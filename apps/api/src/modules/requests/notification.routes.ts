/**
 * Notification Routes
 * API routes for notification management
 */

import { Router } from 'express';
import { authenticate, requireRoles } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/errorHandler';
import * as controller from './notification.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ============================================================================
// Read Notifications
// ============================================================================

/**
 * @route GET /api/v1/notifications
 * @desc Get notifications for current user
 * @access Private
 */
router.get('/', asyncHandler(controller.getNotifications));

/**
 * @route GET /api/v1/notifications/unread-count
 * @desc Get unread notification count
 * @access Private
 */
router.get('/unread-count', asyncHandler(controller.getUnreadCount));

/**
 * @route GET /api/v1/notifications/stats
 * @desc Get notification statistics
 * @access Private
 */
router.get('/stats', asyncHandler(controller.getNotificationStats));

// ============================================================================
// Notification Preferences (must be before /:id routes)
// ============================================================================

/**
 * @route GET /api/v1/notifications/preferences
 * @desc Get notification preferences
 * @access Private
 */
router.get('/preferences', asyncHandler(controller.getPreferences));

/**
 * @route PUT /api/v1/notifications/preferences
 * @desc Update a notification preference
 * @access Private
 */
router.put('/preferences', asyncHandler(controller.updatePreference));

/**
 * @route PUT /api/v1/notifications/preferences/bulk
 * @desc Bulk update notification preferences
 * @access Private
 */
router.put('/preferences/bulk', asyncHandler(controller.bulkUpdatePreferences));

/**
 * @route POST /api/v1/notifications/preferences/reset
 * @desc Reset preferences to defaults
 * @access Private
 */
router.post('/preferences/reset', asyncHandler(controller.resetPreferences));

/**
 * @route GET /api/v1/notifications/:id
 * @desc Get notification by ID
 * @access Private
 */
router.get('/:id', asyncHandler(controller.getNotificationById));

// ============================================================================
// Update Notifications
// ============================================================================

/**
 * @route PUT /api/v1/notifications/mark-all-read
 * @desc Mark all notifications as read
 * @access Private
 */
router.put('/mark-all-read', asyncHandler(controller.markAllAsRead));

/**
 * @route PUT /api/v1/notifications/mark-read
 * @desc Mark multiple notifications as read
 * @access Private
 */
router.put('/mark-read', asyncHandler(controller.markManyAsRead));

/**
 * @route PUT /api/v1/notifications/:id/read
 * @desc Mark notification as read
 * @access Private
 */
router.put('/:id/read', asyncHandler(controller.markAsRead));

// ============================================================================
// Delete Notifications
// ============================================================================

/**
 * @route DELETE /api/v1/notifications/:id
 * @desc Delete a notification
 * @access Private
 */
router.delete('/:id', asyncHandler(controller.deleteNotification));

// ============================================================================
// Admin Operations
// ============================================================================

/**
 * @route POST /api/v1/notifications/cleanup
 * @desc Cleanup old notifications (Admin)
 * @access Private (Admin)
 */
router.post('/cleanup', requireRoles('ADMIN'), asyncHandler(controller.cleanupNotifications));

/**
 * @route POST /api/v1/notifications/test
 * @desc Create a test notification (Admin)
 * @access Private (Admin)
 */
router.post('/test', requireRoles('ADMIN'), asyncHandler(controller.createTestNotification));

export default router;
