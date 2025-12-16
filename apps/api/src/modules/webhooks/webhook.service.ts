import prisma from '../../lib/prisma';
import { logger } from '../../lib/logger';

// ============================================================================
// Types
// ============================================================================

export interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  secret?: string;
  headers?: Record<string, string>;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WebhookPayload {
  event: string;
  timestamp: string;
  tenantId: string;
  data: Record<string, unknown>;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'success' | 'failed';
  statusCode?: number;
  response?: string;
  attempts: number;
  lastAttempt?: Date;
  createdAt: Date;
}

// ============================================================================
// In-Memory Storage (for MVP - would use DB in production)
// ============================================================================

const webhookConfigs = new Map<string, WebhookConfig[]>();
const webhookDeliveries = new Map<string, WebhookDelivery[]>();

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Register a webhook
 */
export async function registerWebhook(
  tenantId: string,
  config: {
    name: string;
    url: string;
    events: string[];
    secret?: string;
    headers?: Record<string, string>;
  }
): Promise<WebhookConfig> {
  const webhook: WebhookConfig = {
    id: crypto.randomUUID(),
    name: config.name,
    url: config.url,
    events: config.events,
    isActive: true,
    secret: config.secret,
    headers: config.headers,
    retryCount: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const tenantWebhooks = webhookConfigs.get(tenantId) ?? [];
  tenantWebhooks.push(webhook);
  webhookConfigs.set(tenantId, tenantWebhooks);

  logger.info(`Webhook registered: ${webhook.name} for tenant ${tenantId}`);

  return webhook;
}

/**
 * List webhooks for tenant
 */
export async function listWebhooks(tenantId: string): Promise<WebhookConfig[]> {
  return webhookConfigs.get(tenantId) ?? [];
}

/**
 * Get webhook by ID
 */
export async function getWebhook(
  tenantId: string,
  webhookId: string
): Promise<WebhookConfig | null> {
  const tenantWebhooks = webhookConfigs.get(tenantId) ?? [];
  return tenantWebhooks.find(w => w.id === webhookId) ?? null;
}

/**
 * Update webhook
 */
export async function updateWebhook(
  tenantId: string,
  webhookId: string,
  updates: Partial<{
    name: string;
    url: string;
    events: string[];
    isActive: boolean;
    secret: string;
    headers: Record<string, string>;
  }>
): Promise<WebhookConfig | null> {
  const tenantWebhooks = webhookConfigs.get(tenantId) ?? [];
  const index = tenantWebhooks.findIndex(w => w.id === webhookId);
  
  if (index === -1) return null;

  tenantWebhooks[index] = {
    ...tenantWebhooks[index],
    ...updates,
    updatedAt: new Date(),
  };

  webhookConfigs.set(tenantId, tenantWebhooks);
  return tenantWebhooks[index];
}

/**
 * Delete webhook
 */
export async function deleteWebhook(
  tenantId: string,
  webhookId: string
): Promise<boolean> {
  const tenantWebhooks = webhookConfigs.get(tenantId) ?? [];
  const filtered = tenantWebhooks.filter(w => w.id !== webhookId);
  
  if (filtered.length === tenantWebhooks.length) return false;

  webhookConfigs.set(tenantId, filtered);
  return true;
}

/**
 * Trigger webhook event
 */
export async function triggerWebhook(
  tenantId: string,
  event: string,
  data: Record<string, unknown>
): Promise<void> {
  const tenantWebhooks = webhookConfigs.get(tenantId) ?? [];
  const matchingWebhooks = tenantWebhooks.filter(
    w => w.isActive && w.events.includes(event)
  );

  if (matchingWebhooks.length === 0) return;

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    tenantId,
    data,
  };

  for (const webhook of matchingWebhooks) {
    await deliverWebhook(tenantId, webhook, payload);
  }
}

/**
 * Deliver webhook
 */
async function deliverWebhook(
  tenantId: string,
  webhook: WebhookConfig,
  payload: WebhookPayload
): Promise<void> {
  const delivery: WebhookDelivery = {
    id: crypto.randomUUID(),
    webhookId: webhook.id,
    event: payload.event,
    payload: payload as unknown as Record<string, unknown>,
    status: 'pending',
    attempts: 0,
    createdAt: new Date(),
  };

  // Store delivery
  const deliveries = webhookDeliveries.get(tenantId) ?? [];
  deliveries.push(delivery);
  webhookDeliveries.set(tenantId, deliveries);

  // Attempt delivery
  await attemptDelivery(tenantId, delivery, webhook);
}

/**
 * Attempt webhook delivery
 */
async function attemptDelivery(
  tenantId: string,
  delivery: WebhookDelivery,
  webhook: WebhookConfig
): Promise<void> {
  delivery.attempts++;
  delivery.lastAttempt = new Date();

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-Event': delivery.event,
      'X-Webhook-Delivery-Id': delivery.id,
      ...(webhook.headers ?? {}),
    };

    // Add signature if secret is configured
    if (webhook.secret) {
      const signature = await generateSignature(
        JSON.stringify(delivery.payload),
        webhook.secret
      );
      headers['X-Webhook-Signature'] = signature;
    }

    const response = await fetch(webhook.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(delivery.payload),
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    delivery.statusCode = response.status;
    delivery.response = await response.text().catch(() => '');

    if (response.ok) {
      delivery.status = 'success';
      logger.info(`Webhook delivered: ${delivery.id} to ${webhook.url}`);
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    delivery.status = 'failed';
    delivery.response = error instanceof Error ? error.message : 'Unknown error';
    
    logger.warn(`Webhook delivery failed: ${delivery.id} - ${delivery.response}`);

    // Schedule retry if attempts remaining
    if (delivery.attempts < webhook.retryCount) {
      const delay = Math.pow(2, delivery.attempts) * 1000; // Exponential backoff
      setTimeout(() => attemptDelivery(tenantId, delivery, webhook), delay);
    }
  }

  // Update delivery record
  const deliveries = webhookDeliveries.get(tenantId) ?? [];
  const index = deliveries.findIndex(d => d.id === delivery.id);
  if (index !== -1) {
    deliveries[index] = delivery;
    webhookDeliveries.set(tenantId, deliveries);
  }
}

/**
 * Generate HMAC signature for webhook payload
 */
async function generateSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(payload);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  return 'sha256=' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Get webhook deliveries
 */
export async function getDeliveries(
  tenantId: string,
  webhookId?: string,
  limit: number = 50
): Promise<WebhookDelivery[]> {
  let deliveries = webhookDeliveries.get(tenantId) ?? [];
  
  if (webhookId) {
    deliveries = deliveries.filter(d => d.webhookId === webhookId);
  }

  return deliveries
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit);
}

/**
 * Retry failed delivery
 */
export async function retryDelivery(
  tenantId: string,
  deliveryId: string
): Promise<boolean> {
  const deliveries = webhookDeliveries.get(tenantId) ?? [];
  const delivery = deliveries.find(d => d.id === deliveryId);
  
  if (!delivery || delivery.status === 'success') return false;

  const webhook = await getWebhook(tenantId, delivery.webhookId);
  if (!webhook) return false;

  delivery.status = 'pending';
  await attemptDelivery(tenantId, delivery, webhook);
  return true;
}

/**
 * Get available webhook events
 */
export function getAvailableEvents(): Array<{ event: string; description: string }> {
  return [
    { event: 'resource.created', description: 'New resource created' },
    { event: 'resource.updated', description: 'Resource updated' },
    { event: 'resource.deleted', description: 'Resource deleted' },
    { event: 'allocation.created', description: 'New allocation created' },
    { event: 'allocation.updated', description: 'Allocation updated' },
    { event: 'allocation.deleted', description: 'Allocation deleted' },
    { event: 'project.created', description: 'New project created' },
    { event: 'project.updated', description: 'Project updated' },
    { event: 'project.completed', description: 'Project completed' },
    { event: 'bench.resource_added', description: 'Resource added to bench' },
    { event: 'bench.resource_removed', description: 'Resource removed from bench' },
    { event: 'timesheet.submitted', description: 'Timesheet submitted for approval' },
    { event: 'timesheet.approved', description: 'Timesheet approved' },
    { event: 'timesheet.rejected', description: 'Timesheet rejected' },
    { event: 'contract.expiring', description: 'Contract expiring soon' },
  ];
}

