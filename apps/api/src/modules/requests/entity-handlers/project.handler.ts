/**
 * Project Request Handlers
 * 
 * Handles entity creation for project-related requests:
 * - PROJECT_CREATION: Create new project
 * - PROJECT_CLOSURE: Close/complete a project
 */

import prisma from '../../../lib/prisma';
import { logger } from '../../../lib/logger';
import { HandlerContext, HandlerResult } from './index';
import { ProjectStatus, AllocationStatus, AuditAction } from '@prisma/client';

// ============================================================================
// PROJECT_CREATION Handler
// Creates a new project when request is approved
// ============================================================================

export async function executeProjectCreationHandler(ctx: HandlerContext): Promise<HandlerResult> {
  const { tenantId, requestId: _requestId, requestData } = ctx;
  
  // Extract fields
  const name = requestData.name as string;
  const code = requestData.code as string;
  const description = requestData.description as string | undefined;
  const clientId = requestData.clientId as string | undefined;
  const contractId = requestData.contractId as string | undefined;
  const managerId = requestData.managerId as string | undefined;
  const practiceId = requestData.practiceId as string | undefined;
  const type = requestData.type as string;
  const deliveryModel = requestData.deliveryModel as string | undefined;
  const startDate = requestData.startDate ? new Date(requestData.startDate as string) : new Date();
  const endDate = requestData.endDate ? new Date(requestData.endDate as string) : undefined;
  const budgetHours = requestData.budgetHours as number | undefined;
  const budgetAmount = requestData.budgetAmount as number | undefined;
  const billingType = requestData.billingType as string | undefined;
  
  // Validate required fields
  if (!name || !code || !type) {
    return {
      success: false,
      error: 'Missing required fields: name, code, type',
    };
  }
  
  // Check for duplicate code
  const existingProject = await prisma.project.findFirst({
    where: { code, tenantId, deletedAt: null },
  });
  
  if (existingProject) {
    return {
      success: false,
      error: `Project with code ${code} already exists`,
    };
  }
  
  // Verify client exists if provided
  if (clientId) {
    const client = await prisma.client.findFirst({
      where: { id: clientId, tenantId, deletedAt: null },
    });
    if (!client) {
      return {
        success: false,
        error: `Client not found: ${clientId}`,
      };
    }
  }
  
  // Verify manager exists if provided
  if (managerId) {
    const manager = await prisma.resource.findFirst({
      where: { id: managerId, tenantId, deletedAt: null },
    });
    if (!manager) {
      return {
        success: false,
        error: `Manager not found: ${managerId}`,
      };
    }
  }
  
  // Create the project
  // Create the project
  const project = await prisma.project.create({
    data: {
      tenantId,
      name,
      code,
      description,
      clientId,
      contractId,
      managerId,
      practiceId,
      type: type as any,
      deliveryModel: (deliveryModel as any) ?? 'HYBRID',
      startDate,
      endDate,
      budgetHours,
      budgetAmount,
      billingType: (billingType as any) ?? 'TM',
      status: ProjectStatus.ACTIVE,
    },
  });
  
  // Log audit
  await prisma.auditLog.create({
    data: {
      tenantId,
      userId: ctx.approvedById,
      action: AuditAction.CREATE,
      entityType: 'Project',
      entityId: project.id,
      changes: {
        name,
        code,
        type,
        clientId,
        managerId,
        startDate: startDate.toISOString(),
        requestNumber: ctx.requestNumber,
      },
    },
  });
  
  logger.info('Project created from request', {
    projectId: project.id,
    projectCode: code,
    requestId: ctx.requestId,
    requestNumber: ctx.requestNumber,
  });
  
  return {
    success: true,
    entityType: 'Project',
    entityId: project.id,
    details: {
      name,
      code,
      type,
      status: project.status,
    },
  };
}

// ============================================================================
// PROJECT_CLOSURE Handler
// Closes a project and optionally releases all resources
// ============================================================================

export async function executeProjectClosureHandler(ctx: HandlerContext): Promise<HandlerResult> {
  const { tenantId, requestId: _requestId, requestData } = ctx;
  
  const projectId = requestData.projectId as string;
  const closureDate = new Date(requestData.closureDate as string);
  const closureReason = requestData.closureReason as string;
  const releaseResources = requestData.releaseResources !== false;
  const closureNotes = requestData.closureNotes as string | undefined;
  
  if (!projectId || !closureDate || !closureReason) {
    return {
      success: false,
      error: 'Missing required fields: projectId, closureDate, closureReason',
    };
  }
  
  // Find the project
  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId, deletedAt: null },
  });
  
  if (!project) {
    return {
      success: false,
      error: `Project not found: ${projectId}`,
    };
  }
  
  // Map closure reason to status
  const statusMap: Record<string, ProjectStatus> = {
    COMPLETED: ProjectStatus.COMPLETED,
    CANCELLED: ProjectStatus.CANCELLED,
    ON_HOLD: ProjectStatus.ON_HOLD,
  };
  
  const newStatus = statusMap[closureReason] || ProjectStatus.COMPLETED;
  
  // Update the project
  await prisma.project.update({
    where: { id: projectId },
    data: {
      status: newStatus,
      endDate: closureDate,
      description: closureNotes 
        ? `${project.description || ''}\n\n[Closure Notes: ${closureNotes}]`.trim()
        : project.description,
      updatedAt: new Date(),
    },
  });
  
  // Release all active allocations if requested
  let releasedCount = 0;
  if (releaseResources) {
    const activeAllocations = await prisma.allocation.findMany({
      where: {
        projectId,
        tenantId,
        status: AllocationStatus.ACTIVE,
        deletedAt: null,
      },
      include: { resource: true },
    });
    
    for (const allocation of activeAllocations) {
      await prisma.allocation.update({
        where: { id: allocation.id },
        data: {
          status: AllocationStatus.COMPLETED,
          endDate: closureDate,
          notes: `${allocation.notes || ''}\n[Released due to project closure]`.trim(),
        },
      });
      
      // Check if resource should go to bench
      const otherAllocations = await prisma.allocation.count({
        where: {
          resourceId: allocation.resourceId,
          tenantId,
          status: AllocationStatus.ACTIVE,
          endDate: { gte: new Date() },
          id: { not: allocation.id },
          deletedAt: null,
        },
      });
      
      if (otherAllocations === 0 && !allocation.resource.benchSince) {
        await prisma.resource.update({
          where: { id: allocation.resourceId },
          data: { benchSince: closureDate },
        });
      }
      
      releasedCount++;
    }
  }
  
  // Log audit
  await prisma.auditLog.create({
    data: {
      tenantId,
      userId: ctx.approvedById,
      action: AuditAction.UPDATE,
      entityType: 'Project',
      entityId: projectId,
      changes: {
        closureDate: closureDate.toISOString(),
        closureReason,
        newStatus,
        resourcesReleased: releasedCount,
        requestNumber: ctx.requestNumber,
      },
    },
  });
  
  logger.info('Project closed from request', {
    projectId,
    projectName: project.name,
    closureReason,
    resourcesReleased: releasedCount,
    requestId: ctx.requestId,
  });
  
  return {
    success: true,
    entityType: 'Project',
    entityId: projectId,
    details: {
      name: project.name,
      code: project.code,
      closureReason,
      newStatus,
      resourcesReleased: releasedCount,
    },
  };
}
