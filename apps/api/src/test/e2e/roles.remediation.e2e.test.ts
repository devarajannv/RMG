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

const actorEmail = 'roles-remediation-actor@newvision.test';
const targetEmail = 'roles-remediation-target@newvision.test';
const testPassword = 'Str0ng!Pass1234';

let actorUserId: string;
let targetUserId: string;
let actorRoleId: string;
let targetBaseRoleId: string;
let assignedRoleId: string;
let tenantId: string;

let actorAccessCookie: string;
let actorCsrfCookie: string;
let actorCsrfHeaderToken: string;
let targetAccessCookie: string;
let targetRefreshCookie: string;

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

describe('E2E: Roles remediation high-fidelity checks', () => {
  beforeAll(async () => {
    await prisma.$connect();

    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'newvision' },
      select: { id: true },
    });

    if (!tenant) {
      throw new Error('Seed tenant `newvision` not found for roles remediation E2E');
    }

    tenantId = tenant.id;

    actorRoleId = (
      await prisma.role.create({
        data: {
          tenantId,
          name: `ROLES_REMEDIATION_ASSIGNER_${Date.now()}`,
          description: 'Role with role:assign permission for E2E remediation validation',
          permissions: ['role:assign'],
        },
        select: { id: true },
      })
    ).id;

    targetBaseRoleId = (
      await prisma.role.create({
        data: {
          tenantId,
          name: `ROLES_REMEDIATION_TARGET_BASE_${Date.now()}`,
          description: 'Base role for target login identity',
          permissions: ['resources:read:own'],
        },
        select: { id: true },
      })
    ).id;

    assignedRoleId = (
      await prisma.role.create({
        data: {
          tenantId,
          name: `ROLES_REMEDIATION_ASSIGNED_${Date.now()}`,
          description: 'Role assigned during remediation test',
          permissions: ['projects:read'],
        },
        select: { id: true },
      })
    ).id;

    const passwordHash = await hashPassword(testPassword);

    actorUserId = (
      await prisma.user.upsert({
        where: {
          tenantId_email: {
            tenantId,
            email: actorEmail,
          },
        },
        update: {
          passwordHash,
          firstName: 'Roles',
          lastName: 'Actor',
          status: 'ACTIVE',
          emailVerified: true,
        },
        create: {
          tenantId,
          email: actorEmail,
          passwordHash,
          firstName: 'Roles',
          lastName: 'Actor',
          status: 'ACTIVE',
          emailVerified: true,
        },
        select: { id: true },
      })
    ).id;

    targetUserId = (
      await prisma.user.upsert({
        where: {
          tenantId_email: {
            tenantId,
            email: targetEmail,
          },
        },
        update: {
          passwordHash,
          firstName: 'Roles',
          lastName: 'Target',
          status: 'ACTIVE',
          emailVerified: true,
        },
        create: {
          tenantId,
          email: targetEmail,
          passwordHash,
          firstName: 'Roles',
          lastName: 'Target',
          status: 'ACTIVE',
          emailVerified: true,
        },
        select: { id: true },
      })
    ).id;

    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: actorUserId,
          roleId: actorRoleId,
        },
      },
      update: {
        assignedBy: actorUserId,
      },
      create: {
        userId: actorUserId,
        roleId: actorRoleId,
        assignedBy: actorUserId,
      },
    });

    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: targetUserId,
          roleId: targetBaseRoleId,
        },
      },
      update: {
        assignedBy: actorUserId,
      },
      create: {
        userId: targetUserId,
        roleId: targetBaseRoleId,
        assignedBy: actorUserId,
      },
    });

    const actorLoginResponse = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: actorEmail,
        password: testPassword,
      }),
    });

    if (actorLoginResponse.status !== 200) {
      throw new Error(`Unable to login actor user for roles remediation E2E: ${actorLoginResponse.status}`);
    }

    const actorCookie = extractCookie(actorLoginResponse, 'accessToken');
    if (!actorCookie) {
      throw new Error('No accessToken cookie found for roles actor user');
    }

    actorAccessCookie = actorCookie;

    const actorCsrfSeedResponse = await fetch(`${API_URL}/api/v1/auth/me`, {
      method: 'GET',
      headers: {
        Cookie: actorAccessCookie,
      },
    });

    if (actorCsrfSeedResponse.status !== 200) {
      throw new Error(`Unable to seed CSRF token for roles actor user: ${actorCsrfSeedResponse.status}`);
    }

    const actorXsrf = extractCookie(actorCsrfSeedResponse, 'XSRF-TOKEN');
    if (!actorXsrf) {
      throw new Error('No XSRF-TOKEN cookie found for roles actor user');
    }

    actorCsrfCookie = actorXsrf;
    actorCsrfHeaderToken = actorXsrf.split('=')[1];

    const targetLoginResponse = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: targetEmail,
        password: testPassword,
      }),
    });

    if (targetLoginResponse.status !== 200) {
      throw new Error(`Unable to login target user for roles remediation E2E: ${targetLoginResponse.status}`);
    }

    const targetCookie = extractCookie(targetLoginResponse, 'accessToken');
    if (!targetCookie) {
      throw new Error('No accessToken cookie found for roles target user');
    }

    targetAccessCookie = targetCookie;

    const refreshCookie = extractCookie(targetLoginResponse, 'refreshToken');
    if (!refreshCookie) {
      throw new Error('No refreshToken cookie found for roles target user');
    }

    targetRefreshCookie = refreshCookie;
  });

  afterAll(async () => {
    await prisma.userRole.deleteMany({
      where: {
        userId: {
          in: [actorUserId, targetUserId],
        },
      },
    });

    await prisma.roleAssignmentAudit.deleteMany({
      where: {
        tenantId,
        userId: {
          in: [actorUserId, targetUserId],
        },
      },
    });

    await prisma.role.deleteMany({
      where: {
        id: {
          in: [actorRoleId, targetBaseRoleId, assignedRoleId],
        },
      },
    });

    await prisma.user.deleteMany({
      where: {
        id: {
          in: [actorUserId, targetUserId],
        },
      },
    });

    await prisma.$disconnect();
  });

  it('ROLES-HF-001: invalidates existing target session after role assignment via live API path', async () => {
    const assignResponse = await fetch(`${API_URL}/api/v1/roles/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-xsrf-token': actorCsrfHeaderToken,
        Cookie: `${actorAccessCookie}; ${actorCsrfCookie}`,
      },
      body: JSON.stringify({
        userId: targetUserId,
        roleId: assignedRoleId,
      }),
    });

    const assignBody = (await assignResponse.json()) as JsonRecord;

    expect(assignResponse.status).toBe(200);
    expect(assignBody.message).toBe('Role assigned successfully');

    const targetRefreshResponse = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        Cookie: `${targetAccessCookie}; ${targetRefreshCookie}`,
      },
    });

    const targetRefreshBody = (await targetRefreshResponse.json()) as JsonRecord;

    expect(targetRefreshResponse.status).toBe(401);
    expect(['Invalid refresh token', 'Session expired']).toContain(targetRefreshBody.error);
  });
});
