import * as XLSX from 'xlsx';
import prisma from '../../lib/prisma';
import { ApiError } from '../../middleware/errorHandler';
import { logger } from '../../lib/logger';
import { sanitizeImportValue } from '../../lib/csv-sanitizer';

// ============================================================================
// Types
// ============================================================================

interface ImportResult {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; error: string }>;
}

interface ResourceRow {
  'Employee ID': string;
  'First Name': string;
  'Last Name': string;
  'Email': string;
  'Employment Type': string;
  'Band': string;
  'Designation': string;
  'Department'?: string;
  'Date of Joining': string | Date;
  'Practice'?: string;
  'Location'?: string;
  'Manager Email'?: string;
  'Status'?: string;
  'Phone'?: string;
  'Cost Per Hour'?: number;
  'Bill Rate'?: number;
}

// ============================================================================
// Import Service
// ============================================================================

/**
 * Parse Excel file buffer
 */
function parseExcelBuffer(buffer: Buffer): ResourceRow[] {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  
  // Get first sheet
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new ApiError('Excel file is empty', 400, 'EMPTY_FILE');
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<ResourceRow>(sheet, {
    defval: '',
    raw: false,
  });

  if (rows.length === 0) {
    throw new ApiError('No data rows found in Excel file', 400, 'NO_DATA');
  }

  // H-11: Sanitize all imported cell values to prevent formula injection
  return rows.map((row) => {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      sanitized[key] = typeof value === 'string' ? sanitizeImportValue(value) : value;
    }
    return sanitized as unknown as ResourceRow;
  });
}

/**
 * Validate required fields
 */
function validateRow(row: ResourceRow, rowNum: number): string | null {
  if (!row['Employee ID']) {
    return `Row ${rowNum}: Employee ID is required`;
  }
  if (!row['First Name']) {
    return `Row ${rowNum}: First Name is required`;
  }
  if (!row['Last Name']) {
    return `Row ${rowNum}: Last Name is required`;
  }
  if (!row['Email']) {
    return `Row ${rowNum}: Email is required`;
  }
  if (!row['Employment Type']) {
    return `Row ${rowNum}: Employment Type is required`;
  }
  if (!row['Band']) {
    return `Row ${rowNum}: Band is required`;
  }
  if (!row['Designation']) {
    return `Row ${rowNum}: Designation is required`;
  }
  if (!row['Date of Joining']) {
    return `Row ${rowNum}: Date of Joining is required`;
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(row['Email'])) {
    return `Row ${rowNum}: Invalid email format`;
  }

  return null;
}

/**
 * Map employment type string to enum
 */
function mapEmploymentType(value: string): 'FTE' | 'CONTRACTOR' | 'INTERN' {
  const normalized = value.toUpperCase().trim();
  if (normalized === 'FTE' || normalized === 'FULL TIME' || normalized === 'FULL-TIME') {
    return 'FTE';
  }
  if (normalized === 'CONTRACTOR' || normalized === 'CONTRACT') {
    return 'CONTRACTOR';
  }
  if (normalized === 'INTERN' || normalized === 'INTERNSHIP') {
    return 'INTERN';
  }
  return 'FTE'; // Default
}

/**
 * Map status string to enum
 */
function mapStatus(value: string | undefined): 'ACTIVE' | 'INACTIVE' | 'NOTICE' {
  if (!value) return 'ACTIVE';
  const normalized = value.toUpperCase().trim();
  if (normalized === 'INACTIVE' || normalized === 'LEFT') {
    return 'INACTIVE';
  }
  if (normalized === 'NOTICE' || normalized === 'RESIGNED') {
    return 'NOTICE';
  }
  return 'ACTIVE';
}

/**
 * Parse date from various formats
 */
function parseDate(value: string | Date): Date {
  if (value instanceof Date) {
    return value;
  }
  
  // Try common formats
  const date = new Date(value);
  if (!isNaN(date.getTime())) {
    return date;
  }
  
  // Try DD/MM/YYYY or DD-MM-YYYY
  const parts = value.split(/[\/\-]/);
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }
  
  throw new Error(`Invalid date format: ${value}`);
}

/**
 * Import resources from Excel buffer
 */
export async function importResources(
  tenantId: string,
  buffer: Buffer,
  userId: string,
  options: { updateExisting?: boolean } = {}
): Promise<ImportResult> {
  const { updateExisting = true } = options;
  
  const rows = parseExcelBuffer(buffer);
  
  const result: ImportResult = {
    total: rows.length,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  // Pre-load lookups
  const practices = await prisma.practice.findMany({
    where: { tenantId },
    select: { id: true, name: true, code: true },
  });
  const practiceMap = new Map(
    practices.flatMap((p) => [
      [p.name.toLowerCase(), p.id],
      [p.code.toLowerCase(), p.id],
    ])
  );

  const locations = await prisma.location.findMany({
    where: { tenantId },
    select: { id: true, name: true, code: true },
  });
  const locationMap = new Map(
    locations.flatMap((l) => [
      [l.name.toLowerCase(), l.id],
      [l.code.toLowerCase(), l.id],
    ])
  );

  const resources = await prisma.resource.findMany({
    where: { tenantId, deletedAt: null },
    select: { id: true, email: true, employeeId: true },
  });
  const resourceByEmail = new Map(resources.map((r) => [r.email.toLowerCase(), r]));
  const resourceByEmpId = new Map(resources.map((r) => [r.employeeId, r]));

  // Process rows
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // Excel rows start at 1, plus header

    // Validate
    const validationError = validateRow(row, rowNum);
    if (validationError) {
      result.errors.push({ row: rowNum, error: validationError });
      result.skipped++;
      continue;
    }

    try {
      const email = row['Email'].toLowerCase().trim();
      const employeeId = row['Employee ID'].trim();
      
      // Check if exists
      const existing = resourceByEmpId.get(employeeId) || resourceByEmail.get(email);

      // Parse date
      let dateOfJoining: Date;
      try {
        dateOfJoining = parseDate(row['Date of Joining']);
      } catch {
        result.errors.push({ row: rowNum, error: 'Invalid date format' });
        result.skipped++;
        continue;
      }

      // Lookup practice
      let practiceId: string | undefined;
      if (row['Practice']) {
        practiceId = practiceMap.get(row['Practice'].toLowerCase().trim());
      }

      // Lookup location
      let locationId: string | undefined;
      if (row['Location']) {
        locationId = locationMap.get(row['Location'].toLowerCase().trim());
      }

      // Lookup manager
      let managerId: string | undefined;
      if (row['Manager Email']) {
        const manager = resourceByEmail.get(row['Manager Email'].toLowerCase().trim());
        managerId = manager?.id;
      }

      const data = {
        tenantId,
        employeeId,
        email,
        firstName: row['First Name'].trim(),
        lastName: row['Last Name'].trim(),
        phone: row['Phone']?.trim() || null,
        employmentType: mapEmploymentType(row['Employment Type']),
        band: row['Band'].trim(),
        designation: row['Designation'].trim(),
        department: row['Department']?.trim() || null,
        dateOfJoining,
        status: mapStatus(row['Status']),
        practiceId: practiceId || null,
        locationId: locationId || null,
        managerId: managerId || null,
        costPerHour: row['Cost Per Hour'] || null,
        billRateDefault: row['Bill Rate'] || null,
        capacity: 100,
      };

      if (existing && updateExisting) {
        await prisma.resource.update({
          where: { id: existing.id },
          data,
        });
        result.updated++;
      } else if (!existing) {
        const created = await prisma.resource.create({
          data: { ...data, benchSince: new Date() },
        });
        // Add to lookup for manager references in later rows
        resourceByEmail.set(email, { id: created.id, email, employeeId });
        resourceByEmpId.set(employeeId, { id: created.id, email, employeeId });
        result.created++;
      } else {
        result.skipped++;
      }
    } catch (err) {
      result.errors.push({
        row: rowNum,
        error: (err as Error).message || 'Unknown error',
      });
      result.skipped++;
    }
  }

  // Audit log
  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      entityType: 'Resource',
      entityId: 'import',
      action: 'IMPORT',
      metadata: {
        total: result.total,
        created: result.created,
        updated: result.updated,
        skipped: result.skipped,
        errorCount: result.errors.length,
      },
    },
  });

  logger.info('Resource import completed', {
    tenantId,
    total: result.total,
    created: result.created,
    updated: result.updated,
    errors: result.errors.length,
  });

  return result;
}

/**
 * Generate import template
 */
export function generateImportTemplate(): Buffer {
  const headers = [
    'Employee ID',
    'First Name',
    'Last Name',
    'Email',
    'Employment Type',
    'Band',
    'Designation',
    'Department',
    'Date of Joining',
    'Practice',
    'Location',
    'Manager Email',
    'Status',
    'Phone',
    'Cost Per Hour',
    'Bill Rate',
  ];

  const sampleRow = [
    'NV001',
    'John',
    'Doe',
    'john.doe@company.com',
    'FTE',
    'L4',
    'Senior Software Engineer',
    'Engineering',
    '2024-01-15',
    'Technology',
    'Bangalore',
    'manager@company.com',
    'Active',
    '+91 9876543210',
    '2500',
    '5000',
  ];

  const workbook = XLSX.utils.book_new();
  const data = [headers, sampleRow];
  const worksheet = XLSX.utils.aoa_to_sheet(data);

  // Set column widths
  worksheet['!cols'] = headers.map(() => ({ wch: 20 }));

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Resources');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

