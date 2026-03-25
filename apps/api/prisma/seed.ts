import { PrismaClient, TenantTier, TenantStatus, UserStatus, EmploymentType, ResourceStatus, Proficiency, ClientStatus, ClientTier, ProjectType, ProjectStatus, BillingType, AllocationStatus, PracticeStatus, LocationType, LocationStatus, FunctionCategory, FunctionScopeType } from '@prisma/client';
import argon2 from 'argon2';

import { seedRequestBlueprints } from './seed-request-blueprints';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean existing data (in reverse order of dependencies)
  console.log('🧹 Cleaning existing data...');
  await prisma.tenantRolePlaceholderMapping.deleteMany();
  await prisma.tenantRequestPackActivation.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.timesheetEntry.deleteMany();
  await prisma.timesheetPeriod.deleteMany();
  await prisma.allocation.deleteMany();
  await prisma.project.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.opportunity.deleteMany();
  await prisma.resourceSkill.deleteMany();
  await prisma.skill.deleteMany();
  await prisma.skillCategory.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.role.deleteMany();
  await prisma.user.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.client.deleteMany();
  await prisma.practice.deleteMany();
  await prisma.location.deleteMany();
  await prisma.tenant.deleteMany();

  // Create tenant
  console.log('🏢 Creating tenant...');
  const tenant = await prisma.tenant.create({
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
  console.log(`   Created tenant: ${tenant.name} (${tenant.id})`);

  // Create locations
  console.log('📍 Creating locations...');
  const locationBangalore = await prisma.location.create({
    data: {
      tenantId: tenant.id,
      name: 'Bangalore Office',
      code: 'BLR',
      type: LocationType.OFFICE,
      timezone: 'Asia/Kolkata',
      country: 'IN',
      isOnshore: true,
      status: LocationStatus.ACTIVE,
      address: {
        line1: 'Tech Park',
        city: 'Bangalore',
        state: 'Karnataka',
        postalCode: '560001',
      },
    },
  });

  const locationRemote = await prisma.location.create({
    data: {
      tenantId: tenant.id,
      name: 'Remote - India',
      code: 'RMT-IN',
      type: LocationType.REMOTE,
      timezone: 'Asia/Kolkata',
      country: 'IN',
      isOnshore: true,
      status: LocationStatus.ACTIVE,
    },
  });

  // Create practices
  console.log('🏛️ Creating practices...');
  const practiceTech = await prisma.practice.create({
    data: {
      tenantId: tenant.id,
      name: 'Technology',
      code: 'TECH',
      targetUtilization: 85,
      status: PracticeStatus.ACTIVE,
    },
  });

  const practiceData = await prisma.practice.create({
    data: {
      tenantId: tenant.id,
      name: 'Data & Analytics',
      code: 'DATA',
      targetUtilization: 80,
      status: PracticeStatus.ACTIVE,
    },
  });

  const practiceCloud = await prisma.practice.create({
    data: {
      tenantId: tenant.id,
      name: 'Cloud & Infrastructure',
      code: 'CLOUD',
      targetUtilization: 85,
      status: PracticeStatus.ACTIVE,
    },
  });

  // Create skill categories
  console.log('🎯 Creating skill categories...');
  const catProgramming = await prisma.skillCategory.create({
    data: {
      tenantId: tenant.id,
      name: 'Programming Languages',
      color: '#0077b6',
      sortOrder: 1,
    },
  });

  const catFramework = await prisma.skillCategory.create({
    data: {
      tenantId: tenant.id,
      name: 'Frameworks & Libraries',
      color: '#00b4d8',
      sortOrder: 2,
    },
  });

  const catCloud = await prisma.skillCategory.create({
    data: {
      tenantId: tenant.id,
      name: 'Cloud Platforms',
      color: '#f77f00',
      sortOrder: 3,
    },
  });

  // Create skills
  console.log('💡 Creating skills...');
  const skillTypeScript = await prisma.skill.create({
    data: {
      tenantId: tenant.id,
      categoryId: catProgramming.id,
      name: 'TypeScript',
      isVerifiable: true,
    },
  });

  const skillPython = await prisma.skill.create({
    data: {
      tenantId: tenant.id,
      categoryId: catProgramming.id,
      name: 'Python',
      isVerifiable: true,
    },
  });

  const skillReact = await prisma.skill.create({
    data: {
      tenantId: tenant.id,
      categoryId: catFramework.id,
      name: 'React',
      isVerifiable: true,
    },
  });

  const skillAWS = await prisma.skill.create({
    data: {
      tenantId: tenant.id,
      categoryId: catCloud.id,
      name: 'AWS',
      isVerifiable: true,
    },
  });

  // Create roles
  console.log('🔐 Creating roles...');
  const roleAdmin = await prisma.role.create({
    data: {
      tenantId: tenant.id,
      name: 'Admin',
      description: 'Full system access',
      isSystem: true,
      permissions: ['*'],
    },
  });

  const roleRM = await prisma.role.create({
    data: {
      tenantId: tenant.id,
      name: 'Resource Manager',
      description: 'Manage resources and allocations',
      isSystem: true,
      permissions: [
        'resource:read',
        'resource:write',
        'allocation:read',
        'allocation:write',
        'project:read',
        'report:read',
      ],
    },
  });

  const _rolePM = await prisma.role.create({
    data: {
      tenantId: tenant.id,
      name: 'Project Manager',
      description: 'Manage projects and requests',
      isSystem: true,
      permissions: [
        'project:read',
        'project:write',
        'allocation:read',
        'allocation:request',
        'resource:read',
        'timesheet:read',
      ],
    },
  });

  const _roleEmployee = await prisma.role.create({
    data: {
      tenantId: tenant.id,
      name: 'Employee',
      description: 'Basic access for employees',
      isSystem: true,
      permissions: ['profile:read', 'profile:write', 'timesheet:write', 'timesheet:read'],
    },
  });

  // Create resources
  console.log('👥 Creating resources...');
  const resourceAdmin = await prisma.resource.create({
    data: {
      tenantId: tenant.id,
      practiceId: practiceTech.id,
      locationId: locationBangalore.id,
      employeeId: 'NV001',
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@newvision.in',
      employmentType: EmploymentType.FTE,
      band: 'L7',
      designation: 'Director',
      dateOfJoining: new Date('2020-01-01'),
      capacity: 100,
      status: ResourceStatus.ACTIVE,
    },
  });

  const resourceRM = await prisma.resource.create({
    data: {
      tenantId: tenant.id,
      practiceId: practiceTech.id,
      locationId: locationBangalore.id,
      employeeId: 'NV002',
      firstName: 'Resource',
      lastName: 'Manager',
      email: 'rm@newvision.in',
      employmentType: EmploymentType.FTE,
      band: 'L6',
      designation: 'Resource Manager',
      dateOfJoining: new Date('2020-06-01'),
      capacity: 100,
      status: ResourceStatus.ACTIVE,
    },
  });

  const resourceDev1 = await prisma.resource.create({
    data: {
      tenantId: tenant.id,
      practiceId: practiceTech.id,
      locationId: locationRemote.id,
      managerId: resourceRM.id,
      employeeId: 'NV003',
      firstName: 'Priya',
      lastName: 'Sharma',
      email: 'priya.sharma@newvision.in',
      employmentType: EmploymentType.FTE,
      band: 'L4',
      designation: 'Senior Software Engineer',
      dateOfJoining: new Date('2021-03-15'),
      capacity: 100,
      status: ResourceStatus.ACTIVE,
    },
  });

  const resourceDev2 = await prisma.resource.create({
    data: {
      tenantId: tenant.id,
      practiceId: practiceData.id,
      locationId: locationBangalore.id,
      managerId: resourceRM.id,
      employeeId: 'NV004',
      firstName: 'Rahul',
      lastName: 'Kumar',
      email: 'rahul.kumar@newvision.in',
      employmentType: EmploymentType.FTE,
      band: 'L3',
      designation: 'Data Engineer',
      dateOfJoining: new Date('2022-07-01'),
      capacity: 100,
      status: ResourceStatus.ACTIVE,
      benchSince: new Date('2024-11-01'),
    },
  });

  const resourceDev3 = await prisma.resource.create({
    data: {
      tenantId: tenant.id,
      practiceId: practiceCloud.id,
      locationId: locationBangalore.id,
      managerId: resourceRM.id,
      employeeId: 'NV005',
      firstName: 'Aisha',
      lastName: 'Patel',
      email: 'aisha.patel@newvision.in',
      employmentType: EmploymentType.CONTRACTOR,
      band: 'C1',
      designation: 'DevOps Engineer',
      dateOfJoining: new Date('2023-01-10'),
      capacity: 100,
      status: ResourceStatus.ACTIVE,
    },
  });

  // Add skills to resources
  console.log('🔗 Assigning skills...');
  await prisma.resourceSkill.createMany({
    data: [
      { resourceId: resourceDev1.id, skillId: skillTypeScript.id, proficiency: Proficiency.EXPERT, yearsExp: 5 },
      { resourceId: resourceDev1.id, skillId: skillReact.id, proficiency: Proficiency.EXPERT, yearsExp: 4 },
      { resourceId: resourceDev2.id, skillId: skillPython.id, proficiency: Proficiency.ADVANCED, yearsExp: 3 },
      { resourceId: resourceDev2.id, skillId: skillAWS.id, proficiency: Proficiency.INTERMEDIATE, yearsExp: 2 },
      { resourceId: resourceDev3.id, skillId: skillAWS.id, proficiency: Proficiency.EXPERT, yearsExp: 6, certified: true },
    ],
  });

  // Create users
  console.log('👤 Creating users...');
  // M-11: Use environment variable for seed password, fallback only in development
  const seedPassword = process.env.SEED_ADMIN_PASSWORD || 'Password123!@#';
  if (!process.env.SEED_ADMIN_PASSWORD) {
    console.warn('⚠️  WARNING: Using default seed password. Set SEED_ADMIN_PASSWORD env var for production seeding.');
  }
  const passwordHash = await argon2.hash(seedPassword);

  const userAdmin = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      resourceId: resourceAdmin.id,
      email: 'admin@newvision.in',
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      status: UserStatus.ACTIVE,
      emailVerified: true,
    },
  });

  const userRM = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      resourceId: resourceRM.id,
      email: 'rm@newvision.in',
      passwordHash,
      firstName: 'Resource',
      lastName: 'Manager',
      status: UserStatus.ACTIVE,
      emailVerified: true,
    },
  });

  // Assign roles
  console.log('🔑 Assigning roles...');
  await prisma.userRole.createMany({
    data: [
      { userId: userAdmin.id, roleId: roleAdmin.id, assignedBy: userAdmin.id },
      { userId: userRM.id, roleId: roleRM.id, assignedBy: userAdmin.id },
    ],
  });

  // Create clients
  console.log('🏢 Creating clients...');
  const clientAlpha = await prisma.client.create({
    data: {
      tenantId: tenant.id,
      name: 'Alpha Tech Solutions',
      code: 'ALPHA',
      industry: 'Technology',
      website: 'https://alphatech.example.com',
      status: ClientStatus.ACTIVE,
      tier: ClientTier.STRATEGIC,
    },
  });

  const _clientBeta = await prisma.client.create({
    data: {
      tenantId: tenant.id,
      name: 'Beta Financial Services',
      code: 'BETA',
      industry: 'Financial Services',
      website: 'https://betafinance.example.com',
      status: ClientStatus.ACTIVE,
      tier: ClientTier.KEY,
    },
  });

  // Create contracts
  console.log('📄 Creating contracts...');
  const contractAlpha = await prisma.contract.create({
    data: {
      tenantId: tenant.id,
      clientId: clientAlpha.id,
      accountMgrId: resourceRM.id,
      contractNumber: 'MSA-2024-001',
      name: 'Alpha Tech Master Services Agreement',
      type: 'MSA',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2026-12-31'),
      signedDate: new Date('2023-12-15'),
      billingType: BillingType.TM,
      status: 'ACTIVE',
      autoRenew: true,
    },
  });

  // Create projects
  console.log('📁 Creating projects...');
  const projectPortal = await prisma.project.create({
    data: {
      tenantId: tenant.id,
      clientId: clientAlpha.id,
      contractId: contractAlpha.id,
      managerId: resourceRM.id,
      practiceId: practiceTech.id,
      code: 'ALPHA-PORTAL',
      name: 'Customer Portal Development',
      type: ProjectType.BILLABLE,
      status: ProjectStatus.ACTIVE,
      startDate: new Date('2024-06-01'),
      endDate: new Date('2025-03-31'),
      budgetHours: 2000,
      billingType: BillingType.TM,
    },
  });

  const _projectInternal = await prisma.project.create({
    data: {
      tenantId: tenant.id,
      practiceId: practiceTech.id,
      code: 'INT-TRAINING',
      name: 'Internal Training & Development',
      type: ProjectType.INTERNAL,
      status: ProjectStatus.ACTIVE,
      startDate: new Date('2024-01-01'),
    },
  });

  // Create allocations
  console.log('📊 Creating allocations...');
  await prisma.allocation.create({
    data: {
      tenantId: tenant.id,
      resourceId: resourceDev1.id,
      projectId: projectPortal.id,
      requestedById: userRM.id,
      approvedById: userAdmin.id,
      role: 'Tech Lead',
      percentage: 100,
      startDate: new Date('2024-06-01'),
      endDate: new Date('2025-03-31'),
      status: AllocationStatus.ACTIVE,
      isBillable: true,
      confirmedAt: new Date('2024-05-25'),
      startedAt: new Date('2024-06-01'),
    },
  });

  await prisma.allocation.create({
    data: {
      tenantId: tenant.id,
      resourceId: resourceDev3.id,
      projectId: projectPortal.id,
      requestedById: userRM.id,
      role: 'DevOps Engineer',
      percentage: 50,
      startDate: new Date('2024-06-01'),
      endDate: new Date('2025-03-31'),
      status: AllocationStatus.ACTIVE,
      isBillable: true,
    },
  });

  // Create approval functions (system functions)
  console.log('🎭 Creating approval functions...');
  
  // System approval functions - these are "hats" that users can wear
  // Separate from organizational structure (reporting manager) and system roles
  const systemFunctions = [
    {
      code: 'RESOURCE_ALLOCATOR',
      name: 'Resource Allocator',
      description: 'Can approve resource allocation requests',
      category: FunctionCategory.APPROVAL,
      scopeType: FunctionScopeType.PRACTICE,
      allowMultipleHolders: true,
      requiresApproval: false,
      canDelegate: true,
      maxDelegationDays: 30,
      sortOrder: 10,
    },
    {
      code: 'LEAVE_APPROVER',
      name: 'Leave Approver',
      description: 'Can approve leave requests for assigned resources',
      category: FunctionCategory.APPROVAL,
      scopeType: FunctionScopeType.PRACTICE,
      allowMultipleHolders: true,
      requiresApproval: false,
      canDelegate: true,
      maxDelegationDays: 14,
      sortOrder: 20,
    },
    {
      code: 'TIMESHEET_APPROVER',
      name: 'Timesheet Approver',
      description: 'Can approve timesheets for assigned resources',
      category: FunctionCategory.APPROVAL,
      scopeType: FunctionScopeType.PROJECT,
      allowMultipleHolders: true,
      requiresApproval: false,
      canDelegate: true,
      maxDelegationDays: 7,
      sortOrder: 30,
    },
    {
      code: 'PRACTICE_HEAD',
      name: 'Practice Head',
      description: 'Head of a practice unit - responsible for practice-level decisions',
      category: FunctionCategory.LEADERSHIP,
      scopeType: FunctionScopeType.PRACTICE,
      allowMultipleHolders: false,
      requiresApproval: true,
      canDelegate: true,
      maxDelegationDays: 30,
      sortOrder: 40,
    },
    {
      code: 'PROJECT_MANAGER',
      name: 'Project Manager',
      description: 'Manages a specific project - responsible for project-level approvals',
      category: FunctionCategory.LEADERSHIP,
      scopeType: FunctionScopeType.PROJECT,
      allowMultipleHolders: false,
      requiresApproval: false,
      canDelegate: true,
      maxDelegationDays: 14,
      sortOrder: 50,
    },
    {
      code: 'HIRING_MANAGER',
      name: 'Hiring Manager',
      description: 'Can approve hiring requests and requisitions',
      category: FunctionCategory.APPROVAL,
      scopeType: FunctionScopeType.PRACTICE,
      allowMultipleHolders: true,
      requiresApproval: true,
      canDelegate: false,
      sortOrder: 60,
    },
    {
      code: 'BUDGET_APPROVER',
      name: 'Budget Approver',
      description: 'Can approve budget-related requests',
      category: FunctionCategory.APPROVAL,
      scopeType: FunctionScopeType.TENANT,
      allowMultipleHolders: true,
      requiresApproval: true,
      canDelegate: true,
      maxDelegationDays: 7,
      sortOrder: 70,
    },
    {
      code: 'TRAVEL_APPROVER',
      name: 'Travel Approver',
      description: 'Can approve travel requests',
      category: FunctionCategory.APPROVAL,
      scopeType: FunctionScopeType.PRACTICE,
      allowMultipleHolders: true,
      requiresApproval: false,
      canDelegate: true,
      maxDelegationDays: 14,
      sortOrder: 80,
    },
    {
      code: 'EXPENSE_APPROVER',
      name: 'Expense Approver',
      description: 'Can approve expense reports and reimbursements',
      category: FunctionCategory.APPROVAL,
      scopeType: FunctionScopeType.PRACTICE,
      allowMultipleHolders: true,
      requiresApproval: false,
      canDelegate: true,
      maxDelegationDays: 14,
      sortOrder: 90,
    },
    {
      code: 'ASSET_APPROVER',
      name: 'Asset Approver',
      description: 'Can approve asset requests (laptops, equipment, etc.)',
      category: FunctionCategory.APPROVAL,
      scopeType: FunctionScopeType.TENANT,
      allowMultipleHolders: true,
      requiresApproval: false,
      canDelegate: true,
      maxDelegationDays: 7,
      sortOrder: 100,
    },
  ];

  for (const func of systemFunctions) {
    await prisma.approvalFunction.upsert({
      where: {
        tenantId_code: {
          tenantId: tenant.id,
          code: func.code,
        },
      },
      update: func,
      create: {
        tenantId: tenant.id,
        isSystem: true,
        ...func,
      },
    });
  }
  console.log(`   Created ${systemFunctions.length} system approval functions`);

  // Assign some default functions to the Resource Manager and Practice Lead
  console.log('🔗 Assigning default functions...');
  
  // Make userRM the Resource Allocator and Leave Approver for Tech practice
  const resourceAllocatorFunc = await prisma.approvalFunction.findFirst({
    where: { tenantId: tenant.id, code: 'RESOURCE_ALLOCATOR' },
  });
  const leaveApproverFunc = await prisma.approvalFunction.findFirst({
    where: { tenantId: tenant.id, code: 'LEAVE_APPROVER' },
  });

  if (resourceAllocatorFunc) {
    await prisma.functionAssignment.create({
      data: {
        tenantId: tenant.id,
        functionId: resourceAllocatorFunc.id,
        userId: userRM.id,
        scopeType: FunctionScopeType.PRACTICE,
        scopeEntityId: practiceTech.id,
        assignedById: userAdmin.id,
        approvalStatus: 'APPROVED',
      },
    });
    console.log(`   Assigned Resource Allocator to ${userRM.email} for ${practiceTech.name}`);
  }

  if (leaveApproverFunc) {
    await prisma.functionAssignment.create({
      data: {
        tenantId: tenant.id,
        functionId: leaveApproverFunc.id,
        userId: userRM.id,
        scopeType: FunctionScopeType.PRACTICE,
        scopeEntityId: practiceTech.id,
        assignedById: userAdmin.id,
        approvalStatus: 'APPROVED',
      },
    });
    console.log(`   Assigned Leave Approver to ${userRM.email} for ${practiceTech.name}`);
  }

  console.log('🧩 Seeding request packs and blueprints...');
  const requestBlueprintSeedResult = await seedRequestBlueprints(prisma);
  console.log(
    `   Seeded ${requestBlueprintSeedResult.packCode} with ${requestBlueprintSeedResult.requestTypeCount} request types and ${requestBlueprintSeedResult.blueprintCount} blueprints`
  );

  console.log('✅ Seeding complete!');
  console.log('');
  console.log('📝 Sample login credentials:');
  console.log('   Email: admin@newvision.in');
  console.log(`   Password: ${process.env.SEED_ADMIN_PASSWORD ? '(set via SEED_ADMIN_PASSWORD env var)' : 'Password123!@#'}`);
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

