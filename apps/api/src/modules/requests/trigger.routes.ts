/**
 * Request Trigger Routes
 * API endpoints for managing request triggers and inbound webhooks
 */

import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requirePermission } from '../../middleware/rbac';
import * as triggerController from './trigger.controller';

const router = Router();

// ============================================================================
// Inbound Webhook Management (Authenticated)
// ============================================================================

/**
 * @swagger
 * /api/triggers/webhooks:
 *   post:
 *     summary: Create inbound webhook
 *     tags: [Triggers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - source
 *             properties:
 *               name:
 *                 type: string
 *                 description: Webhook name
 *               source:
 *                 type: string
 *                 enum: [HUBSPOT, SALESFORCE, STRIPE, JIRA, SLACK, TEAMS, CUSTOM]
 *               description:
 *                 type: string
 *               signatureHeader:
 *                 type: string
 *                 description: Header containing signature for validation
 *               signatureAlgo:
 *                 type: string
 *                 description: Signature algorithm (e.g., hmac-sha256)
 *     responses:
 *       201:
 *         description: Webhook created
 */
router.post(
  '/webhooks',
  authenticate,
  requirePermission('triggers:manage'),
  triggerController.createInboundWebhook
);

/**
 * @swagger
 * /api/triggers/webhooks:
 *   get:
 *     summary: List inbound webhooks
 *     tags: [Triggers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: includeInactive
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of webhooks
 */
router.get(
  '/webhooks',
  authenticate,
  requirePermission('triggers:read'),
  triggerController.listInboundWebhooks
);

/**
 * @swagger
 * /api/triggers/webhooks/{webhookId}:
 *   get:
 *     summary: Get inbound webhook by ID
 *     tags: [Triggers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: webhookId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Webhook details
 */
router.get(
  '/webhooks/:webhookId',
  authenticate,
  requirePermission('triggers:read'),
  triggerController.getInboundWebhook
);

/**
 * @swagger
 * /api/triggers/webhooks/{webhookId}:
 *   patch:
 *     summary: Update inbound webhook
 *     tags: [Triggers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: webhookId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Updated webhook
 */
router.patch(
  '/webhooks/:webhookId',
  authenticate,
  requirePermission('triggers:manage'),
  triggerController.updateInboundWebhook
);

/**
 * @swagger
 * /api/triggers/webhooks/{webhookId}/regenerate-secret:
 *   post:
 *     summary: Regenerate webhook secret key
 *     tags: [Triggers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: webhookId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: New secret key
 */
router.post(
  '/webhooks/:webhookId/regenerate-secret',
  authenticate,
  requirePermission('triggers:manage'),
  triggerController.regenerateWebhookSecret
);

/**
 * @swagger
 * /api/triggers/webhooks/{webhookId}:
 *   delete:
 *     summary: Delete inbound webhook
 *     tags: [Triggers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: webhookId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Deleted
 */
router.delete(
  '/webhooks/:webhookId',
  authenticate,
  requirePermission('triggers:manage'),
  triggerController.deleteInboundWebhook
);

/**
 * @swagger
 * /api/triggers/webhooks/{webhookId}/events:
 *   get:
 *     summary: Get webhook event history
 *     tags: [Triggers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: webhookId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, PROCESSING, PROCESSED, FAILED, SKIPPED]
 *     responses:
 *       200:
 *         description: Event history
 */
router.get(
  '/webhooks/:webhookId/events',
  authenticate,
  requirePermission('triggers:read'),
  triggerController.getWebhookEvents
);

// ============================================================================
// Request Trigger Management (Authenticated)
// ============================================================================

/**
 * @swagger
 * /api/triggers:
 *   post:
 *     summary: Create request trigger
 *     tags: [Triggers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - sourceType
 *               - eventType
 *               - requestTypeConfigId
 *               - fieldMapping
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               sourceType:
 *                 type: string
 *                 enum: [WEBHOOK, MANUAL, SCHEDULED, API, INTERNAL]
 *               webhookId:
 *                 type: string
 *                 description: Required if sourceType is WEBHOOK
 *               eventType:
 *                 type: string
 *                 description: Event type to match (e.g., "deal.closed")
 *               eventFilter:
 *                 type: object
 *                 description: JSON filter conditions
 *               requestTypeConfigId:
 *                 type: string
 *                 description: Target request type configuration
 *               fieldMapping:
 *                 type: object
 *                 description: JSONPath mappings from payload to request fields
 *               defaultPriority:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH, URGENT]
 *               approvalChainId:
 *                 type: string
 *                 description: Override approval chain
 *               requireConfirmation:
 *                 type: boolean
 *                 description: If true, creates draft for review
 *               deduplicationKey:
 *                 type: string
 *                 description: JSONPath for deduplication
 *               deduplicationHours:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Trigger created
 */
router.post(
  '/',
  authenticate,
  requirePermission('triggers:manage'),
  triggerController.createRequestTrigger
);

/**
 * @swagger
 * /api/triggers:
 *   get:
 *     summary: List request triggers
 *     tags: [Triggers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: sourceType
 *         schema:
 *           type: string
 *           enum: [WEBHOOK, MANUAL, SCHEDULED, API, INTERNAL]
 *       - in: query
 *         name: webhookId
 *         schema:
 *           type: string
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of triggers
 */
router.get(
  '/',
  authenticate,
  requirePermission('triggers:read'),
  triggerController.listRequestTriggers
);

/**
 * @swagger
 * /api/triggers/{triggerId}:
 *   get:
 *     summary: Get request trigger by ID
 *     tags: [Triggers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: triggerId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Trigger details
 */
router.get(
  '/:triggerId',
  authenticate,
  requirePermission('triggers:read'),
  triggerController.getRequestTrigger
);

/**
 * @swagger
 * /api/triggers/{triggerId}:
 *   patch:
 *     summary: Update request trigger
 *     tags: [Triggers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: triggerId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               eventType:
 *                 type: string
 *               eventFilter:
 *                 type: object
 *               fieldMapping:
 *                 type: object
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Updated trigger
 */
router.patch(
  '/:triggerId',
  authenticate,
  requirePermission('triggers:manage'),
  triggerController.updateRequestTrigger
);

/**
 * @swagger
 * /api/triggers/{triggerId}:
 *   delete:
 *     summary: Delete request trigger
 *     tags: [Triggers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: triggerId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Deleted
 */
router.delete(
  '/:triggerId',
  authenticate,
  requirePermission('triggers:manage'),
  triggerController.deleteRequestTrigger
);

/**
 * @swagger
 * /api/triggers/{triggerId}/executions:
 *   get:
 *     summary: Get trigger execution history
 *     tags: [Triggers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: triggerId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [SUCCESS, SKIPPED_FILTER, SKIPPED_DUPLICATE, SKIPPED_INACTIVE, FAILED_MAPPING, FAILED_VALIDATION, FAILED_ERROR]
 *     responses:
 *       200:
 *         description: Execution history
 */
router.get(
  '/:triggerId/executions',
  authenticate,
  requirePermission('triggers:read'),
  triggerController.getTriggerExecutions
);

/**
 * @swagger
 * /api/triggers/{triggerId}/execute:
 *   post:
 *     summary: Manually execute trigger (for testing)
 *     tags: [Triggers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: triggerId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - payload
 *             properties:
 *               payload:
 *                 type: object
 *                 description: Simulated webhook payload
 *     responses:
 *       200:
 *         description: Execution result
 */
router.post(
  '/:triggerId/execute',
  authenticate,
  requirePermission('triggers:manage'),
  triggerController.manuallyExecuteTrigger
);

export default router;
