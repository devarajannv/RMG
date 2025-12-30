/**
 * Contract Request Handlers
 * 
 * Handles entity creation for contract-related requests:
 * - CONTRACT_CREATION: Create new contract (MSA/SOW)
 * - CONTRACT_AMENDMENT: Amend existing contract
 */

import prisma from '../../../lib/prisma';
import { logger } from '../../../lib/logger';
import { HandlerContext, HandlerResult } from './index';
import { ContractStatus, ContractType, AuditAction } from '@prisma/client';

// ============================================================================
// CONTRACT_CREATION Handler
// Creates a new contract when request is approved
// ============================================================================

export async function executeContractHandler(ctx: HandlerContext): Promise<HandlerResult> {
  const { tenantId, requestData } = ctx;
  
  // Extract fields
  const clientId = requestData.clientId as string;
  const type = requestData.type as string;
  const name = requestData.name as string;
  const startDate = new Date(requestData.startDate as string);
  const endDate = requestData.endDate ? new Date(requestData.endDate as string) : undefined;
  const value = requestData.value as number | undefined;
  const currency = (requestData.currency as string) || 'INR';
  const paymentTerms = requestData.paymentTerms as string | undefined;
  const billingType = (requestData.billingType as string) || 'TM';
  const autoRenew = requestData.autoRenew as boolean | undefined;
  const description = requestData.description as string | undefined;
  
  // Validate required fields
  if (!clientId || !type || !name || !startDate) {
    return {
      success: false,
      error: 'Missing required fields: clientId, type, name, startDate',
    };
  }
  
  // Verify client exists
  const client = await prisma.client.findFirst({
    where: { id: clientId, tenantId, deletedAt: null },
  });
  
  if (!client) {
    return {
      success: false,
      error: `Client not found: ${clientId}`,
    };
  }
  
  // Generate contract number
  const year = new Date().getFullYear();
  const count = await prisma.contract.count({
    where: { tenantId, createdAt: { gte: new Date(`${year}-01-01`) } },
  });
  const contractNumber = `${client.code || 'CON'}-${year}-${String(count + 1).padStart(4, '0')}`;
  
  // Map contract type
  const contractTypeMap: Record<string, ContractType> = {
    MSA: ContractType.MSA,
    SOW: ContractType.SOW,
    NDA: ContractType.NDA,
    AMENDMENT: ContractType.AMENDMENT,
    OTHER: ContractType.OTHER,
  };
  
  // Create the contract
  const contract = await prisma.contract.create({
    data: {
      tenantId,
      clientId,
      contractNumber,
      type: contractTypeMap[type] || ContractType.SOW,
      name,
      description,
      startDate,
      endDate,
      value,
      currency,
      paymentTerms,
      billingType: billingType as any,
      autoRenew: autoRenew ?? false,
      status: ContractStatus.DRAFT, // Starts as draft, needs activation
    },
  });
  
  // Log audit
  await prisma.auditLog.create({
    data: {
      tenantId,
      userId: ctx.approvedById,
      action: AuditAction.CREATE,
      entityType: 'Contract',
      entityId: contract.id,
      changes: {
        contractNumber,
        type,
        name,
        clientId,
        clientName: client.name,
        value,
        startDate: startDate.toISOString(),
        requestNumber: ctx.requestNumber,
      },
    },
  });
  
  logger.info('Contract created from request', {
    contractId: contract.id,
    contractNumber,
    type,
    clientName: client.name,
    requestId: ctx.requestId,
  });
  
  return {
    success: true,
    entityType: 'Contract',
    entityId: contract.id,
    details: {
      contractNumber,
      type,
      name,
      clientName: client.name,
      value,
      status: contract.status,
    },
  };
}

// ============================================================================
// CONTRACT_AMENDMENT Handler
// Creates an amendment to an existing contract
// ============================================================================

export async function executeContractAmendmentHandler(ctx: HandlerContext): Promise<HandlerResult> {
  const { tenantId, requestData } = ctx;
  
  const contractId = requestData.contractId as string;
  const amendmentType = requestData.amendmentType as string;
  const effectiveDate = new Date(requestData.effectiveDate as string);
  const changes = requestData.changes as Record<string, unknown> | undefined;
  const reason = requestData.reason as string;
  
  if (!contractId || !amendmentType || !effectiveDate) {
    return {
      success: false,
      error: 'Missing required fields: contractId, amendmentType, effectiveDate',
    };
  }
  
  // Find the original contract
  const contract = await prisma.contract.findFirst({
    where: { id: contractId, tenantId, deletedAt: null },
    include: { client: true },
  });
  
  if (!contract) {
    return {
      success: false,
      error: `Contract not found: ${contractId}`,
    };
  }
  
  // Generate amendment number
  const amendmentCount = await prisma.contract.count({
    where: { tenantId, type: ContractType.AMENDMENT, name: { contains: contract.contractNumber } },
  });
  const amendmentNumber = `${contract.contractNumber}-AMD-${amendmentCount + 1}`;
  
  // Create the amendment as a new contract record
  const amendment = await prisma.contract.create({
    data: {
      tenantId,
      clientId: contract.clientId,
      contractNumber: amendmentNumber,
      type: ContractType.AMENDMENT,
      name: `Amendment to ${contract.name}: ${amendmentType}`,
      description: JSON.stringify({
        amendmentType,
        reason,
        originalValues: {
          value: contract.value?.toString(),
          endDate: contract.endDate?.toISOString(),
          paymentTerms: contract.paymentTerms,
        },
        newValues: changes,
      }),
      startDate: effectiveDate,
      endDate: contract.endDate,
      value: changes?.newValue != null ? Number(changes.newValue) : contract.value,
      currency: contract.currency,
      paymentTerms: (changes?.newPaymentTerms as string) ?? contract.paymentTerms,
      billingType: contract.billingType,
      status: ContractStatus.ACTIVE,
    },
  });
  
  // Update the original contract if there are direct changes
  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };
  
  if (changes?.newEndDate) {
    updateData.endDate = new Date(changes.newEndDate as string);
  }
  if (changes?.newValue !== undefined) {
    updateData.value = changes.newValue as number;
  }
  if (changes?.newPaymentTerms) {
    updateData.paymentTerms = changes.newPaymentTerms as string;
  }
  
  if (Object.keys(updateData).length > 1) {
    await prisma.contract.update({
      where: { id: contractId },
      data: updateData as any,
    });
  }
  
  // Log audit
  await prisma.auditLog.create({
    data: {
      tenantId,
      userId: ctx.approvedById,
      action: AuditAction.UPDATE,
      entityType: 'Contract',
      entityId: contractId,
      changes: {
        amendmentId: amendment.id,
        amendmentNumber,
        amendmentType,
        effectiveDate: effectiveDate.toISOString(),
        reason,
        requestNumber: ctx.requestNumber,
      },
    },
  });
  
  logger.info('Contract amended from request', {
    contractId,
    amendmentId: amendment.id,
    amendmentNumber,
    amendmentType,
    requestId: ctx.requestId,
  });
  
  return {
    success: true,
    entityType: 'Contract',
    entityId: amendment.id,
    details: {
      amendmentNumber,
      amendmentType,
      originalContract: contract.contractNumber,
      effectiveDate: effectiveDate.toISOString(),
      reason,
    },
  };
}
