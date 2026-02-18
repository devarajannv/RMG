/**
 * RMG Master File Data Import Script
 * 
 * This script imports data from RMG_Master_File.xlsx into the database.
 * 
 * Date: January 20, 2026
 * Source: /RMG_Master_File.xlsx
 * 
 * Import Order:
 * 1. Practices (18 unique)
 * 2. Locations (9 unique)
 * 3. Clients (28 unique)
 * 4. Skills (82 unique)
 * 5. Projects (229 from Project Master)
 * 6. Resources (775 unique employees)
 * 7. Allocations (2006 records)
 * 
 * Edge Cases Documented:
 * - Manish Sharma: External contractor with 5% allocation (expected)
 * - Shubham Sonawane: 600% allocation (to be fixed by team)
 * - 70 manager names not found as employees (created as ghost resources)
 */

import * as XLSX from 'xlsx';
import { PrismaClient, EmploymentType, ResourceStatus, ProjectType, ProjectStatus, AllocationStatus, BillingType } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Configuration
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _TENANT_ID = process.env.TENANT_ID || ''; // Can be overridden via env
const XLSX_PATH = path.join(__dirname, '..', '..', '..', 'RMG_Master_File.xlsx');
const LOG_PATH = path.join(__dirname, '..', '..', '..', 'docs', `IMPORT_LOG_${new Date().toISOString().replace(/[:.]/g, '-')}.md`);

// Import statistics
const stats = {
  startTime: new Date(),
  endTime: null as Date | null,
  practices: { created: 0, existing: 0, failed: 0 },
  locations: { created: 0, existing: 0, failed: 0 },
  clients: { created: 0, existing: 0, failed: 0 },
  skills: { created: 0, existing: 0, failed: 0 },
  projects: { created: 0, existing: 0, failed: 0 },
  resources: { created: 0, existing: 0, failed: 0 },
  allocations: { created: 0, existing: 0, failed: 0 },
  managerResolutions: { matched: 0, fuzzy: 0, created: 0 },
  edgeCases: [] as string[],
};

// Lookup maps
const practiceMap = new Map<string, string>(); // name -> id
const locationMap = new Map<string, string>();
const clientMap = new Map<string, string>();
const skillMap = new Map<string, string>();
const projectMap = new Map<string, string>(); // code -> id
const resourceMap = new Map<string, string>(); // empId -> id
const resourceByName = new Map<string, string>(); // fullName -> id

// Excel date conversion
function excelToDate(serial: number | undefined): Date | null {
  if (!serial || typeof serial !== 'number') return null;
  return new Date((serial - 25569) * 86400 * 1000);
}

// Parse employment type from Excel
function parseEmploymentType(value: string | undefined): EmploymentType {
  if (!value) return EmploymentType.FTE;
  const v = value.toLowerCase();
  if (v === 'fte') return EmploymentType.FTE;
  if (v.includes('consultant') || v.includes('contractor')) return EmploymentType.CONTRACTOR;
  if (v === 'ph') return EmploymentType.FTE; // Practice Head is FTE
  return EmploymentType.FTE;
}

// Parse project type from Excel
function parseProjectType(status: string | undefined): ProjectType {
  if (!status) return ProjectType.BILLABLE;
  const s = status.toLowerCase();
  if (s.includes('billable')) return ProjectType.BILLABLE;
  if (s.includes('management') || s.includes('internal')) return ProjectType.INTERNAL;
  if (s.includes('r&d') || s.includes('investment')) return ProjectType.PRESALES;
  return ProjectType.BILLABLE;
}

// Parse billing type
function parseBillingType(value: string | undefined): BillingType {
  if (!value) return BillingType.TM;
  const v = value.toUpperCase();
  if (v === 'FB' || v === 'FMB' || v.includes('FIXED')) return BillingType.FIXED;
  return BillingType.TM;
}

// Split full name into first/last
function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}

// Generate email from name if not provided
function generateEmail(fullName: string, empId: string): string {
  const parts = fullName.toLowerCase().trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]}.${parts[parts.length - 1]}@newvision-software.com`;
  }
  return `${empId.toLowerCase()}@newvision-software.com`;
}

// Find manager by name (with fuzzy matching)
function findManagerId(managerName: string | undefined): string | null {
  if (!managerName) return null;
  
  // Exact match
  if (resourceByName.has(managerName)) {
    stats.managerResolutions.matched++;
    return resourceByName.get(managerName)!;
  }
  
  // Case-insensitive match
  const lowerName = managerName.toLowerCase();
  for (const [name, id] of resourceByName) {
    if (name.toLowerCase() === lowerName) {
      stats.managerResolutions.fuzzy++;
      return id;
    }
  }
  
  return null;
}

async function getOrCreateTenant(): Promise<string> {
  // Check for existing tenant
  let tenant = await prisma.tenant.findFirst({
    where: { slug: 'newvision' }
  });
  
  if (tenant) {
    console.log(`Using existing tenant: ${tenant.name} (${tenant.id})`);
    return tenant.id;
  }
  
  // Create new tenant
  tenant = await prisma.tenant.create({
    data: {
      name: 'NewVision Software',
      slug: 'newvision',
      tier: 'ENTERPRISE',
      status: 'ACTIVE',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
    }
  });
  
  console.log(`Created new tenant: ${tenant.name} (${tenant.id})`);
  return tenant.id;
}

async function importPractices(data: any[], tenantId: string) {
  console.log('\n📂 Importing Practices...');
  const practices = [...new Set(data.map(r => r['Practice']).filter(v => v))];
  
  for (const name of practices) {
    try {
      const existing = await prisma.practice.findFirst({
        where: { tenantId, name }
      });
      
      if (existing) {
        practiceMap.set(name, existing.id);
        stats.practices.existing++;
      } else {
        const practice = await prisma.practice.create({
          data: {
            tenantId,
            name,
            code: name.substring(0, 10).toUpperCase().replace(/\s+/g, '_'),
            status: 'ACTIVE',
          }
        });
        practiceMap.set(name, practice.id);
        stats.practices.created++;
      }
    } catch (error) {
      console.error(`  Failed to import practice: ${name}`, error);
      stats.practices.failed++;
    }
  }
  
  console.log(`  ✓ Created: ${stats.practices.created}, Existing: ${stats.practices.existing}, Failed: ${stats.practices.failed}`);
}

async function importLocations(data: any[], tenantId: string) {
  console.log('\n📍 Importing Locations...');
  const locations = [...new Set(data.map(r => r['Location']).filter(v => v))];
  
  for (const name of locations) {
    try {
      const existing = await prisma.location.findFirst({
        where: { tenantId, name }
      });
      
      if (existing) {
        locationMap.set(name, existing.id);
        stats.locations.existing++;
      } else {
        // Determine country code (2-char ISO) based on location name
        let country = 'IN';
        let timezone = 'Asia/Kolkata';
        if (name.includes('USA') || name.includes('Atlanta')) {
          country = 'US';
          timezone = 'America/New_York';
        } else if (name.includes('Dubai')) {
          country = 'AE';
          timezone = 'Asia/Dubai';
        } else if (name.includes('Egypt')) {
          country = 'EG';
          timezone = 'Africa/Cairo';
        }
        
        const code = name.substring(0, 15).toUpperCase().replace(/[^A-Z0-9]/g, '');
        
        const location = await prisma.location.create({
          data: {
            tenantId,
            name,
            code,
            type: 'OFFICE',
            timezone,
            country,
            status: 'ACTIVE',
          }
        });
        locationMap.set(name, location.id);
        stats.locations.created++;
      }
    } catch (error) {
      console.error(`  Failed to import location: ${name}`, error);
      stats.locations.failed++;
    }
  }
  
  console.log(`  ✓ Created: ${stats.locations.created}, Existing: ${stats.locations.existing}, Failed: ${stats.locations.failed}`);
}

async function importClients(data: any[], tenantId: string) {
  console.log('\n🏢 Importing Clients...');
  const clients = [...new Set(data.map(r => r['Client']).filter(v => v))];
  
  for (const name of clients) {
    try {
      // Generate code from name
      const code = name.substring(0, 15).toUpperCase().replace(/[^A-Z0-9]/g, '');
      
      const existing = await prisma.client.findFirst({
        where: { tenantId, name }
      });
      
      if (existing) {
        clientMap.set(name, existing.id);
        stats.clients.existing++;
      } else {
        const client = await prisma.client.create({
          data: {
            tenantId,
            name,
            code,
            status: 'ACTIVE',
          }
        });
        clientMap.set(name, client.id);
        stats.clients.created++;
      }
    } catch (error) {
      console.error(`  Failed to import client: ${name}`, error);
      stats.clients.failed++;
    }
  }
  
  console.log(`  ✓ Created: ${stats.clients.created}, Existing: ${stats.clients.existing}, Failed: ${stats.clients.failed}`);
}

async function importSkills(data: any[], tenantId: string) {
  console.log('\n🛠️ Importing Skills...');
  const skills = [...new Set(data.map(r => r['Primary Skill'] || r['Skill']).filter(v => v))];
  
  for (const name of skills) {
    try {
      const existing = await prisma.skill.findFirst({
        where: { tenantId, name }
      });
      
      if (existing) {
        skillMap.set(name, existing.id);
        stats.skills.existing++;
      } else {
        const skill = await prisma.skill.create({
          data: {
            tenantId,
            name,
          }
        });
        skillMap.set(name, skill.id);
        stats.skills.created++;
      }
    } catch (error) {
      console.error(`  Failed to import skill: ${name}`, error);
      stats.skills.failed++;
    }
  }
  
  console.log(`  ✓ Created: ${stats.skills.created}, Existing: ${stats.skills.existing}, Failed: ${stats.skills.failed}`);
}

async function importProjects(projectData: any[], allocationData: any[], tenantId: string) {
  console.log('\n📋 Importing Projects...');
  
  // First, import from Project Master sheet
  for (const row of projectData) {
    const code = row['Project ID'];
    const name = row['Project name'];
    const clientName = row['Account'];
    
    if (!code || !name) continue;
    
    try {
      const existing = await prisma.project.findFirst({
        where: { tenantId, code }
      });
      
      if (existing) {
        projectMap.set(code, existing.id);
        stats.projects.existing++;
        continue;
      }
      
      const clientId = clientMap.get(clientName) || null;
      const startDate = excelToDate(row['Project start Date']);
      const endDate = excelToDate(row['Project SOW End Date']);
      
      const project = await prisma.project.create({
        data: {
          tenantId,
          code,
          name,
          clientId,
          type: ProjectType.BILLABLE,
          status: row['Status2'] === 'Active' ? ProjectStatus.ACTIVE : 
                  row['Status2'] === 'Completed' ? ProjectStatus.COMPLETED : ProjectStatus.ACTIVE,
          billingType: parseBillingType(row['Project Type (T&M/Fixed Bid/Fixed Capacity)']),
          startDate: startDate || new Date(),
          endDate,
        }
      });
      
      projectMap.set(code, project.id);
      stats.projects.created++;
    } catch (error) {
      console.error(`  Failed to import project: ${code} - ${name}`, error);
      stats.projects.failed++;
    }
  }
  
  // Also create projects found in allocations but not in project master
  for (const row of allocationData) {
    const code = row['Project Code'];
    const name = row['Project'];
    const clientName = row['Client'];
    
    if (!code || !name || projectMap.has(code)) continue;
    
    try {
      const clientId = clientMap.get(clientName) || null;
      
      const project = await prisma.project.create({
        data: {
          tenantId,
          code,
          name,
          clientId,
          type: parseProjectType(row['Project Status']),
          status: ProjectStatus.ACTIVE,
          billingType: parseBillingType(row['Project type']),
          startDate: excelToDate(row['Start Date']) || new Date(),
          endDate: excelToDate(row['End Date']),
        }
      });
      
      projectMap.set(code, project.id);
      stats.projects.created++;
    } catch (error) {
      // Likely duplicate, skip
    }
  }
  
  console.log(`  ✓ Created: ${stats.projects.created}, Existing: ${stats.projects.existing}, Failed: ${stats.projects.failed}`);
}

async function importResources(data: any[], tenantId: string) {
  console.log('\n👥 Importing Resources...');
  
  // Group by employee to get unique resources
  const employeeData = new Map<string, any>();
  data.forEach(row => {
    const empId = row['Emp Id'];
    if (empId && !employeeData.has(empId)) {
      employeeData.set(empId, row);
    }
  });
  
  console.log(`  Found ${employeeData.size} unique employees`);
  
  for (const [empId, row] of employeeData) {
    try {
      const existing = await prisma.resource.findFirst({
        where: { tenantId, employeeId: empId }
      });
      
      if (existing) {
        resourceMap.set(empId, existing.id);
        resourceByName.set(row['Full Name'], existing.id);
        stats.resources.existing++;
        continue;
      }
      
      const { firstName, lastName } = splitName(row['Full Name'] || empId);
      const email = row['email ID'] || generateEmail(row['Full Name'] || empId, empId);
      const practiceId = practiceMap.get(row['Practice']) || null;
      const locationId = locationMap.get(row['Location']) || null;
      const doj = excelToDate(row['DOJ']);
      
      // Parse experience range to fit band field (max 10 chars)
      let band = row['Experience Range'] || 'Unknown';
      if (band === 'More than 12 yrs') band = '>12 yrs';
      else if (band === 'less than 1 yr') band = '<1 yr';
      
      const resource = await prisma.resource.create({
        data: {
          tenantId,
          employeeId: empId,
          firstName: firstName.substring(0, 100),
          lastName: lastName.substring(0, 100),
          email: email.substring(0, 255),
          practiceId,
          locationId,
          employmentType: parseEmploymentType(row['FTE/ Consultant']),
          designation: (row['Role'] || 'Employee').substring(0, 100),
          band: band.substring(0, 10),
          dateOfJoining: doj || new Date(),
          status: row['Active'] === 'Active' ? ResourceStatus.ACTIVE : ResourceStatus.INACTIVE,
        }
      });
      
      resourceMap.set(empId, resource.id);
      resourceByName.set(row['Full Name'], resource.id);
      stats.resources.created++;
      
    } catch (error: any) {
      console.error(`  Failed to import resource: ${empId}`, error.message);
      stats.resources.failed++;
    }
  }
  
  console.log(`  ✓ Created: ${stats.resources.created}, Existing: ${stats.resources.existing}, Failed: ${stats.resources.failed}`);
}

async function createGhostManagers(data: any[], tenantId: string) {
  console.log('\n👻 Creating ghost resources for missing managers...');
  
  // Collect all manager names
  const managerNames = new Set<string>();
  data.forEach(row => {
    if (row['L1 Manager']) managerNames.add(row['L1 Manager']);
    if (row['Practice Head']) managerNames.add(row['Practice Head']);
    if (row['Project Manager']) managerNames.add(row['Project Manager']);
  });
  
  let created = 0;
  for (const name of managerNames) {
    if (resourceByName.has(name)) continue; // Already exists
    
    try {
      const { firstName, lastName } = splitName(name);
      const empId = `MGR-${name.replace(/\s+/g, '-').substring(0, 20)}`;
      
      const resource = await prisma.resource.create({
        data: {
          tenantId,
          employeeId: empId,
          firstName,
          lastName,
          email: generateEmail(name, empId),
          employmentType: EmploymentType.FTE,
          designation: 'Manager',
          band: 'Unknown',
          dateOfJoining: new Date(),
          status: ResourceStatus.ACTIVE,
        }
      });
      
      resourceByName.set(name, resource.id);
      stats.managerResolutions.created++;
      created++;
    } catch (error) {
      // Skip if fails
    }
  }
  
  console.log(`  ✓ Created ${created} ghost manager resources`);
}

async function updateManagerRelationships(data: any[], _tenantId: string) {
  console.log('\n🔗 Updating manager relationships...');
  
  const employeeData = new Map<string, any>();
  data.forEach(row => {
    const empId = row['Emp Id'];
    if (empId && !employeeData.has(empId)) {
      employeeData.set(empId, row);
    }
  });
  
  let updated = 0;
  for (const [empId, row] of employeeData) {
    const resourceId = resourceMap.get(empId);
    if (!resourceId) continue;
    
    const managerId = findManagerId(row['L1 Manager']);
    if (managerId) {
      try {
        await prisma.resource.update({
          where: { id: resourceId },
          data: { managerId }
        });
        updated++;
      } catch (error) {
        // Skip
      }
    }
  }
  
  console.log(`  ✓ Updated ${updated} manager relationships`);
}

async function importAllocations(data: any[], tenantId: string) {
  console.log('\n📊 Importing Allocations...');
  
  for (const row of data) {
    const empId = row['Emp Id'];
    const projectCode = row['Project Code'];
    
    if (!empId || !projectCode) continue;
    
    const resourceId = resourceMap.get(empId);
    const projectId = projectMap.get(projectCode);
    
    if (!resourceId || !projectId) {
      stats.allocations.failed++;
      continue;
    }
    
    try {
      const startDate = excelToDate(row['Start Date']);
      const endDate = excelToDate(row['End Date']);
      const percentage = row['Allocation%'] || 100;
      const isBillable = row['Billable'] === 'Y';
      const isHistory = row['Status'] === 'History';
      
      // Check for edge cases
      if (percentage < 5) {
        stats.edgeCases.push(`${row['Full Name']} (${empId}): ${percentage}% allocation on ${row['Project']}`);
      }
      
      // Check for existing allocation
      const existing = await prisma.allocation.findFirst({
        where: {
          tenantId,
          resourceId,
          projectId,
          startDate: startDate || undefined,
        }
      });
      
      if (existing) {
        stats.allocations.existing++;
        continue;
      }
      
      await prisma.allocation.create({
        data: {
          tenantId,
          resourceId,
          projectId,
          role: row['Role'] || 'Resource',
          percentage,
          startDate: startDate || new Date(),
          endDate: endDate || new Date('2026-12-31'),
          status: isHistory ? AllocationStatus.COMPLETED : AllocationStatus.ACTIVE,
          isBillable,
        }
      });
      
      stats.allocations.created++;
      
    } catch (error: any) {
      // console.error(`  Failed to import allocation for ${empId}`, error.message);
      stats.allocations.failed++;
    }
  }
  
  console.log(`  ✓ Created: ${stats.allocations.created}, Existing: ${stats.allocations.existing}, Failed: ${stats.allocations.failed}`);
}

async function generateImportLog(tenantId: string) {
  stats.endTime = new Date();
  const duration = (stats.endTime.getTime() - stats.startTime.getTime()) / 1000;
  
  const log = `# RMG Data Import Log

## Import Details
- **Date/Time:** ${stats.startTime.toISOString()}
- **Duration:** ${duration.toFixed(2)} seconds
- **Source File:** RMG_Master_File.xlsx
- **Tenant ID:** ${tenantId}

## Statistics

| Entity | Created | Existing | Failed | Total |
|--------|---------|----------|--------|-------|
| Practices | ${stats.practices.created} | ${stats.practices.existing} | ${stats.practices.failed} | ${stats.practices.created + stats.practices.existing} |
| Locations | ${stats.locations.created} | ${stats.locations.existing} | ${stats.locations.failed} | ${stats.locations.created + stats.locations.existing} |
| Clients | ${stats.clients.created} | ${stats.clients.existing} | ${stats.clients.failed} | ${stats.clients.created + stats.clients.existing} |
| Skills | ${stats.skills.created} | ${stats.skills.existing} | ${stats.skills.failed} | ${stats.skills.created + stats.skills.existing} |
| Projects | ${stats.projects.created} | ${stats.projects.existing} | ${stats.projects.failed} | ${stats.projects.created + stats.projects.existing} |
| Resources | ${stats.resources.created} | ${stats.resources.existing} | ${stats.resources.failed} | ${stats.resources.created + stats.resources.existing} |
| Allocations | ${stats.allocations.created} | ${stats.allocations.existing} | ${stats.allocations.failed} | ${stats.allocations.created + stats.allocations.existing} |

## Manager Resolution
- **Exact Match:** ${stats.managerResolutions.matched}
- **Fuzzy Match:** ${stats.managerResolutions.fuzzy}
- **Ghost Resources Created:** ${stats.managerResolutions.created}

## Edge Cases to Review

The following records require manual review by the team:

### Under-allocated Resources
${stats.edgeCases.length > 0 ? stats.edgeCases.map(e => `- ${e}`).join('\n') : '- None'}

### Known Issues
- **Manish Sharma:** External contractor with 5% allocation (expected behavior - point person from subcontractor company)
- **Shubham Sonawane:** 600% allocation (data error - to be corrected by team)

## Data Mappings

### Employment Types
| Excel Value | Database Value |
|-------------|----------------|
| FTE | FTE |
| Consultant-* | CONTRACTOR |
| Contractor | CONTRACTOR |
| PH (Practice Head) | FTE |

### Project Types
| Excel Status | Database Type |
|--------------|---------------|
| Billable | BILLABLE |
| Management, Internal | INTERNAL |
| R&D, Investment | PRESALES |

---
*Generated by import-rmg-data.ts*
`;

  fs.writeFileSync(LOG_PATH, log);
  console.log(`\n📄 Import log saved to: ${LOG_PATH}`);
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  RMG Master File Data Import');
  console.log('  Date: ' + new Date().toISOString());
  console.log('═══════════════════════════════════════════════════════════════');
  
  try {
    // Read Excel file
    console.log('\n📖 Reading Excel file...');
    const workbook = XLSX.readFile(XLSX_PATH);
    
    // Get data from sheets
    const allocationSheet = workbook.Sheets['RMG curren allocation'];
    const projectSheet = workbook.Sheets['Project master'];
    
    const allocationData = XLSX.utils.sheet_to_json(allocationSheet, { range: 1 });
    const projectData = XLSX.utils.sheet_to_json(projectSheet);
    
    console.log(`  ✓ Allocations sheet: ${allocationData.length} rows`);
    console.log(`  ✓ Projects sheet: ${projectData.length} rows`);
    
    // Get or create tenant
    const tenantId = await getOrCreateTenant();
    
    // Import in order
    await importPractices(allocationData, tenantId);
    await importLocations(allocationData, tenantId);
    await importClients(allocationData, tenantId);
    await importSkills(allocationData, tenantId);
    await importProjects(projectData, allocationData, tenantId);
    await importResources(allocationData, tenantId);
    await createGhostManagers(allocationData, tenantId);
    await updateManagerRelationships(allocationData, tenantId);
    await importAllocations(allocationData, tenantId);
    
    // Generate log
    await generateImportLog(tenantId);
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  ✅ Import Complete!');
    console.log('═══════════════════════════════════════════════════════════════');
    
  } catch (error) {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
