/**
 * GDPR Service
 * C-10: Right to Erasure (Article 17) and Data Portability (Article 20)
 *
 * Provides:
 * - Data export (all PII for a user)
 * - Data anonymization (right to erasure)
 * - Erasure request tracking
 */

import prisma from '../../lib/prisma';
import { invalidateAllUserTokens } from '../../lib/redis';
import { logger } from '../../lib/logger';
import * as crypto from 'crypto';

type GdprErasureRequestStatus = 'RECEIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';

interface GdprErasureRequest {
  id: string;
  tenantId: string;
  userId: string;
  requestedBy: string;
  status: GdprErasureRequestStatus;
  error?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

async function getTenantSettings(tenantId: string): Promise<Record<string, unknown>> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { settings: true },
  });

  return ((tenant?.settings as Record<string, unknown> | null) ?? {}) as Record<string, unknown>;
}

async function persistErasureRequest(
  tenantId: string,
  request: GdprErasureRequest
): Promise<void> {
  const settings = await getTenantSettings(tenantId);
  const gdpr = ((settings.gdpr as Record<string, unknown> | null) ?? {}) as Record<string, unknown>;
  const erasureRequests =
    ((gdpr.erasureRequests as Record<string, GdprErasureRequest> | null) ?? {}) as Record<string, GdprErasureRequest>;

  erasureRequests[request.id] = request;

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      settings: {
        ...settings,
        gdpr: {
          ...gdpr,
          erasureRequests,
        },
      },
    },
  });
}

export async function createErasureRequest(
  tenantId: string,
  userId: string,
  requestedBy: string
): Promise<GdprErasureRequest> {
  const now = new Date().toISOString();
  const request: GdprErasureRequest = {
    id: crypto.randomUUID(),
    tenantId,
    userId,
    requestedBy,
    status: 'RECEIVED',
    createdAt: now,
    updatedAt: now,
  };

  await persistErasureRequest(tenantId, request);
  return request;
}

async function updateErasureRequestStatus(
  tenantId: string,
  request: GdprErasureRequest,
  status: GdprErasureRequestStatus,
  error?: string
): Promise<GdprErasureRequest> {
  const now = new Date().toISOString();
  const updated: GdprErasureRequest = {
    ...request,
    status,
    updatedAt: now,
    ...(status === 'COMPLETED' ? { completedAt: now } : {}),
    ...(error ? { error } : {}),
  };

  await persistErasureRequest(tenantId, updated);
  return updated;
}

export async function processErasureRequest(
  request: GdprErasureRequest,
  requestedBy: string
): Promise<GdprErasureRequest> {
  const inProgress = await updateErasureRequestStatus(request.tenantId, request, 'IN_PROGRESS');

  try {
    await anonymizeUserData(inProgress.userId, inProgress.tenantId, requestedBy);
    return updateErasureRequestStatus(inProgress.tenantId, inProgress, 'COMPLETED');
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    await updateErasureRequestStatus(inProgress.tenantId, inProgress, 'FAILED', errMsg);
    throw error;
  }
}

/**
 * C-10: Export all personal data for a user (GDPR Article 20 - Data Portability)
 */
export async function exportUserData(userId: string, tenantId: string): Promise<Record<string, unknown>> {
  const user = await prisma.user.findFirst({
    where: { id: userId, tenantId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      status: true,
      emailVerified: true,
      lastLoginAt: true,
      mfaEnabled: true,
      preferences: true,
      createdAt: true,
      updatedAt: true,
      roles: {
        select: {
          role: { select: { name: true } },
          assignedAt: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Get associated resource data (if linked via user.resourceId)
  let resource = null;
  if (user) {
    const fullUser = await prisma.user.findUnique({ where: { id: userId }, select: { resourceId: true } });
    if (fullUser?.resourceId) {
      resource = await prisma.resource.findFirst({
        where: { id: fullUser.resourceId, tenantId },
        select: {
          employeeId: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          designation: true,
          band: true,
          employmentType: true,
          dateOfJoining: true,
          status: true,
        },
      });
    }
  }

  // Get audit logs for this user
  const auditLogs = await prisma.auditLog.findMany({
    where: { userId, tenantId },
    select: {
      action: true,
      entityType: true,
      entityId: true,
      timestamp: true,
    },
    orderBy: { timestamp: 'desc' },
    take: 1000,
  });

  // Audit the export itself
  await prisma.auditLog.create({
    data: {
      action: 'GDPR_EXPORT' as any,
      userId,
      tenantId,
      entityType: 'User',
      entityId: userId,
      changes: { exportedAt: new Date().toISOString() },
    },
  });

  logger.info('GDPR data export', { userId, tenantId });

  return {
    exportDate: new Date().toISOString(),
    user,
    resource: resource || null,
    auditLogs,
  };
}

/**
 * C-10: Anonymize user data (GDPR Article 17 - Right to Erasure)
 * Replaces PII with anonymized values rather than hard deleting
 */
export async function anonymizeUserData(
  userId: string,
  tenantId: string,
  requestedBy: string
): Promise<void> {
  const user = await prisma.user.findFirst({
    where: { id: userId, tenantId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const anonymizedEmail = `anonymized-${userId.substring(0, 8)}@deleted.local`;
  const anonymizedName = 'Anonymized User';

  // Anonymize user record
  await prisma.user.update({
    where: { id: userId },
    data: {
      email: anonymizedEmail,
      firstName: anonymizedName,
      lastName: '',
      passwordHash: 'ANONYMIZED',
      status: 'INACTIVE',
      preferences: undefined,
      mfaSecret: null,
      microsoftId: null,
      googleId: null,
      deletedAt: new Date(),
    },
  });

  // Anonymize linked resource if exists
  const fullUser = await prisma.user.findUnique({ where: { id: userId }, select: { resourceId: true } });
  if (fullUser?.resourceId) {
    const resource = await prisma.resource.findFirst({
      where: { id: fullUser.resourceId, tenantId },
    });

    if (resource) {
      await prisma.resource.update({
        where: { id: resource.id },
        data: {
          firstName: anonymizedName,
          lastName: '',
          email: anonymizedEmail,
          phone: null,
          deletedAt: new Date(),
        },
      });
    }
  }

  // Delete password history
  await prisma.passwordHistory.deleteMany({
    where: { userId },
  });

  // Invalidate all sessions
  await invalidateAllUserTokens(userId);

  // Audit the erasure
  await prisma.auditLog.create({
    data: {
      action: 'GDPR_ERASURE' as any,
      userId: requestedBy,
      tenantId,
      entityType: 'User',
      entityId: userId,
      changes: {
        anonymizedAt: new Date().toISOString(),
        requestedBy,
        originalEmail: '[REDACTED]', // Don't log original PII in audit
      },
    },
  });

  logger.info('GDPR data anonymization completed', { userId, tenantId, requestedBy });
}
