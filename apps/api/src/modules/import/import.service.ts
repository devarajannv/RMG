import prisma from '../../lib/prisma';
import { Prisma } from '@prisma/client';

// ============================================================================
// Types
// ============================================================================

export interface ImportResult {
  success: boolean;
  totalRows: number;
  importedRows: number;
  skippedRows: number;
  errors: Array<{
    row: number;
    field?: string;
    message: string;
  }>;
}

export interface ResourceImportRow {
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  designation?: string;
  band?: string;
  practiceCode?: string;
  locationCode?: string;
  status?: string;
  employmentType?: string;
  joinDate?: string;
  capacity?: string | number;
  billRatePerHour?: string | number;
  costPerHour?: string | number;
  skills?: string;
}

export interface AllocationImportRow {
  resourceEmployeeId: string;
  projectCode: string;
  role?: string;
  percentage: string | number;
  startDate: string;
  endDate: string;
  status?: string;
  isBillable?: string | boolean;
}

export interface ProjectImportRow {
  code: string;
  name: string;
  clientCode?: string;
  type?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  budgetHours?: string | number;
  description?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function parseCSV(csvData: string): Array<Record<string, string>> {
  const lines = csvData.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const rows: Array<Record<string, string>> = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === headers.length) {
      const row: Record<string, string> = {};
      headers.forEach((header, idx) => {
        row[header.trim()] = values[idx]?.trim() ?? '';
      });
      rows.push(row);
    }
  }

  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

function parseNumber(value: string | number | undefined): number | null {
  if (value === undefined || value === '') return null;
  const num = typeof value === 'number' ? value : parseFloat(value);
  return isNaN(num) ? null : num;
}

function parseBoolean(value: string | boolean | undefined): boolean {
  if (typeof value === 'boolean') return value;
  if (!value) return false;
  return ['true', '1', 'yes', 'y'].includes(value.toLowerCase());
}

// ============================================================================
// Import Functions
// ============================================================================

/**
 * Import resources from CSV
 */
export async function importResources(
  tenantId: string,
  csvData: string,
  _userId: string,
  options: { updateExisting?: boolean } = {}
): Promise<ImportResult> {
  const rows = parseCSV(csvData) as unknown as ResourceImportRow[];
  const result: ImportResult = {
    success: true,
    totalRows: rows.length,
    importedRows: 0,
    skippedRows: 0,
    errors: [],
  };

  // Get lookup maps
  const practices = await prisma.practice.findMany({
    where: { tenantId },
    select: { id: true, code: true },
  });
  const practiceMap = new Map(practices.map(p => [p.code.toUpperCase(), p.id]));

  const locations = await prisma.location.findMany({
    where: { tenantId },
    select: { id: true, code: true },
  });
  const locationMap = new Map(locations.map(l => [l.code.toUpperCase(), l.id]));

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // 1-indexed + header row

    try {
      // Validate required fields
      if (!row.employeeId || !row.firstName || !row.lastName || !row.email) {
        result.errors.push({
          row: rowNum,
          message: 'Missing required fields: employeeId, firstName, lastName, email',
        });
        result.skippedRows++;
        continue;
      }

      // Check if resource exists
      const existing = await prisma.resource.findFirst({
        where: { tenantId, employeeId: row.employeeId },
      });

      if (existing && !options.updateExisting) {
        result.skippedRows++;
        continue;
      }

      // Resolve foreign keys
      const practiceId = row.practiceCode 
        ? practiceMap.get(row.practiceCode.toUpperCase()) 
        : null;
      const locationId = row.locationCode 
        ? locationMap.get(row.locationCode.toUpperCase()) 
        : null;

      const resourceData = {
        employeeId: row.employeeId,
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email.toLowerCase(),
        designation: row.designation || 'Associate',
        band: row.band || 'L3',
        practiceId,
        locationId,
        status: (row.status?.toUpperCase() || 'ACTIVE') as 'ACTIVE' | 'INACTIVE' | 'ONLEAVE' | 'TERMINATED',
        employmentType: (row.employmentType?.toUpperCase() || 'FTE') as 'FTE' | 'CONTRACTOR' | 'INTERN',
        joinDate: parseDate(row.joinDate ?? '') || new Date(),
        capacity: parseNumber(row.capacity) ?? 100,
        billRatePerHour: parseNumber(row.billRatePerHour),
        costPerHour: parseNumber(row.costPerHour),
        benchSince: new Date(),
      };

      if (existing) {
        await prisma.resource.update({
          where: { id: existing.id },
          data: resourceData as Prisma.ResourceUncheckedUpdateInput,
        });
      } else {
        await prisma.resource.create({
          data: {
            ...resourceData,
            tenantId,
          } as unknown as Prisma.ResourceUncheckedCreateInput,
        });
      }

      result.importedRows++;

      // Handle skills if provided
      if (row.skills) {
        const skillNames = row.skills.split(';').map(s => s.trim()).filter(Boolean);
        const resource = await prisma.resource.findFirst({
          where: { tenantId, employeeId: row.employeeId },
        });

        if (resource) {
          for (const skillName of skillNames) {
            // Find or create skill
            let skill = await prisma.skill.findFirst({
              where: { tenantId, name: { equals: skillName, mode: 'insensitive' } },
            });

            if (!skill) {
              const defaultCategory = await prisma.skillCategory.findFirst({
                where: { tenantId },
              });
              if (defaultCategory) {
                skill = await prisma.skill.create({
                  data: {
                    tenantId,
                    categoryId: defaultCategory.id,
                    name: skillName,
                  },
                });
              }
            }

            if (skill) {
              await prisma.resourceSkill.upsert({
                where: {
                  resourceId_skillId: {
                    resourceId: resource.id,
                    skillId: skill.id,
                  },
                },
                update: {},
                create: {
                  resourceId: resource.id,
                  skillId: skill.id,
                  proficiency: 'INTERMEDIATE',
                  yearsExp: 1,
                },
              });
            }
          }
        }
      }
    } catch (error) {
      result.errors.push({
        row: rowNum,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      result.skippedRows++;
    }
  }

  result.success = result.errors.length === 0;
  return result;
}

/**
 * Import allocations from CSV
 */
export async function importAllocations(
  tenantId: string,
  csvData: string,
  userId: string,
  options: { updateExisting?: boolean } = {}
): Promise<ImportResult> {
  const rows = parseCSV(csvData) as unknown as AllocationImportRow[];
  const result: ImportResult = {
    success: true,
    totalRows: rows.length,
    importedRows: 0,
    skippedRows: 0,
    errors: [],
  };

  // Get lookup maps
  const resources = await prisma.resource.findMany({
    where: { tenantId },
    select: { id: true, employeeId: true },
  });
  const resourceMap = new Map(resources.map(r => [r.employeeId.toUpperCase(), r.id]));

  const projects = await prisma.project.findMany({
    where: { tenantId },
    select: { id: true, code: true },
  });
  const projectMap = new Map(projects.map(p => [p.code.toUpperCase(), p.id]));

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    try {
      // Validate required fields
      if (!row.resourceEmployeeId || !row.projectCode || !row.startDate || !row.endDate) {
        result.errors.push({
          row: rowNum,
          message: 'Missing required fields: resourceEmployeeId, projectCode, startDate, endDate',
        });
        result.skippedRows++;
        continue;
      }

      const resourceId = resourceMap.get(row.resourceEmployeeId.toUpperCase());
      const projectId = projectMap.get(row.projectCode.toUpperCase());

      if (!resourceId) {
        result.errors.push({
          row: rowNum,
          field: 'resourceEmployeeId',
          message: `Resource not found: ${row.resourceEmployeeId}`,
        });
        result.skippedRows++;
        continue;
      }

      if (!projectId) {
        result.errors.push({
          row: rowNum,
          field: 'projectCode',
          message: `Project not found: ${row.projectCode}`,
        });
        result.skippedRows++;
        continue;
      }

      const startDate = parseDate(row.startDate);
      const endDate = parseDate(row.endDate);

      if (!startDate || !endDate) {
        result.errors.push({
          row: rowNum,
          message: 'Invalid date format',
        });
        result.skippedRows++;
        continue;
      }

      const allocationData = {
        resourceId,
        projectId,
        role: row.role || 'Team Member',
        percentage: parseNumber(row.percentage) ?? 100,
        startDate,
        endDate,
        status: (row.status?.toUpperCase() || 'ACTIVE') as 'ACTIVE' | 'PROPOSED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED',
        isBillable: parseBoolean(row.isBillable),
        allocatedBy: userId,
      };

      // Check for existing allocation
      const existing = await prisma.allocation.findFirst({
        where: {
          tenantId,
          resourceId,
          projectId,
          startDate,
          endDate,
          deletedAt: null,
        },
      });

      if (existing && !options.updateExisting) {
        result.skippedRows++;
        continue;
      }

      if (existing) {
        await prisma.allocation.update({
          where: { id: existing.id },
          data: allocationData,
        });
      } else {
        await prisma.allocation.create({
          data: {
            ...allocationData,
            tenantId,
          },
        });
      }

      result.importedRows++;
    } catch (error) {
      result.errors.push({
        row: rowNum,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      result.skippedRows++;
    }
  }

  result.success = result.errors.length === 0;
  return result;
}

/**
 * Import projects from CSV
 */
export async function importProjects(
  tenantId: string,
  csvData: string,
  _userId: string,
  options: { updateExisting?: boolean } = {}
): Promise<ImportResult> {
  const rows = parseCSV(csvData) as unknown as ProjectImportRow[];
  const result: ImportResult = {
    success: true,
    totalRows: rows.length,
    importedRows: 0,
    skippedRows: 0,
    errors: [],
  };

  // Get client map
  const clients = await prisma.client.findMany({
    where: { tenantId },
    select: { id: true, code: true },
  });
  const clientMap = new Map(clients.map(c => [c.code.toUpperCase(), c.id]));

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    try {
      // Validate required fields
      if (!row.code || !row.name) {
        result.errors.push({
          row: rowNum,
          message: 'Missing required fields: code, name',
        });
        result.skippedRows++;
        continue;
      }

      // Check if project exists
      const existing = await prisma.project.findFirst({
        where: { tenantId, code: row.code },
      });

      if (existing && !options.updateExisting) {
        result.skippedRows++;
        continue;
      }

      const clientId = row.clientCode 
        ? clientMap.get(row.clientCode.toUpperCase()) 
        : null;

      const projectData = {
        code: row.code,
        name: row.name,
        clientId,
        type: (row.type?.toUpperCase() || 'BILLABLE') as 'BILLABLE' | 'NON_BILLABLE' | 'INTERNAL' | 'INVESTMENT',
        status: (row.status?.toUpperCase() || 'ACTIVE') as 'PIPELINE' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED',
        startDate: parseDate(row.startDate ?? '') || new Date(),
        endDate: parseDate(row.endDate ?? ''),
        budgetHours: parseNumber(row.budgetHours),
        description: row.description,
      };

      if (existing) {
        await prisma.project.update({
          where: { id: existing.id },
          data: projectData as Prisma.ProjectUncheckedUpdateInput,
        });
      } else {
        await prisma.project.create({
          data: {
            ...projectData,
            tenantId,
          } as Prisma.ProjectUncheckedCreateInput,
        });
      }

      result.importedRows++;
    } catch (error) {
      result.errors.push({
        row: rowNum,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      result.skippedRows++;
    }
  }

  result.success = result.errors.length === 0;
  return result;
}

/**
 * Get import template
 */
export function getImportTemplate(type: 'resources' | 'allocations' | 'projects'): string {
  const templates: Record<string, string> = {
    resources: 'employeeId,firstName,lastName,email,designation,band,practiceCode,locationCode,status,employmentType,joinDate,capacity,billRatePerHour,costPerHour,skills\nNV001,John,Doe,john.doe@company.com,Software Engineer,L3,TECH,BLR,ACTIVE,FTE,2024-01-15,100,50,35,"Java; Python; AWS"',
    allocations: 'resourceEmployeeId,projectCode,role,percentage,startDate,endDate,status,isBillable\nNV001,PROJ001,Developer,100,2024-01-01,2024-06-30,ACTIVE,true',
    projects: 'code,name,clientCode,type,status,startDate,endDate,budgetHours,description\nPROJ001,Customer Portal,CLIENT001,BILLABLE,ACTIVE,2024-01-01,2024-12-31,2000,Customer portal development project',
  };

  return templates[type] ?? '';
}

