/**
 * Governance Service
 * 
 * Handles Phase 5 of Organization Onboarding: Governance Setup
 * - Delegation rules
 * - Approval configurations
 */

import prisma from '../../lib/prisma';
import { logger } from '../../lib/logger';
import type { EntityStatus, DelegatorType } from '@prisma/client';

// =============================================================================
// TYPES
// =============================================================================

export interface DelegationRuleInput {
  name: string;
  description?: string;
  delegatorType?: DelegatorType;
  delegatorId?: string;
  autoDelegate?: boolean;
  triggerDays?: number;
  maxDuration?: number;
  allowedTypes?: string[];
}

// =============================================================================
// DELEGATION RULES
// =============================================================================

/**
 * Get delegation rules
 */
export async function getDelegationRules(tenantId: string, active?: boolean) {
  return prisma.delegationRule.findMany({
    where: {
      tenantId,
      ...(active && { status: 'ACTIVE' }),
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get delegation rule by ID
 */
export async function getDelegationRuleById(tenantId: string, id: string) {
  return prisma.delegationRule.findFirst({
    where: { id, tenantId },
  });
}

/**
 * Create delegation rule
 */
export async function createDelegationRule(tenantId: string, input: DelegationRuleInput) {
  logger.info('Creating delegation rule', { tenantId, name: input.name });
  
  const rule = await prisma.delegationRule.create({
    data: {
      tenantId,
      name: input.name,
      description: input.description,
      delegatorType: input.delegatorType || 'ANY_USER',
      delegatorId: input.delegatorId,
      autoDelegate: input.autoDelegate ?? false,
      triggerDays: input.triggerDays,
      maxDuration: input.maxDuration,
      allowedTypes: input.allowedTypes || [],
    },
  });
  
  logger.info('Delegation rule created', { ruleId: rule.id });
  return rule;
}

/**
 * Update delegation rule
 */
export async function updateDelegationRule(
  tenantId: string,
  id: string,
  input: Partial<DelegationRuleInput & { status: EntityStatus }>
) {
  logger.info('Updating delegation rule', { tenantId, id });
  
  return prisma.delegationRule.update({
    where: { id },
    data: {
      ...(input.name && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.delegatorType && { delegatorType: input.delegatorType }),
      ...(input.delegatorId !== undefined && { delegatorId: input.delegatorId }),
      ...(input.autoDelegate !== undefined && { autoDelegate: input.autoDelegate }),
      ...(input.triggerDays !== undefined && { triggerDays: input.triggerDays }),
      ...(input.maxDuration !== undefined && { maxDuration: input.maxDuration }),
      ...(input.allowedTypes && { allowedTypes: input.allowedTypes }),
      ...(input.status && { status: input.status }),
    },
  });
}

/**
 * Delete delegation rule (soft delete)
 */
export async function deleteDelegationRule(tenantId: string, id: string) {
  logger.info('Deleting delegation rule', { tenantId, id });
  
  await prisma.delegationRule.update({
    where: { id },
    data: { status: 'INACTIVE' },
  });
}

// =============================================================================
// GOVERNANCE STATUS
// =============================================================================

/**
 * Get governance setup status
 */
export async function getGovernanceStatus(tenantId: string) {
  const delegationRules = await prisma.delegationRule.count({ where: { tenantId, status: 'ACTIVE' } });
  
  return {
    hasDelegationRules: delegationRules > 0,
    delegationRuleCount: delegationRules,
  };
}

// =============================================================================
// SEEDING
// =============================================================================

const DEFAULT_DELEGATION_RULES: Omit<DelegationRuleInput, 'tenantId'>[] = [
  {
    name: 'Standard Delegation',
    description: 'Allows any user to delegate to another user',
    delegatorType: 'ANY_USER',
    autoDelegate: false,
    maxDuration: 30,
  },
  {
    name: 'Role-based Delegation',
    description: 'Role holders can delegate to others',
    delegatorType: 'ROLE_HOLDER',
    autoDelegate: false,
    maxDuration: 14,
  },
];

/**
 * Seed default delegation rules
 */
export async function seedDefaultDelegationRules(tenantId: string) {
  logger.info('Seeding default delegation rules', { tenantId });
  
  const created: any[] = [];
  
  for (const rule of DEFAULT_DELEGATION_RULES) {
    const existing = await prisma.delegationRule.findFirst({
      where: { tenantId, name: rule.name },
    });
    
    if (!existing) {
      const newRule = await createDelegationRule(tenantId, rule);
      created.push(newRule);
    }
  }
  
  return created;
}
