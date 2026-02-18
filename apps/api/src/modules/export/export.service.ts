import prisma from '../../lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';

// ============================================================================
// Types
// ============================================================================

export interface ExportOptions {
  format: 'csv' | 'json';
  includeHeaders?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface ExportResult {
  data: string;
  filename: string;
  mimeType: string;
  recordCount: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

function escapeCSV(value: string | number | boolean | null | undefined | Date | Decimal): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().split('T')[0];
  if (typeof value === 'object' && 'toNumber' in value) return value.toNumber().toString();
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCSV(headers: string[], rows: Array<Record<string, unknown>>): string {
  const headerLine = headers.map(h => escapeCSV(h)).join(',');
  const dataLines = rows.map(row =>
    headers.map(h => escapeCSV(row[h] as string | number | boolean | null)).join(',')
  );
  return [headerLine, ...dataLines].join('\n');
}

function generateFilename(prefix: string, format: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  return `${prefix}_${timestamp}.${format}`;
}

// ============================================================================
// Export Functions
// ============================================================================

/**
 * Export all resources
 */
export async function exportResources(
  tenantId: string,
  options: ExportOptions
): Promise<ExportResult> {
  const resources = await prisma.resource.findMany({
    where: { tenantId, deletedAt: null },
    include: {
      practice: { select: { name: true, code: true } },
      location: { select: { name: true, code: true } },
      skills: {
        include: { skill: { select: { name: true } } },
        take: 10,
      },
      allocations: {
        where: { status: 'ACTIVE', deletedAt: null },
        include: { project: { select: { name: true, code: true } } },
      },
    },
    orderBy: { employeeId: 'asc' },
  });

  const rows = resources.map(r => ({
    employeeId: r.employeeId,
    firstName: r.firstName,
    lastName: r.lastName,
    email: r.email,
    designation: r.designation,
    band: r.band,
    practice: r.practice?.name ?? '',
    practiceCode: r.practice?.code ?? '',
    location: r.location?.name ?? '',
    locationCode: r.location?.code ?? '',
    status: r.status,
    employmentType: r.employmentType,
    joinDate: r.dateOfJoining,
    capacity: r.capacity,
    billRatePerHour: r.billRateDefault,
    costPerHour: r.costPerHour,
    skills: r.skills.map(s => s.skill.name).join('; '),
    currentProjects: r.allocations.map(a => a.project.code).join('; '),
    totalAllocation: r.allocations.reduce((sum, a) => sum + a.percentage, 0),
    benchSince: r.benchSince,
  }));

  const headers = [
    'employeeId', 'firstName', 'lastName', 'email', 'designation', 'band',
    'practice', 'practiceCode', 'location', 'locationCode', 'status',
    'employmentType', 'joinDate', 'capacity', 'billRatePerHour', 'costPerHour',
    'skills', 'currentProjects', 'totalAllocation', 'benchSince'
  ];

  if (options.format === 'json') {
    return {
      data: JSON.stringify(rows, null, 2),
      filename: generateFilename('resources', 'json'),
      mimeType: 'application/json',
      recordCount: rows.length,
    };
  }

  return {
    data: toCSV(headers, rows),
    filename: generateFilename('resources', 'csv'),
    mimeType: 'text/csv',
    recordCount: rows.length,
  };
}

/**
 * Export all projects
 */
export async function exportProjects(
  tenantId: string,
  options: ExportOptions
): Promise<ExportResult> {
  const projects = await prisma.project.findMany({
    where: { tenantId, deletedAt: null },
    include: {
      client: { select: { name: true, code: true } },
      contract: { select: { name: true, contractNumber: true } },
      allocations: {
        where: { status: 'ACTIVE', deletedAt: null },
        include: { resource: { select: { firstName: true, lastName: true } } },
      },
    },
    orderBy: { code: 'asc' },
  });

  const rows = projects.map(p => ({
    code: p.code,
    name: p.name,
    client: p.client?.name ?? '',
    clientCode: p.client?.code ?? '',
    contract: p.contract?.contractNumber ?? '',
    type: p.type,
    status: p.status,
    healthStatus: p.healthStatus,
    startDate: p.startDate,
    endDate: p.endDate,
    budgetHours: p.budgetHours,
    teamSize: new Set(p.allocations.map(a => a.resourceId)).size,
    teamMembers: p.allocations.map(a => `${a.resource.firstName} ${a.resource.lastName}`).join('; '),
    description: p.description,
  }));

  const headers = [
    'code', 'name', 'client', 'clientCode', 'contract', 'type', 'status',
    'healthStatus', 'startDate', 'endDate', 'budgetHours', 'teamSize',
    'teamMembers', 'description'
  ];

  if (options.format === 'json') {
    return {
      data: JSON.stringify(rows, null, 2),
      filename: generateFilename('projects', 'json'),
      mimeType: 'application/json',
      recordCount: rows.length,
    };
  }

  return {
    data: toCSV(headers, rows),
    filename: generateFilename('projects', 'csv'),
    mimeType: 'text/csv',
    recordCount: rows.length,
  };
}

/**
 * Export allocations
 */
export async function exportAllocations(
  tenantId: string,
  options: ExportOptions
): Promise<ExportResult> {
  const where: Record<string, unknown> = { tenantId, deletedAt: null };
  
  if (options.dateRange) {
    where.OR = [
      {
        startDate: { lte: options.dateRange.end },
        endDate: { gte: options.dateRange.start },
      },
    ];
  }

  const allocations = await prisma.allocation.findMany({
    where,
    include: {
      resource: { select: { employeeId: true, firstName: true, lastName: true } },
      project: { select: { code: true, name: true } },
    },
    orderBy: [{ startDate: 'desc' }, { resource: { employeeId: 'asc' } }],
  });

  const rows = allocations.map(a => ({
    resourceId: a.resource.employeeId,
    resourceName: `${a.resource.firstName} ${a.resource.lastName}`,
    projectCode: a.project.code,
    projectName: a.project.name,
    role: a.role,
    percentage: a.percentage,
    startDate: a.startDate,
    endDate: a.endDate,
    status: a.status,
    isBillable: a.isBillable,
    billRateOverride: a.billRate,
    notes: a.notes,
  }));

  const headers = [
    'resourceId', 'resourceName', 'projectCode', 'projectName', 'role',
    'percentage', 'startDate', 'endDate', 'status', 'isBillable',
    'billRateOverride', 'notes'
  ];

  if (options.format === 'json') {
    return {
      data: JSON.stringify(rows, null, 2),
      filename: generateFilename('allocations', 'json'),
      mimeType: 'application/json',
      recordCount: rows.length,
    };
  }

  return {
    data: toCSV(headers, rows),
    filename: generateFilename('allocations', 'csv'),
    mimeType: 'text/csv',
    recordCount: rows.length,
  };
}

/**
 * Export bench report
 */
export async function exportBenchReport(
  tenantId: string,
  options: ExportOptions
): Promise<ExportResult> {
  const now = new Date();

  const resources = await prisma.resource.findMany({
    where: {
      tenantId,
      status: 'ACTIVE',
      deletedAt: null,
      benchSince: { not: null },
    },
    include: {
      practice: { select: { name: true } },
      location: { select: { name: true } },
      skills: {
        include: { skill: { select: { name: true } } },
        take: 5,
      },
    },
    orderBy: { benchSince: 'asc' },
  });

  const rows = resources.map(r => {
    const benchDays = r.benchSince 
      ? Math.floor((now.getTime() - r.benchSince.getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    const monthlyCost = r.costPerHour ? r.costPerHour.toNumber() * 176 : 150000;

    return {
      employeeId: r.employeeId,
      name: `${r.firstName} ${r.lastName}`,
      designation: r.designation,
      band: r.band,
      practice: r.practice?.name ?? '',
      location: r.location?.name ?? '',
      benchSince: r.benchSince,
      benchDays,
      estimatedMonthlyCost: Math.round(monthlyCost),
      skills: r.skills.map(s => s.skill.name).join('; '),
    };
  });

  const headers = [
    'employeeId', 'name', 'designation', 'band', 'practice', 'location',
    'benchSince', 'benchDays', 'estimatedMonthlyCost', 'skills'
  ];

  if (options.format === 'json') {
    return {
      data: JSON.stringify(rows, null, 2),
      filename: generateFilename('bench_report', 'json'),
      mimeType: 'application/json',
      recordCount: rows.length,
    };
  }

  return {
    data: toCSV(headers, rows),
    filename: generateFilename('bench_report', 'csv'),
    mimeType: 'text/csv',
    recordCount: rows.length,
  };
}

/**
 * Export utilization report
 */
export async function exportUtilizationReport(
  tenantId: string,
  options: ExportOptions
): Promise<ExportResult> {
  const now = new Date();

  const resources = await prisma.resource.findMany({
    where: { tenantId, status: 'ACTIVE', deletedAt: null },
    include: {
      practice: { select: { name: true, targetUtilization: true } },
      location: { select: { name: true } },
      allocations: {
        where: {
          status: 'ACTIVE',
          deletedAt: null,
          startDate: { lte: now },
          endDate: { gte: now },
        },
        include: { project: { select: { name: true, code: true } } },
      },
    },
    orderBy: { employeeId: 'asc' },
  });

  const rows = resources.map(r => {
    const billable = r.allocations
      .filter(a => a.isBillable)
      .reduce((sum, a) => sum + a.percentage, 0);
    const nonBillable = r.allocations
      .filter(a => !a.isBillable)
      .reduce((sum, a) => sum + a.percentage, 0);
    const total = billable + nonBillable;
    const available = Math.max(0, r.capacity - total);
    const target = r.practice?.targetUtilization ?? 85;

    return {
      employeeId: r.employeeId,
      name: `${r.firstName} ${r.lastName}`,
      designation: r.designation,
      band: r.band,
      practice: r.practice?.name ?? '',
      location: r.location?.name ?? '',
      capacity: r.capacity,
      billableAllocation: billable,
      nonBillableAllocation: nonBillable,
      totalAllocation: total,
      availableCapacity: available,
      targetUtilization: target,
      variance: billable - target,
      status: billable >= target ? 'On Target' : billable >= target - 10 ? 'Near Target' : 'Below Target',
      projects: r.allocations.map(a => a.project.code).join('; '),
    };
  });

  const headers = [
    'employeeId', 'name', 'designation', 'band', 'practice', 'location',
    'capacity', 'billableAllocation', 'nonBillableAllocation', 'totalAllocation',
    'availableCapacity', 'targetUtilization', 'variance', 'status', 'projects'
  ];

  if (options.format === 'json') {
    return {
      data: JSON.stringify(rows, null, 2),
      filename: generateFilename('utilization_report', 'json'),
      mimeType: 'application/json',
      recordCount: rows.length,
    };
  }

  return {
    data: toCSV(headers, rows),
    filename: generateFilename('utilization_report', 'csv'),
    mimeType: 'text/csv',
    recordCount: rows.length,
  };
}

/**
 * Export clients
 */
export async function exportClients(
  tenantId: string,
  options: ExportOptions
): Promise<ExportResult> {
  const clients = await prisma.client.findMany({
    where: { tenantId, deletedAt: null },
    include: {
      projects: { where: { deletedAt: null }, select: { name: true, status: true } },
      contracts: { where: { deletedAt: null }, select: { name: true, status: true } },
    },
    orderBy: { name: 'asc' },
  });

  const rows = clients.map(c => ({
    code: c.code,
    name: c.name,
    industry: c.industry,
    status: c.status,
    contactName: (c.contacts as Record<string, unknown>)?.name ?? '',
    contactEmail: (c.contacts as Record<string, unknown>)?.email ?? '',
    contactPhone: (c.contacts as Record<string, unknown>)?.phone ?? '',
    address: c.billingAddress ?? '',
    website: c.website,
    activeProjects: c.projects.filter(p => p.status === 'ACTIVE').length,
    totalProjects: c.projects.length,
    activeContracts: c.contracts.filter(ct => ct.status === 'ACTIVE').length,
    totalContracts: c.contracts.length,
  }));

  const headers = [
    'code', 'name', 'industry', 'status', 'contactName', 'contactEmail',
    'contactPhone', 'address', 'website', 'activeProjects', 'totalProjects',
    'activeContracts', 'totalContracts'
  ];

  if (options.format === 'json') {
    return {
      data: JSON.stringify(rows, null, 2),
      filename: generateFilename('clients', 'json'),
      mimeType: 'application/json',
      recordCount: rows.length,
    };
  }

  return {
    data: toCSV(headers, rows),
    filename: generateFilename('clients', 'csv'),
    mimeType: 'text/csv',
    recordCount: rows.length,
  };
}

/**
 * Export skills inventory
 */
export async function exportSkillsInventory(
  tenantId: string,
  options: ExportOptions
): Promise<ExportResult> {
  const skills = await prisma.skill.findMany({
    where: { tenantId },
    include: {
      category: { select: { name: true } },
      resources: {
        include: {
          resource: { 
            select: { employeeId: true, firstName: true, lastName: true, status: true } 
          },
        },
      },
    },
    orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
  });

  const rows = skills.map(s => {
    const activeResources = s.resources.filter(r => r.resource.status === 'ACTIVE');
    const proficiencyLevels = activeResources.reduce((acc, r) => {
      acc[r.proficiency] = (acc[r.proficiency] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      skillName: s.name,
      category: s.category?.name ?? '',
      totalResources: activeResources.length,
      beginners: proficiencyLevels['BEGINNER'] ?? 0,
      intermediate: proficiencyLevels['INTERMEDIATE'] ?? 0,
      advanced: proficiencyLevels['ADVANCED'] ?? 0,
      experts: proficiencyLevels['EXPERT'] ?? 0,
      resourceList: activeResources.map(r => 
        `${r.resource.firstName} ${r.resource.lastName} (${r.proficiency})`
      ).join('; '),
    };
  });

  const headers = [
    'skillName', 'category', 'totalResources', 'beginners', 'intermediate',
    'advanced', 'experts', 'resourceList'
  ];

  if (options.format === 'json') {
    return {
      data: JSON.stringify(rows, null, 2),
      filename: generateFilename('skills_inventory', 'json'),
      mimeType: 'application/json',
      recordCount: rows.length,
    };
  }

  return {
    data: toCSV(headers, rows),
    filename: generateFilename('skills_inventory', 'csv'),
    mimeType: 'text/csv',
    recordCount: rows.length,
  };
}

