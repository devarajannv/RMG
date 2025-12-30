/**
 * Request Trigger Service
 * Manages the pipeline from external events to request creation
 * 
 * Key concepts:
 * - RequestTrigger: Defines how an event maps to a request
 * - InboundWebhook: Configuration for receiving external webhooks
 * - TriggerExecution: Audit log of trigger executions
 * - Field Mapping: JSONPath-based extraction from event payloads
 */

import {
  Prisma,
  TriggerSourceType,
  InboundWebhookSource,
  TriggerEventStatus,
  TriggerExecutionStatus,
  Priority,
  RequestStatus,
} from '@prisma/client';
import prisma from '../../lib/prisma';
import { ApiError } from '../../middleware/errorHandler';
import { logger } from '../../lib/logger';
import { submitRequest } from './request.service';
import * as crypto from 'crypto';

// ============================================================================
// Types
// ============================================================================

export interface CreateInboundWebhookInput {
  name: string;
  source: InboundWebhookSource;
  description?: string;
  signatureHeader?: string;
  signatureAlgo?: string;
}

export interface CreateRequestTriggerInput {
  name: string;
  description?: string;
  sourceType: TriggerSourceType;
  webhookId?: string;
  eventType: string;
  eventFilter?: Record<string, unknown>;
  requestTypeConfigId: string;
  fieldMapping: Record<string, string>;
  defaultPriority?: Priority;
  defaultMetadata?: Record<string, unknown>;
  approvalChainId?: string;
  requireConfirmation?: boolean;
  deduplicationKey?: string;
  deduplicationHours?: number;
}

export interface UpdateRequestTriggerInput {
  name?: string;
  description?: string;
  eventType?: string;
  eventFilter?: Record<string, unknown>;
  fieldMapping?: Record<string, string>;
  defaultPriority?: Priority;
  defaultMetadata?: Record<string, unknown>;
  approvalChainId?: string;
  isActive?: boolean;
  requireConfirmation?: boolean;
  deduplicationKey?: string;
  deduplicationHours?: number;
}

export interface ProcessWebhookEventInput {
  webhookId: string;
  eventType: string;
  payload: Record<string, unknown>;
  headers?: Record<string, string>;
  signature?: string;
}

export interface TriggerExecutionResult {
  triggerId: string;
  status: TriggerExecutionStatus;
  requestId?: string;
  requestNumber?: string;
  errorMessage?: string;
  skippedReason?: string;
}

export interface TriggerListFilters {
  sourceType?: TriggerSourceType;
  webhookId?: string;
  isActive?: boolean;
  search?: string;
}

// ============================================================================
// Inbound Webhook Management
// ============================================================================

/**
 * Create a new inbound webhook configuration
 */
export async function createInboundWebhook(
  tenantId: string,
  userId: string,
  input: CreateInboundWebhookInput
): Promise<ReturnType<typeof prisma.inboundWebhook.create>> {
  // Generate secure secret key
  const secretKey = crypto.randomBytes(32).toString('hex');
  
  // Generate unique endpoint path
  const endpointPath = `${tenantId.slice(0, 8)}-${crypto.randomBytes(8).toString('hex')}`;

  const webhook = await prisma.inboundWebhook.create({
    data: {
      tenantId,
      name: input.name,
      source: input.source,
      description: input.description,
      secretKey,
      signatureHeader: input.signatureHeader || getDefaultSignatureHeader(input.source),
      signatureAlgo: input.signatureAlgo || 'hmac-sha256',
      endpointPath,
      createdById: userId,
    },
    include: {
      triggers: true,
    },
  });

  logger.info({ tenantId, webhookId: webhook.id, source: input.source }, 'Inbound webhook created');
  return webhook;
}

/**
 * Get default signature header for known webhook sources
 */
function getDefaultSignatureHeader(source: InboundWebhookSource): string {
  switch (source) {
    case 'HUBSPOT':
      return 'X-HubSpot-Signature-v3';
    case 'SALESFORCE':
      return 'X-Salesforce-Signature';
    case 'STRIPE':
      return 'Stripe-Signature';
    case 'JIRA':
      return 'X-Hub-Signature';
    case 'SLACK':
      return 'X-Slack-Signature';
    default:
      return 'X-Webhook-Signature';
  }
}

/**
 * List inbound webhooks for a tenant
 */
export async function listInboundWebhooks(
  tenantId: string,
  options: { includeInactive?: boolean } = {}
): Promise<ReturnType<typeof prisma.inboundWebhook.findMany>> {
  return prisma.inboundWebhook.findMany({
    where: {
      tenantId,
      ...(options.includeInactive ? {} : { isActive: true }),
    },
    include: {
      triggers: {
        select: { id: true, name: true, eventType: true, isActive: true },
      },
      _count: {
        select: { events: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get inbound webhook by ID
 */
export async function getInboundWebhook(
  tenantId: string,
  webhookId: string
): Promise<ReturnType<typeof prisma.inboundWebhook.findUnique>> {
  const webhook = await prisma.inboundWebhook.findUnique({
    where: { id: webhookId },
    include: {
      triggers: true,
      events: {
        take: 20,
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!webhook || webhook.tenantId !== tenantId) {
    throw new ApiError(404, 'Inbound webhook not found');
  }

  return webhook;
}

/**
 * Get inbound webhook by endpoint path (for routing incoming requests)
 */
export async function getInboundWebhookByEndpoint(
  endpointPath: string
): Promise<ReturnType<typeof prisma.inboundWebhook.findUnique>> {
  return prisma.inboundWebhook.findUnique({
    where: { endpointPath },
    include: {
      triggers: {
        where: { isActive: true, deletedAt: null },
        include: {
          requestTypeConfig: {
            include: { requestType: true },
          },
        },
      },
    },
  });
}

/**
 * Update inbound webhook
 */
export async function updateInboundWebhook(
  tenantId: string,
  webhookId: string,
  input: Partial<CreateInboundWebhookInput> & { isActive?: boolean }
): Promise<ReturnType<typeof prisma.inboundWebhook.update>> {
  const existing = await prisma.inboundWebhook.findUnique({
    where: { id: webhookId },
  });

  if (!existing || existing.tenantId !== tenantId) {
    throw new ApiError(404, 'Inbound webhook not found');
  }

  return prisma.inboundWebhook.update({
    where: { id: webhookId },
    data: {
      name: input.name,
      description: input.description,
      signatureHeader: input.signatureHeader,
      signatureAlgo: input.signatureAlgo,
      isActive: input.isActive,
    },
  });
}

/**
 * Regenerate secret key for webhook
 */
export async function regenerateWebhookSecret(
  tenantId: string,
  webhookId: string
): Promise<{ secretKey: string }> {
  const existing = await prisma.inboundWebhook.findUnique({
    where: { id: webhookId },
  });

  if (!existing || existing.tenantId !== tenantId) {
    throw new ApiError(404, 'Inbound webhook not found');
  }

  const secretKey = crypto.randomBytes(32).toString('hex');

  await prisma.inboundWebhook.update({
    where: { id: webhookId },
    data: { secretKey },
  });

  return { secretKey };
}

/**
 * Delete inbound webhook
 */
export async function deleteInboundWebhook(
  tenantId: string,
  webhookId: string
): Promise<void> {
  const existing = await prisma.inboundWebhook.findUnique({
    where: { id: webhookId },
    include: { triggers: true },
  });

  if (!existing || existing.tenantId !== tenantId) {
    throw new ApiError(404, 'Inbound webhook not found');
  }

  if (existing.triggers.length > 0) {
    throw new ApiError(400, 'Cannot delete webhook with active triggers. Delete triggers first.');
  }

  await prisma.inboundWebhook.delete({
    where: { id: webhookId },
  });

  logger.info({ tenantId, webhookId }, 'Inbound webhook deleted');
}

// ============================================================================
// Request Trigger Management
// ============================================================================

/**
 * Create a new request trigger
 */
export async function createRequestTrigger(
  tenantId: string,
  userId: string,
  input: CreateRequestTriggerInput
): Promise<ReturnType<typeof prisma.requestTrigger.create>> {
  // Validate request type config exists and belongs to tenant
  const requestTypeConfig = await prisma.tenantRequestTypeConfig.findUnique({
    where: { id: input.requestTypeConfigId },
    include: { requestType: true },
  });

  if (!requestTypeConfig || requestTypeConfig.tenantId !== tenantId) {
    throw new ApiError(404, 'Request type configuration not found');
  }

  // Validate webhook if provided
  if (input.webhookId) {
    const webhook = await prisma.inboundWebhook.findUnique({
      where: { id: input.webhookId },
    });
    if (!webhook || webhook.tenantId !== tenantId) {
      throw new ApiError(404, 'Inbound webhook not found');
    }
  }

  // Validate approval chain if provided
  if (input.approvalChainId) {
    const chain = await prisma.approvalChain.findUnique({
      where: { id: input.approvalChainId },
    });
    if (!chain || chain.tenantId !== tenantId) {
      throw new ApiError(404, 'Approval chain not found');
    }
  }

  // Validate field mapping structure
  validateFieldMapping(input.fieldMapping);

  const trigger = await prisma.requestTrigger.create({
    data: {
      tenantId,
      name: input.name,
      description: input.description,
      sourceType: input.sourceType,
      webhookId: input.webhookId,
      eventType: input.eventType,
      eventFilter: input.eventFilter as Prisma.JsonValue,
      requestTypeConfigId: input.requestTypeConfigId,
      fieldMapping: input.fieldMapping as Prisma.JsonValue,
      defaultPriority: input.defaultPriority || 'MEDIUM',
      defaultMetadata: input.defaultMetadata as Prisma.JsonValue,
      approvalChainId: input.approvalChainId,
      requireConfirmation: input.requireConfirmation ?? false,
      deduplicationKey: input.deduplicationKey,
      deduplicationHours: input.deduplicationHours,
      createdById: userId,
    },
    include: {
      requestTypeConfig: {
        include: { requestType: true },
      },
      webhook: true,
      approvalChain: true,
    },
  });

  logger.info(
    { tenantId, triggerId: trigger.id, name: input.name, eventType: input.eventType },
    'Request trigger created'
  );

  return trigger;
}

/**
 * Validate field mapping structure
 */
function validateFieldMapping(mapping: Record<string, string>): void {
  const requiredFields = ['title'];
  const missingFields = requiredFields.filter((f) => !mapping[f]);
  
  if (missingFields.length > 0) {
    throw new ApiError(400, `Field mapping missing required fields: ${missingFields.join(', ')}`);
  }

  // Validate JSONPath syntax (basic check)
  for (const [field, path] of Object.entries(mapping)) {
    if (typeof path !== 'string') {
      throw new ApiError(400, `Invalid mapping for field '${field}': must be a string`);
    }
    if (!path.startsWith('$.') && !path.startsWith('$[') && path !== '$') {
      throw new ApiError(400, `Invalid JSONPath for field '${field}': must start with $`);
    }
  }
}

/**
 * List request triggers for a tenant
 */
export async function listRequestTriggers(
  tenantId: string,
  filters: TriggerListFilters = {},
  options: { page?: number; limit?: number } = {}
): Promise<{ triggers: ReturnType<typeof prisma.requestTrigger.findMany>; total: number }> {
  const page = options.page || 1;
  const limit = options.limit || 20;
  const skip = (page - 1) * limit;

  const where: Prisma.RequestTriggerWhereInput = {
    tenantId,
    deletedAt: null,
    ...(filters.sourceType && { sourceType: filters.sourceType }),
    ...(filters.webhookId && { webhookId: filters.webhookId }),
    ...(filters.isActive !== undefined && { isActive: filters.isActive }),
    ...(filters.search && {
      OR: [
        { name: { contains: filters.search, mode: 'insensitive' as const } },
        { description: { contains: filters.search, mode: 'insensitive' as const } },
        { eventType: { contains: filters.search, mode: 'insensitive' as const } },
      ],
    }),
  };

  const [triggers, total] = await Promise.all([
    prisma.requestTrigger.findMany({
      where,
      include: {
        requestTypeConfig: {
          include: { requestType: true },
        },
        webhook: { select: { id: true, name: true, source: true } },
        approvalChain: { select: { id: true, name: true } },
        _count: { select: { executions: true } },
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.requestTrigger.count({ where }),
  ]);

  return { triggers: triggers as any, total };
}

/**
 * Get request trigger by ID
 */
export async function getRequestTrigger(
  tenantId: string,
  triggerId: string
): Promise<ReturnType<typeof prisma.requestTrigger.findUnique>> {
  const trigger = await prisma.requestTrigger.findUnique({
    where: { id: triggerId },
    include: {
      requestTypeConfig: {
        include: { requestType: true, approvalChain: true },
      },
      webhook: true,
      approvalChain: true,
      executions: {
        take: 20,
        orderBy: { executedAt: 'desc' },
        include: {
          request: { select: { id: true, requestNumber: true, title: true, status: true } },
        },
      },
    },
  });

  if (!trigger || trigger.tenantId !== tenantId || trigger.deletedAt) {
    throw new ApiError(404, 'Request trigger not found');
  }

  return trigger;
}

/**
 * Update request trigger
 */
export async function updateRequestTrigger(
  tenantId: string,
  triggerId: string,
  input: UpdateRequestTriggerInput
): Promise<ReturnType<typeof prisma.requestTrigger.update>> {
  const existing = await prisma.requestTrigger.findUnique({
    where: { id: triggerId },
  });

  if (!existing || existing.tenantId !== tenantId || existing.deletedAt) {
    throw new ApiError(404, 'Request trigger not found');
  }

  if (input.fieldMapping) {
    validateFieldMapping(input.fieldMapping);
  }

  if (input.approvalChainId) {
    const chain = await prisma.approvalChain.findUnique({
      where: { id: input.approvalChainId },
    });
    if (!chain || chain.tenantId !== tenantId) {
      throw new ApiError(404, 'Approval chain not found');
    }
  }

  return prisma.requestTrigger.update({
    where: { id: triggerId },
    data: {
      name: input.name,
      description: input.description,
      eventType: input.eventType,
      eventFilter: input.eventFilter as Prisma.JsonValue,
      fieldMapping: input.fieldMapping as Prisma.JsonValue,
      defaultPriority: input.defaultPriority,
      defaultMetadata: input.defaultMetadata as Prisma.JsonValue,
      approvalChainId: input.approvalChainId,
      isActive: input.isActive,
      requireConfirmation: input.requireConfirmation,
      deduplicationKey: input.deduplicationKey,
      deduplicationHours: input.deduplicationHours,
    },
    include: {
      requestTypeConfig: {
        include: { requestType: true },
      },
      webhook: true,
      approvalChain: true,
    },
  });
}

/**
 * Delete request trigger (soft delete)
 */
export async function deleteRequestTrigger(
  tenantId: string,
  triggerId: string
): Promise<void> {
  const existing = await prisma.requestTrigger.findUnique({
    where: { id: triggerId },
  });

  if (!existing || existing.tenantId !== tenantId) {
    throw new ApiError(404, 'Request trigger not found');
  }

  await prisma.requestTrigger.update({
    where: { id: triggerId },
    data: { deletedAt: new Date(), isActive: false },
  });

  logger.info({ tenantId, triggerId }, 'Request trigger deleted');
}

// ============================================================================
// Webhook Event Processing
// ============================================================================

/**
 * Validate webhook signature
 */
export function validateWebhookSignature(
  payload: string,
  signature: string,
  secretKey: string,
  algorithm: string
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac(algorithm.replace('hmac-', ''), secretKey)
      .update(payload)
      .digest('hex');

    // Handle different signature formats (e.g., "sha256=xxx" or just "xxx")
    const actualSignature = signature.includes('=')
      ? signature.split('=')[1]
      : signature;

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(actualSignature)
    );
  } catch (error) {
    logger.warn({ error }, 'Signature validation error');
    return false;
  }
}

/**
 * Process incoming webhook event
 * This is the main entry point for external webhook processing
 */
export async function processWebhookEvent(
  input: ProcessWebhookEventInput
): Promise<TriggerExecutionResult[]> {
  const webhook = await prisma.inboundWebhook.findUnique({
    where: { id: input.webhookId },
    include: {
      triggers: {
        where: { isActive: true, deletedAt: null },
        include: {
          requestTypeConfig: {
            include: { requestType: true, approvalChain: true },
          },
          approvalChain: true,
        },
      },
    },
  });

  if (!webhook || !webhook.isActive) {
    throw new ApiError(404, 'Webhook not found or inactive');
  }

  // Log the event
  const webhookEvent = await prisma.inboundWebhookEvent.create({
    data: {
      webhookId: webhook.id,
      eventType: input.eventType,
      payload: input.payload as Prisma.JsonValue,
      headers: input.headers as Prisma.JsonValue,
      signatureValid: input.signature
        ? validateWebhookSignature(
            JSON.stringify(input.payload),
            input.signature,
            webhook.secretKey,
            webhook.signatureAlgo || 'hmac-sha256'
          )
        : null,
    },
  });

  // Update webhook stats
  await prisma.inboundWebhook.update({
    where: { id: webhook.id },
    data: {
      lastReceivedAt: new Date(),
      totalEventsReceived: { increment: 1 },
    },
  });

  // Find matching triggers
  const matchingTriggers = webhook.triggers.filter(
    (trigger) => trigger.eventType === input.eventType || trigger.eventType === '*'
  );

  if (matchingTriggers.length === 0) {
    await prisma.inboundWebhookEvent.update({
      where: { id: webhookEvent.id },
      data: { status: 'SKIPPED', processedAt: new Date() },
    });
    logger.info({ webhookId: webhook.id, eventType: input.eventType }, 'No matching triggers for event');
    return [];
  }

  // Execute each matching trigger
  const results: TriggerExecutionResult[] = [];

  for (const trigger of matchingTriggers) {
    const result = await executeTrigger(trigger, input.payload, webhookEvent.id);
    results.push(result);
  }

  // Update event status
  const allSuccess = results.every((r) => r.status === 'SUCCESS');
  const allSkipped = results.every((r) => r.status.startsWith('SKIPPED'));
  
  await prisma.inboundWebhookEvent.update({
    where: { id: webhookEvent.id },
    data: {
      status: allSuccess ? 'PROCESSED' : allSkipped ? 'SKIPPED' : 'FAILED',
      processedAt: new Date(),
    },
  });

  return results;
}

/**
 * Execute a single trigger against a payload
 */
export async function executeTrigger(
  trigger: Prisma.RequestTriggerGetPayload<{
    include: {
      requestTypeConfig: {
        include: { requestType: true; approvalChain: true };
      };
      approvalChain: true;
    };
  }>,
  payload: Record<string, unknown>,
  webhookEventId?: string
): Promise<TriggerExecutionResult> {
  const startTime = Date.now();

  try {
    // 1. Check if trigger is active
    if (!trigger.isActive) {
      return await logExecution(trigger.id, webhookEventId, payload, {
        status: 'SKIPPED_INACTIVE',
        skippedReason: 'Trigger is inactive',
        durationMs: Date.now() - startTime,
      });
    }

    // 2. Check event filter
    if (trigger.eventFilter) {
      const filterMatches = evaluateEventFilter(payload, trigger.eventFilter as Record<string, unknown>);
      if (!filterMatches) {
        return await logExecution(trigger.id, webhookEventId, payload, {
          status: 'SKIPPED_FILTER',
          skippedReason: 'Payload did not match event filter',
          durationMs: Date.now() - startTime,
        });
      }
    }

    // 3. Check deduplication
    if (trigger.deduplicationKey && trigger.deduplicationHours) {
      const isDuplicate = await checkDuplication(trigger, payload);
      if (isDuplicate) {
        return await logExecution(trigger.id, webhookEventId, payload, {
          status: 'SKIPPED_DUPLICATE',
          skippedReason: `Duplicate event within ${trigger.deduplicationHours} hours`,
          durationMs: Date.now() - startTime,
        });
      }
    }

    // 4. Map fields from payload
    const mappedFields = mapFields(payload, trigger.fieldMapping as Record<string, string>);
    
    if (!mappedFields.title) {
      return await logExecution(trigger.id, webhookEventId, payload, {
        status: 'FAILED_MAPPING',
        errorMessage: 'Field mapping failed: title is required',
        mappedFields,
        durationMs: Date.now() - startTime,
      });
    }

    // 5. Create the request
    const requestTypeConfig = trigger.requestTypeConfig;
    const approvalChain = trigger.approvalChain || requestTypeConfig.approvalChain;

    // Determine request status based on requireConfirmation
    const initialStatus: RequestStatus = trigger.requireConfirmation ? 'DRAFT' : 'PENDING_APPROVAL';

    // Build request data
    const requestData = {
      ...mappedFields.metadata,
      ...((trigger.defaultMetadata as Record<string, unknown>) || {}),
      _triggerId: trigger.id,
      _webhookEventId: webhookEventId,
    };

    // Create request using the request service
    const request = await submitRequest(
      trigger.tenantId,
      trigger.createdById, // Use trigger creator as system user
      {
        typeId: requestTypeConfig.requestTypeId,
        title: mappedFields.title as string,
        description: mappedFields.description as string || `Auto-created from ${trigger.name}`,
        requestData,
        priority: trigger.defaultPriority,
        resourceId: mappedFields.resourceId as string,
        projectId: mappedFields.projectId as string,
        externalRef: mappedFields.externalRef as string,
        externalUrl: mappedFields.externalUrl as string,
      },
      {
        skipValidation: false,
        autoSubmit: !trigger.requireConfirmation,
      }
    );

    logger.info(
      {
        tenantId: trigger.tenantId,
        triggerId: trigger.id,
        requestId: request.id,
        requestNumber: request.requestNumber,
      },
      'Trigger created request'
    );

    return await logExecution(trigger.id, webhookEventId, payload, {
      status: 'SUCCESS',
      requestId: request.id,
      mappedFields,
      durationMs: Date.now() - startTime,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ triggerId: trigger.id, error: errorMessage }, 'Trigger execution failed');

    return await logExecution(trigger.id, webhookEventId, payload, {
      status: 'FAILED_ERROR',
      errorMessage,
      durationMs: Date.now() - startTime,
    });
  }
}

/**
 * Log trigger execution
 */
async function logExecution(
  triggerId: string,
  webhookEventId: string | undefined,
  payload: Record<string, unknown>,
  result: {
    status: TriggerExecutionStatus;
    requestId?: string;
    errorMessage?: string;
    skippedReason?: string;
    mappedFields?: Record<string, unknown>;
    durationMs?: number;
  }
): Promise<TriggerExecutionResult> {
  const execution = await prisma.triggerExecution.create({
    data: {
      triggerId,
      webhookEventId,
      inputPayload: payload as Prisma.JsonValue,
      matchedFilter: !result.status.startsWith('SKIPPED_FILTER'),
      status: result.status,
      requestId: result.requestId,
      errorMessage: result.errorMessage,
      skippedReason: result.skippedReason,
      mappedFields: result.mappedFields as Prisma.JsonValue,
      durationMs: result.durationMs,
    },
    include: {
      request: { select: { requestNumber: true } },
    },
  });

  return {
    triggerId,
    status: result.status,
    requestId: result.requestId,
    requestNumber: execution.request?.requestNumber,
    errorMessage: result.errorMessage,
    skippedReason: result.skippedReason,
  };
}

/**
 * Evaluate event filter against payload
 * Supports simple equality, $gt, $gte, $lt, $lte, $ne, $in, $nin, $exists
 */
function evaluateEventFilter(
  payload: Record<string, unknown>,
  filter: Record<string, unknown>
): boolean {
  for (const [path, condition] of Object.entries(filter)) {
    const value = getValueByPath(payload, path);

    if (typeof condition === 'object' && condition !== null) {
      // Operator-based condition
      const ops = condition as Record<string, unknown>;
      for (const [op, expected] of Object.entries(ops)) {
        switch (op) {
          case '$eq':
            if (value !== expected) return false;
            break;
          case '$ne':
            if (value === expected) return false;
            break;
          case '$gt':
            if (typeof value !== 'number' || value <= (expected as number)) return false;
            break;
          case '$gte':
            if (typeof value !== 'number' || value < (expected as number)) return false;
            break;
          case '$lt':
            if (typeof value !== 'number' || value >= (expected as number)) return false;
            break;
          case '$lte':
            if (typeof value !== 'number' || value > (expected as number)) return false;
            break;
          case '$in':
            if (!Array.isArray(expected) || !expected.includes(value)) return false;
            break;
          case '$nin':
            if (!Array.isArray(expected) || expected.includes(value)) return false;
            break;
          case '$exists':
            if ((expected && value === undefined) || (!expected && value !== undefined)) return false;
            break;
          default:
            logger.warn({ op }, 'Unknown filter operator');
        }
      }
    } else {
      // Simple equality
      if (value !== condition) return false;
    }
  }

  return true;
}

/**
 * Check for duplicate events
 */
async function checkDuplication(
  trigger: { id: string; deduplicationKey: string | null; deduplicationHours: number | null },
  payload: Record<string, unknown>
): Promise<boolean> {
  if (!trigger.deduplicationKey || !trigger.deduplicationHours) {
    return false;
  }

  const deduplicationValue = getValueByPath(payload, trigger.deduplicationKey);
  if (deduplicationValue === undefined) {
    return false;
  }

  const cutoffTime = new Date();
  cutoffTime.setHours(cutoffTime.getHours() - trigger.deduplicationHours);

  const existingExecution = await prisma.triggerExecution.findFirst({
    where: {
      triggerId: trigger.id,
      status: 'SUCCESS',
      executedAt: { gte: cutoffTime },
      inputPayload: {
        path: [trigger.deduplicationKey.replace('$.', '').split('.')[0]],
        equals: deduplicationValue,
      },
    },
  });

  return existingExecution !== null;
}

/**
 * Map fields from payload using JSONPath-like expressions
 */
function mapFields(
  payload: Record<string, unknown>,
  mapping: Record<string, string>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [targetField, sourcePath] of Object.entries(mapping)) {
    const value = getValueByPath(payload, sourcePath);
    if (value !== undefined) {
      // Handle nested target fields (e.g., "metadata.dealValue")
      setValueByPath(result, targetField, value);
    }
  }

  return result;
}

/**
 * Get value from object by JSONPath-like path
 * Supports: $.field, $.nested.field, $[0], $.array[0].field
 */
function getValueByPath(obj: Record<string, unknown>, path: string): unknown {
  // Remove leading $. or $
  let cleanPath = path;
  if (cleanPath.startsWith('$.')) {
    cleanPath = cleanPath.slice(2);
  } else if (cleanPath.startsWith('$')) {
    cleanPath = cleanPath.slice(1);
  }

  if (!cleanPath) {
    return obj;
  }

  // Split by dots and brackets
  const parts = cleanPath.split(/\.|\[|\]/).filter(Boolean);
  
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Set value in object by path
 */
function setValueByPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.');
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current)) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }

  current[parts[parts.length - 1]] = value;
}

// ============================================================================
// Manual Trigger Execution
// ============================================================================

/**
 * Manually execute a trigger (for testing or manual request creation)
 */
export async function manuallyExecuteTrigger(
  tenantId: string,
  triggerId: string,
  payload: Record<string, unknown>
): Promise<TriggerExecutionResult> {
  const trigger = await prisma.requestTrigger.findUnique({
    where: { id: triggerId },
    include: {
      requestTypeConfig: {
        include: { requestType: true, approvalChain: true },
      },
      approvalChain: true,
    },
  });

  if (!trigger || trigger.tenantId !== tenantId || trigger.deletedAt) {
    throw new ApiError(404, 'Request trigger not found');
  }

  return executeTrigger(trigger, payload);
}

// ============================================================================
// Trigger Execution History
// ============================================================================

/**
 * Get trigger execution history
 */
export async function getTriggerExecutions(
  tenantId: string,
  triggerId: string,
  options: { page?: number; limit?: number; status?: TriggerExecutionStatus } = {}
): Promise<{ executions: ReturnType<typeof prisma.triggerExecution.findMany>; total: number }> {
  // Verify trigger belongs to tenant
  const trigger = await prisma.requestTrigger.findUnique({
    where: { id: triggerId },
  });

  if (!trigger || trigger.tenantId !== tenantId) {
    throw new ApiError(404, 'Request trigger not found');
  }

  const page = options.page || 1;
  const limit = options.limit || 20;
  const skip = (page - 1) * limit;

  const where: Prisma.TriggerExecutionWhereInput = {
    triggerId,
    ...(options.status && { status: options.status }),
  };

  const [executions, total] = await Promise.all([
    prisma.triggerExecution.findMany({
      where,
      include: {
        request: { select: { id: true, requestNumber: true, title: true, status: true } },
        webhookEvent: { select: { id: true, eventType: true, createdAt: true } },
      },
      skip,
      take: limit,
      orderBy: { executedAt: 'desc' },
    }),
    prisma.triggerExecution.count({ where }),
  ]);

  return { executions: executions as any, total };
}

/**
 * Get webhook event history
 */
export async function getWebhookEvents(
  tenantId: string,
  webhookId: string,
  options: { page?: number; limit?: number; status?: TriggerEventStatus } = {}
): Promise<{ events: ReturnType<typeof prisma.inboundWebhookEvent.findMany>; total: number }> {
  // Verify webhook belongs to tenant
  const webhook = await prisma.inboundWebhook.findUnique({
    where: { id: webhookId },
  });

  if (!webhook || webhook.tenantId !== tenantId) {
    throw new ApiError(404, 'Inbound webhook not found');
  }

  const page = options.page || 1;
  const limit = options.limit || 20;
  const skip = (page - 1) * limit;

  const where: Prisma.InboundWebhookEventWhereInput = {
    webhookId,
    ...(options.status && { status: options.status }),
  };

  const [events, total] = await Promise.all([
    prisma.inboundWebhookEvent.findMany({
      where,
      include: {
        executions: {
          select: { id: true, triggerId: true, status: true, requestId: true },
        },
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.inboundWebhookEvent.count({ where }),
  ]);

  return { events: events as any, total };
}
