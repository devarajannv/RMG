/**
 * Request Trigger Controller
 * Handles HTTP endpoints for trigger and inbound webhook management
 */

import { Request, Response, NextFunction } from 'express';
import * as triggerService from './trigger.service';
import { TriggerSourceType, InboundWebhookSource, TriggerExecutionStatus, TriggerEventStatus } from '@prisma/client';

// ============================================================================
// Inbound Webhook Endpoints
// ============================================================================

/**
 * Create inbound webhook
 * POST /api/triggers/webhooks
 */
export async function createInboundWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const { tenantId, id: userId } = req.user!;
    const webhook = await triggerService.createInboundWebhook(tenantId, userId, {
      name: req.body.name,
      source: req.body.source as InboundWebhookSource,
      description: req.body.description,
      signatureHeader: req.body.signatureHeader,
      signatureAlgo: req.body.signatureAlgo,
    });
    res.status(201).json(webhook);
  } catch (error) {
    next(error);
  }
}

/**
 * List inbound webhooks
 * GET /api/triggers/webhooks
 */
export async function listInboundWebhooks(req: Request, res: Response, next: NextFunction) {
  try {
    const { tenantId } = req.user!;
    const includeInactive = req.query.includeInactive === 'true';
    const webhooks = await triggerService.listInboundWebhooks(tenantId, { includeInactive });
    res.json(webhooks);
  } catch (error) {
    next(error);
  }
}

/**
 * Get inbound webhook by ID
 * GET /api/triggers/webhooks/:webhookId
 */
export async function getInboundWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const { tenantId } = req.user!;
    const { webhookId } = req.params;
    const webhook = await triggerService.getInboundWebhook(tenantId, webhookId);
    res.json(webhook);
  } catch (error) {
    next(error);
  }
}

/**
 * Update inbound webhook
 * PATCH /api/triggers/webhooks/:webhookId
 */
export async function updateInboundWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const { tenantId } = req.user!;
    const { webhookId } = req.params;
    const webhook = await triggerService.updateInboundWebhook(tenantId, webhookId, req.body);
    res.json(webhook);
  } catch (error) {
    next(error);
  }
}

/**
 * Regenerate webhook secret
 * POST /api/triggers/webhooks/:webhookId/regenerate-secret
 */
export async function regenerateWebhookSecret(req: Request, res: Response, next: NextFunction) {
  try {
    const { tenantId } = req.user!;
    const { webhookId } = req.params;
    const result = await triggerService.regenerateWebhookSecret(tenantId, webhookId);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Delete inbound webhook
 * DELETE /api/triggers/webhooks/:webhookId
 */
export async function deleteInboundWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const { tenantId } = req.user!;
    const { webhookId } = req.params;
    await triggerService.deleteInboundWebhook(tenantId, webhookId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

/**
 * Get webhook events
 * GET /api/triggers/webhooks/:webhookId/events
 */
export async function getWebhookEvents(req: Request, res: Response, next: NextFunction) {
  try {
    const { tenantId } = req.user!;
    const { webhookId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as TriggerEventStatus | undefined;
    
    const result = await triggerService.getWebhookEvents(tenantId, webhookId, { page, limit, status });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// Request Trigger Endpoints
// ============================================================================

/**
 * Create request trigger
 * POST /api/triggers
 */
export async function createRequestTrigger(req: Request, res: Response, next: NextFunction) {
  try {
    const { tenantId, id: userId } = req.user!;
    const trigger = await triggerService.createRequestTrigger(tenantId, userId, {
      name: req.body.name,
      description: req.body.description,
      sourceType: req.body.sourceType as TriggerSourceType,
      webhookId: req.body.webhookId,
      eventType: req.body.eventType,
      eventFilter: req.body.eventFilter,
      requestTypeConfigId: req.body.requestTypeConfigId,
      fieldMapping: req.body.fieldMapping,
      defaultPriority: req.body.defaultPriority,
      defaultMetadata: req.body.defaultMetadata,
      approvalChainId: req.body.approvalChainId,
      requireConfirmation: req.body.requireConfirmation,
      deduplicationKey: req.body.deduplicationKey,
      deduplicationHours: req.body.deduplicationHours,
    });
    res.status(201).json(trigger);
  } catch (error) {
    next(error);
  }
}

/**
 * List request triggers
 * GET /api/triggers
 */
export async function listRequestTriggers(req: Request, res: Response, next: NextFunction) {
  try {
    const { tenantId } = req.user!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    
    const result = await triggerService.listRequestTriggers(
      tenantId,
      {
        sourceType: req.query.sourceType as TriggerSourceType | undefined,
        webhookId: req.query.webhookId as string | undefined,
        isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
        search: req.query.search as string | undefined,
      },
      { page, limit }
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Get request trigger by ID
 * GET /api/triggers/:triggerId
 */
export async function getRequestTrigger(req: Request, res: Response, next: NextFunction) {
  try {
    const { tenantId } = req.user!;
    const { triggerId } = req.params;
    const trigger = await triggerService.getRequestTrigger(tenantId, triggerId);
    res.json(trigger);
  } catch (error) {
    next(error);
  }
}

/**
 * Update request trigger
 * PATCH /api/triggers/:triggerId
 */
export async function updateRequestTrigger(req: Request, res: Response, next: NextFunction) {
  try {
    const { tenantId } = req.user!;
    const { triggerId } = req.params;
    const trigger = await triggerService.updateRequestTrigger(tenantId, triggerId, req.body);
    res.json(trigger);
  } catch (error) {
    next(error);
  }
}

/**
 * Delete request trigger
 * DELETE /api/triggers/:triggerId
 */
export async function deleteRequestTrigger(req: Request, res: Response, next: NextFunction) {
  try {
    const { tenantId } = req.user!;
    const { triggerId } = req.params;
    await triggerService.deleteRequestTrigger(tenantId, triggerId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

/**
 * Get trigger executions
 * GET /api/triggers/:triggerId/executions
 */
export async function getTriggerExecutions(req: Request, res: Response, next: NextFunction) {
  try {
    const { tenantId } = req.user!;
    const { triggerId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as TriggerExecutionStatus | undefined;
    
    const result = await triggerService.getTriggerExecutions(tenantId, triggerId, { page, limit, status });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Manually execute trigger (for testing)
 * POST /api/triggers/:triggerId/execute
 */
export async function manuallyExecuteTrigger(req: Request, res: Response, next: NextFunction) {
  try {
    const { tenantId } = req.user!;
    const { triggerId } = req.params;
    const payload = req.body.payload || {};
    
    const result = await triggerService.manuallyExecuteTrigger(tenantId, triggerId, payload);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// Inbound Webhook Receiver (Public Endpoint)
// ============================================================================

/**
 * Receive inbound webhook (public endpoint - no auth required)
 * POST /api/webhooks/inbound/:endpointPath
 */
export async function receiveInboundWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const { endpointPath } = req.params;
    
    // Find webhook by endpoint path
    const webhook = await triggerService.getInboundWebhookByEndpoint(endpointPath);
    
    if (!webhook || !webhook.isActive) {
      return res.status(404).json({ error: 'Webhook endpoint not found' });
    }

    // Get signature from header
    const signature = webhook.signatureHeader
      ? req.headers[webhook.signatureHeader.toLowerCase()] as string
      : undefined;

    // Extract event type from payload or headers
    const eventType = extractEventType(req.body, req.headers as Record<string, string>, webhook.source);

    // Process the webhook event
    const results = await triggerService.processWebhookEvent({
      webhookId: webhook.id,
      eventType,
      payload: req.body,
      headers: req.headers as Record<string, string>,
      signature,
    });

    // Return success (most webhook providers expect 200/202)
    res.status(202).json({
      received: true,
      eventType,
      triggers: results.length,
      results: results.map((r) => ({
        triggerId: r.triggerId,
        status: r.status,
        requestNumber: r.requestNumber,
      })),
    });
  } catch (error) {
    // Always return 200/202 to webhook providers to prevent retries
    // Log the error but don't expose it
    console.error('Webhook processing error:', error);
    res.status(202).json({ received: true, error: 'Processing failed' });
  }
}

/**
 * Extract event type from webhook payload based on source
 */
function extractEventType(
  payload: Record<string, unknown>,
  headers: Record<string, string>,
  source: string
): string {
  // HubSpot
  if (source === 'HUBSPOT') {
    // HubSpot sends event type in payload
    if (Array.isArray(payload)) {
      return (payload[0] as Record<string, unknown>)?.subscriptionType as string || 'unknown';
    }
    return payload.subscriptionType as string || 'unknown';
  }

  // Salesforce
  if (source === 'SALESFORCE') {
    return payload.event as string || payload.type as string || 'unknown';
  }

  // Stripe
  if (source === 'STRIPE') {
    return payload.type as string || 'unknown';
  }

  // Jira
  if (source === 'JIRA') {
    return payload.webhookEvent as string || 'unknown';
  }

  // Slack
  if (source === 'SLACK') {
    return payload.type as string || payload.event?.type as string || 'unknown';
  }

  // Teams
  if (source === 'TEAMS') {
    return payload.type as string || 'unknown';
  }

  // Custom - check common patterns
  return (
    payload.event as string ||
    payload.eventType as string ||
    payload.type as string ||
    headers['x-event-type'] ||
    'unknown'
  );
}
