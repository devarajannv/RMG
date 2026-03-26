/**
 * Post-Approval Action Executor
 * Executes configured actions after request approval/rejection
 * 
 * Actions are configured in TenantRequestTypeConfig:
 * - onApprovalActions: Actions to run when request is approved
 * - onRejectionActions: Actions to run when request is rejected
 * 
 * Supported Action Types:
 * - NOTIFY_WEBHOOK: Send notification to external webhook
 * - CREATE_DOCUMENT: Generate document from template
 * - UPDATE_EXTERNAL: Update external system (HubSpot, Salesforce, etc.)
 * - SEND_EMAIL: Send email notification
 * - CREATE_TASK: Create follow-up task
 */

import prisma from '../../lib/prisma';
import { logger } from '../../lib/logger';
import * as crypto from 'crypto';
import { executeEntityHandler, hasHandler, HandlerContext } from './entity-handlers';
import { createAuditLog } from '../audit/audit.service';


// ============================================================================
// Types
// ============================================================================

export type ActionType = 
  | 'NOTIFY_WEBHOOK'
  | 'CREATE_DOCUMENT'
  | 'UPDATE_EXTERNAL'
  | 'SEND_EMAIL'
  | 'CREATE_TASK'
  | 'LOG_AUDIT';

export interface PostApprovalAction {
  type: ActionType;
  name?: string;
  config: Record<string, unknown>;
}

export interface ActionExecutionContext {
  tenantId: string;
  requestId: string;
  requestNumber: string;
  requestType: string;
  requestTitle: string;
  requestData: Record<string, unknown>;
  requesterId: string;
  requesterName: string;
  requesterEmail: string;
  approvedById?: string;
  approvedByName?: string;
  rejectedById?: string;
  rejectedByName?: string;
  comments?: string;
  decision: 'APPROVED' | 'REJECTED';
  metadata?: Record<string, unknown>;
}

export interface ActionResult {
  actionType: ActionType;
  actionName?: string;
  success: boolean;
  error?: string;
  result?: Record<string, unknown>;
  durationMs: number;
}

// ============================================================================
// Main Executor
// ============================================================================

/**
 * Execute post-approval actions for a request
 */
export async function executePostApprovalActions(
  context: ActionExecutionContext
): Promise<ActionResult[]> {
  const results: ActionResult[] = [];
  
  // Get tenant request type config
  // M-12: Include tenantId to prevent cross-tenant request loading
  const request = await prisma.request.findFirst({
    where: { id: context.requestId, tenantId: context.tenantId },
    include: {
      type: true,
    },
  });

  if (!request) {
    logger.error('Request not found for post-approval actions', { requestId: context.requestId });
    return [];
  }

  // ========================================================================
  // STEP 1: Execute Entity Handler (creates/modifies business entities)
  // This is the PRIMARY action - e.g., creating an allocation for RESOURCE_ALLOCATION
  // ========================================================================
  
  if (context.decision === 'APPROVED' && request.type.onApprovalHandler) {
    const handlerName = request.type.onApprovalHandler;
    
    if (hasHandler(handlerName)) {
      const startTime = Date.now();
      
      const handlerContext: HandlerContext = {
        tenantId: context.tenantId,
        requestId: context.requestId,
        requestNumber: context.requestNumber,
        requestData: context.requestData,
        requesterId: context.requesterId,
        approvedById: context.approvedById!,
      };
      
      const handlerResult = await executeEntityHandler(handlerName, handlerContext);
      
      results.push({
        actionType: 'CREATE_ENTITY' as any,
        actionName: handlerName,
        success: handlerResult.success,
        error: handlerResult.error,
        result: handlerResult.details,
        durationMs: Date.now() - startTime,
      });
      
      // Update request with created entity reference
      if (handlerResult.success && handlerResult.entityId) {
        await prisma.request.update({
          where: { id: context.requestId },
          data: {
            resultEntityType: handlerResult.entityType,
            resultEntityId: handlerResult.entityId,
            executionNotes: `Entity created: ${handlerResult.entityType} ${handlerResult.entityId}`,
          },
        });
        
        logger.info('Entity created from request approval', {
          requestId: context.requestId,
          requestNumber: context.requestNumber,
          entityType: handlerResult.entityType,
          entityId: handlerResult.entityId,
        });
      }
    } else {
      logger.warn('Entity handler not implemented', {
        handlerName,
        requestId: context.requestId,
      });
    }
  }

  // ========================================================================
  // STEP 2: Execute Configured Actions (webhooks, emails, documents, etc.)
  // These are SECONDARY actions configured per tenant
  // ========================================================================
  
  // Get tenant config for this request type
  const tenantConfig = await prisma.tenantRequestTypeConfig.findUnique({
    where: {
      tenantId_requestTypeId: {
        tenantId: context.tenantId,
        requestTypeId: request.typeId,
      },
    },
  });

  // Get actions based on decision
  const actionsJson = context.decision === 'APPROVED'
    ? tenantConfig?.onApprovalActions
    : tenantConfig?.onRejectionActions;

  if (actionsJson) {
    const actions = actionsJson as unknown as PostApprovalAction[];
    if (Array.isArray(actions) && actions.length > 0) {
      logger.info(`Executing ${actions.length} post-${context.decision.toLowerCase()} actions`, {
        requestId: context.requestId,
        requestNumber: context.requestNumber,
      });

      for (const action of actions) {
        const result = await executeAction(action, context);
        results.push(result);

        if (!result.success) {
          logger.error('Post-approval action failed', {
            requestId: context.requestId,
            actionType: action.type,
            error: result.error,
          });
        }
      }
    }
  }

  // Log summary
  if (results.length > 0) {
    const successCount = results.filter(r => r.success).length;
    logger.info(`Post-approval actions completed: ${successCount}/${results.length} successful`, {
      requestId: context.requestId,
    });
  }

  return results;
}

/**
 * Execute a single action
 */
async function executeAction(
  action: PostApprovalAction,
  context: ActionExecutionContext
): Promise<ActionResult> {
  const startTime = Date.now();

  try {
    let result: Record<string, unknown> | undefined;

    switch (action.type) {
      case 'NOTIFY_WEBHOOK':
        result = await executeWebhookAction(action.config, context);
        break;

      case 'CREATE_DOCUMENT':
        result = await executeCreateDocumentAction(action.config, context);
        break;

      case 'UPDATE_EXTERNAL':
        result = await executeUpdateExternalAction(action.config, context);
        break;

      case 'SEND_EMAIL':
        result = await executeSendEmailAction(action.config, context);
        break;

      case 'CREATE_TASK':
        result = await executeCreateTaskAction(action.config, context);
        break;

      case 'LOG_AUDIT':
        result = await executeLogAuditAction(action.config, context);
        break;

      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }

    return {
      actionType: action.type,
      actionName: action.name,
      success: true,
      result,
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      actionType: action.type,
      actionName: action.name,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      durationMs: Date.now() - startTime,
    };
  }
}

// ============================================================================
// Action Implementations
// ============================================================================

/**
 * NOTIFY_WEBHOOK: Send notification to external webhook
 * Config: { url: string, method?: string, headers?: object, includeRequestData?: boolean }
 */
async function executeWebhookAction(
  config: Record<string, unknown>,
  context: ActionExecutionContext
): Promise<Record<string, unknown>> {
  const url = config.url as string;
  if (!url) {
    throw new Error('Webhook URL is required');
  }

  const method = (config.method as string) || 'POST';
  const headers = (config.headers as Record<string, string>) || {};
  const includeRequestData = config.includeRequestData !== false;

  // Build payload
  const payload = {
    event: context.decision === 'APPROVED' ? 'request.approved' : 'request.rejected',
    timestamp: new Date().toISOString(),
    request: {
      id: context.requestId,
      number: context.requestNumber,
      type: context.requestType,
      title: context.requestTitle,
      ...(includeRequestData && { data: context.requestData }),
    },
    requester: {
      id: context.requesterId,
      name: context.requesterName,
      email: context.requesterEmail,
    },
    decision: {
      by: context.decision === 'APPROVED'
        ? { id: context.approvedById, name: context.approvedByName }
        : { id: context.rejectedById, name: context.rejectedByName },
      comments: context.comments,
    },
    metadata: context.metadata,
  };

  // Generate signature if secret is configured
  const secret = config.secret as string;
  if (secret) {
    const signature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
    headers['X-Webhook-Signature'] = `sha256=${signature}`;
  }

  // Send request
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Webhook returned ${response.status}: ${response.statusText}`);
  }

  return {
    statusCode: response.status,
    sent: true,
  };
}

/**
 * CREATE_DOCUMENT: Generate document from template
 * Config: { templateId: string, outputFormat?: string, store?: boolean }
 */
async function executeCreateDocumentAction(
  config: Record<string, unknown>,
  context: ActionExecutionContext
): Promise<Record<string, unknown>> {
  const templateId = config.templateId as string;
  if (!templateId) {
    throw new Error('Template ID is required');
  }

  // TODO: Implement document generation
  // This would integrate with a document generation service
  logger.info('Document generation action triggered', {
    templateId,
    requestId: context.requestId,
  });

  return {
    templateId,
    status: 'QUEUED',
    message: 'Document generation queued (not yet implemented)',
  };
}

/**
 * UPDATE_EXTERNAL: Update external system
 * Config: { system: string, action: string, mapping: object }
 */
async function executeUpdateExternalAction(
  config: Record<string, unknown>,
  context: ActionExecutionContext
): Promise<Record<string, unknown>> {
  const system = config.system as string;
  const action = config.action as string;
  // Mapping will be used when external system integrations are implemented
  // const mapping = config.mapping as Record<string, string>;

  if (!system || !action) {
    throw new Error('System and action are required');
  }

  // TODO: Implement external system integrations
  // This would integrate with HubSpot, Salesforce, etc.
  logger.info('External system update triggered', {
    system,
    action,
    requestId: context.requestId,
  });

  return {
    system,
    action,
    status: 'QUEUED',
    message: `${system} update queued (not yet implemented)`,
  };
}

/**
 * SEND_EMAIL: Send email notification
 * Config: { to: string | string[], template?: string, subject?: string, body?: string }
 */
async function executeSendEmailAction(
  config: Record<string, unknown>,
  context: ActionExecutionContext
): Promise<Record<string, unknown>> {
  const to = config.to as string | string[];
  const template = config.template as string;
  // Subject and body will be used when email service is implemented
  // const subject = config.subject as string;
  // const body = config.body as string;

  if (!to) {
    throw new Error('Email recipient is required');
  }

  // Resolve recipients
  const recipients: string[] = [];
  if (typeof to === 'string') {
    if (to === '$requester') {
      recipients.push(context.requesterEmail);
    } else {
      recipients.push(to);
    }
  } else {
    for (const recipient of to) {
      if (recipient === '$requester') {
        recipients.push(context.requesterEmail);
      } else {
        recipients.push(recipient);
      }
    }
  }

  // TODO: Implement email sending
  // This would integrate with an email service (SendGrid, SES, etc.)
  logger.info('Email action triggered', {
    recipients,
    template,
    requestId: context.requestId,
  });

  return {
    recipients,
    template,
    status: 'QUEUED',
    message: 'Email queued (not yet implemented)',
  };
}

/**
 * CREATE_TASK: Create follow-up task
 * Config: { title: string, assignTo: string, dueInDays?: number, description?: string }
 */
async function executeCreateTaskAction(
  config: Record<string, unknown>,
  context: ActionExecutionContext
): Promise<Record<string, unknown>> {
  const title = config.title as string;
  const assignTo = config.assignTo as string;
  const dueInDays = (config.dueInDays as number) || 7;
  // Description will be used when task system is implemented
  // const description = config.description as string;

  if (!title || !assignTo) {
    throw new Error('Task title and assignTo are required');
  }

  // Resolve assignee
  let assigneeId: string;
  if (assignTo === '$requester') {
    assigneeId = context.requesterId;
  } else if (assignTo === '$approver') {
    assigneeId = context.approvedById || context.requesterId;
  } else {
    assigneeId = assignTo;
  }

  // Calculate due date
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + dueInDays);

  // TODO: Implement task creation
  // This could create tasks in the system or external task management
  logger.info('Task creation triggered', {
    title,
    assigneeId,
    dueDate,
    requestId: context.requestId,
  });

  return {
    title,
    assigneeId,
    dueDate: dueDate.toISOString(),
    status: 'QUEUED',
    message: 'Task creation queued (not yet implemented)',
  };
}

/**
 * LOG_AUDIT: Log to audit trail
 * Config: { category: string, details?: object }
 */
async function executeLogAuditAction(
  config: Record<string, unknown>,
  context: ActionExecutionContext
): Promise<Record<string, unknown>> {
  const category = (config.category as string) || 'POST_APPROVAL_ACTION';
  const details = (config.details as Record<string, unknown>) || {};

  // Use appropriate AuditAction enum value based on decision
  const auditAction = context.decision === 'APPROVED' ? 'APPROVE' : 'REJECT';

  await createAuditLog(
    context.tenantId,
    context.decision === 'APPROVED' ? context.approvedById! : context.rejectedById!,
    'Request',
    context.requestId,
    auditAction,
    {
      requestNumber: context.requestNumber,
      requestType: context.requestType,
      decision: context.decision,
      comments: context.comments,
      ...details,
    }
  );

  return {
    logged: true,
    category,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Resolve template variables in a string
 */
export function resolveTemplateVariables(
  template: string,
  context: ActionExecutionContext
): string {
  return template
    .replace(/\$\{requestNumber\}/g, context.requestNumber)
    .replace(/\$\{requestTitle\}/g, context.requestTitle)
    .replace(/\$\{requestType\}/g, context.requestType)
    .replace(/\$\{requesterName\}/g, context.requesterName)
    .replace(/\$\{requesterEmail\}/g, context.requesterEmail)
    .replace(/\$\{decision\}/g, context.decision)
    .replace(/\$\{comments\}/g, context.comments || '')
    .replace(/\$\{approverName\}/g, context.approvedByName || context.rejectedByName || '');
}

/**
 * Build action execution context from request
 */
export async function buildActionContext(
  tenantId: string,
  requestId: string,
  decision: 'APPROVED' | 'REJECTED',
  decidedById: string,
  comments?: string
): Promise<ActionExecutionContext> {
  // M-12: Include tenantId to prevent cross-tenant request loading
  const request = await prisma.request.findFirst({
    where: { id: requestId, tenantId },
    include: {
      type: true,
      requester: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });

  if (!request) {
    throw new Error('Request not found');
  }

  // M-12: Include tenantId to prevent cross-tenant user loading
  const decider = await prisma.user.findFirst({
    where: { id: decidedById, tenantId },
    select: { firstName: true, lastName: true },
  });

  const deciderName = decider ? `${decider.firstName} ${decider.lastName}` : 'Unknown';

  return {
    tenantId,
    requestId,
    requestNumber: request.requestNumber,
    requestType: request.type.code,
    requestTitle: request.title,
    requestData: request.requestData as Record<string, unknown>,
    requesterId: request.requesterId,
    requesterName: `${request.requester.firstName} ${request.requester.lastName}`,
    requesterEmail: request.requester.email,
    ...(decision === 'APPROVED'
      ? { approvedById: decidedById, approvedByName: deciderName }
      : { rejectedById: decidedById, rejectedByName: deciderName }),
    comments,
    decision,
  };
}
