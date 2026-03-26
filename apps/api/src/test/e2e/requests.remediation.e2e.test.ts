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

const actorEmail = 'requests-remediation-actor@newvision.test';
const nonParticipantEmail = 'requests-remediation-viewer@newvision.test';
const testPassword = 'Str0ng!Pass1234';

let tenantId: string;
let actorUserId: string;
let nonParticipantUserId: string;
let creatorRoleId: string;
let readerRoleId: string;
let requestTypeId: string;
let createdRequestId: string;
const createdApprovalChainIds: string[] = [];

let actorAccessCookie: string;
let actorCsrfCookie: string;
let actorCsrfHeaderToken: string;
let nonParticipantAccessCookie: string;

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

describe('E2E: Requests remediation high-fidelity checks', () => {
  beforeAll(async () => {
    await prisma.$connect();

    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'newvision' },
      select: { id: true },
    });

    if (!tenant) {
      throw new Error('Seed tenant `newvision` not found for requests remediation E2E');
    }

    tenantId = tenant.id;

    const passwordHash = await hashPassword(testPassword);

    creatorRoleId = (
      await prisma.role.create({
        data: {
          tenantId,
          name: `REQUESTS_REMEDIATION_CREATOR_${Date.now()}`,
          description: 'Allows creating and reading requests',
          permissions: ['request:create', 'request:read', 'workflow:manage'],
        },
        select: { id: true },
      })
    ).id;

    readerRoleId = (
      await prisma.role.create({
        data: {
          tenantId,
          name: `REQUESTS_REMEDIATION_READER_${Date.now()}`,
          description: 'Allows reading requests',
          permissions: ['request:read'],
        },
        select: { id: true },
      })
    ).id;

    requestTypeId = (
      await prisma.requestType.create({
        data: {
          code: `REQ_REM_${Date.now()}`,
          name: 'Requests Remediation Visibility Type',
          description: 'Type for visibility-scope remediation checks',
          category: 'OTHER',
          tenantId,
          isSystemType: false,
          requiredFields: [],
          sensitiveFields: [],
          visibilityScope: 'PARTICIPANTS',
        },
        select: { id: true },
      })
    ).id;

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
          firstName: 'Requests',
          lastName: 'Actor',
          status: 'ACTIVE',
          emailVerified: true,
        },
        create: {
          tenantId,
          email: actorEmail,
          passwordHash,
          firstName: 'Requests',
          lastName: 'Actor',
          status: 'ACTIVE',
          emailVerified: true,
        },
        select: { id: true },
      })
    ).id;

    nonParticipantUserId = (
      await prisma.user.upsert({
        where: {
          tenantId_email: {
            tenantId,
            email: nonParticipantEmail,
          },
        },
        update: {
          passwordHash,
          firstName: 'Requests',
          lastName: 'Viewer',
          status: 'ACTIVE',
          emailVerified: true,
        },
        create: {
          tenantId,
          email: nonParticipantEmail,
          passwordHash,
          firstName: 'Requests',
          lastName: 'Viewer',
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
          roleId: creatorRoleId,
        },
      },
      update: {
        assignedBy: actorUserId,
      },
      create: {
        userId: actorUserId,
        roleId: creatorRoleId,
        assignedBy: actorUserId,
      },
    });

    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: nonParticipantUserId,
          roleId: readerRoleId,
        },
      },
      update: {
        assignedBy: actorUserId,
      },
      create: {
        userId: nonParticipantUserId,
        roleId: readerRoleId,
        assignedBy: actorUserId,
      },
    });

    const actorLoginResponse = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: actorEmail, password: testPassword }),
    });

    if (actorLoginResponse.status !== 200) {
      throw new Error(`Unable to login actor user for requests remediation E2E: ${actorLoginResponse.status}`);
    }

    const actorCookie = extractCookie(actorLoginResponse, 'accessToken');
    if (!actorCookie) {
      throw new Error('No accessToken cookie found for requests actor user');
    }
    actorAccessCookie = actorCookie;

    const actorCsrfSeedResponse = await fetch(`${API_URL}/api/v1/auth/me`, {
      method: 'GET',
      headers: { Cookie: actorAccessCookie },
    });

    if (actorCsrfSeedResponse.status !== 200) {
      throw new Error(`Unable to seed CSRF token for requests actor user: ${actorCsrfSeedResponse.status}`);
    }

    const actorXsrf = extractCookie(actorCsrfSeedResponse, 'XSRF-TOKEN');
    if (!actorXsrf) {
      throw new Error('No XSRF-TOKEN cookie found for requests actor user');
    }

    actorCsrfCookie = actorXsrf;
    actorCsrfHeaderToken = actorXsrf.split('=')[1];

    const nonParticipantLoginResponse = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: nonParticipantEmail, password: testPassword }),
    });

    if (nonParticipantLoginResponse.status !== 200) {
      throw new Error(`Unable to login non-participant user for requests remediation E2E: ${nonParticipantLoginResponse.status}`);
    }

    const nonParticipantCookie = extractCookie(nonParticipantLoginResponse, 'accessToken');
    if (!nonParticipantCookie) {
      throw new Error('No accessToken cookie found for requests non-participant user');
    }
    nonParticipantAccessCookie = nonParticipantCookie;
  });

  afterAll(async () => {
    if (createdRequestId) {
      await prisma.requestHistory.deleteMany({ where: { requestId: createdRequestId } });
      await prisma.request.deleteMany({ where: { id: createdRequestId } });
    }

    if (createdApprovalChainIds.length > 0) {
      await prisma.approvalChain.deleteMany({
        where: {
          id: {
            in: createdApprovalChainIds,
          },
        },
      });
    }

    await prisma.userRole.deleteMany({
      where: {
        userId: {
          in: [actorUserId, nonParticipantUserId],
        },
      },
    });

    await prisma.requestType.deleteMany({ where: { id: requestTypeId } });

    await prisma.role.deleteMany({
      where: {
        id: {
          in: [creatorRoleId, readerRoleId],
        },
      },
    });

    await prisma.user.deleteMany({
      where: {
        id: {
          in: [actorUserId, nonParticipantUserId],
        },
      },
    });

    await prisma.$disconnect();
  });

  it('REQUESTS-HF-001: blocks non-participant from reading PARTICIPANTS-scoped request', async () => {
    const type = await prisma.requestType.findUnique({ where: { id: requestTypeId }, select: { code: true } });
    if (!type) {
      throw new Error('Requests remediation type was not found while creating request');
    }

    const createResponse = await fetch(`${API_URL}/api/v1/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-xsrf-token': actorCsrfHeaderToken,
        Cookie: `${actorAccessCookie}; ${actorCsrfCookie}`,
      },
      body: JSON.stringify({
        typeCode: type.code,
        title: `Requests remediation visibility ${Date.now()}`,
        requestData: {},
      }),
    });

    const createBody = (await createResponse.json()) as JsonRecord;

    expect(createResponse.status).toBe(201);
    expect(createBody.success).toBe(true);

    const created = createBody.data as JsonRecord;
    createdRequestId = created.id as string;

    const forbiddenReadResponse = await fetch(`${API_URL}/api/v1/requests/${createdRequestId}`, {
      method: 'GET',
      headers: {
        Cookie: nonParticipantAccessCookie,
      },
    });

    const forbiddenBody = (await forbiddenReadResponse.json()) as JsonRecord;

    expect(forbiddenReadResponse.status).toBe(403);
    expect(forbiddenBody.error).toBe('You do not have access to this request');
  });

  it('REQUESTS-HF-002: creates approval chains without code and auto-suffixes on conflict', async () => {
    const uniqueSeed = Date.now();
    const chainName = `Remediation Workflow ${uniqueSeed}`;

    const chainPayload = {
      name: chainName,
      scope: 'TENANT',
      steps: [
        {
          name: 'Step 1',
          stepOrder: 1,
          approverType: 'ROLE',
          approverRoleId: creatorRoleId,
          approvalMode: 'ANY',
          onConflict: 'REJECTION_WINS',
        },
      ],
    };

    const firstCreateResponse = await fetch(`${API_URL}/api/v1/approval-chains`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-xsrf-token': actorCsrfHeaderToken,
        Cookie: `${actorAccessCookie}; ${actorCsrfCookie}`,
      },
      body: JSON.stringify(chainPayload),
    });

    const firstBody = (await firstCreateResponse.json()) as JsonRecord;

    expect(firstCreateResponse.status).toBe(201);
    expect(firstBody.success).toBe(true);

    const firstCreated = firstBody.data as JsonRecord;
    const firstCode = firstCreated.code as string;
    createdApprovalChainIds.push(firstCreated.id as string);

    expect(firstCode).toBe(`REMEDIATION_WORKFLOW_${uniqueSeed}`);

    const secondCreateResponse = await fetch(`${API_URL}/api/v1/approval-chains`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-xsrf-token': actorCsrfHeaderToken,
        Cookie: `${actorAccessCookie}; ${actorCsrfCookie}`,
      },
      body: JSON.stringify(chainPayload),
    });

    const secondBody = (await secondCreateResponse.json()) as JsonRecord;

    expect(secondCreateResponse.status).toBe(201);
    expect(secondBody.success).toBe(true);

    const secondCreated = secondBody.data as JsonRecord;
    const secondCode = secondCreated.code as string;
    createdApprovalChainIds.push(secondCreated.id as string);

    expect(secondCode).toBe(`${firstCode}_2`);
  });
});
