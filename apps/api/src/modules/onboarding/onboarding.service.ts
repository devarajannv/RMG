/**
 * Onboarding Orchestrator Service
 * 
 * Central orchestrator for the Organization Onboarding flow
 * - Progress tracking
 * - Phase validation
 * - Checklist management
 */

import prisma from '../../lib/prisma';
import { logger } from '../../lib/logger';
import * as IdentityService from './identity.service';
import * as StructureService from './structure.service';
import * as RolesService from './roles.service';
import * as PeopleService from './people.service';
import * as GovernanceService from './governance.service';
import { roleService } from '../roles/role.service';

// =============================================================================
// TYPES
// =============================================================================

export interface OnboardingProgress {
  currentPhase: number;
  totalPhases: number;
  overallPercentage: number;
  phases: PhaseProgress[];
  canProceed: boolean;
  blockers: string[];
}

export interface PhaseProgress {
  phase: number;
  name: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  percentage: number;
  steps: StepProgress[];
}

export interface StepProgress {
  stepCode: string;
  name: string;
  isRequired: boolean;
  isCompleted: boolean;
  completedAt?: Date;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const ONBOARDING_PHASES = [
  {
    phase: 1,
    name: 'Organization Identity',
    steps: [
      { stepCode: 'COMPANY_PROFILE', stepName: 'Company Profile', isRequired: true },
      { stepCode: 'BRANDING', stepName: 'Branding Settings', isRequired: false },
      { stepCode: 'REGIONAL_SETTINGS', stepName: 'Regional Settings', isRequired: true },
    ],
  },
  {
    phase: 2,
    name: 'Organization Structure',
    steps: [
      { stepCode: 'DEPARTMENTS', stepName: 'Departments', isRequired: true },
      { stepCode: 'TEAMS', stepName: 'Teams', isRequired: false },
      { stepCode: 'COST_CENTERS', stepName: 'Cost Centers', isRequired: false },
    ],
  },
  {
    phase: 3,
    name: 'Business Roles',
    steps: [
      { stepCode: 'GRADE_BANDS', stepName: 'Grade Bands', isRequired: true },
      { stepCode: 'BUSINESS_ROLES', stepName: 'Business Roles', isRequired: true },
    ],
  },
  {
    phase: 4,
    name: 'People Setup',
    steps: [
      { stepCode: 'RESOURCES', stepName: 'Add Resources', isRequired: true },
      { stepCode: 'USER_ACCOUNTS', stepName: 'User Accounts', isRequired: true },
    ],
  },
  {
    phase: 5,
    name: 'Governance',
    steps: [
      { stepCode: 'DELEGATION_RULES', stepName: 'Delegation Rules', isRequired: false },
    ],
  },
];

// =============================================================================
// PROGRESS TRACKING
// =============================================================================

/**
 * Get onboarding progress for a tenant
 */
export async function getOnboardingProgress(tenantId: string): Promise<OnboardingProgress> {
  logger.info('Getting onboarding progress', { tenantId });
  
  const checklist = await prisma.onboardingChecklist.findMany({
    where: { tenantId },
    orderBy: [{ phase: 'asc' }, { stepCode: 'asc' }],
  });
  
  const checklistMap = new Map(checklist.map(c => [`${c.phase}-${c.stepCode}`, c]));
  
  const phases: PhaseProgress[] = [];
  let currentPhase = 1;
  const blockers: string[] = [];
  
  for (const phaseConfig of ONBOARDING_PHASES) {
    const steps: StepProgress[] = phaseConfig.steps.map(step => {
      const item = checklistMap.get(`${phaseConfig.phase}-${step.stepCode}`);
      return {
        stepCode: step.stepCode,
        name: step.stepName,
        isRequired: step.isRequired,
        isCompleted: item?.isCompleted || false,
        completedAt: item?.completedAt || undefined,
      };
    });
    
    const completedSteps = steps.filter(s => s.isCompleted).length;
    const requiredSteps = steps.filter(s => s.isRequired);
    
    let status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' = 'NOT_STARTED';
    if (completedSteps === steps.length) {
      status = 'COMPLETED';
    } else if (completedSteps > 0) {
      status = 'IN_PROGRESS';
    }
    
    // Find blockers for current phase
    if (status !== 'COMPLETED' && phaseConfig.phase === currentPhase + 1) {
      const incomplete = requiredSteps.filter(s => !s.isCompleted);
      blockers.push(...incomplete.map(s => `${phaseConfig.name}: ${s.name} is required`));
    }
    
    if (status === 'COMPLETED' || status === 'IN_PROGRESS') {
      currentPhase = Math.max(currentPhase, phaseConfig.phase);
    }
    
    phases.push({
      phase: phaseConfig.phase,
      name: phaseConfig.name,
      status,
      percentage: Math.round((completedSteps / steps.length) * 100),
      steps,
    });
  }
  
  const completedPhases = phases.filter(p => p.status === 'COMPLETED').length;
  const overallPercentage = Math.round((completedPhases / phases.length) * 100);
  
  return {
    currentPhase,
    totalPhases: phases.length,
    overallPercentage,
    phases,
    canProceed: blockers.length === 0,
    blockers,
  };
}

/**
 * Mark a step as completed
 */
export async function completeStep(
  tenantId: string,
  phase: number,
  stepCode: string,
  completedBy: string
): Promise<void> {
  logger.info('Completing onboarding step', { tenantId, phase, stepCode });
  
  const phaseConfig = ONBOARDING_PHASES.find(p => p.phase === phase);
  const stepConfig = phaseConfig?.steps.find(s => s.stepCode === stepCode);
  
  if (!stepConfig) {
    throw new Error('Invalid phase or step');
  }
  
  await prisma.onboardingChecklist.upsert({
    where: {
      tenantId_phase_stepCode: { tenantId, phase, stepCode },
    },
    create: {
      tenantId,
      phase,
      stepCode,
      stepName: stepConfig.stepName,
      isRequired: stepConfig.isRequired,
      isCompleted: true,
      completedBy,
      completedAt: new Date(),
    },
    update: {
      isCompleted: true,
      completedBy,
      completedAt: new Date(),
    },
  });
  
  logger.info('Step completed', { tenantId, phase, stepCode });
}

/**
 * Skip a step (for optional steps only)
 */
export async function skipStep(
  tenantId: string,
  phase: number,
  stepCode: string,
  skippedBy: string
): Promise<void> {
  logger.info('Skipping onboarding step', { tenantId, phase, stepCode });
  
  const phaseConfig = ONBOARDING_PHASES.find(p => p.phase === phase);
  const stepConfig = phaseConfig?.steps.find(s => s.stepCode === stepCode);
  
  if (!stepConfig) {
    throw new Error('Invalid phase or step');
  }
  
  if (stepConfig.isRequired) {
    throw new Error('Cannot skip a required step');
  }
  
  await prisma.onboardingChecklist.upsert({
    where: {
      tenantId_phase_stepCode: { tenantId, phase, stepCode },
    },
    create: {
      tenantId,
      phase,
      stepCode,
      stepName: stepConfig.stepName,
      isRequired: stepConfig.isRequired,
      isCompleted: true,
      completedBy: skippedBy,
      completedAt: new Date(),
      notes: 'Skipped',
    },
    update: {
      isCompleted: true,
      completedBy: skippedBy,
      completedAt: new Date(),
      notes: 'Skipped',
    },
  });
}

/**
 * Reset onboarding step
 */
export async function resetStep(
  tenantId: string,
  phase: number,
  stepCode: string
): Promise<void> {
  logger.info('Resetting onboarding step', { tenantId, phase, stepCode });
  
  const phaseConfig = ONBOARDING_PHASES.find(p => p.phase === phase);
  const stepConfig = phaseConfig?.steps.find(s => s.stepCode === stepCode);
  
  if (!stepConfig) {
    throw new Error('Invalid phase or step');
  }
  
  await prisma.onboardingChecklist.upsert({
    where: {
      tenantId_phase_stepCode: { tenantId, phase, stepCode },
    },
    create: {
      tenantId,
      phase,
      stepCode,
      stepName: stepConfig.stepName,
      isRequired: stepConfig.isRequired,
      isCompleted: false,
    },
    update: {
      isCompleted: false,
      completedBy: null,
      completedAt: null,
      notes: null,
    },
  });
}

// =============================================================================
// PHASE VALIDATION
// =============================================================================

/**
 * Check if a phase can be started
 */
export async function canStartPhase(
  tenantId: string,
  phase: number
): Promise<{ canStart: boolean; reason?: string }> {
  if (phase === 1) return { canStart: true };
  
  const prevPhase = ONBOARDING_PHASES.find(p => p.phase === phase - 1);
  if (!prevPhase) return { canStart: false, reason: 'Invalid phase' };
  
  const requiredSteps = prevPhase.steps.filter(s => s.isRequired);
  
  const completed = await prisma.onboardingChecklist.findMany({
    where: {
      tenantId,
      phase: phase - 1,
      stepCode: { in: requiredSteps.map(s => s.stepCode) },
      isCompleted: true,
    },
  });
  
  if (completed.length < requiredSteps.length) {
    return { canStart: false, reason: `Complete all required steps in ${prevPhase.name} first` };
  }
  
  return { canStart: true };
}

/**
 * Validate phase completion based on actual data
 */
export async function validatePhaseCompletion(
  tenantId: string,
  phase: number
): Promise<{ isComplete: boolean; missing: string[] }> {
  const missing: string[] = [];
  
  switch (phase) {
    case 1: {
      const profile = await IdentityService.getTenantProfile(tenantId);
      if (!profile) missing.push('Company Profile');
      break;
    }
    case 2: {
      const summary = await StructureService.getStructureSummary(tenantId);
      if (summary.departments === 0) missing.push('At least one department');
      break;
    }
    case 3: {
      const summary = await RolesService.getRolesSummary(tenantId);
      if (summary.businessRoles === 0) missing.push('At least one business role');
      if (summary.gradeBands === 0) missing.push('At least one grade band');
      break;
    }
    case 4: {
      const stats = await PeopleService.getPeopleStats(tenantId);
      if (stats.total === 0) missing.push('At least one resource');
      if (stats.withUserAccounts === 0) missing.push('At least one user account');
      break;
    }
    case 5:
      // Governance is optional
      break;
  }
  
  return { isComplete: missing.length === 0, missing };
}

// =============================================================================
// QUICK SETUP
// =============================================================================

/**
 * Initialize default data for quick setup
 */
export async function initializeDefaults(
  tenantId: string,
  options: {
    departments?: boolean;
    businessRoles?: boolean;
    gradeBands?: boolean;
    delegationRules?: boolean;
  }
): Promise<{ initialized: string[] }> {
  logger.info('Initializing defaults for tenant', { tenantId, options });
  
  const initialized: string[] = [];
  
  if (options.departments) {
    const created = await StructureService.seedDefaultDepartments(tenantId);
    if (created.length > 0) initialized.push(`${created.length} departments`);
  }
  
  if (options.businessRoles) {
    const created = await RolesService.seedDefaultBusinessRoles(tenantId);
    if (created.length > 0) initialized.push(`${created.length} business roles`);
  }
  
  if (options.gradeBands) {
    const created = await RolesService.seedDefaultGradeBands(tenantId);
    if (created.length > 0) initialized.push(`${created.length} grade bands`);
  }
  
  if (options.delegationRules) {
    const created = await GovernanceService.seedDefaultDelegationRules(tenantId);
    if (created.length > 0) initialized.push(`${created.length} delegation rules`);
  }

  const pmoRole = await roleService.ensureNewVisionPmoBaseline(tenantId);
  if (pmoRole) {
    initialized.push('PMO system role');
  }
  
  logger.info('Defaults initialized', { tenantId, initialized });
  
  return { initialized };
}

// =============================================================================
// ONBOARDING SUMMARY
// =============================================================================

/**
 * Get complete onboarding summary
 */
export async function getOnboardingSummary(tenantId: string) {
  const [progress, profile, structure, roles, people, governance] = await Promise.all([
    getOnboardingProgress(tenantId),
    IdentityService.getTenantProfile(tenantId),
    StructureService.getStructureSummary(tenantId),
    RolesService.getRolesSummary(tenantId),
    PeopleService.getPeopleStats(tenantId),
    GovernanceService.getGovernanceStatus(tenantId),
  ]);
  
  return {
    progress,
    identity: {
      hasProfile: !!profile,
      companyName: profile?.legalName,
      industry: profile?.industry,
    },
    structure,
    roles,
    people,
    governance,
  };
}

/**
 * Check if onboarding is complete
 */
export async function isOnboardingComplete(tenantId: string): Promise<boolean> {
  const progress = await getOnboardingProgress(tenantId);
  
  // At minimum: Phase 1-4 required steps must be complete
  for (let phase = 1; phase <= 4; phase++) {
    const phaseProgress = progress.phases.find(p => p.phase === phase);
    if (!phaseProgress) return false;
    
    const requiredSteps = phaseProgress.steps.filter(s => s.isRequired);
    const allRequiredComplete = requiredSteps.every(s => s.isCompleted);
    
    if (!allRequiredComplete) return false;
  }
  
  return true;
}

/**
 * Mark onboarding as complete
 */
export async function markOnboardingComplete(tenantId: string): Promise<void> {
  logger.info('Marking onboarding as complete', { tenantId });
  
  await IdentityService.updateOnboardingStatus(tenantId, 'COMPLETED');
  
  logger.info('Onboarding marked complete', { tenantId });
}

/**
 * Get phases configuration
 */
export function getPhasesConfig() {
  return ONBOARDING_PHASES;
}
