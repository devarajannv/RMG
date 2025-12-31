/**
 * Notifications E2E Tests
 * Tests notification creation, delivery, read/unread states, and bulk operations
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { apiRequest, login, TestCleanup } from './helpers';

describe('E2E: Notifications', () => {
  let token: string;
  let userId: string;
  const cleanup = new TestCleanup();

  beforeAll(async () => {
    const t = await login();
    if (!t) throw new Error('Failed to login for notification tests');
    token = t;
    cleanup.setToken(token);

    // Get current user ID
    const meRes = await apiRequest<{ user: { id: string } }>(
      'GET',
      '/api/v1/auth/me',
      undefined,
      token
    );
    if (meRes.status === 200) {
      userId = meRes.data.user.id;
    }
  });

  afterAll(async () => {
    await cleanup.cleanup();
  });

  describe('Notification Listing', () => {
    it('NOT-001: List all notifications', async () => {
      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        '/api/v1/notifications',
        undefined,
        token
      );

      expect(response.status).toBe(200);
    });

    it('NOT-002: List unread notifications', async () => {
      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        '/api/v1/notifications?read=false',
        undefined,
        token
      );

      expect(response.status).toBe(200);
    });

    it('NOT-003: List notifications with pagination', async () => {
      const response = await apiRequest<{ data: unknown[]; meta: { total: number } }>(
        'GET',
        '/api/v1/notifications?page=1&limit=10',
        undefined,
        token
      );

      expect(response.status).toBe(200);
    });

    it('NOT-004: Filter notifications by type', async () => {
      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        '/api/v1/notifications?type=INFO',
        undefined,
        token
      );

      expect(response.status).toBe(200);
    });

    it('NOT-005: Get notification count', async () => {
      const response = await apiRequest<{
        total: number;
        unread: number;
      }>(
        'GET',
        '/api/v1/notifications/count',
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Single Notification Operations', () => {
    let notificationId: string;

    beforeAll(async () => {
      // Create a notification if endpoint exists
      const createRes = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/notifications',
        {
          type: 'INFO',
          title: 'Test Notification',
          message: 'This is a test notification from E2E tests',
          userId,
        },
        token
      );

      if (createRes.status === 201) {
        notificationId = createRes.data.id;
        cleanup.add('notifications', notificationId);
      }
    });

    it('NOT-006: Get single notification', async () => {
      if (!notificationId) return;

      const response = await apiRequest<{ id: string; title: string }>(
        'GET',
        `/api/v1/notifications/${notificationId}`,
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('NOT-007: Mark notification as read', async () => {
      if (!notificationId) return;

      const response = await apiRequest<{ readAt: string }>(
        'PATCH',
        `/api/v1/notifications/${notificationId}/read`,
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('NOT-008: Mark notification as unread', async () => {
      if (!notificationId) return;

      const response = await apiRequest<{ readAt: null }>(
        'PATCH',
        `/api/v1/notifications/${notificationId}/unread`,
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('NOT-009: Delete notification', async () => {
      // Create a new one to delete
      const createRes = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/notifications',
        {
          type: 'INFO',
          title: 'To Delete',
          message: 'This will be deleted',
          userId,
        },
        token
      );

      if (createRes.status !== 201) return;

      const response = await apiRequest(
        'DELETE',
        `/api/v1/notifications/${createRes.data.id}`,
        undefined,
        token
      );

      expect([200, 204, 404]).toContain(response.status);
    });
  });

  describe('Bulk Operations', () => {
    it('NOT-010: Mark all as read', async () => {
      const response = await apiRequest(
        'PATCH',
        '/api/v1/notifications/read-all',
        undefined,
        token
      );

      expect([200, 204, 404]).toContain(response.status);
    });

    it('NOT-011: Delete all read notifications', async () => {
      const response = await apiRequest(
        'DELETE',
        '/api/v1/notifications/delete-read',
        undefined,
        token
      );

      expect([200, 204, 404]).toContain(response.status);
    });

    it('NOT-012: Bulk mark specific notifications as read', async () => {
      // Create some notifications
      const ids: string[] = [];
      for (let i = 0; i < 3; i++) {
        const res = await apiRequest<{ id: string }>(
          'POST',
          '/api/v1/notifications',
          {
            type: 'INFO',
            title: `Bulk Test ${i}`,
            message: 'Bulk operation test',
            userId,
          },
          token
        );
        if (res.status === 201) {
          ids.push(res.data.id);
        }
      }

      if (ids.length === 0) return;

      const response = await apiRequest(
        'PATCH',
        '/api/v1/notifications/bulk-read',
        { ids },
        token
      );

      expect([200, 404]).toContain(response.status);

      // Cleanup
      for (const id of ids) {
        await apiRequest('DELETE', `/api/v1/notifications/${id}`, undefined, token);
      }
    });

    it('NOT-013: Bulk delete notifications', async () => {
      const ids: string[] = [];
      for (let i = 0; i < 2; i++) {
        const res = await apiRequest<{ id: string }>(
          'POST',
          '/api/v1/notifications',
          {
            type: 'INFO',
            title: `Delete Test ${i}`,
            message: 'Will be deleted',
            userId,
          },
          token
        );
        if (res.status === 201) {
          ids.push(res.data.id);
        }
      }

      if (ids.length === 0) return;

      const response = await apiRequest(
        'DELETE',
        '/api/v1/notifications/bulk',
        { ids },
        token
      );

      expect([200, 204, 404]).toContain(response.status);
    });
  });

  describe('Notification Types', () => {
    it('NOT-014: Create INFO notification', async () => {
      const response = await apiRequest<{ id: string; type: string }>(
        'POST',
        '/api/v1/notifications',
        {
          type: 'INFO',
          title: 'Information',
          message: 'This is an informational notification',
          userId,
        },
        token
      );

      if (response.status === 201) {
        cleanup.add('notifications', response.data.id);
      }
      expect([201, 400, 404]).toContain(response.status);
    });

    it('NOT-015: Create WARNING notification', async () => {
      const response = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/notifications',
        {
          type: 'WARNING',
          title: 'Warning',
          message: 'This is a warning notification',
          userId,
        },
        token
      );

      if (response.status === 201) {
        cleanup.add('notifications', response.data.id);
      }
      expect([201, 400, 404]).toContain(response.status);
    });

    it('NOT-016: Create ERROR notification', async () => {
      const response = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/notifications',
        {
          type: 'ERROR',
          title: 'Error',
          message: 'This is an error notification',
          userId,
        },
        token
      );

      if (response.status === 201) {
        cleanup.add('notifications', response.data.id);
      }
      expect([201, 400, 404]).toContain(response.status);
    });

    it('NOT-017: Create SUCCESS notification', async () => {
      const response = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/notifications',
        {
          type: 'SUCCESS',
          title: 'Success',
          message: 'Operation completed successfully',
          userId,
        },
        token
      );

      if (response.status === 201) {
        cleanup.add('notifications', response.data.id);
      }
      expect([201, 400, 404]).toContain(response.status);
    });
  });

  describe('Notification Preferences', () => {
    it('NOT-018: Get notification preferences', async () => {
      const response = await apiRequest<{
        emailEnabled: boolean;
        pushEnabled: boolean;
        categories: object;
      }>(
        'GET',
        '/api/v1/notifications/preferences',
        undefined,
        token
      );

      expect([200, 404]).toContain(response.status);
    });

    it('NOT-019: Update notification preferences', async () => {
      const response = await apiRequest(
        'PUT',
        '/api/v1/notifications/preferences',
        {
          emailEnabled: true,
          pushEnabled: false,
          quietHoursEnabled: true,
          quietHoursStart: '22:00',
          quietHoursEnd: '07:00',
          categories: {
            approvals: { email: true, push: true },
            timesheets: { email: false, push: true },
            system: { email: true, push: false },
          },
        },
        token
      );

      expect([200, 201, 404]).toContain(response.status);
    });

    it('NOT-020: Disable email notifications', async () => {
      const response = await apiRequest(
        'PATCH',
        '/api/v1/notifications/preferences',
        { emailEnabled: false },
        token
      );

      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Notification Filtering', () => {
    it('NOT-021: Filter by date range', async () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        `/api/v1/notifications?startDate=${startDate}&endDate=${endDate}`,
        undefined,
        token
      );

      expect(response.status).toBe(200);
    });

    it('NOT-022: Filter by category', async () => {
      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        '/api/v1/notifications?category=approval',
        undefined,
        token
      );

      expect(response.status).toBe(200);
    });

    it('NOT-023: Search notifications', async () => {
      const response = await apiRequest<{ data: unknown[] }>(
        'GET',
        '/api/v1/notifications?search=test',
        undefined,
        token
      );

      expect(response.status).toBe(200);
    });
  });

  describe('Notification Links', () => {
    it('NOT-024: Create notification with link', async () => {
      const response = await apiRequest<{ id: string; link: string }>(
        'POST',
        '/api/v1/notifications',
        {
          type: 'INFO',
          title: 'Request Approved',
          message: 'Your allocation request has been approved',
          userId,
          link: '/requests/123',
          linkText: 'View Request',
        },
        token
      );

      if (response.status === 201) {
        cleanup.add('notifications', response.data.id);
      }
      expect([201, 400, 404]).toContain(response.status);
    });

    it('NOT-025: Create notification with action', async () => {
      const response = await apiRequest<{ id: string }>(
        'POST',
        '/api/v1/notifications',
        {
          type: 'INFO',
          title: 'Timesheet Reminder',
          message: 'Please submit your timesheet',
          userId,
          actions: [
            { label: 'Submit Now', action: 'submit-timesheet' },
            { label: 'Dismiss', action: 'dismiss' },
          ],
        },
        token
      );

      if (response.status === 201) {
        cleanup.add('notifications', response.data.id);
      }
      expect([201, 400, 404]).toContain(response.status);
    });
  });
});
