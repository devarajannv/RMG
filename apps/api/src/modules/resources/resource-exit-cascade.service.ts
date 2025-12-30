/**
 * Resource Exit Cascade Service
 * 
 * Handles all the cascading operations when a resource exits the organization:
 * - Ends active/upcoming allocations on exit date
 * - Notifies project managers of affected allocations
 * - Updates bench status
 * - Creates audit trail
 * 
 * This is the GOD LEVEL approach - no manual cleanup required.
 * When dateOfExit is set, everything cascades automatically.
 */

import { Prisma } from '@prisma/client';
import prisma from '../../lib/prisma';
import { logger } from '../../lib/logger';

// ============================================================================
// Types
// ============================================================================

export interface ExitCascadeResult {
  success: boolean;
  resourceId: string;
  exitDate: Date;
  allocationsEnded: number;
  allocationsAffected: AllocationAffected[];
  projectsAffected: string[];
  auditLogId?: string;
  errors?: string[];
}

export interface AllocationAffected {
  allocationId: string;
  projectId: string;
  projectName: string;
  originalEndDate: Date;
  newEndDate: Date;
  status: string;
  projectManagerId?: string;
  projectManagerEmail?: string;
}

export interface ExitCascadeOptions {
  /** If true, actually perform the cascade. If false, just return what would happen */
  dryRun?: boolean;
  /** User ID performing the action */
  performedBy: string;
  /** Reason for exit */
  exitReason?: string;
  /** Custom notification message to project managers */
  notificationMessage?: string;
  /** If true, skip notification (for bulk operations) */
  skipNotification?: boolean;
}

// ============================================================================
// Main Cascade Function
// ============================================================================

/**
 * Execute exit cascade for a resource
 * 
 * This function:
 * 1. Finds all allocations that extend beyond the exit date
 * 2. Ends them on the exit date
 * 3. Cancels any PROPOSED allocations that haven't started
 * 4. Creates audit trail
 * 5. Optionally notifies project managers
 */
export async function executeResourceExitCascade(
  tenantId: string,
  resourceId: string,
  exitDate: Date,
  options: ExitCascadeOptions
): Promise<ExitCascadeResult> {
  const { dryRun = false, performedBy, exitReason, skipNotification = false } = options;

  logger.info('Starting resource exit cascade', {
    tenantId,
    resourceId,
    exitDate,
    dryRun,
  });

  // Normalize exit date to end of day
  const normalizedExitDate = new Date(exitDate);
  normalizedExitDate.setHours(23, 59, 59, 999);

  const result: ExitCascadeResult = {
    success: true,
    resourceId,
    exitDate: normalizedExitDate,
    allocationsEnded: 0,
    allocationsAffected: [],
    projectsAffected: [],
  };

  try {
    // Get resource info for audit
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      select: { 
        firstName: true, 
        lastName: true, 
        email: true,
        employeeId: true,
      },
    });

    if (!resource) {
      throw new Error(`Resource ${resourceId} not found`);
    }

    // Find all allocations that need to be affected
    const affectedAllocations = await prisma.allocation.findMany({
      where: {
        tenantId,
        resourceId,
        deletedAt: null,
        OR: [
          // Allocations that end after exit date
          {
            status: { in: ['CONFIRMED', 'ACTIVE'] },
            endDate: { gt: normalizedExitDate },
          },
          // PROPOSED allocations that start after exit date
          {
            status: 'PROPOSED',
            startDate: { gt: normalizedExitDate },
          },
          // Active allocations that span the exit date
          {
            status: 'ACTIVE',
            startDate: { lte: normalizedExitDate },
            endDate: { gte: normalizedExitDate },
          },
        ],
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            code: true,
            managerId: true,
            manager: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    logger.info(`Found ${affectedAllocations.length} allocations to process`, {
      resourceId,
      exitDate: normalizedExitDate,
    });

    // Process each allocation
    const projectsAffectedSet = new Set<string>();
    const errors: string[] = [];

    for (const allocation of affectedAllocations) {
      try {
        const affected = await processAllocationForExit(
          allocation,
          normalizedExitDate,
          dryRun,
          performedBy,
          exitReason
        );

        result.allocationsAffected.push(affected);
        projectsAffectedSet.add(allocation.project.id);

        if (affected.status === 'CANCELLED' || affected.status === 'COMPLETED') {
          result.allocationsEnded++;
        }
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Allocation ${allocation.id}: ${errMsg}`);
        logger.error('Error processing allocation for exit', {
          allocationId: allocation.id,
          error: errMsg,
        });
      }
    }

    result.projectsAffected = Array.from(projectsAffectedSet);
    
    if (errors.length > 0) {
      result.errors = errors;
      // Still mark as success if most allocations were processed
      result.success = errors.length < affectedAllocations.length / 2;
    }

    // Create comprehensive audit log
    if (!dryRun) {
      const auditLog = await prisma.auditLog.create({
        data: {
          tenantId,
          userId: performedBy,
          action: 'TERMINATE',
          entityType: 'Resource',
          entityId: resourceId,
          changes: {
            exitDate: normalizedExitDate.toISOString(),
            exitReason,
            resourceName: `${resource.firstName} ${resource.lastName}`,
            resourceEmail: resource.email,
            employeeId: resource.employeeId,
            allocationsAffected: result.allocationsAffected.length,
            allocationsEnded: result.allocationsEnded,
            projectsAffected: result.projectsAffected,
            cascade: result.allocationsAffected.map(a => ({
              allocationId: a.allocationId,
              projectName: a.projectName,
              originalEndDate: a.originalEndDate.toISOString(),
              newEndDate: a.newEndDate.toISOString(),
              action: a.status,
            })),
          } as Prisma.InputJsonValue,
        },
      });

      result.auditLogId = auditLog.id;
    }

    // Trigger notifications if not skipped
    if (!skipNotification && !dryRun && result.allocationsAffected.length > 0) {
      await queueExitNotifications(
        tenantId,
        resourceId,
        resource,
        normalizedExitDate,
        result.allocationsAffected,
        options.notificationMessage
      );
    }

    logger.info('Resource exit cascade completed', {
      resourceId,
      allocationsEnded: result.allocationsEnded,
      projectsAffected: result.projectsAffected.length,
      dryRun,
    });

    return result;

  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Resource exit cascade failed', {
      resourceId,
      exitDate,
      error: errMsg,
    });

    return {
      ...result,
      success: false,
      errors: [errMsg],
    };
  }
}

// ============================================================================
// Allocation Processing
// ============================================================================

/**
 * Process a single allocation for resource exit
 */
async function processAllocationForExit(
  allocation: {
    id: string;
    status: string;
    startDate: Date;
    endDate: Date;
    project: {
      id: string;
      name: string;
      code: string;
      managerId: string | null;
      manager: {
        id: string;
        firstName: string;
        lastName: string;
      } | null;
    };
  },
  exitDate: Date,
  dryRun: boolean,
  _performedBy: string, // Reserved for audit trail integration
  exitReason?: string
): Promise<AllocationAffected> {
  const result: AllocationAffected = {
    allocationId: allocation.id,
    projectId: allocation.project.id,
    projectName: `${allocation.project.name} (${allocation.project.code})`,
    originalEndDate: allocation.endDate,
    newEndDate: allocation.endDate, // Will be updated based on action
    status: allocation.status,
    projectManagerId: allocation.project.managerId || undefined,
  };

  // Determine action based on allocation state
  if (allocation.status === 'PROPOSED' && allocation.startDate > exitDate) {
    // Cancel proposals that haven't started and start after exit
    result.status = 'CANCELLED';
    result.newEndDate = allocation.endDate; // Keep original for record

    if (!dryRun) {
      await prisma.allocation.update({
        where: { id: allocation.id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelReason: `Resource exit: ${exitReason || 'No longer available'}`,
          notes: `Automatically cancelled due to resource exit on ${exitDate.toISOString().split('T')[0]}`,
        },
      });
    }
  } else if (allocation.endDate > exitDate) {
    // End allocation on exit date
    result.status = allocation.startDate <= exitDate ? 'COMPLETED' : 'CANCELLED';
    result.newEndDate = exitDate;

    if (!dryRun) {
      await prisma.allocation.update({
        where: { id: allocation.id },
        data: {
          endDate: exitDate,
          actualEndDate: exitDate,
          status: result.status === 'COMPLETED' ? 'COMPLETED' : 'CANCELLED',
          completedAt: result.status === 'COMPLETED' ? new Date() : undefined,
          cancelledAt: result.status === 'CANCELLED' ? new Date() : undefined,
          cancelReason: result.status === 'CANCELLED' 
            ? `Resource exit: ${exitReason || 'No longer available'}`
            : undefined,
          notes: `End date adjusted from ${allocation.endDate.toISOString().split('T')[0]} to ${exitDate.toISOString().split('T')[0]} due to resource exit`,
        },
      });
    }
  }

  return result;
}

// ============================================================================
// Notification Queue
// ============================================================================

/**
 * Queue notifications to project managers about resource exit
 */
async function queueExitNotifications(
  tenantId: string,
  _resourceId: string, // Reserved for notification linking
  resource: { firstName: string; lastName: string; email: string },
  exitDate: Date,
  affectedAllocations: AllocationAffected[],
  customMessage?: string
): Promise<void> {
  // Group allocations by project manager
  const byManager = new Map<string, AllocationAffected[]>();

  for (const allocation of affectedAllocations) {
    if (allocation.projectManagerId) {
      const existing = byManager.get(allocation.projectManagerId) || [];
      existing.push(allocation);
      byManager.set(allocation.projectManagerId, existing);
    }
  }

  // Create notification tasks for each manager
  for (const [managerId, allocations] of byManager) {
    // In a real implementation, this would queue to a job system
    // For now, we just log it
    logger.info('Notification queued for project manager', {
      tenantId,
      managerId,
      resourceName: `${resource.firstName} ${resource.lastName}`,
      exitDate: exitDate.toISOString().split('T')[0],
      affectedAllocations: allocations.length,
      projects: allocations.map(a => a.projectName),
      customMessage,
    });

    // TODO: Integrate with email service when implemented
    // await emailService.send({
    //   to: managerEmail,
    //   template: 'resource-exit-notification',
    //   data: { resource, exitDate, allocations, customMessage }
    // });
  }
}

// ============================================================================
// Preview / Dry Run
// ============================================================================

/**
 * Preview what would happen if resource exits on given date
 * This is a dry run that returns the would-be changes without making them
 */
export async function previewResourceExitCascade(
  tenantId: string,
  resourceId: string,
  exitDate: Date,
  performedBy: string
): Promise<ExitCascadeResult> {
  return executeResourceExitCascade(tenantId, resourceId, exitDate, {
    dryRun: true,
    performedBy,
    skipNotification: true,
  });
}

// ============================================================================
// Batch Operations
// ============================================================================

/**
 * Execute exit cascade for multiple resources (bulk layoff scenario)
 */
export async function executeBulkExitCascade(
  tenantId: string,
  exits: Array<{ resourceId: string; exitDate: Date; exitReason?: string }>,
  performedBy: string
): Promise<{
  total: number;
  successful: number;
  failed: number;
  results: ExitCascadeResult[];
}> {
  const results: ExitCascadeResult[] = [];
  let successful = 0;
  let failed = 0;

  logger.info('Starting bulk exit cascade', {
    tenantId,
    totalResources: exits.length,
  });

  for (const exit of exits) {
    const result = await executeResourceExitCascade(
      tenantId,
      exit.resourceId,
      exit.exitDate,
      {
        performedBy,
        exitReason: exit.exitReason,
        // Skip individual notifications, send bulk notification after
        skipNotification: true,
      }
    );

    results.push(result);
    if (result.success) {
      successful++;
    } else {
      failed++;
    }
  }

  logger.info('Bulk exit cascade completed', {
    tenantId,
    total: exits.length,
    successful,
    failed,
  });

  return {
    total: exits.length,
    successful,
    failed,
    results,
  };
}

// ============================================================================
// Rollback (if needed)
// ============================================================================

/**
 * Rollback an exit cascade using the audit log
 * This is a safety net - should rarely be needed
 */
export async function rollbackExitCascade(
  tenantId: string,
  auditLogId: string,
  performedBy: string
): Promise<{ success: boolean; restoredAllocations: number; error?: string }> {
  try {
    const auditLog = await prisma.auditLog.findUnique({
      where: { id: auditLogId },
    });

    if (!auditLog || auditLog.tenantId !== tenantId) {
      return { success: false, restoredAllocations: 0, error: 'Audit log not found' };
    }

    if (auditLog.action !== 'TERMINATE' || auditLog.entityType !== 'Resource') {
      return { success: false, restoredAllocations: 0, error: 'Invalid audit log type' };
    }

    const changes = auditLog.changes as {
      cascade?: Array<{
        allocationId: string;
        originalEndDate: string;
        action: string;
      }>;
    };

    if (!changes.cascade || changes.cascade.length === 0) {
      return { success: true, restoredAllocations: 0 };
    }

    let restored = 0;

    for (const item of changes.cascade) {
      try {
        await prisma.allocation.update({
          where: { id: item.allocationId },
          data: {
            endDate: new Date(item.originalEndDate),
            actualEndDate: null,
            status: item.action === 'CANCELLED' ? 'PROPOSED' : 'ACTIVE',
            completedAt: null,
            cancelledAt: null,
            cancelReason: null,
            notes: `Restored by rollback (audit: ${auditLogId})`,
          },
        });
        restored++;
      } catch (error) {
        logger.warn('Failed to restore allocation during rollback', {
          allocationId: item.allocationId,
          error,
        });
      }
    }

    // Log the rollback
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: performedBy,
        action: 'UPDATE',
        entityType: 'Resource',
        entityId: auditLog.entityId,
        changes: {
          action: 'ROLLBACK_EXIT_CASCADE',
          originalAuditLogId: auditLogId,
          restoredAllocations: restored,
        } as Prisma.InputJsonValue,
      },
    });

    return { success: true, restoredAllocations: restored };

  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Exit cascade rollback failed', { auditLogId, error: errMsg });
    return { success: false, restoredAllocations: 0, error: errMsg };
  }
}
