/**
 * Integration Test Setup
 * Uses Testcontainers to spin up real PostgreSQL database
 */

import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

let container: StartedPostgreSqlContainer;
let prisma: PrismaClient;

export async function setupTestDatabase(): Promise<{
  prisma: PrismaClient;
  connectionString: string;
}> {
  // Start PostgreSQL container
  console.log('🐳 Starting PostgreSQL container...');
  container = await new PostgreSqlContainer('postgres:15-alpine')
    .withDatabase('rmgaas_test')
    .withUsername('test')
    .withPassword('test')
    .withExposedPorts(5432)
    .start();

  const connectionString = container.getConnectionUri();
  console.log(`✅ PostgreSQL container started at ${connectionString}`);

  // Set environment variable for Prisma
  process.env.DATABASE_URL = connectionString;

  // Run Prisma migrations
  console.log('🔄 Running database migrations...');
  execSync('npx prisma db push --skip-generate', {
    env: { ...process.env, DATABASE_URL: connectionString },
    cwd: process.cwd(),
    stdio: 'pipe',
  });
  console.log('✅ Migrations complete');

  // Create Prisma client
  prisma = new PrismaClient({
    datasources: {
      db: { url: connectionString },
    },
  });

  await prisma.$connect();
  console.log('✅ Connected to test database');

  return { prisma, connectionString };
}

export async function teardownTestDatabase(): Promise<void> {
  console.log('🧹 Cleaning up test database...');
  
  if (prisma) {
    await prisma.$disconnect();
  }
  
  if (container) {
    await container.stop();
    console.log('✅ PostgreSQL container stopped');
  }
}

export async function cleanDatabase(client: PrismaClient): Promise<void> {
  // Delete in correct order to respect foreign key constraints
  const tablesToClean = [
    'AuditLog',
    'RequestHistory',
    'RequestComment',
    'RequestApproval',
    'RequestAttachment',
    'SlaBreachEvent',
    'Request',
    'ApprovalChainStep',
    'ApprovalChain',
    'Delegation',
    'Allocation',
    'TimesheetEntry',
    'TimesheetPeriod',
    'Contract',
    'Project',
    'Client',
    'ResourceSkill',
    'Resource',
    'Skill',
    'SkillCategory',
    'Practice',
    'Location',
    'UserRole',
    'Role',
    'User',
    'Tenant',
  ];

  for (const table of tablesToClean) {
    try {
      await client.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`);
    } catch {
      // Table might not exist in some test scenarios
    }
  }
}

export async function seedTestData(client: PrismaClient): Promise<{
  tenant: { id: string; slug: string };
  user: { id: string; email: string };
  resource: { id: string; employeeId: string };
}> {
  // Create tenant
  const tenant = await client.tenant.create({
    data: {
      name: 'Test Organization',
      slug: 'test-org',
      tier: 'PRO',
      status: 'ACTIVE',
    },
  });

  // Create user
  const user = await client.user.create({
    data: {
      tenantId: tenant.id,
      email: 'admin@test.com',
      passwordHash: '$2b$10$test.hash.for.testing',
      firstName: 'Admin',
      lastName: 'User',
      status: 'ACTIVE',
    },
  });

  // Create practice
  const practice = await client.practice.create({
    data: {
      tenantId: tenant.id,
      name: 'Engineering',
      code: 'ENG',
    },
  });

  // Create location
  const location = await client.location.create({
    data: {
      tenantId: tenant.id,
      name: 'Bangalore',
      code: 'BLR',
      type: 'OFFICE',
    },
  });

  // Create resource
  const resource = await client.resource.create({
    data: {
      tenantId: tenant.id,
      employeeId: 'EMP001',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@test.com',
      status: 'ACTIVE',
      practiceId: practice.id,
      locationId: location.id,
    },
  });

  return {
    tenant: { id: tenant.id, slug: tenant.slug },
    user: { id: user.id, email: user.email },
    resource: { id: resource.id, employeeId: resource.employeeId },
  };
}

export { prisma, container };
