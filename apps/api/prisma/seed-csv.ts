import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

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
    
    // Skip rows without Emp Id
    if (row['Emp Id']) {
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
// Hash password (simple for seeding)
// ============================================================================

async function hashPassword(password: string): Promise<string> {
  // Using argon2 would be better, but for seeding we'll use a simple hash
  // In production, the auth service uses argon2
  const { hash } = await import('argon2');
  return hash(password);
}

// ============================================================================
// Main Seed Function
// ============================================================================

async function main() {
  console.log('🌱 Seeding database with real CSV data...\n');
  
  const csvPath = path.join(__dirname, '../../../Analysis Copy RMG_Master_File V2.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.error('❌ CSV file not found at:', csvPath);
    process.exit(1);
  }
  
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCSV(csvContent);
  
  console.log(`📊 Found ${rows.length} rows in CSV\n`);
  
  // Clean existing data
  console.log('🧹 Cleaning existing data...');
  await prisma.auditLog.deleteMany();
  await prisma.timesheetEntry.deleteMany();
  await prisma.timesheetPeriod.deleteMany();
  await prisma.allocation.deleteMany();
  await prisma.resourceSkill.deleteMany();
  await prisma.project.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.opportunity.deleteMany();
  await prisma.client.deleteMany();
  await prisma.skill.deleteMany();
  await prisma.skillCategory.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.user.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.role.deleteMany();
  await prisma.practice.deleteMany();
  await prisma.location.deleteMany();
  await prisma.tenant.deleteMany();
  
  // Create tenant
  console.log('🏢 Creating tenant...');
  const tenant = await prisma.tenant.create({
    data: {
      name: 'NewVision Software',
      slug: 'newvision',
      settings: {},
      status: 'ACTIVE',
    },
  });
  
  // Extract unique values from CSV
  const uniqueLocations = new Set<string>();
  const uniquePractices = new Set<string>();
  const uniqueSkills = new Set<string>();
  const uniqueClients = new Set<string>();
  const uniqueProjects = new Map<string, { code: string; name: string; client: string; type: string; status: string }>();
  
  rows.forEach(row => {
    if (row['Location']) uniqueLocations.add(row['Location']);
    if (row['Practice']) uniquePractices.add(row['Practice']);
    if (row['Skill']) uniqueSkills.add(row['Skill']);
    if (row['Client']) uniqueClients.add(row['Client']);
    if (row['Project Code'] && row['Project']) {
      uniqueProjects.set(row['Project Code'], {
        code: row['Project Code'],
        name: row['Project'],
        client: row['Client'],
        type: row['Project type'] || 'DELIVERY',
        status: row['Project Status'] || 'ACTIVE',
      });
    }
  });
  
  // Create locations
  console.log(`📍 Creating ${uniqueLocations.size} locations...`);
  const locationMap = new Map<string, string>();
  let locCounter = 1;
  for (const loc of uniqueLocations) {
    if (!loc) continue;
    const locCode = `L${String(locCounter++).padStart(3, '0')}`;
    const location = await prisma.location.create({
      data: {
        tenantId: tenant.id,
        name: loc.substring(0, 100),
        code: locCode,
        type: 'OFFICE',
        country: 'IN',
        timezone: 'Asia/Kolkata',
        status: 'ACTIVE',
      },
    });
    locationMap.set(loc, location.id);
  }
  
  // Create practices
  console.log(`🏛️ Creating ${uniquePractices.size} practices...`);
  const practiceMap = new Map<string, string>();
  let pracCounter = 1;
  for (const prac of uniquePractices) {
    if (!prac) continue;
    const pracCode = `P${String(pracCounter++).padStart(3, '0')}`;
    const practice = await prisma.practice.create({
      data: {
        tenantId: tenant.id,
        name: prac.substring(0, 100),
        code: pracCode,
        targetUtilization: 85,
        status: 'ACTIVE',
      },
    });
    practiceMap.set(prac, practice.id);
  }
  
  // Create skill category and skills
  console.log(`💡 Creating ${uniqueSkills.size} skills...`);
  const skillCategory = await prisma.skillCategory.create({
    data: {
      tenantId: tenant.id,
      name: 'Technical Skills',
    },
  });
  
  const skillMap = new Map<string, string>();
  for (const skillName of uniqueSkills) {
    if (!skillName) continue;
    const skill = await prisma.skill.create({
      data: {
        tenantId: tenant.id,
        categoryId: skillCategory.id,
        name: skillName.substring(0, 100),
        description: skillName.substring(0, 500),
      },
    });
    skillMap.set(skillName, skill.id);
  }
  
  // Create clients
  console.log(`🏢 Creating ${uniqueClients.size} clients...`);
  const clientMap = new Map<string, string>();
  for (const clientName of uniqueClients) {
    if (!clientName) continue;
    const client = await prisma.client.create({
      data: {
        tenantId: tenant.id,
        name: clientName,
        code: clientName.substring(0, 10).toUpperCase().replace(/[^A-Z0-9]/g, ''),
        status: 'ACTIVE',
        tier: 'STANDARD',
      },
    });
    clientMap.set(clientName, client.id);
  }
  
  // Create projects
  console.log(`📁 Creating ${uniqueProjects.size} projects...`);
  const projectMap = new Map<string, string>();
  for (const [code, proj] of uniqueProjects) {
    const clientId = clientMap.get(proj.client);
    if (!clientId) continue;
    
    const projectStatus = proj.status?.toUpperCase() === 'ACTIVE' ? 'ACTIVE' : 
                          proj.status?.toUpperCase() === 'COMPLETED' ? 'COMPLETED' : 'ACTIVE';
    
    const project = await prisma.project.create({
      data: {
        tenantId: tenant.id,
        clientId,
        code,
        name: proj.name.substring(0, 200),
        type: 'BILLABLE',
        status: projectStatus,
        startDate: new Date('2024-01-01'),
        healthStatus: 'GREEN',
      },
    });
    projectMap.set(code, project.id);
  }
  
  // Create roles
  console.log('🔐 Creating roles...');
  const adminRole = await prisma.role.create({
    data: {
      tenantId: tenant.id,
      name: 'Admin',
      description: 'Full system access',
      permissions: ['*'],
      isSystem: true,
    },
  });
  
  const rmRole = await prisma.role.create({
    data: {
      tenantId: tenant.id,
      name: 'Resource Manager',
      description: 'Manage resources and allocations',
      permissions: ['resource:*', 'allocation:*', 'project:read', 'client:read', 'report:read'],
      isSystem: true,
    },
  });
  
  // Create resources from CSV
  console.log(`👥 Creating resources from ${rows.length} rows...`);
  const resourceMap = new Map<string, string>();
  const processedEmpIds = new Set<string>();
  
  for (const row of rows) {
    const empId = row['Emp Id'];
    
    // Skip empty or already processed
    if (!empId || empId.trim() === '') continue;
    if (processedEmpIds.has(empId)) continue;
    processedEmpIds.add(empId);
    
    const fullName = row['Full Name'] || 'Unknown';
    const nameParts = fullName.trim().split(/\s+/);
    const firstName = (nameParts[0] || 'Unknown').substring(0, 100);
    const lastName = (nameParts.slice(1).join(' ') || 'User').substring(0, 100);
    
    const isActive = row['Active']?.toUpperCase() !== 'NO' && row['Active']?.toUpperCase() !== 'N';
    const isConsultant = row['FTE/ Consultant']?.toUpperCase().includes('CONSULT');
    
    // Parse date of joining
    let dateOfJoining = new Date('2024-01-01');
    if (row['DOJ']) {
      const doj = new Date(row['DOJ']);
      if (!isNaN(doj.getTime())) {
        dateOfJoining = doj;
      }
    }
    
    // Clean email
    let email = row['email ID']?.trim();
    if (!email || !email.includes('@')) {
      email = `${empId.toLowerCase()}@newvision.in`;
    }
    email = email.substring(0, 255);
    
    try {
      const resource = await prisma.resource.create({
        data: {
          tenantId: tenant.id,
          employeeId: empId.substring(0, 50),
          firstName,
          lastName: lastName || 'User',
          email,
          designation: (row['Role'] || 'Engineer').substring(0, 100),
          band: 'L3',
          employmentType: isConsultant ? 'CONTRACTOR' : 'FTE',
          status: isActive ? 'ACTIVE' : 'INACTIVE',
          dateOfJoining,
          practiceId: practiceMap.get(row['Practice']) || null,
          locationId: locationMap.get(row['Location']) || null,
          capacity: 100,
        },
      });
      
      resourceMap.set(empId, resource.id);
      
      // Assign skill if present
      const skillId = skillMap.get(row['Skill']);
      if (skillId) {
        await prisma.resourceSkill.create({
          data: {
            resourceId: resource.id,
            skillId,
            proficiency: 'INTERMEDIATE',
            yearsExp: parseFloat(row[' Relevant Experience ']) || 0,
          },
        });
      }
    } catch (err: any) {
      if (resourceMap.size < 3) {
        console.log(`   Error for ${empId}:`, err.message);
      }
    }
  }
  
  console.log(`   Created ${resourceMap.size} unique resources`);
  
  // Create allocations
  console.log('📊 Creating allocations...');
  let allocationCount = 0;
  let skippedNoResource = 0;
  let skippedNoProject = 0;
  let skippedErrors = 0;
  
  // Check first few rows for debugging
  if (rows.length > 0) {
    const sampleRow = rows[0];
    console.log(`   Sample row keys: ${Object.keys(sampleRow).filter(k => k.includes('Proj') || k.includes('Emp')).join(', ')}`);
    console.log(`   Sample Emp Id: "${sampleRow['Emp Id']}", Project Code: "${sampleRow['Project Code']}"`);
    console.log(`   Project map size: ${projectMap.size}, has NV000214: ${projectMap.has('NV000214')}`);
    console.log(`   Sample project codes in map: ${Array.from(projectMap.keys()).slice(0, 5).join(', ')}`);
  }
  
  for (const row of rows) {
    const empId = row['Emp Id'];
    const projectCode = row['Project Code'];
    const resourceId = resourceMap.get(empId);
    const projectId = projectMap.get(projectCode);
    
    if (!resourceId) { skippedNoResource++; continue; }
    if (!projectId) { skippedNoProject++; continue; }
    
    const allocationPct = parseInt(row['Allocation%']) || 100;
    const isBillable = row['Billable (Y/N)']?.toUpperCase() === 'Y';
    
    // Parse dates
    let startDate = new Date('2024-01-01');
    let endDate = new Date('2025-12-31');
    
    if (row['Start Date']) {
      const sd = new Date(row['Start Date']);
      if (!isNaN(sd.getTime())) startDate = sd;
    }
    if (row['End Date']) {
      const ed = new Date(row['End Date']);
      if (!isNaN(ed.getTime())) endDate = ed;
    }
    
    // Get the role from the CSV or default
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
          percentage: allocationPct,
          isBillable,
          status: 'ACTIVE',
        },
      });
      allocationCount++;
    } catch (err: any) {
      if (allocationCount === 0 && skippedErrors < 3) {
        console.log(`   Allocation error sample: ${err.message?.substring(0, 200)}`);
      }
      skippedErrors++;
    }
  }
  
  console.log(`   Created ${allocationCount} allocations`);
  console.log(`   Skipped: ${skippedNoResource} no resource, ${skippedNoProject} no project, ${skippedErrors} errors`);
  
  // Create admin user
  console.log('👤 Creating admin user...');
  const hashedPassword = await hashPassword('Password123!@#');
  
  const adminUser = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: 'admin@newvision.in',
      passwordHash: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      status: 'ACTIVE',
    },
  });
  
  await prisma.userRole.create({
    data: {
      userId: adminUser.id,
      roleId: adminRole.id,
      assignedBy: adminUser.id,
    },
  });
  
  // Create RM user
  const rmUser = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: 'rm@newvision.in',
      passwordHash: hashedPassword,
      firstName: 'Resource',
      lastName: 'Manager',
      status: 'ACTIVE',
    },
  });
  
  await prisma.userRole.create({
    data: {
      userId: rmUser.id,
      roleId: rmRole.id,
      assignedBy: adminUser.id,
    },
  });
  
  console.log('\n✅ Seeding complete!');
  console.log('\n📝 Login credentials:');
  console.log('   Email: admin@newvision.in');
  console.log('   Password: Password123!@#');
  console.log('\n📊 Summary:');
  console.log(`   Resources: ${resourceMap.size}`);
  console.log(`   Locations: ${locationMap.size}`);
  console.log(`   Practices: ${practiceMap.size}`);
  console.log(`   Skills: ${skillMap.size}`);
  console.log(`   Clients: ${clientMap.size}`);
  console.log(`   Projects: ${projectMap.size}`);
  console.log(`   Allocations: ${allocationCount}`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

