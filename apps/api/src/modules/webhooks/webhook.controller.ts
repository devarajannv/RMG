import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as webhookService from './webhook.service';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /api/v1/webhooks
 * List all webhooks for tenant
 */
router.get(
  '/',
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const webhooks = await webhookService.listWebhooks(req.tenantId!);
      res.json({ data: webhooks });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/webhooks
 * Register a new webhook
 */
router.post(
  '/',
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({
        name: z.string().min(1).max(100),
        url: z.string().url(),
        events: z.array(z.string()).min(1),
        secret: z.string().optional(),
        headers: z.record(z.string()).optional(),
      });

      const input = schema.parse(req.body);

      const webhook = await webhookService.registerWebhook(req.tenantId!, input);

      res.status(201).json({ data: webhook });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/webhooks/events
 * Get available webhook events
 */
router.get(
  '/events',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const events = webhookService.getAvailableEvents();
      res.json({ data: events });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/webhooks/:id
 * Get webhook by ID
 */
router.get(
  '/:id',
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const webhook = await webhookService.getWebhook(req.tenantId!, req.params.id);
      
      if (!webhook) {
        return res.status(404).json({ error: 'Webhook not found' });
      }

      res.json({ data: webhook });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/v1/webhooks/:id
 * Update webhook
 */
router.patch(
  '/:id',
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = z.object({
        name: z.string().min(1).max(100).optional(),
        url: z.string().url().optional(),
        events: z.array(z.string()).min(1).optional(),
        isActive: z.boolean().optional(),
        secret: z.string().optional(),
        headers: z.record(z.string()).optional(),
      });

      const input = schema.parse(req.body);

      const webhook = await webhookService.updateWebhook(
        req.tenantId!,
        req.params.id,
        input
      );

      if (!webhook) {
        return res.status(404).json({ error: 'Webhook not found' });
      }

      res.json({ data: webhook });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/webhooks/:id
 * Delete webhook
 */
router.delete(
  '/:id',
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const deleted = await webhookService.deleteWebhook(req.tenantId!, req.params.id);

      if (!deleted) {
        return res.status(404).json({ error: 'Webhook not found' });
      }

      res.json({ message: 'Webhook deleted' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/webhooks/:id/deliveries
 * Get delivery history for webhook
 */
router.get(
  '/:id/deliveries',
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const deliveries = await webhookService.getDeliveries(
        req.tenantId!,
        req.params.id,
        limit
      );

      res.json({ data: deliveries });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/webhooks/deliveries/:deliveryId/retry
 * Retry a failed delivery
 */
router.post(
  '/deliveries/:deliveryId/retry',
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const success = await webhookService.retryDelivery(
        req.tenantId!,
        req.params.deliveryId
      );

      if (!success) {
        return res.status(400).json({ 
          error: 'Cannot retry delivery - not found or already succeeded' 
        });
      }

      res.json({ message: 'Retry initiated' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/webhooks/:id/test
 * Send test webhook
 */
router.post(
  '/:id/test',
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const webhook = await webhookService.getWebhook(req.tenantId!, req.params.id);
      
      if (!webhook) {
        return res.status(404).json({ error: 'Webhook not found' });
      }

      // Trigger a test event
      await webhookService.triggerWebhook(req.tenantId!, 'test.ping', {
        message: 'Test webhook delivery',
        timestamp: new Date().toISOString(),
        webhookId: webhook.id,
      });

      res.json({ message: 'Test webhook sent' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

