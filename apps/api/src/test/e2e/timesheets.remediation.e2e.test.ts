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

const scopedReaderEmail = 'timesheets-remediation-scoped@newvision.test';
const testPassword = 'Str0ng!Pass1234';

let tenantId: string;
let scopedReaderUserId: string;
let scopedReaderRoleId: string;
let scopedReaderAccessCookie: string;

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

describe('E2E: Timesheets remediation high-fidelity checks', () => {
  beforeAll(async () => {
    await prisma.$connect();

    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'newvision' },
      select: { id: true },
    });

    if (!tenant) {
      throw new Error('Seed tenant `newvision` not found for timesheets remediation E2E');
    }

    tenantId = tenant.id;

    scopedReaderRoleId = (
      await prisma.role.create({
        data: {
          tenantId,
          name: `TIMESHEETS_REMEDIATION_SCOPED_${Date.now()}`,
          description: 'Scoped timesheet reader role for remediation validation',
          permissions: ['timesheet:read'],
        },
        select: { id: true },
      })
    ).id;

    const passwordHash = await hashPassword(testPassword);

    scopedReaderUserId = (
      await prisma.user.upsert({
        where: {
          tenantId_email: {
            tenantId,
            email: scopedReaderEmail,
          },
        },
        update: {
          passwordHash,
          firstName: 'Timesheets',
          lastName: 'Scoped',
          status: 'ACTIVE',
          emailVerified: true,
        },
        create: {
          tenantId,
          email: scopedReaderEmail,
          passwordHash,
          firstName: 'Timesheets',
          lastName: 'Scoped',
          status: 'ACTIVE',
          emailVerified: true,
        },
        select: { id: true },
      })
    ).id;

    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: scopedReaderUserId,
          roleId: scopedReaderRoleId,
        },
      },
      update: {
        assignedBy: scopedReaderUserId,
      },
      create: {
        userId: scopedReaderUserId,
        roleId: scopedReaderRoleId,
        assignedBy: scopedReaderUserId,
      },
    });

    await prisma.resource.deleteMany({
      where: {
        tenantId,
        email: scopedReaderEmail,
      },
    });

    const scopedReaderLoginResponse = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: scopedReaderEmail, password: testPassword }),
    });

    if (scopedReaderLoginResponse.status !== 200) {
      throw new Error(
        `Unable to login scoped reader user for timesheets remediation E2E: ${scopedReaderLoginResponse.status}`
      );
    }

    const scopedReaderCookie = extractCookie(scopedReaderLoginResponse, 'accessToken');
    if (!scopedReaderCookie) {
      throw new Error('No accessToken cookie found for timesheets scoped reader user');
    }

    scopedReaderAccessCookie = scopedReaderCookie;
  });

  afterAll(async () => {
    await prisma.userRole.deleteMany({
      where: {
        userId: scopedReaderUserId,
        roleId: scopedReaderRoleId,
      },
    });

    await prisma.role.deleteMany({ where: { id: scopedReaderRoleId } });
    await prisma.user.deleteMany({ where: { id: scopedReaderUserId } });

    await prisma.$disconnect();
  });

  it('TIMESHEETS-HF-001: blocks scoped reader without linked resource from unscoped list access', async () => {
    const listResponse = await fetch(`${API_URL}/api/v1/timesheets`, {
      method: 'GET',
      headers: {
        Cookie: scopedReaderAccessCookie,
      },
    });

    const listBody = (await listResponse.json()) as JsonRecord;

    expect(listResponse.status).toBe(403);
    expect(listBody.error).toBe('No linked resource found for scoped timesheet access');
  });
});
