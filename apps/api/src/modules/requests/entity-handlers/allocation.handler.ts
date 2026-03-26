/**
 * Allocation Request Handlers
 * 
 * Handles entity creation for allocation-related requests:
 * - RESOURCE_ALLOCATION: Create new allocation
 * - RESOURCE_EXTENSION: Extend existing allocation
 * - RESOURCE_RELEASE: End/release allocation early
 */

import prisma from '../../../lib/prisma';
import { logger } from '../../../lib/logger';
import { HandlerContext, HandlerResult } from './index';
import { AllocationStatus } from '@prisma/client';
import { createAuditLog } from '../../audit/audit.service';

// ============================================================================
// RESOURCE_ALLOCATION Handler
// Creates a new allocation when request is approved
// ============================================================================

export async function executeAllocationHandler(ctx: HandlerContext): Promise<HandlerResult> {
  const { tenantId, requestId: _requestId, requestData } = ctx;
  
  // Extract and validate required fields
  const resourceId = requestData.resourceId as string;
  const projectId = requestData.projectId as string;
  const role = requestData.role as string;
  const percentage = requestData.percentage as number;
  const startDate = new Date(requestData.startDate as string);
  const endDate = new Date(requestData.endDate as string);
  const isBillable = requestData.isBillable !== false;
  const billRate = requestData.billRate as number | undefined;
  const notes = requestData.notes as string | undefined;
  
  // Validate required fields
  if (!resourceId || !projectId || !role || !percentage || !startDate || !endDate) {
    return {
      success: false,
      error: 'Missing required fields: resourceId, projectId, role, percentage, startDate, endDate',
    };
  }
  
  // Verify resource exists and belongs to tenant
  const resource = await prisma.resource.findFirst({
    where: { id: resourceId, tenantId, deletedAt: null },
  });
  
  if (!resource) {
    return {
      success: false,
      error: `Resource not found: ${resourceId}`,
    };
  }
  
  // Verify project exists and belongs to tenant
  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId, deletedAt: null },
  });
  
  if (!project) {
    return {
      success: false,
      error: `Project not found: ${projectId}`,
    };
  }
  
  // Check for over-allocation
  const existingAllocations = await prisma.allocation.findMany({
    where: {
      resourceId,
      tenantId,
      status: AllocationStatus.ACTIVE,
      startDate: { lte: endDate },
      endDate: { gte: startDate },
      deletedAt: null,
    },
  });
  
  const totalExisting = existingAllocations.reduce((sum, a) => sum + a.percentage, 0);
  if (totalExisting + percentage > 100) {
    logger.warn('Allocation would exceed 100%', {
      resourceId,
      existing: totalExisting,
      requested: percentage,
      total: totalExisting + percentage,
    });
    // Allow but log warning - business may allow over-allocation
  }
  
  // Create the allocation
  const allocation = await prisma.allocation.create({
    data: {
      tenantId,
      resourceId,
      projectId,
      role,
      percentage,
      startDate,
      endDate,
      isBillable,
      billRate: billRate ?? resource.costPerHour,
      status: AllocationStatus.ACTIVE,
      notes: notes ? `${notes}\n[Created from request ${ctx.requestNumber}]` : `Created from request ${ctx.requestNumber}`,
      requestedById: ctx.requesterId,
      approvedById: ctx.approvedById,
      confirmedAt: new Date(),
    },
  });
  
  // Update resource bench status if they're fully allocated now
  const totalAllocated = totalExisting + percentage;
  if (totalAllocated >= 100 && resource.benchSince) {
    await prisma.resource.update({
      where: { id: resourceId },
      data: { benchSince: null },
    });
    logger.info('Resource removed from bench', { resourceId, totalAllocated });
  }
  
  await createAuditLog(
    tenantId,
    ctx.approvedById,
    'Allocation',
    allocation.id,
    'CREATE',
    {
      resourceId,
      projectId,
      percentage,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      requestNumber: ctx.requestNumber,
    }
  );
  
  return {
    success: true,
    entityType: 'Allocation',
    entityId: allocation.id,
    details: {
      resourceId,
      resourceName: `${resource.firstName} ${resource.lastName}`,
      projectId,
      projectName: project.name,
      percentage,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    },
  };
}

// ============================================================================
// RESOURCE_EXTENSION Handler
// Extends an existing allocation's end date
// ============================================================================

export async function executeExtensionHandler(ctx: HandlerContext): Promise<HandlerResult> {
  const { tenantId, requestId: _requestId, requestData } = ctx;
  
  const allocationId = requestData.allocationId as string;
  const newEndDate = new Date(requestData.newEndDate as string);
  const percentageChange = requestData.percentageChange as number | undefined;
  const billRateChange = requestData.billRateChange as number | undefined;
  
  if (!allocationId || !newEndDate) {
    return {
      success: false,
      error: 'Missing required fields: allocationId, newEndDate',
    };
  }
  
  // Find the allocation
  const allocation = await prisma.allocation.findFirst({
    where: { id: allocationId, tenantId, deletedAt: null },
    include: { resource: true, project: true },
  });
  
  if (!allocation) {
    return {
      success: false,
      error: `Allocation not found: ${allocationId}`,
    };
  }
  
  // Store old values for audit
  const oldEndDate = allocation.endDate;
  const oldPercentage = allocation.percentage;
  const oldBillRate = allocation.billRate;
  
  // Update the allocation
  await prisma.allocation.update({
    where: { id: allocationId },
    data: {
      endDate: newEndDate,
      percentage: percentageChange ?? allocation.percentage,
      billRate: billRateChange ?? allocation.billRate,
      updatedAt: new Date(),
    },
  });
  
  await createAuditLog(
    tenantId,
    ctx.approvedById,
    'Allocation',
    allocationId,
    'UPDATE',
    {
      oldEndDate: oldEndDate.toISOString(),
      newEndDate: newEndDate.toISOString(),
      oldPercentage,
      newPercentage: percentageChange ?? oldPercentage,
      oldBillRate: oldBillRate?.toString(),
      newBillRate: (billRateChange ?? oldBillRate)?.toString(),
      requestNumber: ctx.requestNumber,
    }
  );
  
  return {
    success: true,
    entityType: 'Allocation',
    entityId: allocationId,
    details: {
      resourceName: `${allocation.resource.firstName} ${allocation.resource.lastName}`,
      projectName: allocation.project.name,
      oldEndDate: oldEndDate.toISOString(),
      newEndDate: newEndDate.toISOString(),
    },
  };
}

// ============================================================================
// RESOURCE_RELEASE Handler
// Ends an allocation early (early release/rolloff)
// ============================================================================

export async function executeReleaseHandler(ctx: HandlerContext): Promise<HandlerResult> {
  const { tenantId, requestId: _requestId, requestData } = ctx;
  
  const allocationId = requestData.allocationId as string;
  const releaseDate = new Date(requestData.releaseDate as string);
  const reason = requestData.reason as string;
  
  if (!allocationId || !releaseDate) {
    return {
      success: false,
      error: 'Missing required fields: allocationId, releaseDate',
    };
  }
  
  // Find the allocation
  const allocation = await prisma.allocation.findFirst({
    where: { id: allocationId, tenantId, deletedAt: null },
    include: { resource: true, project: true },
  });
  
  if (!allocation) {
    return {
      success: false,
      error: `Allocation not found: ${allocationId}`,
    };
  }
  
  const originalEndDate = allocation.endDate;
  
  // Update the allocation
  await prisma.allocation.update({
    where: { id: allocationId },
    data: {
      endDate: releaseDate,
      status: releaseDate <= new Date() ? AllocationStatus.COMPLETED : AllocationStatus.ACTIVE,
      notes: `${allocation.notes || ''}\n[Released early: ${reason}]`.trim(),
      updatedAt: new Date(),
    },
  });
  
  // Check if resource should go back to bench
  const remainingAllocations = await prisma.allocation.findMany({
    where: {
      resourceId: allocation.resourceId,
      tenantId,
      status: AllocationStatus.ACTIVE,
      endDate: { gte: new Date() },
      deletedAt: null,
      id: { not: allocationId },
    },
  });
  
  const totalRemaining = remainingAllocations.reduce((sum, a) => sum + a.percentage, 0);
  if (totalRemaining === 0 && !allocation.resource.benchSince) {
    await prisma.resource.update({
      where: { id: allocation.resourceId },
      data: { benchSince: releaseDate },
    });
    logger.info('Resource moved to bench', { resourceId: allocation.resourceId });
  }
  
  await createAuditLog(
    tenantId,
    ctx.approvedById,
    'Allocation',
    allocationId,
    'UPDATE',
    {
      originalEndDate: originalEndDate.toISOString(),
      releaseDate: releaseDate.toISOString(),
      reason,
      requestNumber: ctx.requestNumber,
    }
  );
  
  return {
    success: true,
    entityType: 'Allocation',
    entityId: allocationId,
    details: {
      resourceName: `${allocation.resource.firstName} ${allocation.resource.lastName}`,
      projectName: allocation.project.name,
      originalEndDate: originalEndDate.toISOString(),
      releaseDate: releaseDate.toISOString(),
      reason,
    },
  };
}
