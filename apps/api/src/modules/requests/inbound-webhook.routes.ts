/**
 * Inbound Webhook Public Routes
 * These routes are PUBLIC - they receive webhooks from external services
 * No authentication required (signatures are validated in the handler)
 */

import { Router } from 'express';
import * as triggerController from './trigger.controller';
import { webhookInboundLimiter } from '../../middleware/rateLimiter';

const router = Router();

/**
 * @swagger
 * /api/webhooks/inbound/{endpointPath}:
 *   post:
 *     summary: Receive inbound webhook (public endpoint)
 *     tags: [Webhooks]
 *     description: |
 *       This endpoint receives webhooks from external services like HubSpot, Salesforce, Stripe, etc.
 *       No authentication is required - signature validation is done using the webhook's secret key.
 *     parameters:
 *       - in: path
 *         name: endpointPath
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique endpoint path for this webhook
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Webhook payload from external service
 *     responses:
 *       202:
 *         description: Webhook received and processing
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 received:
 *                   type: boolean
 *                 eventType:
 *                   type: string
 *                 triggers:
 *                   type: integer
 *                   description: Number of triggers matched
 *       404:
 *         description: Webhook endpoint not found
 */
router.post('/:endpointPath', webhookInboundLimiter, triggerController.receiveInboundWebhook);

export default router;
