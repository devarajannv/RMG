/**
 * Onboarding Module Types
 * 
 * Type definitions for the Organization Onboarding feature.
 * Matches the backend API response shapes.
 */

// ============================================================================
// Enums
// ============================================================================

export type OnboardingStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
export type RoleCategory = 'LEADERSHIP' | 'MANAGEMENT' | 'DELIVERY' | 'INDIVIDUAL' | 'SUPPORT' | 'CONTRACTOR';
export type GradeLevel = 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6' | 'L7' | 'L8' | 'L9' | 'L10';
export type DelegatorType = 'ANY_USER' | 'SPECIFIC_USER' | 'ROLE_HOLDER' | 'MANAGER_OF';
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';
export type ResourceStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'TERMINATED';

// ============================================================================
// Phase 1: Organization Identity
// ============================================================================

export interface TenantProfile {
  id: string;
  tenantId: string;
  organizationName: string | null;
  industryId: string | null;
  subIndustry: string | null;
  companySize: string | null;
  headquarters: string | null;
  foundedYear: number | null;
  website: string | null;
  description: string | null;
  primaryLogo: string | null;
  secondaryLogo: string | null;
  favicon: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  defaultCurrency: string | null;
  defaultTimezone: string | null;
  defaultLanguage: string | null;
  dateFormat: string | null;
  fiscalYearStart: number | null;
  onboardingStatus: OnboardingStatus;
  onboardingCompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  industry?: Industry | null;
}

export interface Industry {
  id: string;
  name: string;
  code: string;
  description: string | null;
}

export interface TenantProfileInput {
  organizationName?: string;
  industryId?: string;
  subIndustry?: string;
  companySize?: string;
  headquarters?: string;
  foundedYear?: number;
  website?: string;
  description?: string;
}

export interface BrandingInput {
  primaryLogo?: string;
  secondaryLogo?: string;
  favicon?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
}

export interface RegionalInput {
  defaultCurrency?: string;
  defaultTimezone?: string;
  defaultLanguage?: string;
  dateFormat?: string;
  fiscalYearStart?: number;
}

// ============================================================================
// Phase 2: Organization Structure
// ============================================================================

export interface Department {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  description: string | null;
  parentId: string | null;
  headId: string | null;
  costCenterId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  parent?: Department | null;
  children?: Department[];
  head?: Resource | null;
  costCenter?: CostCenter | null;
  _count?: {
    children: number;
    teams: number;
    resources: number;
  };
}

export interface Team {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  description: string | null;
  departmentId: string;
  leadId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  department?: Department;
  lead?: Resource | null;
  _count?: {
    resources: number;
  };
}

export interface CostCenter {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  description: string | null;
  budget: number | null;
  budgetYear: number | null;
  parentId: string | null;
  managerId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  parent?: CostCenter | null;
  children?: CostCenter[];
  manager?: Resource | null;
  _count?: {
    children: number;
    departments: number;
    resources: number;
  };
}

export interface DepartmentInput {
  name: string;
  code: string;
  description?: string;
  parentId?: string;
  headId?: string;
  costCenterId?: string;
  isActive?: boolean;
}

export interface TeamInput {
  name: string;
  code: string;
  description?: string;
  departmentId: string;
  leadId?: string;
  isActive?: boolean;
}

export interface CostCenterInput {
  code: string;
  name: string;
  description?: string;
  budget?: number;
  budgetYear?: number;
  parentId?: string;
  managerId?: string;
  isActive?: boolean;
}

export interface StructureSummary {
  departments: { total: number; active: number };
  teams: { total: number; active: number };
  costCenters: { total: number; active: number };
}

// ============================================================================
// Phase 3: Business Roles & Grade Bands
// ============================================================================

export interface BusinessRole {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  description: string | null;
  category: RoleCategory;
  level: number;
  skills: string[];
  responsibilities: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    resourceRoles: number;
  };
}

export interface GradeBand {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  level: GradeLevel;
  description: string | null;
  minSalary: number | null;
  maxSalary: number | null;
  currency: string | null;
  benefits: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    resources: number;
  };
}

export interface ResourceBusinessRole {
  id: string;
  resourceId: string;
  businessRoleId: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  isPrimary: boolean;
  createdAt: string;
  resource?: Resource;
  businessRole?: BusinessRole;
}

export interface BusinessRoleInput {
  name: string;
  code: string;
  description?: string;
  category: RoleCategory;
  level: number;
  skills?: string[];
  responsibilities?: string[];
  isActive?: boolean;
}

export interface GradeBandInput {
  name: string;
  code: string;
  level: GradeLevel;
  description?: string;
  minSalary?: number;
  maxSalary?: number;
  currency?: string;
  benefits?: string[];
  isActive?: boolean;
}

// ============================================================================
// Phase 4: People Setup
// ============================================================================

export interface Resource {
  id: string;
  tenantId: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  title: string | null;
  departmentId: string | null;
  teamId: string | null;
  managerId: string | null;
  costCenterId: string | null;
  gradeBandId: string | null;
  hireDate: string | null;
  terminationDate: string | null;
  status: ResourceStatus;
  profilePhoto: string | null;
  location: string | null;
  timezone: string | null;
  workHoursPerWeek: number | null;
  createdAt: string;
  updatedAt: string;
  department?: Department | null;
  team?: Team | null;
  manager?: Resource | null;
  costCenter?: CostCenter | null;
  gradeBand?: GradeBand | null;
  businessRoles?: ResourceBusinessRole[];
  user?: User[];
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
}

export interface UserInvitation {
  id: string;
  tenantId: string;
  email: string;
  resourceId: string | null;
  invitedById: string;
  token: string;
  status: InvitationStatus;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
  resource?: Resource | null;
  invitedBy?: User;
}

export interface ResourceInput {
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  title?: string;
  departmentId?: string;
  teamId?: string;
  managerId?: string;
  costCenterId?: string;
  gradeBandId?: string;
  hireDate?: string;
  status?: ResourceStatus;
  location?: string;
  timezone?: string;
  workHoursPerWeek?: number;
}

export interface InvitationInput {
  email: string;
  resourceId?: string;
}

export interface ImportResourceRow {
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  title?: string;
  departmentCode?: string;
  teamCode?: string;
  gradeBandCode?: string;
  hireDate?: string;
  location?: string;
}

export interface ImportValidationResult {
  valid: boolean;
  rowCount: number;
  errors: Array<{
    row: number;
    field: string;
    message: string;
  }>;
  warnings: Array<{
    row: number;
    field: string;
    message: string;
  }>;
}

export interface ImportResult {
  success: boolean;
  imported: number;
  errors: Array<{
    row: number;
    error: string;
  }>;
}

export interface PeopleStats {
  totalResources: number;
  activeResources: number;
  resourcesWithAccounts: number;
  pendingInvitations: number;
  byDepartment: Record<string, number>;
  byStatus: Record<string, number>;
}

// ============================================================================
// Phase 5: Governance
// ============================================================================

export interface DelegationRule {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  delegatorType: DelegatorType;
  delegatorId: string | null;
  delegateRoleId: string | null;
  canApprove: boolean;
  canReject: boolean;
  canReassign: boolean;
  maxAmount: number | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  delegateRole?: BusinessRole | null;
}

export interface DelegationRuleInput {
  name: string;
  description?: string;
  delegatorType: DelegatorType;
  delegatorId?: string;
  delegateRoleId?: string;
  canApprove?: boolean;
  canReject?: boolean;
  canReassign?: boolean;
  maxAmount?: number;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive?: boolean;
}

export interface GovernanceStatus {
  delegationRulesCount: number;
  activeDelegationRules: number;
}

// ============================================================================
// Onboarding Progress & Steps
// ============================================================================

export interface OnboardingStep {
  stepCode: string;
  stepName: string;
  isRequired: boolean;
  isCompleted: boolean;
  isSkipped: boolean;
  completedAt: string | null;
  completedBy: string | null;
}

export interface OnboardingPhase {
  phase: number;
  name: string;
  description: string;
  steps: OnboardingStep[];
  isComplete: boolean;
  canStart: boolean;
}

export interface OnboardingProgress {
  phases: OnboardingPhase[];
  currentPhase: number;
  overallProgress: number;
  isComplete: boolean;
}

export interface OnboardingSummary {
  status: OnboardingStatus;
  completedSteps: number;
  totalSteps: number;
  progressPercentage: number;
  phases: Array<{
    phase: number;
    name: string;
    completed: number;
    total: number;
    isComplete: boolean;
  }>;
  blockers: string[];
}

export interface PhaseConfig {
  phase: number;
  name: string;
  description: string;
  steps: Array<{
    code: string;
    name: string;
    required: boolean;
  }>;
}
