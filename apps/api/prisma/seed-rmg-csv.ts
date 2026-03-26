import {
  AllocationStatus,
  BillingType,
  EntityStatus,
  ClientStatus,
  ClientTier,
  EmploymentType,
  Proficiency,
  RoleCategory,
  LocationStatus,
  LocationType,
  PracticeStatus,
  PrismaClient,
  ProjectStatus,
  ProjectType,
  ResourceStatus,
  TenantStatus,
  TenantTier,
} from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { roleService } from '../src/modules/roles/role.service';

const prisma = new PrismaClient();

const RESOURCE_CSV_PATH = path.join(__dirname, '..', '..', '..', 'RMG_Master_File_My Copy.csv');
const PROJECT_CSV_PATH = path.join(__dirname, '..', '..', '..', 'Porjects Master.csv');

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index++) {
    const char = line[index];

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
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

function parseCSVRows(filePath: string): string[][] {
  const content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let index = 0; index < content.length; index++) {
    const char = content[index];

    if (char === '"') {
      if (inQuotes && content[index + 1] === '"') {
        currentField += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      currentRow.push(currentField);
      currentField = '';
      continue;
    }

    if (char === '\n' && !inQuotes) {
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = '';
      continue;
    }

    currentField += char;
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

function parseCSV(filePath: string, headerLineIndex: number): Record<string, string>[] {
  const parsedRows = parseCSVRows(filePath);
  const headerRow = parsedRows[headerLineIndex];

  if (!headerRow) {
    return [];
  }

  const headers = headerRow.map((header) => header.trim());
  const rows: Record<string, string>[] = [];

  for (let rowIndex = headerLineIndex + 1; rowIndex < parsedRows.length; rowIndex++) {
    const rawRow = parsedRows[rowIndex];
    if (!rawRow || rawRow.every((value) => !value.trim())) {
      continue;
    }

    const row: Record<string, string> = {};
    headers.forEach((header, valueIndex) => {
      row[header] = (rawRow[valueIndex] || '').trim();
    });
    rows.push(row);
  }

  return rows;
}

function parseDate(dateStr: string | undefined): Date | null {
  if (!dateStr) {
    return null;
  }

  const trimmed = dateStr.trim();
  if (!trimmed || trimmed === '-' || trimmed === 'NA') {
    return null;
  }

  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const serial = Number.parseFloat(trimmed);
    if (Number.isFinite(serial) && serial > 20000 && serial < 80000) {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const parsedFromSerial = new Date(excelEpoch.getTime() + serial * 24 * 60 * 60 * 1000);
      if (!Number.isNaN(parsedFromSerial.getTime())) {
        return parsedFromSerial;
      }
    }
  }

  const monthMap: Record<string, number> = {
    Jan: 0,
    Feb: 1,
    Mar: 2,
    Apr: 3,
    May: 4,
    Jun: 5,
    Jul: 6,
    Aug: 7,
    Sep: 8,
    Oct: 9,
    Nov: 10,
    Dec: 11,
  };

  const compact = trimmed.match(/^(\d{1,2})-(\w{3})-(\d{2})$/);
  if (compact) {
    const day = Number.parseInt(compact[1], 10);
    const month = monthMap[compact[2]];
    let year = Number.parseInt(compact[3], 10);
    year = year < 50 ? 2000 + year : 1900 + year;

    if (month !== undefined) {
      return new Date(year, month, day);
    }
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const year = parsed.getUTCFullYear();
  if (year < 2000 || year > 2100) {
    return null;
  }

  return parsed;
}

function parseAllocationPercentage(value: string | undefined): number {
  const parsed = Number.parseInt((value || '').replace(/[^0-9]/g, ''), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 100;
  }
  return Math.min(parsed, 100);
}

function normalizeKey(value: string | undefined): string {
  return (value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function parseGradeBand(experienceRange: string | undefined): { code: string; name: string; level: number; legacyBand: string } {
  const normalized = normalizeKey(experienceRange);

  if (normalized.includes('less than 1') || normalized.includes('<1')) {
    return { code: 'LT1', name: 'Less than 1 year', level: 1, legacyBand: '<1 yr' };
  }
  if (normalized.includes('1-3')) {
    return { code: 'G1_3', name: '1 to 3 years', level: 2, legacyBand: '1-3 yrs' };
  }
  if (normalized.includes('3-6')) {
    return { code: 'G3_6', name: '3 to 6 years', level: 3, legacyBand: '3-6 yrs' };
  }
  if (normalized.includes('6-9')) {
    return { code: 'G6_9', name: '6 to 9 years', level: 4, legacyBand: '6-9 yrs' };
  }
  if (normalized.includes('9-12')) {
    return { code: 'G9_12', name: '9 to 12 years', level: 5, legacyBand: '9-12 yrs' };
  }
  if (normalized.includes('more than 12') || normalized.includes('>12')) {
    return { code: 'GT12', name: 'More than 12 years', level: 6, legacyBand: '>12 yrs' };
  }

  return { code: 'UNK', name: 'Unknown', level: 0, legacyBand: 'Unknown' };
}

function normalizeBusinessRoleName(value: string | undefined): string {
  const normalized = normalizeKey(value);
  if (!normalized) {
    return 'Individual Contributor';
  }
  if (normalized.includes('technical lead')) {
    return 'Technical Lead';
  }
  if (normalized.includes('project manager')) {
    return 'Project Manager';
  }
  if (normalized.includes('manager')) {
    return 'Manager';
  }
  if (normalized.includes('consultant')) {
    return 'Consultant';
  }
  if (normalized.includes('architect')) {
    return 'Architect';
  }
  if (normalized.includes('engineer')) {
    return 'Software Engineer';
  }
  if (normalized.includes('tester') || normalized.includes('qa')) {
    return 'QA Engineer';
  }
  if (normalized.includes('lead')) {
    return 'Lead';
  }
  return toTitleCase(normalized);
}

function parseBusinessRoleCategory(roleName: string): RoleCategory {
  const normalized = normalizeKey(roleName);
  if (
    normalized.includes('manager')
    || normalized.includes('lead')
    || normalized.includes('head')
    || normalized.includes('director')
    || normalized.includes('chief')
    || normalized.includes('officer')
    || normalized.includes('president')
    || normalized.includes('vp')
    || normalized.includes('vice president')
  ) {
    return RoleCategory.MANAGEMENT;
  }
  return RoleCategory.INDIVIDUAL;
}

function parseSkillNames(row: Record<string, string>): string[] {
  const candidates = [row['Primary Skill'], row['Skill']]
    .map((value) => value?.trim())
    .filter(Boolean) as string[];

  const unique = new Map<string, string>();
  for (const candidate of candidates) {
    const parts = candidate.split(',').map((part) => part.trim()).filter(Boolean);
    for (const part of parts) {
      const key = normalizeKey(part);
      if (!key || unique.has(key)) {
        continue;
      }
      unique.set(key, part.slice(0, 100));
    }
  }

  return [...unique.values()];
}

function buildBusinessRoleCode(roleName: string): string {
  return buildBaseCode(roleName, 'ROLE').slice(0, 20);
}

function getAllocationStatus(
  startDate: Date,
  endDate: Date,
  rowStatus: string | undefined,
  resourceStatus: string | undefined,
): AllocationStatus {
  const now = new Date();
  const normalizedStatus = rowStatus?.trim().toLowerCase() || '';
  const normalizedResourceStatus = resourceStatus?.trim().toLowerCase() || '';

  if (normalizedResourceStatus && normalizedResourceStatus !== 'active') {
    return AllocationStatus.COMPLETED;
  }

  if (normalizedStatus === 'history' || endDate < now) {
    return AllocationStatus.COMPLETED;
  }

  if (startDate > now) {
    return AllocationStatus.CONFIRMED;
  }

  return AllocationStatus.ACTIVE;
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: 'Unknown', lastName: 'User' };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}

function normalizeEmail(empId: string, email: string | undefined): string {
  const trimmed = email?.trim().toLowerCase();
  if (trimmed && trimmed.includes('@')) {
    return trimmed.slice(0, 255);
  }
  return `${empId.toLowerCase()}@newvision.in`;
}

function makeUniqueEmail(empId: string, email: string | undefined, usedEmails: Set<string>): string {
  const baseEmail = normalizeEmail(empId, email);
  let nextEmail = baseEmail;
  let suffix = 1;

  while (usedEmails.has(nextEmail)) {
    const atIndex = baseEmail.indexOf('@');
    const localPart = atIndex === -1 ? baseEmail : baseEmail.slice(0, atIndex);
    const domainPart = atIndex === -1 ? '@newvision.in' : baseEmail.slice(atIndex);
    nextEmail = `${localPart}.${suffix}${domainPart}`.slice(0, 255);
    suffix += 1;
  }

  usedEmails.add(nextEmail);
  return nextEmail;
}

function parseEmploymentType(value: string | undefined): EmploymentType {
  const normalized = value?.trim().toLowerCase() || '';
  return normalized.includes('consult') || normalized.includes('contract')
    ? EmploymentType.CONTRACTOR
    : EmploymentType.FTE;
}

function parseResourceStatus(value: string | undefined): ResourceStatus {
  return value?.trim().toLowerCase() === 'active' ? ResourceStatus.ACTIVE : ResourceStatus.INACTIVE;
}

function parseBillingType(value: string | undefined): BillingType {
  const normalized = value?.trim().toUpperCase() || '';
  if (normalized.includes('FIXED') || normalized === 'FB' || normalized === 'FMB') {
    return BillingType.FIXED;
  }
  if (normalized.includes('CAPACITY')) {
    return BillingType.MILESTONE;
  }
  return BillingType.TM;
}

function parseProjectType(value: string | undefined): ProjectType {
  const normalized = value?.trim().toLowerCase() || '';
  if (normalized.includes('internal')) {
    return ProjectType.INTERNAL;
  }
  return ProjectType.BILLABLE;
}

function parseProjectStatus(value: string | undefined): ProjectStatus {
  const normalized = value?.trim().toLowerCase() || '';
  if (normalized.includes('complete') || normalized.includes('closed')) {
    return ProjectStatus.COMPLETED;
  }
  if (normalized.includes('hold')) {
    return ProjectStatus.ON_HOLD;
  }
  if (normalized.includes('pipeline') || normalized.includes('scope')) {
    return ProjectStatus.PIPELINE;
  }
  return ProjectStatus.ACTIVE;
}

function buildBaseCode(value: string, fallback: string): string {
  const normalized = value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  return (normalized || fallback).slice(0, 15);
}

function makeUniqueCode(value: string, fallback: string, usedCodes: Set<string>): string {
  const base = buildBaseCode(value, fallback);
  let nextCode = base;
  let suffix = 1;

  while (usedCodes.has(nextCode)) {
    const suffixStr = String(suffix);
    nextCode = `${base.slice(0, Math.max(1, 15 - suffixStr.length))}${suffixStr}`;
    suffix += 1;
  }

  usedCodes.add(nextCode);
  return nextCode;
}

async function getOrCreateTenant() {
  const existing = await prisma.tenant.findFirst({ where: { slug: 'newvision' } });
  if (existing) {
    return existing;
  }

  return prisma.tenant.create({
    data: {
      name: 'NewVision Software',
      slug: 'newvision',
      tier: TenantTier.ENTERPRISE,
      status: TenantStatus.ACTIVE,
      timezone: 'Asia/Kolkata',
      currency: 'INR',
      fiscalYearStart: 4,
      settings: {
        defaultCapacity: 100,
        targetUtilization: 85,
        workingHoursPerDay: 8,
        workingDaysPerWeek: 5,
      },
    },
  });
}

async function clearImportedData(tenantId: string) {
  await prisma.allocation.deleteMany({ where: { tenantId } });
  await prisma.resourceSkill.deleteMany({ where: { resource: { tenantId } } });
  await prisma.teamMember.deleteMany({ where: { team: { tenantId } } });
  await prisma.resourceBusinessRole.deleteMany({ where: { resource: { tenantId } } });
  await prisma.project.deleteMany({ where: { tenantId } });
  await prisma.resource.deleteMany({ where: { tenantId } });
  await prisma.team.deleteMany({ where: { tenantId } });
  await prisma.department.deleteMany({ where: { tenantId } });
  await prisma.businessRole.deleteMany({ where: { tenantId, isSystem: false } });
  await prisma.gradeBand.deleteMany({ where: { tenantId } });
  await prisma.skill.deleteMany({ where: { tenantId } });
  await prisma.client.deleteMany({ where: { tenantId } });
  await prisma.practice.deleteMany({ where: { tenantId } });
  await prisma.location.deleteMany({ where: { tenantId } });
}

async function main() {
  console.log('🌱 Seeding operational and org foundation data from CSV...');

  if (!fs.existsSync(RESOURCE_CSV_PATH)) {
    throw new Error(`Resource CSV not found: ${RESOURCE_CSV_PATH}`);
  }

  if (!fs.existsSync(PROJECT_CSV_PATH)) {
    throw new Error(`Project CSV not found: ${PROJECT_CSV_PATH}`);
  }

  const tenant = await getOrCreateTenant();
  console.log(`🏢 Using tenant ${tenant.name} (${tenant.id})`);

  const resourceRows = parseCSV(RESOURCE_CSV_PATH, 1).filter((row) => row['Emp Id']);
  const projectRows = parseCSV(PROJECT_CSV_PATH, 0).filter((row) => row['Project ID']);

  console.log(`📄 Resource rows: ${resourceRows.length}`);
  console.log(`📄 Project rows: ${projectRows.length}`);

  console.log('🧹 Clearing previously imported domain data...');
  await clearImportedData(tenant.id);

  const practiceMap = new Map<string, string>();
  const locationMap = new Map<string, string>();
  const clientMap = new Map<string, string>();
  const gradeBandMap = new Map<string, string>();
  const businessRoleMap = new Map<string, string>();
  const departmentMap = new Map<string, string>();
  const teamMap = new Map<string, string>();
  const skillMap = new Map<string, string>();
  const practiceCodes = new Set<string>();
  const locationCodes = new Set<string>();
  const clientCodes = new Set<string>();
  const gradeBandCodes = new Set<string>();
  const businessRoleCodes = new Set<string>();
  const departmentCodes = new Set<string>();
  const teamCodes = new Set<string>();
  const adminUser = await prisma.user.findFirst({
    where: { tenantId: tenant.id, status: 'ACTIVE', deletedAt: null },
    orderBy: { createdAt: 'asc' },
  });

  if (!adminUser) {
    throw new Error('At least one active tenant user is required for business role assignments.');
  }

  console.log('🏛️ Creating practices...');
  const practices = [...new Set(resourceRows.map((row) => row['Practice']?.trim()).filter(Boolean))];
  for (const practiceName of practices) {
    const practice = await prisma.practice.create({
      data: {
        tenantId: tenant.id,
        name: practiceName,
        code: makeUniqueCode(practiceName, 'PRACTICE', practiceCodes),
        targetUtilization: 85,
        status: PracticeStatus.ACTIVE,
      },
    });
    practiceMap.set(practiceName, practice.id);
  }
  console.log(`   ✓ ${practiceMap.size} practices`);

  console.log('📍 Creating locations...');
  const locations = [...new Set(resourceRows.map((row) => row['Location']?.trim()).filter(Boolean))];
  for (const locationName of locations) {
    const isIndia = !locationName.toLowerCase().includes('usa')
      && !locationName.toLowerCase().includes('dubai')
      && !locationName.toLowerCase().includes('egypt');
    const location = await prisma.location.create({
      data: {
        tenantId: tenant.id,
        name: locationName,
        code: makeUniqueCode(locationName, 'LOC', locationCodes),
        type: LocationType.OFFICE,
        timezone: isIndia ? 'Asia/Kolkata' : 'UTC',
        country: isIndia ? 'IN' : 'US',
        isOnshore: isIndia,
        status: LocationStatus.ACTIVE,
      },
    });
    locationMap.set(locationName, location.id);
  }
  console.log(`   ✓ ${locationMap.size} locations`);

  console.log('🎚️ Creating grade bands...');
  const gradeBands = new Map<string, { code: string; name: string; level: number; legacyBand: string }>();
  resourceRows.forEach((row) => {
    const parsed = parseGradeBand(row['Experience Range']);
    gradeBands.set(parsed.code, parsed);
  });
  for (const gradeBand of gradeBands.values()) {
    const created = await prisma.gradeBand.create({
      data: {
        tenantId: tenant.id,
        code: makeUniqueCode(gradeBand.code, 'GB', gradeBandCodes),
        name: gradeBand.name,
        level: gradeBand.level,
        currency: 'INR',
      },
    });
    gradeBandMap.set(gradeBand.code, created.id);
  }
  console.log(`   ✓ ${gradeBandMap.size} grade bands`);

  console.log('🧭 Creating departments...');
  for (const practiceName of practices) {
    const department = await prisma.department.create({
      data: {
        tenantId: tenant.id,
        code: makeUniqueCode(practiceName, 'DEPT', departmentCodes),
        name: practiceName,
        type: 'DEPARTMENT',
        status: EntityStatus.ACTIVE,
        level: 0,
      },
    });
    departmentMap.set(practiceName, department.id);
  }
  console.log(`   ✓ ${departmentMap.size} departments`);

  console.log('👔 Creating business roles...');
  const normalizedRoleNames = [...new Set(resourceRows.map((row) => normalizeBusinessRoleName(row['Role'])).filter(Boolean))];
  for (const roleName of normalizedRoleNames) {
    const businessRole = await prisma.businessRole.create({
      data: {
        tenantId: tenant.id,
        code: makeUniqueCode(buildBusinessRoleCode(roleName), 'ROLE', businessRoleCodes),
        name: roleName,
        category: parseBusinessRoleCategory(roleName),
        canManage: parseBusinessRoleCategory(roleName) === RoleCategory.MANAGEMENT,
        canApprove: normalizeKey(roleName).includes('manager') || normalizeKey(roleName).includes('head'),
        canBillable: !normalizeKey(roleName).includes('manager'),
        status: EntityStatus.ACTIVE,
      },
    });
    businessRoleMap.set(roleName, businessRole.id);
  }
  console.log(`   ✓ ${businessRoleMap.size} business roles`);

  console.log('🧩 Creating teams...');
  const teamEntries = new Map<string, { name: string; departmentId: string }>();
  resourceRows.forEach((row) => {
    const practiceName = (row['Practice'] || '').trim();
    const subPracticeName = (row['Sub-practice'] || '').trim();
    const departmentId = departmentMap.get(practiceName);
    if (!subPracticeName || !departmentId) {
      return;
    }
    const key = `${departmentId}:${normalizeKey(subPracticeName)}`;
    if (!teamEntries.has(key)) {
      teamEntries.set(key, { name: subPracticeName, departmentId });
    }
  });
  for (const [teamKey, teamEntry] of teamEntries) {
    const team = await prisma.team.create({
      data: {
        tenantId: tenant.id,
        departmentId: teamEntry.departmentId,
        code: makeUniqueCode(teamEntry.name, 'TEAM', teamCodes),
        name: teamEntry.name,
        status: EntityStatus.ACTIVE,
      },
    });
    teamMap.set(teamKey, team.id);
  }
  console.log(`   ✓ ${teamMap.size} teams`);

  console.log('🛠️ Creating skills...');
  const skills = new Map<string, string>();
  resourceRows.forEach((row) => {
    parseSkillNames(row).forEach((skillName) => {
      const key = normalizeKey(skillName);
      if (!skills.has(key)) {
        skills.set(key, skillName);
      }
    });
  });
  for (const [skillKey, skillName] of skills) {
    const skill = await prisma.skill.create({
      data: {
        tenantId: tenant.id,
        name: skillName,
      },
    });
    skillMap.set(skillKey, skill.id);
  }
  console.log(`   ✓ ${skillMap.size} skills`);

  console.log('🏢 Creating clients...');
  const clientNames = new Set<string>();
  projectRows.forEach((row) => {
    if (row['Account']?.trim()) {
      clientNames.add(row['Account'].trim());
    }
  });
  resourceRows.forEach((row) => {
    if (row['Client']?.trim()) {
      clientNames.add(row['Client'].trim());
    }
  });
  for (const clientName of clientNames) {
    const client = await prisma.client.create({
      data: {
        tenantId: tenant.id,
        name: clientName,
        code: makeUniqueCode(clientName, 'CLIENT', clientCodes),
        status: ClientStatus.ACTIVE,
        tier: clientName.toLowerCase() === 'newvision' ? ClientTier.STRATEGIC : ClientTier.STANDARD,
        industry: clientName.toLowerCase() === 'newvision' ? 'Technology' : 'Various',
      },
    });
    clientMap.set(clientName, client.id);
  }
  console.log(`   ✓ ${clientMap.size} clients`);

  console.log('📁 Creating projects...');
  const projectMap = new Map<string, string>();
  for (const row of projectRows) {
    const code = row['Project ID']?.trim();
    const name = row['Project name']?.trim();
    if (!code || !name || projectMap.has(code)) {
      continue;
    }

    const clientId = clientMap.get((row['Account'] || '').trim()) || null;
    const project = await prisma.project.create({
      data: {
        tenantId: tenant.id,
        code,
        name,
        clientId,
        type: parseProjectType(row['Project Type (SOW/Staff Augmentation)']),
        billingType: parseBillingType(row['Revenue Type (T&M/Fixed Bid/Fixed Capacity)']),
        status: parseProjectStatus(row['Status2'] || row['Status']),
        startDate: parseDate(row['Project start Date']) || new Date('2024-01-01'),
        endDate: parseDate(row['Project SOW End Date']),
        healthStatus: 'GREEN',
      },
    });
    projectMap.set(code, project.id);
  }

  for (const row of resourceRows) {
    const code = row['Project Code']?.trim();
    const name = row['Project']?.trim();
    if (!code || !name || projectMap.has(code)) {
      continue;
    }

    const clientId = clientMap.get((row['Client'] || '').trim()) || null;
    const project = await prisma.project.create({
      data: {
        tenantId: tenant.id,
        code,
        name,
        clientId,
        type: parseProjectType(row['Project type']),
        billingType: parseBillingType(row['Project type']),
        status: parseProjectStatus(row['Project Status']),
        startDate: parseDate(row['Start Date']) || new Date('2024-01-01'),
        endDate: parseDate(row['End Date']),
        healthStatus: 'GREEN',
      },
    });
    projectMap.set(code, project.id);
  }
  console.log(`   ✓ ${projectMap.size} projects`);

  console.log('👥 Creating resources...');
  const employeeRows = new Map<string, Record<string, string>>();
  for (const row of resourceRows) {
    const employeeId = row['Emp Id']?.trim();
    if (employeeId && !employeeRows.has(employeeId)) {
      employeeRows.set(employeeId, row);
    }
  }

  const resourceByEmployeeId = new Map<string, string>();
  const resourceByName = new Map<string, string>();
  const resourceByNormalizedName = new Map<string, string>();
  const managerNames = new Set<string>();
  const usedEmails = new Set<string>();

  for (const [employeeId, row] of employeeRows) {
    const fullName = (row['Full Name'] || employeeId).trim();
    const { firstName, lastName } = splitName(fullName);
    const practiceName = (row['Practice'] || '').trim();
    const departmentId = departmentMap.get(practiceName) || null;
    const parsedGradeBand = parseGradeBand(row['Experience Range']);
    const resource = await prisma.resource.create({
      data: {
        tenantId: tenant.id,
        employeeId,
        firstName: firstName.slice(0, 100),
        lastName: lastName.slice(0, 100),
        email: makeUniqueEmail(employeeId, row['email ID'], usedEmails),
        designation: (row['Role'] || 'Employee').trim().slice(0, 100),
        band: parsedGradeBand.legacyBand.slice(0, 10),
        employmentType: parseEmploymentType(row['FTE/ Consultant']),
        status: parseResourceStatus(row['Active']),
        dateOfJoining: parseDate(row['DOJ']) || new Date('2024-01-01'),
        practiceId: practiceMap.get((row['Practice'] || '').trim()) || null,
        locationId: locationMap.get((row['Location'] || '').trim()) || null,
        departmentId,
        gradeBandId: gradeBandMap.get(parsedGradeBand.code) || null,
        capacity: 100,
        tags: [],
      },
    });
    resourceByEmployeeId.set(employeeId, resource.id);
    resourceByName.set(fullName, resource.id);
    resourceByNormalizedName.set(normalizeKey(fullName), resource.id);

    if (row['L1 Manager']?.trim()) {
      managerNames.add(row['L1 Manager'].trim());
    }
    if (row['Practice Head']?.trim()) {
      managerNames.add(row['Practice Head'].trim());
    }
    if (row['Project Manager']?.trim()) {
      managerNames.add(row['Project Manager'].trim());
    }
  }

  projectRows.forEach((row) => {
    if (row['Project Manager']?.trim()) {
      managerNames.add(row['Project Manager'].trim());
    }
  });

  for (const managerName of managerNames) {
    if (resourceByName.has(managerName)) {
      continue;
    }

    const { firstName, lastName } = splitName(managerName);
    const employeeId = `MGR-${managerName.replace(/\s+/g, '-').slice(0, 40)}`;
    const resource = await prisma.resource.create({
      data: {
        tenantId: tenant.id,
        employeeId,
        firstName: firstName.slice(0, 100),
        lastName: lastName.slice(0, 100),
        email: makeUniqueEmail(employeeId, undefined, usedEmails),
        designation: 'Manager',
        band: 'Unknown',
        employmentType: EmploymentType.FTE,
        status: ResourceStatus.ACTIVE,
        dateOfJoining: new Date('2024-01-01'),
        capacity: 100,
        tags: [],
        customFields: { syntheticManager: true, source: 'seed-rmg-csv' },
      },
    });
    resourceByName.set(managerName, resource.id);
    resourceByNormalizedName.set(normalizeKey(managerName), resource.id);
  }

  let managerLinks = 0;
  for (const [employeeId, row] of employeeRows) {
    const resourceId = resourceByEmployeeId.get(employeeId);
    const managerId = resourceByName.get((row['L1 Manager'] || '').trim());
    if (!resourceId || !managerId) {
      continue;
    }

    await prisma.resource.update({
      where: { id: resourceId },
      data: { managerId },
    });
    managerLinks += 1;
  }

  console.log(`   ✓ ${resourceByEmployeeId.size} primary resources`);
  console.log(`   ✓ ${resourceByName.size - resourceByEmployeeId.size} ghost manager resources`);
  console.log(`   ✓ ${managerLinks} manager links`);

  console.log('🏛️ Linking practice and department heads...');
  let practiceHeadsLinked = 0;
  for (const practiceName of practices) {
    const sourceRow = resourceRows.find((row) => (row['Practice'] || '').trim() === practiceName && row['Practice Head']?.trim());
    const practiceHeadId = sourceRow ? resourceByNormalizedName.get(normalizeKey(sourceRow['Practice Head'])) : undefined;
    if (!practiceHeadId) {
      continue;
    }
    const practiceId = practiceMap.get(practiceName);
    const departmentId = departmentMap.get(practiceName);
    if (practiceId) {
      await prisma.practice.update({ where: { id: practiceId }, data: { headId: practiceHeadId } });
    }
    if (departmentId) {
      await prisma.department.update({ where: { id: departmentId }, data: { headId: practiceHeadId } });
    }
    practiceHeadsLinked += 1;
  }
  console.log(`   ✓ ${practiceHeadsLinked} practice/department heads linked`);

  console.log('👥 Assigning business roles, team memberships, and resource skills...');
  let businessRoleAssignments = 0;
  let teamMemberships = 0;
  let resourceSkillAssignments = 0;
  const seenRoleAssignments = new Set<string>();
  const seenTeamMemberships = new Set<string>();
  const seenResourceSkills = new Set<string>();

  for (const [employeeId, row] of employeeRows) {
    const resourceId = resourceByEmployeeId.get(employeeId);
    if (!resourceId) {
      continue;
    }

    const businessRoleName = normalizeBusinessRoleName(row['Role']);
    const businessRoleId = businessRoleMap.get(businessRoleName);
    if (businessRoleId) {
      const key = `${resourceId}:${businessRoleId}`;
      if (!seenRoleAssignments.has(key)) {
        await prisma.resourceBusinessRole.create({
          data: {
            resourceId,
            businessRoleId,
            assignedBy: adminUser.id,
            isPrimary: true,
            effectiveFrom: new Date('2024-01-01'),
          },
        });
        seenRoleAssignments.add(key);
        businessRoleAssignments += 1;
      }
    }

    const practiceName = (row['Practice'] || '').trim();
    const subPracticeName = (row['Sub-practice'] || '').trim();
    const departmentId = departmentMap.get(practiceName);
    const teamId = departmentId && subPracticeName ? teamMap.get(`${departmentId}:${normalizeKey(subPracticeName)}`) : undefined;
    if (teamId) {
      const key = `${teamId}:${resourceId}`;
      if (!seenTeamMemberships.has(key)) {
        await prisma.teamMember.create({
          data: {
            teamId,
            resourceId,
            role: (row['Role'] || '').trim().slice(0, 100) || null,
            isPrimary: true,
            joinedAt: parseDate(row['DOJ']) || new Date('2024-01-01'),
          },
        });
        seenTeamMemberships.add(key);
        teamMemberships += 1;
      }
    }

    for (const skillName of parseSkillNames(row)) {
      const skillId = skillMap.get(normalizeKey(skillName));
      if (!skillId) {
        continue;
      }
      const key = `${resourceId}:${skillId}`;
      if (seenResourceSkills.has(key)) {
        continue;
      }
      await prisma.resourceSkill.create({
        data: {
          resourceId,
          skillId,
          proficiency: Proficiency.INTERMEDIATE,
          lastUsed: parseDate(row['End Date']) || parseDate(row['Start Date']) || parseDate(row['DOJ']) || undefined,
        },
      });
      seenResourceSkills.add(key);
      resourceSkillAssignments += 1;
    }
  }

  console.log(`   ✓ ${businessRoleAssignments} business role assignments`);
  console.log(`   ✓ ${teamMemberships} team memberships`);
  console.log(`   ✓ ${resourceSkillAssignments} resource skill assignments`);

  console.log('📁 Linking project managers...');
  let projectManagerLinks = 0;
  for (const row of projectRows) {
    const projectId = projectMap.get((row['Project ID'] || '').trim());
    const managerId = resourceByNormalizedName.get(normalizeKey(row['Project Manager']));
    if (!projectId || !managerId) {
      continue;
    }
    await prisma.project.update({ where: { id: projectId }, data: { managerId } });
    projectManagerLinks += 1;
  }
  console.log(`   ✓ ${projectManagerLinks} project managers linked`);

  console.log('📊 Creating allocations...');
  let allocationCount = 0;
  let activeAllocationCount = 0;
  let completedAllocationCount = 0;
  let confirmedAllocationCount = 0;
  let skippedAllocations = 0;
  const processedAllocations = new Set<string>();

  for (const row of resourceRows) {
    const employeeId = row['Emp Id']?.trim();
    const projectCode = row['Project Code']?.trim();
    const resourceId = employeeId ? resourceByEmployeeId.get(employeeId) : undefined;
    const projectId = projectCode ? projectMap.get(projectCode) : undefined;

    if (!resourceId || !projectId) {
      skippedAllocations += 1;
      continue;
    }

    const startDate = parseDate(row['Start Date']) || parseDate(row['DOJ']) || new Date('2024-01-01');
    const endDate = parseDate(row['End Date']) || new Date('2026-12-31');
    const percentage = parseAllocationPercentage(row['Allocation%']);
    const status = getAllocationStatus(startDate, endDate, row['Status'], row['Active']);
    const role = (row['Role'] || 'Resource').trim().slice(0, 100);
    const isBillable = (row['Billable'] || '').trim().toUpperCase() === 'Y';
    const allocationKey = [resourceId, projectId, startDate.toISOString(), endDate.toISOString(), percentage].join(':');

    if (processedAllocations.has(allocationKey)) {
      skippedAllocations += 1;
      continue;
    }
    processedAllocations.add(allocationKey);

    await prisma.allocation.create({
      data: {
        tenantId: tenant.id,
        resourceId,
        projectId,
        role,
        percentage,
        startDate,
        endDate,
        status,
        isBillable,
      },
    });

    allocationCount += 1;
    if (status === AllocationStatus.ACTIVE) {
      activeAllocationCount += 1;
    } else if (status === AllocationStatus.COMPLETED) {
      completedAllocationCount += 1;
    } else if (status === AllocationStatus.CONFIRMED) {
      confirmedAllocationCount += 1;
    }
  }

  console.log(`   ✓ ${allocationCount} allocations`);
  console.log(`   ✓ ${activeAllocationCount} active`);
  console.log(`   ✓ ${completedAllocationCount} completed`);
  console.log(`   ✓ ${confirmedAllocationCount} confirmed`);
  console.log(`   ✓ ${skippedAllocations} skipped`);

  const pmoRole = await roleService.ensureNewVisionPmoBaseline(tenant.id);
  if (pmoRole) {
    console.log('   ✓ Ensured PMO system role for NewVision');
  }

  console.log('✅ CSV seed complete');
  console.log(`   Tenant: ${tenant.name}`);
  console.log(`   Grade bands: ${gradeBandMap.size}`);
  console.log(`   Business roles: ${businessRoleMap.size}`);
  console.log(`   Departments: ${departmentMap.size}`);
  console.log(`   Teams: ${teamMap.size}`);
  console.log(`   Skills: ${skillMap.size}`);
  console.log(`   Resources: ${resourceByEmployeeId.size}`);
  console.log(`   Clients: ${clientMap.size}`);
  console.log(`   Projects: ${projectMap.size}`);
  console.log(`   Allocations: ${allocationCount}`);
}

main()
  .catch((error) => {
    console.error('❌ CSV seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });