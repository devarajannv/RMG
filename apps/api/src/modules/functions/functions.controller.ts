/**
 * Approval Functions Controller
 * 
 * REST endpoints for managing approval functions and assignments.
 * 
 * Created: January 20, 2026
 */

import { Request, Response, NextFunction } from 'express';
import * as functionsService from './functions.service';
import { ApiError } from '../../middleware/errorHandler';
import { EntityStatus, FunctionCategory, FunctionScopeType } from '@prisma/client';
import {
  createApprovalFunctionSchema,
  updateApprovalFunctionSchema,
  createAssignmentSchema,
  delegateAssignmentSchema,
  revokeAssignmentSchema,
} from './functions.schemas';

// =============================================================================
// APPROVAL FUNCTION ENDPOINTS
// =============================================================================

/**
 * Create a new approval function
 * POST /api/functions
 */
export async function createApprovalFunction(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new ApiError('Tenant ID required', 400, 'TENANT_REQUIRED');
    }

    const input = createApprovalFunctionSchema.parse(req.body);

    const func = await functionsService.createApprovalFunction(tenantId, {
      ...input,
      isSystem: false, // Only seed can create system functions
    } as any);

    res.status(201).json({
      success: true,
      data: func,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get approval function by ID
 * GET /api/functions/:functionId
 */
export async function getApprovalFunction(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new ApiError('Tenant ID required', 400, 'TENANT_REQUIRED');
    }

    const func = await functionsService.getApprovalFunction(tenantId, req.params.functionId);

    if (!func) {
      throw new ApiError('Approval function not found', 404, 'FUNCTION_NOT_FOUND');
    }

    res.json({
      success: true,
      data: func,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * List approval functions
 * GET /api/functions
 */
export async function listApprovalFunctions(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new ApiError('Tenant ID required', 400, 'TENANT_REQUIRED');
    }

    // Parse filters
    const filters: functionsService.FunctionFilters = {};
    
    if (req.query.status) {
      filters.status = (req.query.status as string).split(',') as EntityStatus[];
    }
    
    if (req.query.category) {
      filters.category = (req.query.category as string).split(',') as FunctionCategory[];
    }
    
    if (req.query.scopeType) {
      filters.scopeType = (req.query.scopeType as string).split(',') as FunctionScopeType[];
    }
    
    if (req.query.isSystem !== undefined) {
      filters.isSystem = req.query.isSystem === 'true';
    }
    
    if (req.query.search) {
      filters.search = req.query.search as string;
    }

    // Parse options
    const options: functionsService.ListOptions = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      sortBy: req.query.sortBy as string,
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'asc',
    };

    const result = await functionsService.listApprovalFunctions(tenantId, filters, options);

    res.json({
      success: true,
      data: result.data,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.total / result.limit),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update approval function
 * PATCH /api/functions/:functionId
 */
export async function updateApprovalFunction(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new ApiError('Tenant ID required', 400, 'TENANT_REQUIRED');
    }

    const input = updateApprovalFunctionSchema.parse(req.body);

    const func = await functionsService.updateApprovalFunction(tenantId, req.params.functionId, input as any);

    res.json({
      success: true,
      data: func,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete approval function
 * DELETE /api/functions/:functionId
 */
export async function deleteApprovalFunction(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new ApiError('Tenant ID required', 400, 'TENANT_REQUIRED');
    }

    await functionsService.deleteApprovalFunction(tenantId, req.params.functionId);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

// =============================================================================
// FUNCTION ASSIGNMENT ENDPOINTS
// =============================================================================

/**
 * Create a function assignment
 * POST /api/functions/:functionId/assignments
 */
export async function createAssignment(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) {
      throw new ApiError('Authentication required', 401, 'AUTH_REQUIRED');
    }

    const input = createAssignmentSchema.parse(req.body);

    const assignment = await functionsService.createFunctionAssignment(
      tenantId,
      userId,
      {
        functionId: req.params.functionId,
        userId: input.userId,
        scopeType: input.scopeType,
        scopeEntityId: input.scopeEntityId,
        effectiveFrom: input.effectiveFrom ? new Date(input.effectiveFrom) : undefined,
        effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : undefined,
      } as any
    );

    res.status(201).json({
      success: true,
      data: assignment,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * List assignments for a function
 * GET /api/functions/:functionId/assignments
 */
export async function listFunctionAssignments(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new ApiError('Tenant ID required', 400, 'TENANT_REQUIRED');
    }

    const filters: functionsService.AssignmentFilters = {
      functionId: req.params.functionId,
      activeOnly: req.query.activeOnly === 'true',
    };

    if (req.query.scopeType) {
      filters.scopeType = req.query.scopeType as FunctionScopeType;
    }

    if (req.query.scopeEntityId) {
      filters.scopeEntityId = req.query.scopeEntityId as string;
    }

    const options: functionsService.ListOptions = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
    };

    const result = await functionsService.listFunctionAssignments(tenantId, filters, options);

    res.json({
      success: true,
      data: result.data,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.total / result.limit),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get assignment by ID
 * GET /api/assignments/:assignmentId
 */
export async function getAssignment(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new ApiError('Tenant ID required', 400, 'TENANT_REQUIRED');
    }

    const assignment = await functionsService.getFunctionAssignment(tenantId, req.params.assignmentId);

    if (!assignment) {
      throw new ApiError('Assignment not found', 404, 'ASSIGNMENT_NOT_FOUND');
    }

    res.json({
      success: true,
      data: assignment,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Revoke an assignment
 * DELETE /api/assignments/:assignmentId
 */
export async function revokeAssignment(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) {
      throw new ApiError('Authentication required', 401, 'AUTH_REQUIRED');
    }

    const input = revokeAssignmentSchema.parse(req.body);

    const assignment = await functionsService.revokeFunctionAssignment(
      tenantId,
      req.params.assignmentId,
      userId,
      input.reason
    );

    res.json({
      success: true,
      data: assignment,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delegate a function to another user
 * POST /api/assignments/:assignmentId/delegate
 */
export async function delegateAssignment(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) {
      throw new ApiError('Authentication required', 401, 'AUTH_REQUIRED');
    }

    const input = delegateAssignmentSchema.parse(req.body);

    const delegation = await functionsService.delegateFunction(
      tenantId,
      req.params.assignmentId,
      userId,
      {
        delegateUserId: input.delegateUserId,
        effectiveTo: new Date(input.effectiveTo),
        reason: input.reason,
      }
    );

    res.status(201).json({
      success: true,
      data: delegation,
    });
  } catch (error) {
    next(error);
  }
}

// =============================================================================
// USER-CENTRIC ENDPOINTS
// =============================================================================

/**
 * Get my function assignments
 * GET /api/functions/my-assignments
 */
export async function getMyAssignments(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) {
      throw new ApiError('Authentication required', 401, 'AUTH_REQUIRED');
    }

    const assignments = await functionsService.getAssignmentsForUser(tenantId, userId);

    res.json({
      success: true,
      data: assignments,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get assignments for a specific user (admin)
 * GET /api/users/:userId/function-assignments
 */
export async function getUserAssignments(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new ApiError('Tenant ID required', 400, 'TENANT_REQUIRED');
    }

    const assignments = await functionsService.getAssignmentsForUser(tenantId, req.params.userId);

    res.json({
      success: true,
      data: assignments,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Check if a user holds a specific function
 * GET /api/functions/:functionCode/check-holder
 */
export async function checkFunctionHolder(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new ApiError('Tenant ID required', 400, 'TENANT_REQUIRED');
    }

    const userId = req.query.userId as string;
    if (!userId) {
      throw new ApiError('User ID required', 400, 'USER_ID_REQUIRED');
    }

    const hasFunction = await functionsService.checkUserHasFunction(
      tenantId,
      userId,
      req.params.functionCode,
      req.query.scopeType as FunctionScopeType | undefined,
      req.query.scopeEntityId as string | undefined
    );

    res.json({
      success: true,
      data: { hasFunction },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all holders of a function
 * GET /api/functions/:functionId/holders
 */
export async function getFunctionHolders(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new ApiError('Tenant ID required', 400, 'TENANT_REQUIRED');
    }

    const holders = await functionsService.getFunctionHolders(
      tenantId,
      req.params.functionId,
      req.query.scopeType as FunctionScopeType | undefined,
      req.query.scopeEntityId as string | undefined
    );

    res.json({
      success: true,
      data: holders,
    });
  } catch (error) {
    next(error);
  }
}
