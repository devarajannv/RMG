/**
 * Notification Service
 * Real-time notifications, email integration, in-app notifications
 * Matches actual schema: Notification and NotificationPreference models
 */

import { Prisma, NotificationType, NotificationChannel } from '@prisma/client';
import prisma from '../../lib/prisma';
import { ApiError } from '../../middleware/errorHandler';
import { logger } from '../../lib/logger';
import { wsManager, WS_EVENTS } from '../../lib/websocket';

// ============================================================================
// Types
// ============================================================================

interface CreateNotificationInput {
  userId: string;
  tenantId: string;
  type: NotificationType;
  title: string;
  message: string;
  requestId?: string;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  expiresAt?: Date;
}

interface BulkNotificationInput {
  userIds: string[];
  tenantId: string;
  type: NotificationType;
  title: string;
  message: string;
  requestId?: string;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
}

// ============================================================================
// Create Notifications
// ============================================================================

/**
 * Create a notification for a single user
 */
export async function createNotification(input: CreateNotificationInput): Promise<Record<string, unknown>> {
  // Check user notification preferences
  const preference = await getUserPreference(input.userId, input.type, 'IN_APP');
  
  // Skip if user has disabled this notification type
  if (preference && !preference.enabled) {
    logger.debug('Notification skipped due to user preferences', { userId: input.userId, type: input.type });
    return {};
  }

  const notification = await prisma.notification.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      requestId: input.requestId,
      entityType: input.entityType,
      entityId: input.entityId,
      actionUrl: input.actionUrl,
      expiresAt: input.expiresAt,
      isRead: false,
    },
  });

  logger.info('Notification created', { 
    notificationId: notification.id, 
    userId: input.userId, 
    type: input.type 
  });

  // Send real-time notification via WebSocket
  wsManager.sendToUser(input.userId, WS_EVENTS.NOTIFICATION, {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    actionUrl: notification.actionUrl,
    createdAt: notification.createdAt,
    isRead: false,
  });

  // Also send updated unread count
  const unreadCount = await getUnreadCount(input.userId, input.tenantId);
  wsManager.sendToUser(input.userId, WS_EVENTS.NOTIFICATION_COUNT, { unreadCount });
  // TODO: Queue email if user prefers email notifications

  return notification as unknown as Record<string, unknown>;
}

/**
 * Create notifications for multiple users (bulk)
 */
export async function createBulkNotifications(input: BulkNotificationInput): Promise<number> {
  const notifications: Prisma.NotificationCreateManyInput[] = [];

  for (const userId of input.userIds) {
    // Check user preferences
    const preference = await getUserPreference(userId, input.type, 'IN_APP');
    
    if (preference && !preference.enabled) {
      continue;
    }

    notifications.push({
      tenantId: input.tenantId,
      userId,
      type: input.type,
      title: input.title,
      message: input.message,
      requestId: input.requestId,
      entityType: input.entityType,
      entityId: input.entityId,
      actionUrl: input.actionUrl,
      isRead: false,
    });
  }

  if (notifications.length === 0) {
    return 0;
  }

  const result = await prisma.notification.createMany({
    data: notifications,
  });

  logger.info('Bulk notifications created', { count: result.count });

  // Send real-time notifications via WebSocket to each user
  for (const notification of notifications) {
    wsManager.sendToUser(notification.userId, WS_EVENTS.NOTIFICATION, {
      type: notification.type,
      title: notification.title,
      message: notification.message,
      actionUrl: notification.actionUrl,
      createdAt: new Date(),
      isRead: false,
    });

    // Send updated unread count
    const unreadCount = await getUnreadCount(notification.userId, input.tenantId);
    wsManager.sendToUser(notification.userId, WS_EVENTS.NOTIFICATION_COUNT, { unreadCount });
  }

  return result.count;
}

// ============================================================================
// Request Notification Helpers
// ============================================================================

/**
 * Notify user about request assignment
 */
export async function notifyRequestAssigned(
  request: {
    id: string;
    requestNumber: string;
    title: string;
    tenantId: string;
  },
  assigneeId: string,
  assignedBy: { id: string; name: string }
): Promise<void> {
  await createNotification({
    userId: assigneeId,
    tenantId: request.tenantId,
    type: 'REQUEST_ASSIGNED',
    title: `Request ${request.requestNumber} assigned to you`,
    message: `${assignedBy.name} assigned "${request.title}" to you`,
    requestId: request.id,
    actionUrl: `/requests/${request.id}`,
  });
}

/**
 * Notify user about approval decision
 */
export async function notifyApprovalDecision(
  request: {
    id: string;
    requestNumber: string;
    title: string;
    requesterId: string;
    tenantId: string;
  },
  decision: 'APPROVED' | 'REJECTED' | 'RETURNED',
  approver: { id: string; name: string },
  comments?: string
): Promise<void> {
  const typeMap: Record<string, NotificationType> = {
    'APPROVED': 'REQUEST_APPROVED',
    'REJECTED': 'REQUEST_REJECTED',
    'RETURNED': 'REQUEST_RETURNED',
  };

  const statusLabel = decision === 'APPROVED' ? 'approved' : 
                      decision === 'REJECTED' ? 'rejected' : 'returned for revision';

  await createNotification({
    userId: request.requesterId,
    tenantId: request.tenantId,
    type: typeMap[decision],
    title: `Request ${request.requestNumber} ${statusLabel}`,
    message: `${approver.name} has ${statusLabel} your request "${request.title}"${comments ? `: ${comments}` : ''}`,
    requestId: request.id,
    actionUrl: `/requests/${request.id}`,
  });
}

/**
 * Notify about request completion
 */
export async function notifyRequestCompleted(
  request: {
    id: string;
    requestNumber: string;
    title: string;
    requesterId: string;
    tenantId: string;
  },
  completedBy: { id: string; name: string }
): Promise<void> {
  await createNotification({
    userId: request.requesterId,
    tenantId: request.tenantId,
    type: 'REQUEST_COMPLETED',
    title: `Request ${request.requestNumber} completed`,
    message: `${completedBy.name} has completed your request "${request.title}"`,
    requestId: request.id,
    actionUrl: `/requests/${request.id}`,
  });
}

/**
 * Notify about new comment on request
 */
export async function notifyNewComment(
  request: {
    id: string;
    requestNumber: string;
    title: string;
    requesterId: string;
    assigneeId?: string | null;
    tenantId: string;
  },
  comment: { content: string; isInternal: boolean },
  commenter: { id: string; name: string }
): Promise<void> {
  const recipients: string[] = [];
  
  // Don't notify for internal comments to requester
  if (!comment.isInternal && request.requesterId !== commenter.id) {
    recipients.push(request.requesterId);
  }
  
  // Notify assignee
  if (request.assigneeId && request.assigneeId !== commenter.id && !recipients.includes(request.assigneeId)) {
    recipients.push(request.assigneeId);
  }

  // Get watchers (exclude for internal comments)
  if (!comment.isInternal) {
    const watchers = await prisma.requestWatcher.findMany({
      where: { requestId: request.id },
      select: { userId: true },
    });
    
    for (const watcher of watchers) {
      if (watcher.userId !== commenter.id && !recipients.includes(watcher.userId)) {
        recipients.push(watcher.userId);
      }
    }
  }

  if (recipients.length === 0) return;

  await createBulkNotifications({
    userIds: recipients,
    tenantId: request.tenantId,
    type: 'REQUEST_COMMENTED',
    title: `New comment on ${request.requestNumber}`,
    message: `${commenter.name} commented: ${comment.content.substring(0, 100)}${comment.content.length > 100 ? '...' : ''}`,
    requestId: request.id,
    actionUrl: `/requests/${request.id}#comments`,
  });
}

/**
 * Notify about request escalation
 */
export async function notifyRequestEscalated(
  request: {
    id: string;
    requestNumber: string;
    title: string;
    tenantId: string;
  },
  escalatedToId: string,
  reason: string
): Promise<void> {
  await createNotification({
    userId: escalatedToId,
    tenantId: request.tenantId,
    type: 'REQUEST_ESCALATED',
    title: `Request ${request.requestNumber} escalated to you`,
    message: `Request "${request.title}" has been escalated: ${reason}`,
    requestId: request.id,
    actionUrl: `/requests/${request.id}`,
  });
}

/**
 * Notify about SLA warning (approaching deadline)
 */
export async function notifySlaWarning(
  request: {
    id: string;
    requestNumber: string;
    title: string;
    assigneeId?: string | null;
    tenantId: string;
  },
  hoursRemaining: number
): Promise<void> {
  if (!request.assigneeId) return;

  await createNotification({
    userId: request.assigneeId,
    tenantId: request.tenantId,
    type: 'SLA_WARNING',
    title: `SLA warning: ${request.requestNumber}`,
    message: `Request "${request.title}" SLA deadline is approaching. ${hoursRemaining.toFixed(1)} hours remaining.`,
    requestId: request.id,
    actionUrl: `/requests/${request.id}`,
  });
}

/**
 * Notify about SLA breach
 */
export async function notifySlaBreached(
  request: {
    id: string;
    requestNumber: string;
    title: string;
    assigneeId?: string | null;
    tenantId: string;
  },
  breachType: 'RESPONSE_SLA' | 'RESOLUTION_SLA'
): Promise<void> {
  if (!request.assigneeId) return;

  const breachLabel = breachType === 'RESPONSE_SLA' ? 'Response SLA' : 'Resolution SLA';

  await createNotification({
    userId: request.assigneeId,
    tenantId: request.tenantId,
    type: 'SLA_BREACHED',
    title: `${breachLabel} breach: ${request.requestNumber}`,
    message: `Request "${request.title}" has breached the ${breachLabel.toLowerCase()}.`,
    requestId: request.id,
    actionUrl: `/requests/${request.id}`,
  });
}

/**
 * Notify about delegation creation
 */
export async function notifyDelegationCreated(
  delegatee: { id: string; name: string },
  delegator: { id: string; name: string },
  tenantId: string,
  delegation: {
    startDate: Date;
    endDate: Date;
    reason?: string;
  }
): Promise<void> {
  await createNotification({
    userId: delegatee.id,
    tenantId,
    type: 'DELEGATION_CREATED',
    title: `Approval delegation from ${delegator.name}`,
    message: `${delegator.name} has delegated their approval authority to you from ${delegation.startDate.toLocaleDateString()} to ${delegation.endDate.toLocaleDateString()}${delegation.reason ? `. Reason: ${delegation.reason}` : ''}`,
    entityType: 'Delegation',
    actionUrl: `/settings/delegations`,
  });
}

/**
 * Notify about delegation expiring soon
 */
export async function notifyDelegationExpiring(
  delegatee: { id: string },
  delegator: { name: string },
  tenantId: string,
  expiresAt: Date
): Promise<void> {
  const daysRemaining = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  await createNotification({
    userId: delegatee.id,
    tenantId,
    type: 'DELEGATION_EXPIRING',
    title: `Delegation from ${delegator.name} expiring`,
    message: `Your delegation from ${delegator.name} will expire in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}.`,
    entityType: 'Delegation',
    actionUrl: `/settings/delegations`,
  });
}

/**
 * Notify about delegation revocation
 */
export async function notifyDelegationRevoked(
  delegatee: { id: string },
  delegator: { name: string },
  tenantId: string
): Promise<void> {
  await createNotification({
    userId: delegatee.id,
    tenantId,
    type: 'DELEGATION_REVOKED',
    title: `Delegation from ${delegator.name} revoked`,
    message: `${delegator.name} has revoked the approval delegation.`,
    entityType: 'Delegation',
    actionUrl: `/settings/delegations`,
  });
}

/**
 * Create a reminder notification
 */
export async function createReminder(
  userId: string,
  tenantId: string,
  title: string,
  message: string,
  requestId?: string,
  actionUrl?: string
): Promise<Record<string, unknown>> {
  return createNotification({
    userId,
    tenantId,
    type: 'REMINDER',
    title,
    message,
    requestId,
    actionUrl,
  });
}

/**
 * Create a system notification
 */
export async function createSystemNotification(
  userId: string,
  tenantId: string,
  title: string,
  message: string
): Promise<Record<string, unknown>> {
  return createNotification({
    userId,
    tenantId,
    type: 'SYSTEM',
    title,
    message,
  });
}

// ============================================================================
// Read Notifications
// ============================================================================

/**
 * Get notifications for a user
 */
export async function getUserNotifications(
  userId: string,
  tenantId: string,
  options: {
    isRead?: boolean;
    type?: NotificationType;
    page?: number;
    limit?: number;
  } = {}
): Promise<{
  notifications: Record<string, unknown>[];
  total: number;
  unreadCount: number;
}> {
  const page = options.page || 1;
  const limit = options.limit || 20;
  const skip = (page - 1) * limit;

  const where: Prisma.NotificationWhereInput = {
    userId,
    tenantId,
  };

  if (options.isRead !== undefined) {
    where.isRead = options.isRead;
  }
  if (options.type) {
    where.type = options.type;
  }

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        request: {
          select: { requestNumber: true, title: true, status: true },
        },
      },
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, tenantId, isRead: false } }),
  ]);

  return {
    notifications: notifications as unknown as Record<string, unknown>[],
    total,
    unreadCount,
  };
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadCount(userId: string, tenantId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, tenantId, isRead: false },
  });
}

/**
 * Get notification by ID
 */
export async function getNotificationById(
  notificationId: string,
  userId: string,
  tenantId: string
): Promise<Record<string, unknown> | null> {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId, tenantId },
    include: {
      request: {
        select: { requestNumber: true, title: true, status: true },
      },
    },
  });

  return notification as unknown as Record<string, unknown> | null;
}

// ============================================================================
// Update Notifications
// ============================================================================

/**
 * Mark notification as read
 */
export async function markAsRead(
  notificationId: string,
  userId: string,
  tenantId: string
): Promise<void> {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId, tenantId },
  });

  if (!notification) {
    throw new ApiError('Notification not found', 404, 'NOTIFICATION_NOT_FOUND');
  }

  await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true, readAt: new Date() },
  });
}

/**
 * Mark multiple notifications as read
 */
export async function markManyAsRead(
  notificationIds: string[],
  userId: string,
  tenantId: string
): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: {
      id: { in: notificationIds },
      userId,
      tenantId,
    },
    data: { isRead: true, readAt: new Date() },
  });

  return result.count;
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string, tenantId: string): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: { userId, tenantId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });

  logger.info('Marked all notifications as read', { userId, count: result.count });
  return result.count;
}

// ============================================================================
// Delete Notifications
// ============================================================================

/**
 * Delete a notification
 */
export async function deleteNotification(
  notificationId: string,
  userId: string,
  tenantId: string
): Promise<void> {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId, tenantId },
  });

  if (!notification) {
    throw new ApiError('Notification not found', 404, 'NOTIFICATION_NOT_FOUND');
  }

  await prisma.notification.delete({ where: { id: notificationId } });
}

/**
 * Delete old notifications (cleanup job)
 * H-07: Scoped to tenant to prevent cross-tenant data destruction
 */
export async function deleteOldNotifications(tenantId: string, daysOld: number = 90): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const result = await prisma.notification.deleteMany({
    where: {
      tenantId,
      createdAt: { lt: cutoffDate },
      isRead: true,
    },
  });

  if (result.count > 0) {
    logger.info(`Deleted ${result.count} old notifications`);
  }

  return result.count;
}

/**
 * Delete expired notifications
 * H-07: Scoped to tenant to prevent cross-tenant data destruction
 */
export async function deleteExpiredNotifications(tenantId: string): Promise<number> {
  const now = new Date();

  const result = await prisma.notification.deleteMany({
    where: {
      tenantId,
      expiresAt: { lt: now },
    },
  });

  if (result.count > 0) {
    logger.info(`Deleted ${result.count} expired notifications`);
  }

  return result.count;
}

// ============================================================================
// Notification Preferences
// ============================================================================

/**
 * Get user preference for a specific notification type and channel
 * L-09: Accept tenantId for tenant isolation
 */
async function getUserPreference(
  userId: string,
  eventType: NotificationType,
  channel: NotificationChannel,
  tenantId?: string
): Promise<{ enabled: boolean } | null> {
  // L-09: Verify user belongs to tenant if tenantId provided
  const whereClause: Record<string, unknown> = { userId, eventType, channel };
  if (tenantId) {
    whereClause.user = { tenantId };
  }
  const preference = await prisma.notificationPreference.findFirst({
    where: whereClause as any,
  });

  return preference ? { enabled: preference.enabled } : null;
}

/**
 * Get all notification preferences for a user
 * L-09: Accept tenantId for tenant isolation
 */
export async function getUserPreferences(userId: string, tenantId?: string): Promise<Record<string, unknown>[]> {
  const whereClause: Record<string, unknown> = { userId };
  if (tenantId) {
    whereClause.user = { tenantId };
  }
  const preferences = await prisma.notificationPreference.findMany({
    where: whereClause as any,
    orderBy: [{ eventType: 'asc' }, { channel: 'asc' }],
  });

  return preferences as unknown as Record<string, unknown>[];
}

/**
 * Update a notification preference
 */
export async function updatePreference(
  userId: string,
  eventType: NotificationType,
  channel: NotificationChannel,
  enabled: boolean
): Promise<Record<string, unknown>> {
  const existing = await prisma.notificationPreference.findFirst({
    where: { userId, eventType, channel },
  });

  if (existing) {
    const updated = await prisma.notificationPreference.update({
      where: { id: existing.id },
      data: { enabled },
    });
    return updated as unknown as Record<string, unknown>;
  } else {
    const created = await prisma.notificationPreference.create({
      data: { userId, eventType, channel, enabled },
    });
    return created as unknown as Record<string, unknown>;
  }
}

/**
 * Bulk update notification preferences
 */
export async function bulkUpdatePreferences(
  userId: string,
  preferences: Array<{
    eventType: NotificationType;
    channel: NotificationChannel;
    enabled: boolean;
  }>
): Promise<number> {
  let updatedCount = 0;

  for (const pref of preferences) {
    await updatePreference(userId, pref.eventType, pref.channel, pref.enabled);
    updatedCount++;
  }

  return updatedCount;
}

/**
 * Reset preferences to defaults (enable all)
 * L-04: Verify user belongs to tenant before deleting preferences
 */
export async function resetPreferences(userId: string, tenantId?: string): Promise<void> {
  if (tenantId) {
    // Verify user belongs to this tenant
    const user = await prisma.user.findFirst({ where: { id: userId, tenantId } });
    if (!user) {
      throw new ApiError('User not found', 404, 'USER_NOT_FOUND');
    }
  }
  await prisma.notificationPreference.deleteMany({
    where: { userId },
  });

  logger.info('Notification preferences reset to defaults', { userId });
}

// ============================================================================
// Email Notifications
// ============================================================================

/**
 * Mark notification as email sent
 */
export async function markEmailSent(notificationId: string): Promise<void> {
  await prisma.notification.update({
    where: { id: notificationId },
    data: {
      emailSent: true,
      emailSentAt: new Date(),
    },
  });
}

/**
 * Get notifications pending email delivery
 */
export async function getPendingEmailNotifications(
  tenantId: string,
  limit: number = 100
): Promise<Record<string, unknown>[]> {
  // Get notifications where:
  // - Not yet emailed
  // - User has email enabled for this type
  // - Created recently (within last 24 hours)
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const notifications = await prisma.notification.findMany({
    where: {
      tenantId,
      emailSent: false,
      createdAt: { gte: cutoff },
    },
    include: {
      user: {
        select: { id: true, email: true, firstName: true, lastName: true },
      },
      request: {
        select: { requestNumber: true, title: true },
      },
    },
    take: limit,
    orderBy: { createdAt: 'asc' },
  });

  // Filter by user preferences (check if email is enabled for each notification type)
  const filteredNotifications: typeof notifications = [];

  for (const notification of notifications) {
    const preference = await getUserPreference(notification.userId, notification.type, 'EMAIL');
    if (!preference || preference.enabled) {
      filteredNotifications.push(notification);
    }
  }

  return filteredNotifications as unknown as Record<string, unknown>[];
}

// ============================================================================
// Notification Stats
// ============================================================================

/**
 * Get notification statistics for a user
 */
export async function getUserNotificationStats(
  userId: string,
  tenantId: string
): Promise<{
  total: number;
  unread: number;
  byType: Record<string, number>;
  recentCount: number;
}> {
  const [total, unread, byTypeRaw, recentCount] = await Promise.all([
    prisma.notification.count({ where: { userId, tenantId } }),
    prisma.notification.count({ where: { userId, tenantId, isRead: false } }),
    prisma.notification.groupBy({
      by: ['type'],
      where: { userId, tenantId, isRead: false },
      _count: true,
    }),
    prisma.notification.count({
      where: {
        userId,
        tenantId,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  const byType: Record<string, number> = {};
  for (const item of byTypeRaw) {
    byType[item.type] = item._count;
  }

  return { total, unread, byType, recentCount };
}
