import { PrismaClient, EmploymentType, ResourceStatus, ClientStatus, ClientTier, ProjectType, ProjectStatus, AllocationStatus, PracticeStatus, LocationType, LocationStatus, Proficiency, BillingType } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import argon2 from 'argon2';
import { roleService } from '../src/modules/roles/role.service';

const prisma = new PrismaClient();

// ============================================================================
// CSV Parser (handles Windows line endings and quoted fields)
// ============================================================================

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  
  // Skip first row (metadata) and get headers from second row
  const headerLine = lines[1];
  if (!headerLine) return [];
  
  const headers = parseCSVLine(headerLine).map(h => h.trim());
  const rows: Record<string, string>[] = [];
  
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = parseCSVLine(line);
    const row: Record<string, string> = {};
    
    headers.forEach((header, idx) => {
      row[header] = (values[idx] || '').trim();
    });
    
    // Skip rows without Emp Id or invalid ones
    if (row['Emp Id'] && !row['Emp Id'].startsWith(' ')) {
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

// ============================================================================
// Date Parser
// ============================================================================

function parseDate(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;
  
  const monthMap: Record<string, number> = {
    'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
    'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
  };
  
  // Try DD-Mon-YY format (e.g., 20-Jun-23)
  const match1 = dateStr.match(/^(\d{1,2})-(\w{3})-(\d{2})$/);
  if (match1) {
    const day = parseInt(match1[1]);
    const month = monthMap[match1[2]];
    let year = parseInt(match1[3]);
    year = year < 50 ? 2000 + year : 1900 + year;
    if (month !== undefined) {
      return new Date(year, month, day);
    }
  }
  
  // Try standard Date parsing
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date;
  }
  
  return null;
}

// ============================================================================
// Skill Normalizer - Clean up and categorize skills
// ============================================================================

function normalizeSkill(skill: string): { name: string; category: string } {
  if (!skill) return { name: 'General', category: 'Technical' };
  
  const skillLower = skill.toLowerCase();
  
  // Determine category based on skill content
  let category = 'Technical';
  if (skillLower.includes('qa') || skillLower.includes('test') || skillLower.includes('assurance')) {
    category = 'Quality Assurance';
  } else if (skillLower.includes('.net') || skillLower.includes('c#') || skillLower.includes('asp')) {
    category = '.NET Development';
  } else if (skillLower.includes('java') && !skillLower.includes('javascript')) {
    category = 'Java Development';
  } else if (skillLower.includes('react') || skillLower.includes('angular') || skillLower.includes('vue')) {
    category = 'Frontend Development';
  } else if (skillLower.includes('python') || skillLower.includes('data') || skillLower.includes('ml')) {
    category = 'Data & AI';
  } else if (skillLower.includes('devops') || skillLower.includes('azure') || skillLower.includes('aws')) {
    category = 'DevOps & Cloud';
  } else if (skillLower.includes('mobile') || skillLower.includes('ios') || skillLower.includes('android')) {
    category = 'Mobile Development';
  } else if (skillLower.includes('hr') || skillLower.includes('recruit')) {
    category = 'Human Resources';
  } else if (skillLower.includes('sales') || skillLower.includes('market')) {
    category = 'Sales & Marketing';
  } else if (skillLower.includes('finance') || skillLower.includes('account')) {
    category = 'Finance';
  } else if (skillLower.includes('admin')) {
    category = 'Administration';
  } else if (skillLower.includes('cc&b') || skillLower.includes('util')) {
    category = 'Utilities';
  } else if (skillLower.includes('rpa') || skillLower.includes('automat')) {
    category = 'RPA & Automation';
  }
  
  // Clean up the skill name (truncate if too long)
  const name = skill.substring(0, 100);
  
  return { name, category };
}

// ============================================================================
// Project Type Mapper
// ============================================================================

function mapProjectType(csvType: string): ProjectType {
  const type = csvType?.toUpperCase().trim();
  switch (type) {
    case 'T&M': return 'BILLABLE';
    case 'FB': return 'BILLABLE';
    case 'FMB': return 'BILLABLE';
    case 'FMB+T&M': return 'BILLABLE';
    case 'INTERNAL': return 'INTERNAL';
    default: return 'BILLABLE';
  }
}

function mapBillingType(csvType: string): BillingType {
  const type = csvType?.toUpperCase().trim();
  switch (type) {
    case 'T&M': return BillingType.TM;
    case 'FB': return BillingType.FIXED;
    case 'FMB': return BillingType.FIXED;
    case 'FMB+T&M': return BillingType.MILESTONE;
    default: return BillingType.TM;
  }
}

async function resetDatabase() {
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> '_prisma_migrations'
  `;

  if (tables.length === 0) {
    return;
  }

  const tableNames = tables
    .map(({ tablename }) => `"public"."${tablename}"`)
    .join(', ');

  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tableNames} RESTART IDENTITY CASCADE`);
}

// ============================================================================
// Main Seed Function
// ============================================================================

async function main() {
  console.log('🌱 Seeding database with real CSV data...\n');
  console.log('='.repeat(60));
  
  const csvPath = path.join(__dirname, '../../../Analysis Copy RMG_Master_File V2.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.error('❌ CSV file not found at:', csvPath);
    process.exit(1);
  }
  
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCSV(csvContent);
  
  console.log(`📊 Parsed ${rows.length} data rows from CSV\n`);
  
  // -------------------------------------------------------------------------
  // Clean existing data
  // -------------------------------------------------------------------------
  console.log('🧹 Cleaning existing data...');
  await resetDatabase();
  
  console.log('   ✓ Cleaned all tables\n');
  
  // -------------------------------------------------------------------------
  // Create tenant
  // -------------------------------------------------------------------------
  console.log('🏢 Creating tenant...');
  const tenant = await prisma.tenant.create({
    data: {
      name: 'NewVision Software Pvt. Ltd.',
      slug: 'newvision',
      tier: 'ENTERPRISE',
      status: 'ACTIVE',
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
  console.log(`   ✓ Created tenant: ${tenant.name}\n`);
  
  // -------------------------------------------------------------------------
  // Extract unique values from CSV
  // -------------------------------------------------------------------------
  console.log('📋 Analyzing CSV data...');
  
  const uniqueLocations = new Set<string>();
  const uniquePractices = new Set<string>();
  const uniqueSkills = new Map<string, { name: string; category: string }>();
  const uniqueClients = new Map<string, { name: string; isInternal: boolean }>();
  const uniqueProjects = new Map<string, { 
    code: string; name: string; client: string; type: string; status: string; billingType: string 
  }>();
  
  // First pass: collect unique values
  rows.forEach(row => {
    const location = row['Location']?.trim();
    const practice = row['Practice']?.trim();
    const skill = row['Skill']?.trim();
    const client = row['Client']?.trim();
    const projectCode = row['Project Code']?.trim();
    const projectName = row['Project']?.trim();
    const projectType = row['Project type']?.trim();
    const projectStatus = row['Project Status']?.trim();
    
    if (location) uniqueLocations.add(location);
    if (practice) uniquePractices.add(practice);
    if (skill) {
      const normalized = normalizeSkill(skill);
      uniqueSkills.set(skill, normalized);
    }
    if (client) {
      uniqueClients.set(client, {
        name: client,
        isInternal: client.toLowerCase() === 'newvision'
      });
    }
    if (projectCode && projectName) {
      uniqueProjects.set(projectCode, {
        code: projectCode,
        name: projectName,
        client: client || 'NewVision',
        type: projectType || 'T&M',
        status: projectStatus || 'Active',
        billingType: projectType || 'T&M'
      });
    }
  });
  
  console.log(`   Locations: ${uniqueLocations.size}`);
  console.log(`   Practices: ${uniquePractices.size}`);
  console.log(`   Skills: ${uniqueSkills.size}`);
  console.log(`   Clients: ${uniqueClients.size}`);
  console.log(`   Projects: ${uniqueProjects.size}\n`);
  
  // -------------------------------------------------------------------------
  // Create Locations
  // -------------------------------------------------------------------------
  console.log('📍 Creating locations...');
  const locationMap = new Map<string, string>();
  
  const locationCodes: Record<string, string> = {
    'Pune': 'PNE',
    'Hyderabad': 'HYD',
    'Bhopal': 'BPL',
    'Indore': 'IDR',
    'Dubai': 'DXB',
    'USA': 'USA',
    'USA (Atlanta)': 'ATL',
    'Egypt': 'EGY',
  };
  
  for (const loc of uniqueLocations) {
    if (!loc) continue;
    const code = locationCodes[loc] || loc.substring(0, 3).toUpperCase();
    const isOnshore = !['USA', 'USA (Atlanta)', 'Dubai', 'Egypt'].includes(loc);
    
    try {
      const location = await prisma.location.create({
        data: {
          tenantId: tenant.id,
          name: `${loc} Office`,
          code,
          type: LocationType.OFFICE,
          country: isOnshore ? 'IN' : (loc.includes('USA') ? 'US' : loc.substring(0, 2).toUpperCase()),
          timezone: isOnshore ? 'Asia/Kolkata' : (loc.includes('USA') ? 'America/New_York' : 'UTC'),
          isOnshore,
          status: LocationStatus.ACTIVE,
          address: isOnshore ? { city: loc, state: loc, country: 'India' } : undefined,
        },
      });
      locationMap.set(loc, location.id);
    } catch (err: any) {
      console.log(`   Warning: Could not create location ${loc}: ${err.message}`);
    }
  }
  console.log(`   ✓ Created ${locationMap.size} locations\n`);
  
  // -------------------------------------------------------------------------
  // Create Practices
  // -------------------------------------------------------------------------
  console.log('🏛️ Creating practices...');
  const practiceMap = new Map<string, string>();
  
  const practiceCodes: Record<string, string> = {
    'Digital Assurance': 'DA',
    'Microsoft': 'MSFT',
    'Data': 'DATA',
    'Managed Services': 'MNS',
    'Digital Product Studio': 'DPS',
    'Utilities': 'UTL',
    'HR': 'HR',
    'Sales and Marketing': 'SM',
    'Java': 'JAVA',
    'RPA': 'RPA',
    'Delivery Excellence': 'DE',
    'LAMP': 'LAMP',
    'Business Excellence': 'BE',
    'Mobility': 'MOB',
    'Internal IT': 'IT',
    'Administration': 'ADM',
    'Finance': 'FIN',
    'Management': 'MGT',
  };
  
  let pracCounter = 1;
  for (const prac of uniquePractices) {
    if (!prac) continue;
    const code = practiceCodes[prac] || `P${String(pracCounter++).padStart(2, '0')}`;
    
    try {
      const practice = await prisma.practice.create({
        data: {
          tenantId: tenant.id,
          name: prac,
          code,
          targetUtilization: 85,
          status: PracticeStatus.ACTIVE,
        },
      });
      practiceMap.set(prac, practice.id);
    } catch (err: any) {
      console.log(`   Warning: Could not create practice ${prac}: ${err.message}`);
    }
  }
  console.log(`   ✓ Created ${practiceMap.size} practices\n`);
  
  // -------------------------------------------------------------------------
  // Create Skill Categories and Skills
  // -------------------------------------------------------------------------
  console.log('💡 Creating skill categories and skills...');
  const skillCategoryMap = new Map<string, string>();
  const skillMap = new Map<string, string>();
  
  // Get unique categories
  const categories = new Set<string>();
  uniqueSkills.forEach(s => categories.add(s.category));
  
  // Create categories
  for (const catName of categories) {
    try {
      const category = await prisma.skillCategory.create({
        data: {
          tenantId: tenant.id,
          name: catName,
        },
      });
      skillCategoryMap.set(catName, category.id);
    } catch (err: any) {
      // Ignore duplicates
    }
  }
  console.log(`   ✓ Created ${skillCategoryMap.size} skill categories`);
  
  // Create skills
  for (const [originalName, normalized] of uniqueSkills) {
    const categoryId = skillCategoryMap.get(normalized.category);
    
    try {
      const skill = await prisma.skill.create({
        data: {
          tenantId: tenant.id,
          categoryId,
          name: normalized.name,
          description: originalName.length > 100 ? originalName.substring(0, 500) : null,
        },
      });
      skillMap.set(originalName, skill.id);
    } catch (err: any) {
      // Handle duplicates by finding existing
      const existing = await prisma.skill.findFirst({
        where: { tenantId: tenant.id, name: normalized.name }
      });
      if (existing) {
        skillMap.set(originalName, existing.id);
      }
    }
  }
  console.log(`   ✓ Created ${skillMap.size} skills\n`);
  
  // -------------------------------------------------------------------------
  // Create Clients
  // -------------------------------------------------------------------------
  console.log('🏢 Creating clients...');
  const clientMap = new Map<string, string>();
  
  for (const [name, info] of uniqueClients) {
    if (!name) continue;
    
    const code = name.substring(0, 10).toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    try {
      const client = await prisma.client.create({
        data: {
          tenantId: tenant.id,
          name: name,
          code: code || 'CLT',
          status: ClientStatus.ACTIVE,
          tier: info.isInternal ? ClientTier.STRATEGIC : ClientTier.STANDARD,
          industry: info.isInternal ? 'Technology' : 'Various',
        },
      });
      clientMap.set(name, client.id);
    } catch (err: any) {
      console.log(`   Warning: Could not create client ${name}: ${err.message}`);
    }
  }
  console.log(`   ✓ Created ${clientMap.size} clients\n`);
  
  // -------------------------------------------------------------------------
  // Create Projects
  // -------------------------------------------------------------------------
  console.log('📁 Creating projects...');
  const projectMap = new Map<string, string>();
  
  for (const [code, proj] of uniqueProjects) {
    const clientId = clientMap.get(proj.client);
    if (!clientId) {
      // Use NewVision as default client for internal projects
      const defaultClientId = clientMap.get('NewVision');
      if (!defaultClientId) continue;
    }
    
    const projectStatus: ProjectStatus = 
      proj.status?.toLowerCase().includes('billable') ? 'ACTIVE' :
      proj.status?.toLowerCase().includes('complet') ? 'COMPLETED' :
      proj.status?.toLowerCase().includes('hold') ? 'ON_HOLD' : 'ACTIVE';
    
    try {
      const project = await prisma.project.create({
        data: {
          tenantId: tenant.id,
          clientId: clientId || clientMap.get('NewVision')!,
          code,
          name: proj.name.substring(0, 200),
          type: mapProjectType(proj.type),
          billingType: mapBillingType(proj.billingType),
          status: projectStatus,
          startDate: new Date('2024-01-01'),
          healthStatus: 'GREEN',
        },
      });
      projectMap.set(code, project.id);
    } catch (err: any) {
      // Handle unique constraint violations
      const existing = await prisma.project.findFirst({
        where: { tenantId: tenant.id, code }
      });
      if (existing) {
        projectMap.set(code, existing.id);
      }
    }
  }
  console.log(`   ✓ Created ${projectMap.size} projects\n`);
  
  // -------------------------------------------------------------------------
  // Create Roles
  // -------------------------------------------------------------------------
  console.log('🔐 Creating roles...');
  const adminRole = await prisma.role.create({
    data: {
      tenantId: tenant.id,
      name: 'Admin',
      description: 'Full system administrator access',
      permissions: ['*'],
      isSystem: true,
      level: 0,
    },
  });
  
  const pmRole = await prisma.role.create({
    data: {
      tenantId: tenant.id,
      name: 'Project Manager',
      description: 'Manage projects and allocations',
      permissions: ['project:*', 'allocation:*', 'resource:read', 'client:read', 'report:read', 'timesheet:*'],
      isSystem: true,
      level: 2,
    },
  });
  
  const rmRole = await prisma.role.create({
    data: {
      tenantId: tenant.id,
      name: 'Resource Manager',
      description: 'Manage resources and bench',
      permissions: ['resource:*', 'allocation:*', 'project:read', 'client:read', 'report:read', 'bench:*'],
      isSystem: true,
      level: 2,
    },
  });
  
  await prisma.role.create({
    data: {
      tenantId: tenant.id,
      name: 'User',
      description: 'Basic user access',
      permissions: ['resource:read', 'project:read', 'timesheet:own'],
      isSystem: true,
      level: 3,
    },
  });
  
  console.log('   ✓ Created 4 roles\n');
  
  // -------------------------------------------------------------------------
  // Create Resources from CSV
  // -------------------------------------------------------------------------
  console.log('👥 Creating resources...');
  const resourceMap = new Map<string, string>();
  const processedEmpIds = new Set<string>();
  const emailSet = new Set<string>();
  
  // First pass: create all unique resources
  for (const row of rows) {
    const empId = row['Emp Id']?.trim();
    if (!empId || processedEmpIds.has(empId)) continue;
    processedEmpIds.add(empId);
    
    const fullName = row['Full Name']?.trim() || empId;
    const nameParts = fullName.split(/\s+/);
    const firstName = (nameParts[0] || 'Unknown').substring(0, 100);
    const lastName = (nameParts.slice(1).join(' ') || 'User').substring(0, 100);
    
    const isActive = row['Active']?.toUpperCase() === 'ACTIVE';
    const empType = row['FTE/ Consultant']?.toUpperCase() || '';
    const isConsultant = empType.includes('CONSULT');
    
    // Parse date of joining
    const doj = parseDate(row['DOJ']) || new Date('2024-01-01');
    
    // Clean email - handle duplicates
    let email = row['email ID']?.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      email = `${empId.toLowerCase()}@newvision.in`;
    }
    // Handle duplicate emails by appending empId
    if (emailSet.has(email)) {
      email = `${empId.toLowerCase()}.${email}`;
    }
    emailSet.add(email);
    email = email.substring(0, 255);
    
    // Map designation/role
    const designation = (row['Role'] || 'Engineer').substring(0, 100);
    
    // Determine band from experience or role
    const exp = parseFloat(row[' Relevant Experience '] || '0') || 0;
    let band = 'L3';
    if (designation.toLowerCase().includes('director') || exp > 15) band = 'L6';
    else if (designation.toLowerCase().includes('manager') || exp > 10) band = 'L5';
    else if (designation.toLowerCase().includes('lead') || designation.toLowerCase().includes('architect') || exp > 7) band = 'L4';
    else if (designation.toLowerCase().includes('senior') || exp > 4) band = 'L3';
    else if (exp > 2) band = 'L2';
    else band = 'L1';
    
    try {
      const resource = await prisma.resource.create({
        data: {
          tenantId: tenant.id,
          employeeId: empId.substring(0, 50),
          firstName,
          lastName,
          email,
          designation,
          band,
          employmentType: isConsultant ? EmploymentType.CONTRACTOR : EmploymentType.FTE,
          status: isActive ? ResourceStatus.ACTIVE : ResourceStatus.INACTIVE,
          dateOfJoining: doj,
          practiceId: practiceMap.get(row['Practice']?.trim() || '') || null,
          locationId: locationMap.get(row['Location']?.trim() || '') || null,
          capacity: 100,
          tags: [],
        },
      });
      
      resourceMap.set(empId, resource.id);
      
      // Assign skill if present
      const skillName = row['Skill']?.trim();
      const skillId = skillMap.get(skillName || '');
      if (skillId) {
        try {
          await prisma.resourceSkill.create({
            data: {
              resourceId: resource.id,
              skillId,
              proficiency: exp > 7 ? Proficiency.EXPERT : exp > 4 ? Proficiency.ADVANCED : exp > 2 ? Proficiency.INTERMEDIATE : Proficiency.BEGINNER,
              yearsExp: exp,
            },
          });
        } catch {
          // Skill already assigned
        }
      }
    } catch (err: any) {
      if (resourceMap.size < 5) {
        console.log(`   Warning: ${empId}: ${err.message?.substring(0, 80)}`);
      }
    }
  }
  
  console.log(`   ✓ Created ${resourceMap.size} unique resources\n`);
  
  // -------------------------------------------------------------------------
  // Create Allocations
  // -------------------------------------------------------------------------
  console.log('📊 Creating allocations...');
  let allocationCount = 0;
  let skippedCount = 0;
  const processedAllocations = new Set<string>();
  
  for (const row of rows) {
    const empId = row['Emp Id']?.trim();
    const projectCode = row['Project Code']?.trim();
    const status = row['Status']?.trim();
    
    // Only create allocations for current assignments
    if (status?.toLowerCase() !== 'current') {
      skippedCount++;
      continue;
    }
    
    const resourceId = resourceMap.get(empId || '');
    const projectId = projectMap.get(projectCode || '');
    
    if (!resourceId || !projectId) {
      skippedCount++;
      continue;
    }
    
    // Prevent duplicate allocations
    const allocKey = `${resourceId}-${projectId}`;
    if (processedAllocations.has(allocKey)) {
      skippedCount++;
      continue;
    }
    processedAllocations.add(allocKey);
    
    const allocationPct = parseInt(row['Allocation%']?.replace(/[^0-9]/g, '') || '100') || 100;
    const isBillable = row['Billable (Y/N)']?.toUpperCase() === 'Y';
    
    const startDate = parseDate(row['Start Date']) || new Date('2024-01-01');
    const endDate = parseDate(row['End Date']) || new Date('2025-12-31');
    const role = (row['Role'] || 'Developer').substring(0, 100);
    
    try {
      await prisma.allocation.create({
        data: {
          tenantId: tenant.id,
          resourceId,
          projectId,
          role,
          startDate,
          endDate,
          percentage: Math.min(allocationPct, 100),
          isBillable,
          status: AllocationStatus.ACTIVE,
        },
      });
      allocationCount++;
    } catch (err: any) {
      skippedCount++;
    }
  }
  
  console.log(`   ✓ Created ${allocationCount} allocations (skipped ${skippedCount})\n`);
  
  // -------------------------------------------------------------------------
  // Create Admin Users
  // -------------------------------------------------------------------------
  console.log('👤 Creating system users...');
  // M-11: Use environment variable for seed password
  const csvSeedPassword = process.env.SEED_ADMIN_PASSWORD || 'Password123!@#';
  if (!process.env.SEED_ADMIN_PASSWORD) {
    console.warn('⚠️  WARNING: Using default seed password. Set SEED_ADMIN_PASSWORD env var for production seeding.');
  }
  const hashedPassword = await argon2.hash(csvSeedPassword);
  
  const adminUser = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: 'admin@newvision.in',
      passwordHash: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      status: 'ACTIVE',
      emailVerified: true,
    },
  });
  
  await prisma.userRole.create({
    data: {
      userId: adminUser.id,
      roleId: adminRole.id,
      assignedBy: adminUser.id,
    },
  });
  
  const rmUser = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: 'rm@newvision.in',
      passwordHash: hashedPassword,
      firstName: 'Resource',
      lastName: 'Manager',
      status: 'ACTIVE',
      emailVerified: true,
    },
  });
  
  await prisma.userRole.create({
    data: {
      userId: rmUser.id,
      roleId: rmRole.id,
      assignedBy: adminUser.id,
    },
  });
  
  const pmUser = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: 'pm@newvision.in',
      passwordHash: hashedPassword,
      firstName: 'Project',
      lastName: 'Manager',
      status: 'ACTIVE',
      emailVerified: true,
    },
  });
  
  await prisma.userRole.create({
    data: {
      userId: pmUser.id,
      roleId: pmRole.id,
      assignedBy: adminUser.id,
    },
  });
  
  console.log('   ✓ Created 3 system users\n');
  
  // -------------------------------------------------------------------------
  // Create Default Currencies
  // -------------------------------------------------------------------------
  console.log('💰 Creating currencies...');
  const currencies = [
    { code: 'INR', name: 'Indian Rupee', symbol: '₹', isBase: true },
    { code: 'USD', name: 'US Dollar', symbol: '$', isBase: false },
    { code: 'EUR', name: 'Euro', symbol: '€', isBase: false },
    { code: 'GBP', name: 'British Pound', symbol: '£', isBase: false },
    { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', isBase: false },
  ];
  
  for (const curr of currencies) {
    await prisma.currency.create({
      data: {
        tenantId: tenant.id,
        code: curr.code,
        name: curr.name,
        symbol: curr.symbol,
        isBase: curr.isBase,
      },
    });
  }
  console.log('   ✓ Created 5 currencies\n');

  const pmoRole = await roleService.ensureNewVisionPmoBaseline(tenant.id);
  if (pmoRole) {
    console.log('   ✓ Ensured PMO system role for NewVision\n');
  }
  
  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log('='.repeat(60));
  console.log('✅ Seeding complete!\n');
  console.log('📊 SUMMARY:');
  console.log(`   Tenant:      ${tenant.name}`);
  console.log(`   Locations:   ${locationMap.size}`);
  console.log(`   Practices:   ${practiceMap.size}`);
  console.log(`   Skills:      ${skillMap.size} (${skillCategoryMap.size} categories)`);
  console.log(`   Clients:     ${clientMap.size}`);
  console.log(`   Projects:    ${projectMap.size}`);
  console.log(`   Resources:   ${resourceMap.size}`);
  console.log(`   Allocations: ${allocationCount}`);
  console.log(`   Users:       3 system users`);
  console.log(`   Currencies:  5`);
  
  console.log('\n📝 LOGIN CREDENTIALS:');
  console.log('   Admin:    admin@newvision.in / Password123!@#');
  console.log('   RM:       rm@newvision.in / Password123!@#');
  console.log('   PM:       pm@newvision.in / Password123!@#');
  console.log('='.repeat(60));
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
