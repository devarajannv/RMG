import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../../lib/password';
import { API_URL } from './helpers';

type JsonRecord = Record<string, unknown>;

let unverifiedUserEmail = '';
let unverifiedUserPassword = '';
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

async function loginWithRetry(email: string, password: string, attempts = 3): Promise<Response> {
  for (let index = 0; index < attempts; index++) {
    const response = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (response.status !== 429 || index === attempts - 1) {
      return response;
    }

    await new Promise((resolve) => setTimeout(resolve, 600));
  }

  throw new Error('Unreachable login retry state');
}

describe('E2E: Auth remediation high-fidelity checks', () => {
  beforeAll(async () => {
    await prisma.$connect();

    unverifiedUserEmail = 'auth-remediation-unverified@newvision.test';
    unverifiedUserPassword = 'Str0ng!Pass1234';

    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'newvision' },
      select: { id: true },
    });

    if (!tenant) {
      throw new Error('Seed tenant `newvision` not found for auth remediation E2E test.');
    }

    const passwordHash = await hashPassword(unverifiedUserPassword);

    await prisma.user.upsert({
      where: {
        tenantId_email: {
          tenantId: tenant.id,
          email: unverifiedUserEmail,
        },
      },
      update: {
        passwordHash,
        status: 'ACTIVE',
        emailVerified: false,
        firstName: 'Auth',
        lastName: 'Remediation',
      },
      create: {
        tenantId: tenant.id,
        email: unverifiedUserEmail,
        passwordHash,
        firstName: 'Auth',
        lastName: 'Remediation',
        status: 'ACTIVE',
        emailVerified: false,
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        email: unverifiedUserEmail,
      },
    });

    await prisma.$disconnect();
  });

  it('AUTH-HF-001: login response is functional and does not expose tokens in body', async () => {
    const response = await loginWithRetry(unverifiedUserEmail, unverifiedUserPassword);

    const body = (await response.json()) as JsonRecord;

    expect(response.status).toBe(200);
    expect((body.user as JsonRecord)?.email).toBe(unverifiedUserEmail);
    expect(body.tokens).toBeUndefined();

    const accessCookie = extractCookie(response, 'accessToken');
    const refreshCookie = extractCookie(response, 'refreshToken');
    expect(accessCookie).toBeTruthy();
    expect(refreshCookie).toBeTruthy();
  });

  it('AUTH-HF-002: unverified user can login but is blocked on protected route by middleware gate', async () => {
    const loginResponse = await loginWithRetry(unverifiedUserEmail, unverifiedUserPassword);

    expect(loginResponse.status).toBe(200);

    const accessCookie = extractCookie(loginResponse, 'accessToken');
    expect(accessCookie).toBeTruthy();

    const meResponse = await fetch(`${API_URL}/api/v1/auth/me`, {
      method: 'GET',
      headers: {
        Cookie: accessCookie!,
      },
    });

    const meBody = (await meResponse.json()) as JsonRecord;

    expect(meResponse.status).toBe(403);
    expect(meBody.code).toBe('EMAIL_NOT_VERIFIED');
  });
});