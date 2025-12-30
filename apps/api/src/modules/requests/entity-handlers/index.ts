/**
 * Entity Request Handlers
 * 
 * These handlers execute business logic when requests are approved.
 * Each handler creates, updates, or modifies the actual business entities.
 * 
 * ARCHITECTURE:
 * - Handlers are pure functions that take request data and return results
 * - They call existing services (allocation, project, resource) to create entities
 * - They're invoked by post-approval-actions.service based on onApprovalHandler
 * 
 * EXAMPLE FLOW:
 * 1. User submits RESOURCE_ALLOCATION request
 * 2. Manager approves the request
 * 3. request.service calls executePostApprovalActions
 * 4. post-approval-actions.service checks onApprovalHandler
 * 5. onApprovalHandler = 'AllocationRequestHandler.execute'
 * 6. This file routes to the allocation handler
 * 7. Handler creates the allocation using allocation.service
 */

import { logger } from '../../../lib/logger';
import { executeAllocationHandler, executeExtensionHandler, executeReleaseHandler } from './allocation.handler';
import { executeProjectCreationHandler, executeProjectClosureHandler } from './project.handler';
import { executeOnboardingHandler, executeOffboardingHandler } from './resource.handler';
import { executeContractHandler, executeContractAmendmentHandler } from './contract.handler';

// ============================================================================
// Types
// ============================================================================

export interface HandlerContext {
  tenantId: string;
  requestId: string;
  requestNumber: string;
  requestData: Record<string, unknown>;
  requesterId: string;
  approvedById: string;
}

export interface HandlerResult {
  success: boolean;
  entityType?: string;
  entityId?: string;
  error?: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// Handler Registry
// ============================================================================

/**
 * Registry mapping handler names to implementations
 * The key format matches what's stored in RequestType.onApprovalHandler
 */
const handlerRegistry: Record<string, (ctx: HandlerContext) => Promise<HandlerResult>> = {
  // Resource/Allocation handlers
  'AllocationRequestHandler.execute': executeAllocationHandler,
  'ExtensionRequestHandler.execute': executeExtensionHandler,
  'ReleaseRequestHandler.execute': executeReleaseHandler,
  
  // Project handlers
  'ProjectCreationRequestHandler.execute': executeProjectCreationHandler,
  'ProjectClosureRequestHandler.execute': executeProjectClosureHandler,
  
  // HR handlers
  'OnboardingRequestHandler.execute': executeOnboardingHandler,
  'OffboardingRequestHandler.execute': executeOffboardingHandler,
  
  // Contract handlers
  'ContractCreationRequestHandler.execute': executeContractHandler,
  'ContractAmendmentRequestHandler.execute': executeContractAmendmentHandler,
};

// ============================================================================
// Main Executor
// ============================================================================

/**
 * Execute the registered handler for a request type
 * 
 * @param handlerName - The handler name from RequestType.onApprovalHandler
 * @param context - The execution context with request data
 * @returns Result of handler execution
 */
export async function executeEntityHandler(
  handlerName: string,
  context: HandlerContext
): Promise<HandlerResult> {
  const handler = handlerRegistry[handlerName];
  
  if (!handler) {
    logger.warn('Unknown entity handler requested', { handlerName, requestId: context.requestId });
    return {
      success: false,
      error: `Unknown handler: ${handlerName}`,
    };
  }
  
  try {
    logger.info('Executing entity handler', {
      handlerName,
      requestId: context.requestId,
      requestNumber: context.requestNumber,
    });
    
    const result = await handler(context);
    
    if (result.success) {
      logger.info('Entity handler succeeded', {
        handlerName,
        requestId: context.requestId,
        entityType: result.entityType,
        entityId: result.entityId,
      });
    } else {
      logger.error('Entity handler failed', {
        handlerName,
        requestId: context.requestId,
        error: result.error,
      });
    }
    
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Entity handler threw exception', {
      handlerName,
      requestId: context.requestId,
      error: errorMessage,
    });
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Check if a handler exists for a given name
 */
export function hasHandler(handlerName: string): boolean {
  return handlerName in handlerRegistry;
}

/**
 * Get list of all registered handler names
 */
export function getRegisteredHandlers(): string[] {
  return Object.keys(handlerRegistry);
}
