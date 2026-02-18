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
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const isActive = req.query.isActive === 'true' ? true : 
                       req.query.isActive === 'false' ? false : undefined;
      
      const result = await webhookService.listWebhooks(req.tenantId!, {
        isActive,
        limit,
        offset,
      });
      res.json({ data: result.webhooks, total: result.total });
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
        secret: z.string().min(32, 'Secret must be at least 32 characters'),
        maxRetries: z.number().int().min(0).max(10).optional(),
        retryDelaySeconds: z.number().int().min(10).max(3600).optional(),
      });

      const input = schema.parse(req.body);

      const webhook = await webhookService.registerWebhook(
        req.tenantId!,
        req.user!.id,
        {
          ...input,
          events: input.events as webhookService.WebhookConfig['events'],
        }
      );

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
  async (_req: Request, res: Response, next: NextFunction) => {
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
        res.status(404).json({ error: 'Webhook not found' });
        return;
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
        secret: z.string().min(32).optional(),
        maxRetries: z.number().int().min(0).max(10).optional(),
        retryDelaySeconds: z.number().int().min(10).max(3600).optional(),
      });

      const input = schema.parse(req.body);

      const webhook = await webhookService.updateWebhook(
        req.tenantId!,
        req.params.id,
        {
          ...input,
          events: input.events as webhookService.WebhookConfig['events'],
        }
      );

      if (!webhook) {
        res.status(404).json({ error: 'Webhook not found' });
        return;
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
        res.status(404).json({ error: 'Webhook not found' });
        return;
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
      const offset = parseInt(req.query.offset as string) || 0;
      const status = req.query.status as 'pending' | 'success' | 'failed' | undefined;

      const result = await webhookService.getDeliveries(
        req.tenantId!,
        req.params.id,
        { limit, offset, status }
      );

      res.json({ data: result.deliveries, total: result.total });
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
      const success = await webhookService.retryDelivery(req.params.deliveryId);

      if (!success) {
        res.status(400).json({ 
          error: 'Cannot retry delivery - not found or already delivered' 
        });
        return;
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
      const result = await webhookService.testWebhook(req.tenantId!, req.params.id);
      
      if (!result) {
        res.status(404).json({ error: 'Webhook not found' });
        return;
      }

      res.json({ 
        message: result.success ? 'Test webhook delivered' : 'Test webhook failed',
        success: result.success,
        statusCode: result.statusCode,
        duration: result.responseTime,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/webhooks/:id/stats
 * Get webhook statistics
 */
router.get(
  '/:id/stats',
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await webhookService.getWebhookStats(
        req.tenantId!,
        req.params.id
      );
      
      if (!stats) {
        res.status(404).json({ error: 'Webhook not found' });
        return;
      }

      res.json({ data: stats });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/webhooks/health
 * Get webhook system health for tenant
 */
router.get(
  '/health',
  authorize('admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const health = await webhookService.getTenantWebhookHealth(req.tenantId!);
      res.json({ data: health });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

