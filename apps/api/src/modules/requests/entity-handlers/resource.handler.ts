/**
 * Resource Request Handlers
 * 
 * Handles entity creation for HR/resource-related requests:
 * - RESOURCE_ONBOARDING: Create new resource (employee onboarding)
 * - RESOURCE_OFFBOARDING: Mark resource as inactive (employee exit)
 */

import prisma from '../../../lib/prisma';
import { logger } from '../../../lib/logger';
import { HandlerContext, HandlerResult } from './index';
import { ResourceStatus, EmploymentType, AllocationStatus, AuditAction, RequestStatus } from '@prisma/client';

// ============================================================================
// RESOURCE_ONBOARDING Handler
// Creates a new resource when onboarding request is approved
// ============================================================================

export async function executeOnboardingHandler(ctx: HandlerContext): Promise<HandlerResult> {
  const { tenantId, requestData } = ctx;
  
  // Extract fields
  const firstName = requestData.firstName as string;
  const lastName = requestData.lastName as string;
  const email = requestData.email as string;
  const employmentType = requestData.employmentType as string;
  const practiceId = requestData.practiceId as string;
  const managerId = requestData.managerId as string | undefined;
  const designation = requestData.designation as string;
  const band = requestData.band as string;
  const dateOfJoining = new Date(requestData.dateOfJoining as string);
  const locationId = requestData.locationId as string | undefined;
  const costPerHour = requestData.costPerHour as number | undefined;
  const skills = requestData.skills as string[] | undefined;
  
  // Validate required fields
  if (!firstName || !lastName || !email || !employmentType || !practiceId || !designation || !band || !dateOfJoining) {
    return {
      success: false,
      error: 'Missing required fields: firstName, lastName, email, employmentType, practiceId, designation, band, dateOfJoining',
    };
  }
  
  // Check for duplicate email
  const existingResource = await prisma.resource.findFirst({
    where: { email, tenantId, deletedAt: null },
  });
  
  if (existingResource) {
    return {
      success: false,
      error: `Resource with email ${email} already exists`,
    };
  }
  
  // Generate employee ID
  const year = new Date().getFullYear();
  const count = await prisma.resource.count({
    where: { tenantId, createdAt: { gte: new Date(`${year}-01-01`) } },
  });
  const employeeId = `${tenantId.substring(0, 3).toUpperCase()}${year}${String(count + 1).padStart(4, '0')}`;
  
  // Verify practice exists
  const practice = await prisma.practice.findFirst({
    where: { id: practiceId, tenantId },
  });
  
  if (!practice) {
    return {
      success: false,
      error: `Practice not found: ${practiceId}`,
    };
  }
  
  // Map employment type
  const employmentTypeMap: Record<string, EmploymentType> = {
    FTE: EmploymentType.FTE,
    CONTRACTOR: EmploymentType.CONTRACTOR,
    INTERN: EmploymentType.INTERN,
  };
  
  // Create the resource
  const resource = await prisma.resource.create({
    data: {
      tenantId,
      employeeId,
      firstName,
      lastName,
      email,
      employmentType: employmentTypeMap[employmentType] || EmploymentType.FTE,
      practiceId,
      managerId,
      designation,
      band,
      dateOfJoining,
      locationId,
      costPerHour,
      status: ResourceStatus.ACTIVE,
      capacity: 100,
      benchSince: dateOfJoining, // Start on bench until allocated
    },
  });
  
  // Add skills if provided
  if (skills && skills.length > 0) {
    for (const skillName of skills) {
      // Find or create the skill
      let skill = await prisma.skill.findFirst({
        where: { name: skillName, tenantId },
      });
      
      if (!skill) {
        skill = await prisma.skill.create({
          data: {
            tenantId,
            name: skillName,
          },
        });
      }
      
      // Associate with resource
      await prisma.resourceSkill.create({
        data: {
          resourceId: resource.id,
          skillId: skill.id,
          proficiency: 'INTERMEDIATE',
        },
      });
    }
  }
  
  // Log audit
  await prisma.auditLog.create({
    data: {
      tenantId,
      userId: ctx.approvedById,
      action: AuditAction.CREATE,
      entityType: 'Resource',
      entityId: resource.id,
      changes: {
        employeeId,
        firstName,
        lastName,
        email,
        designation,
        practiceId,
        dateOfJoining: dateOfJoining.toISOString(),
        requestNumber: ctx.requestNumber,
      },
    },
  });
  
  logger.info('Resource created from onboarding request', {
    resourceId: resource.id,
    employeeId,
    email,
    requestId: ctx.requestId,
    requestNumber: ctx.requestNumber,
  });
  
  return {
    success: true,
    entityType: 'Resource',
    entityId: resource.id,
    details: {
      employeeId,
      name: `${firstName} ${lastName}`,
      email,
      designation,
      dateOfJoining: dateOfJoining.toISOString(),
    },
  };
}

// ============================================================================
// RESOURCE_OFFBOARDING Handler
// Marks a resource as inactive and handles exit process
// ============================================================================

export async function executeOffboardingHandler(ctx: HandlerContext): Promise<HandlerResult> {
  const { tenantId, requestData } = ctx;
  
  const resourceId = requestData.resourceId as string;
  const lastWorkingDate = new Date(requestData.lastWorkingDate as string);
  const exitReason = requestData.exitReason as string;
  const exitReasonDetails = requestData.exitReasonDetails as string | undefined;
  
  if (!resourceId || !lastWorkingDate || !exitReason) {
    return {
      success: false,
      error: 'Missing required fields: resourceId, lastWorkingDate, exitReason',
    };
  }
  
  // Find the resource
  const resource = await prisma.resource.findFirst({
    where: { id: resourceId, tenantId, deletedAt: null },
    include: { user: true },
  });
  
  if (!resource) {
    return {
      success: false,
      error: `Resource not found: ${resourceId}`,
    };
  }
  
  // End all active allocations
  const activeAllocations = await prisma.allocation.findMany({
    where: {
      resourceId,
      tenantId,
      status: AllocationStatus.ACTIVE,
      deletedAt: null,
    },
    include: { project: true },
  });
  
  const endedAllocations: string[] = [];
  for (const allocation of activeAllocations) {
    await prisma.allocation.update({
      where: { id: allocation.id },
      data: {
        status: AllocationStatus.COMPLETED,
        endDate: lastWorkingDate,
        notes: `${allocation.notes || ''}\n[Ended due to resource exit: ${exitReason}]`.trim(),
      },
    });
    endedAllocations.push(allocation.project.name);
  }
  
  // Cancel any pending requests from this resource
  const pendingRequests = await prisma.request.findMany({
    where: {
      tenantId,
      requesterId: ctx.requesterId,
      status: { in: [RequestStatus.DRAFT, RequestStatus.PENDING_APPROVAL, RequestStatus.SUBMITTED] },
    },
  });
  
  for (const request of pendingRequests) {
    await prisma.request.update({
      where: { id: request.id },
      data: {
        status: RequestStatus.CANCELLED,
        resolvedAt: new Date(),
        executionNotes: `Automatically cancelled due to resource exit`,
      },
    });
  }
  
  // Update the resource status
  await prisma.resource.update({
    where: { id: resourceId },
    data: {
      status: ResourceStatus.INACTIVE,
      dateOfExit: lastWorkingDate,
      exitReason: exitReasonDetails || exitReason,
      benchSince: null, // No longer on bench
      updatedAt: new Date(),
    },
  });
  
  // Disable associated user account if exists
  if (resource.user && resource.user.length > 0) {
    for (const user of resource.user) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          status: 'INACTIVE',
          updatedAt: new Date(),
        },
      });
      logger.info('User account disabled due to resource exit', { userId: user.id });
    }
  }
  
  // Log audit
  await prisma.auditLog.create({
    data: {
      tenantId,
      userId: ctx.approvedById,
      action: AuditAction.UPDATE,
      entityType: 'Resource',
      entityId: resourceId,
      changes: {
        lastWorkingDate: lastWorkingDate.toISOString(),
        exitReason,
        exitReasonDetails,
        newStatus: ResourceStatus.INACTIVE,
        allocationsEnded: endedAllocations,
        requestsCancelled: pendingRequests.length,
        requestNumber: ctx.requestNumber,
      },
    },
  });
  
  logger.info('Resource offboarded', {
    resourceId,
    employeeId: resource.employeeId,
    exitReason,
    allocationsEnded: endedAllocations.length,
    requestsCancelled: pendingRequests.length,
    requestId: ctx.requestId,
  });
  
  return {
    success: true,
    entityType: 'Resource',
    entityId: resourceId,
    details: {
      employeeId: resource.employeeId,
      name: `${resource.firstName} ${resource.lastName}`,
      exitReason,
      lastWorkingDate: lastWorkingDate.toISOString(),
      newStatus: ResourceStatus.INACTIVE,
      allocationsEnded: endedAllocations.length,
      requestsCancelled: pendingRequests.length,
    },
  };
}
