import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { API_URL } from './helpers';
import { hashPassword } from '../../lib/password';

type JsonRecord = Record<string, unknown>;

const DATABASE_URL =
  process.env.E2E_DATABASE_URL ||
  'postgresql://rmgaas:rmgaas_dev@localhost:5432/rmgaas?schema=public';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL,
    },
  },
});

let accessCookie: string;
let foreignTenantId: string;
let foreignRoleId: string;
let usersTestTenantId: string;
let usersTestRoleId: string;
let usersTestUserId: string;
let csrfCookie: string;
let csrfHeaderToken: string;
const usersTestEmail = 'users-remediation-admin@newvision.test';
const usersTestPassword = 'Str0ng!Pass1234';
const foreignTenantSlug = 'users-remediation-foreign-tenant';
const e2eHeaders = { 'x-e2e-test-mode': '1' };

function getSetCookieHeaders(response: Response): string[] {
  const headersWithGetSetCookie = response.headers as Headers & {
    getSetCookie?: () => string[];
  };

  if (typeof headersWithGetSetCookie.getSetCookie === 'function') {
    return headersWithGetSetCookie.getSetCookie();
  }

  const raw = response.headers.get('set-cookie');
  if (!raw) {
    return [];
  }

  return raw.split(/,(?=\s*[^;]+=)/g);
}

function extractCookie(response: Response, cookieName: string): string | null {
  const setCookieHeaders = getSetCookieHeaders(response);
  const cookie = setCookieHeaders.find((header) => header.startsWith(`${cookieName}=`));

  if (!cookie) {
    return null;
  }

  return cookie.split(';')[0];
}

describe('E2E: Users remediation high-fidelity checks', () => {
  beforeAll(async () => {
    await prisma.$connect();

    const newvisionTenant = await prisma.tenant.findFirst({
      where: {
        slug: 'newvision',
      },
      select: { id: true },
    });

    if (!newvisionTenant) {
      throw new Error('Seed tenant `newvision` not found for users remediation E2E');
    }

    usersTestTenantId = newvisionTenant.id;

    const usersTestRole = await prisma.role.create({
      data: {
        tenantId: usersTestTenantId,
        name: `USERS_REMEDIATION_ROLE_${Date.now()}`,
        description: 'Role for users remediation E2E actor',
        permissions: ['users:create'],
      },
      select: { id: true },
    });

    usersTestRoleId = usersTestRole.id;

    const passwordHash = await hashPassword(usersTestPassword);

    const usersTestUser = await prisma.user.upsert({
      where: {
        tenantId_email: {
          tenantId: usersTestTenantId,
          email: usersTestEmail,
        },
      },
      update: {
        passwordHash,
        status: 'ACTIVE',
        emailVerified: true,
        firstName: 'Users',
        lastName: 'Remediation',
      },
      create: {
        tenantId: usersTestTenantId,
        email: usersTestEmail,
        passwordHash,
        firstName: 'Users',
        lastName: 'Remediation',
        status: 'ACTIVE',
        emailVerified: true,
      },
      select: { id: true },
    });

    usersTestUserId = usersTestUser.id;

    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: usersTestUserId,
          roleId: usersTestRoleId,
        },
      },
      update: {
        assignedBy: usersTestUserId,
      },
      create: {
        userId: usersTestUserId,
        roleId: usersTestRoleId,
        assignedBy: usersTestUserId,
      },
    });

    const loginResponse = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...e2eHeaders,
      },
      body: JSON.stringify({
        email: usersTestEmail,
        password: usersTestPassword,
      }),
    });

    if (loginResponse.status !== 200) {
      throw new Error(`Unable to login admin user for users remediation E2E: ${loginResponse.status}`);
    }

    const cookie = extractCookie(loginResponse, 'accessToken');
    if (!cookie) {
      throw new Error('No accessToken cookie found for users remediation E2E login');
    }

    accessCookie = cookie;

    const csrfSeedResponse = await fetch(`${API_URL}/api/v1/auth/me`, {
      method: 'GET',
      headers: {
        ...e2eHeaders,
        Cookie: accessCookie,
      },
    });

    if (csrfSeedResponse.status !== 200) {
      throw new Error(`Unable to seed CSRF token for users remediation E2E: ${csrfSeedResponse.status}`);
    }

    const xsrf = extractCookie(csrfSeedResponse, 'XSRF-TOKEN');
    if (!xsrf) {
      throw new Error('No XSRF-TOKEN cookie found for users remediation E2E');
    }

    csrfCookie = xsrf;
    csrfHeaderToken = xsrf.split('=')[1];

    const foreignTenant = await prisma.tenant.upsert({
      where: { slug: foreignTenantSlug },
      update: {
        deletedAt: null,
        status: 'ACTIVE',
      },
      create: {
        name: 'Users Remediation Foreign Tenant',
        slug: foreignTenantSlug,
        status: 'ACTIVE',
      },
      select: { id: true },
    });

    foreignTenantId = foreignTenant.id;

    const foreignRole = await prisma.role.create({
      data: {
        tenantId: foreignTenantId,
        name: `USERS_REMEDIATION_FOREIGN_ROLE_${Date.now()}`,
        description: 'Cross-tenant role for users remediation test',
        permissions: [],
      },
      select: { id: true },
    });

    foreignRoleId = foreignRole.id;
  });

  afterAll(async () => {
    const roleIdsToCleanup = [usersTestRoleId, foreignRoleId].filter(
      (roleId): roleId is string => Boolean(roleId)
    );

    if (roleIdsToCleanup.length > 0) {
      await prisma.userRole.deleteMany({
        where: {
          roleId: {
            in: roleIdsToCleanup,
          },
        },
      });
    }

    await prisma.userRole.deleteMany({
      where: {
        OR: [
          {
            userId: usersTestUserId,
            roleId: usersTestRoleId,
          },
          {
            roleId: foreignRoleId,
          },
        ],
      },
    });

    await prisma.role.deleteMany({
      where: {
        id: usersTestRoleId,
      },
    });

    await prisma.user.deleteMany({
      where: {
        id: usersTestUserId,
      },
    });

    await prisma.role.deleteMany({
      where: {
        id: foreignRoleId,
      },
    });

    await prisma.tenant.deleteMany({
      where: {
        id: foreignTenantId,
        slug: foreignTenantSlug,
      },
    });

    await prisma.$disconnect();
  });

  it('USERS-HF-001: rejects malformed create payload via route validation in live API path', async () => {
    const response = await fetch(`${API_URL}/api/v1/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...e2eHeaders,
        'x-xsrf-token': csrfHeaderToken,
        Cookie: `${accessCookie}; ${csrfCookie}`,
      },
      body: JSON.stringify({
        email: 'not-an-email',
        firstName: 'John',
        lastName: 'Doe',
        password: 'Str0ng!Pass1234',
      }),
    });

    const body = (await response.json()) as JsonRecord;

    expect(response.status).toBe(400);
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('USERS-HF-002: rejects cross-tenant role assignment during user creation', async () => {
    const response = await fetch(`${API_URL}/api/v1/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...e2eHeaders,
        'x-xsrf-token': csrfHeaderToken,
        Cookie: `${accessCookie}; ${csrfCookie}`,
      },
      body: JSON.stringify({
        email: `users-remediation-${Date.now()}@newvision.test`,
        firstName: 'Users',
        lastName: 'Remediation',
        password: 'Str0ng!Pass1234',
        roleIds: [foreignRoleId],
      }),
    });

    const body = (await response.json()) as JsonRecord;

    expect(response.status).toBe(400);
    expect(body.error).toBe('One or more roleIds are invalid for this tenant');
  });
});
