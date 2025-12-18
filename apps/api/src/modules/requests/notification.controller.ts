/**
 * Notification Controller
 * HTTP handlers for notification management
 */

import { Request, Response } from 'express';
import { ApiError } from '../../middleware/errorHandler';
import * as notificationService from './notification.service';
import { NotificationType, NotificationChannel } from '@prisma/client';

// ============================================================================
// Get Notifications
// ============================================================================

/**
 * Get notifications for current user
 * GET /api/v1/notifications
 */
export async function getNotifications(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const tenantId = req.user!.tenantId;

  const options = {
    isRead: req.query.isRead === 'true' ? true : req.query.isRead === 'false' ? false : undefined,
    type: req.query.type as NotificationType | undefined,
    page: req.query.page ? parseInt(req.query.page as string) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
  };

  const result = await notificationService.getUserNotifications(userId, tenantId, options);

  res.json({
    success: true,
    data: result.notifications,
    pagination: {
      page: options.page,
      limit: options.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / options.limit),
    },
    meta: {
      unreadCount: result.unreadCount,
    },
  });
}

/**
 * Get unread notification count
 * GET /api/v1/notifications/unread-count
 */
export async function getUnreadCount(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const tenantId = req.user!.tenantId;

  const count = await notificationService.getUnreadCount(userId, tenantId);

  res.json({
    success: true,
    data: { unreadCount: count },
  });
}

/**
 * Get notification by ID
 * GET /api/v1/notifications/:id
 */
export async function getNotificationById(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  const notification = await notificationService.getNotificationById(id, userId, tenantId);

  if (!notification) {
    throw new ApiError('Notification not found', 404, 'NOTIFICATION_NOT_FOUND');
  }

  res.json({
    success: true,
    data: notification,
  });
}

/**
 * Get notification stats
 * GET /api/v1/notifications/stats
 */
export async function getNotificationStats(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const tenantId = req.user!.tenantId;

  const stats = await notificationService.getUserNotificationStats(userId, tenantId);

  res.json({
    success: true,
    data: stats,
  });
}

// ============================================================================
// Update Notifications
// ============================================================================

/**
 * Mark notification as read
 * PUT /api/v1/notifications/:id/read
 */
export async function markAsRead(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  await notificationService.markAsRead(id, userId, tenantId);

  res.json({
    success: true,
    message: 'Notification marked as read',
  });
}

/**
 * Mark multiple notifications as read
 * PUT /api/v1/notifications/mark-read
 */
export async function markManyAsRead(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const tenantId = req.user!.tenantId;

  if (!req.body.ids || !Array.isArray(req.body.ids)) {
    throw new ApiError('Notification IDs array is required', 400, 'VALIDATION_ERROR');
  }

  const count = await notificationService.markManyAsRead(req.body.ids, userId, tenantId);

  res.json({
    success: true,
    message: `${count} notification(s) marked as read`,
    data: { count },
  });
}

/**
 * Mark all notifications as read
 * PUT /api/v1/notifications/mark-all-read
 */
export async function markAllAsRead(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const tenantId = req.user!.tenantId;

  const count = await notificationService.markAllAsRead(userId, tenantId);

  res.json({
    success: true,
    message: `${count} notification(s) marked as read`,
    data: { count },
  });
}

// ============================================================================
// Delete Notifications
// ============================================================================

/**
 * Delete a notification
 * DELETE /api/v1/notifications/:id
 */
export async function deleteNotification(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  await notificationService.deleteNotification(id, userId, tenantId);

  res.json({
    success: true,
    message: 'Notification deleted',
  });
}

// ============================================================================
// Notification Preferences
// ============================================================================

/**
 * Get notification preferences
 * GET /api/v1/notifications/preferences
 */
export async function getPreferences(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;

  const preferences = await notificationService.getUserPreferences(userId);

  res.json({
    success: true,
    data: preferences,
  });
}

/**
 * Update a notification preference
 * PUT /api/v1/notifications/preferences
 */
export async function updatePreference(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;

  const { eventType, channel, enabled } = req.body;

  if (!eventType || !channel || enabled === undefined) {
    throw new ApiError('eventType, channel, and enabled are required', 400, 'VALIDATION_ERROR');
  }

  // Validate eventType
  const validEventTypes = Object.values(NotificationType);
  if (!validEventTypes.includes(eventType)) {
    throw new ApiError(`Invalid eventType. Must be one of: ${validEventTypes.join(', ')}`, 400, 'INVALID_EVENT_TYPE');
  }

  // Validate channel
  const validChannels = Object.values(NotificationChannel);
  if (!validChannels.includes(channel)) {
    throw new ApiError(`Invalid channel. Must be one of: ${validChannels.join(', ')}`, 400, 'INVALID_CHANNEL');
  }

  const preference = await notificationService.updatePreference(userId, eventType, channel, enabled);

  res.json({
    success: true,
    data: preference,
    message: 'Preference updated',
  });
}

/**
 * Bulk update notification preferences
 * PUT /api/v1/notifications/preferences/bulk
 */
export async function bulkUpdatePreferences(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;

  if (!req.body.preferences || !Array.isArray(req.body.preferences)) {
    throw new ApiError('Preferences array is required', 400, 'VALIDATION_ERROR');
  }

  const count = await notificationService.bulkUpdatePreferences(userId, req.body.preferences);

  res.json({
    success: true,
    message: `${count} preference(s) updated`,
    data: { count },
  });
}

/**
 * Reset preferences to defaults
 * POST /api/v1/notifications/preferences/reset
 */
export async function resetPreferences(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;

  await notificationService.resetPreferences(userId);

  res.json({
    success: true,
    message: 'Preferences reset to defaults',
  });
}

// ============================================================================
// Admin Operations
// ============================================================================

/**
 * Cleanup old notifications (Admin)
 * POST /api/v1/notifications/cleanup
 */
export async function cleanupNotifications(req: Request, res: Response): Promise<void> {
  const daysOld = req.body.daysOld ? parseInt(req.body.daysOld) : 90;

  const [deletedOld, deletedExpired] = await Promise.all([
    notificationService.deleteOldNotifications(daysOld),
    notificationService.deleteExpiredNotifications(),
  ]);

  res.json({
    success: true,
    message: `Cleaned up ${deletedOld + deletedExpired} notification(s)`,
    data: {
      deletedOld,
      deletedExpired,
      total: deletedOld + deletedExpired,
    },
  });
}

/**
 * Create a test notification (Admin)
 * POST /api/v1/notifications/test
 */
export async function createTestNotification(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const tenantId = req.user!.tenantId;

  const notification = await notificationService.createSystemNotification(
    userId,
    tenantId,
    'Test Notification',
    'This is a test notification to verify the notification system is working.'
  );

  res.status(201).json({
    success: true,
    data: notification,
    message: 'Test notification created',
  });
}
