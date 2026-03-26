/**
 * H-07: Data Retention & Purge Service
 * 
 * Configurable data retention policies for:
 * - Audit logs: 90 days (configurable)
 * - Password history: Managed by password.ts (keeps last N)
 * - Expired sessions: Cleaned by Redis TTL
 * - AI conversation logs: 30 days (configurable)
 * - Failed login attempts: 7 days
 */

import { prisma } from './prisma';
import { logger } from './logger';

interface RetentionPolicy {
  name: string;
  retentionDays: number;
  purge: () => Promise<number>;
}

const AUDIT_LOG_RETENTION_DAYS = parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || '90', 10);
const AI_CONVERSATION_RETENTION_DAYS = parseInt(process.env.AI_CONVERSATION_RETENTION_DAYS || '30', 10);
const PASSWORD_HISTORY_RETENTION_DAYS = parseInt(process.env.PASSWORD_HISTORY_RETENTION_DAYS || '365', 10);

const policies: RetentionPolicy[] = [
  {
    name: 'AuditLogs',
    retentionDays: AUDIT_LOG_RETENTION_DAYS,
    purge: async () => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - AUDIT_LOG_RETENTION_DAYS);
      const result = await prisma.auditLog.deleteMany({
        where: { timestamp: { lt: cutoff } },
      });
      return result.count;
    },
  },
  {
    name: 'AIConversations',
    retentionDays: AI_CONVERSATION_RETENTION_DAYS,
    purge: async () => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - AI_CONVERSATION_RETENTION_DAYS);
      
      // Delete messages first (FK constraint), then conversations
      const oldConversations = await prisma.agentConversation.findMany({
        where: { updatedAt: { lt: cutoff } },
        select: { id: true },
      });
      
      if (oldConversations.length === 0) return 0;
      
      const ids = oldConversations.map(c => c.id);
      
      await prisma.agentMessage.deleteMany({
        where: { conversationId: { in: ids } },
      });
      
      const result = await prisma.agentConversation.deleteMany({
        where: { id: { in: ids } },
      });
      
      return result.count;
    },
  },
  {
    name: 'PasswordHistory',
    retentionDays: PASSWORD_HISTORY_RETENTION_DAYS,
    purge: async () => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - PASSWORD_HISTORY_RETENTION_DAYS);
      const result = await prisma.passwordHistory.deleteMany({
        where: { createdAt: { lt: cutoff } },
      });
      return result.count;
    },
  },
];

/**
 * Run all data retention purge jobs
 * Should be called on a schedule (e.g., daily cron or on server startup)
 */
export async function runDataRetentionPurge(): Promise<void> {
  logger.info('Starting data retention purge...');
  
  for (const policy of policies) {
    try {
      const deletedCount = await policy.purge();
      if (deletedCount > 0) {
        logger.info(`Data retention: Purged ${deletedCount} ${policy.name} records older than ${policy.retentionDays} days`);
      } else {
        logger.debug(`Data retention: No ${policy.name} records to purge`);
      }
    } catch (error) {
      logger.error(`Data retention: Failed to purge ${policy.name}`, { error });
    }
  }
  
  logger.info('Data retention purge completed');
}

/**
 * Schedule daily purge using setInterval
 * Call this once during server startup
 */
export function scheduleDataRetention(): void {
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  
  // Run once on startup (delayed by 30 seconds to let server initialize)
  setTimeout(() => {
    runDataRetentionPurge().catch(err => {
      logger.error('Initial data retention purge failed', { error: err });
    });
  }, 30_000);
  
  // Then run every 24 hours
  setInterval(() => {
    runDataRetentionPurge().catch(err => {
      logger.error('Scheduled data retention purge failed', { error: err });
    });
  }, TWENTY_FOUR_HOURS);
  
  logger.info('Data retention scheduled: daily purge enabled');
}
