-- Organization Onboarding Migration
-- Phase 0: Complete organizational structure for tenant onboarding
-- Created: December 31, 2025

-- =============================================================================
-- ENUMS
-- =============================================================================

-- Employee Count Range
CREATE TYPE "EmployeeCountRange" AS ENUM ('SOLO', 'MICRO', 'SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE');

-- Revenue Range
CREATE TYPE "RevenueRange" AS ENUM ('STARTUP', 'GROWING', 'ESTABLISHED', 'LARGE_REVENUE', 'ENTERPRISE_REVENUE');

-- Onboarding Status
CREATE TYPE "OnboardingStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED');

-- Department Type
CREATE TYPE "DepartmentType" AS ENUM ('BUSINESS_UNIT', 'DEPARTMENT', 'DIVISION', 'REGION');

-- Entity Status (generic for org entities)
CREATE TYPE "EntityStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- Role Category
CREATE TYPE "RoleCategory" AS ENUM ('LEADERSHIP', 'MANAGEMENT', 'DELIVERY', 'INDIVIDUAL', 'SUPPORT', 'CONTRACTOR');

-- Grade Level
CREATE TYPE "GradeLevel" AS ENUM ('L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'L10');

-- Invite Status
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- Delegator Type
CREATE TYPE "DelegatorType" AS ENUM ('ANY_USER', 'SPECIFIC_USER', 'ROLE_HOLDER', 'MANAGER_OF');

-- =============================================================================
-- TENANT PROFILE (Extended Identity)
-- =============================================================================

CREATE TABLE "TenantProfile" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    
    -- Legal Entity
    "legalName" VARCHAR(300) NOT NULL,
    "tradingName" VARCHAR(300),
    "registrationNo" VARCHAR(100),
    "taxId" VARCHAR(100),
    
    -- Industry & Size
    "industry" VARCHAR(100) NOT NULL,
    "industryCode" VARCHAR(20),
    "employeeCount" "EmployeeCountRange" NOT NULL DEFAULT 'SMALL',
    "annualRevenue" "RevenueRange",
    
    -- Contact
    "primaryEmail" VARCHAR(255) NOT NULL,
    "primaryPhone" VARCHAR(20),
    "website" VARCHAR(255),
    
    -- Address
    "addressLine1" VARCHAR(255),
    "addressLine2" VARCHAR(255),
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "country" VARCHAR(100) NOT NULL DEFAULT 'India',
    "postalCode" VARCHAR(20),
    
    -- Branding (extends Tenant's basic branding)
    "secondaryColor" VARCHAR(7),
    "accentColor" VARCHAR(7),
    "faviconUrl" VARCHAR(500),
    
    -- Localization
    "dateFormat" VARCHAR(20) NOT NULL DEFAULT 'DD/MM/YYYY',
    "timeFormat" VARCHAR(10) NOT NULL DEFAULT 'HH:mm',
    "weekStartDay" INTEGER NOT NULL DEFAULT 1,
    
    -- Onboarding Tracking
    "onboardingPhase" INTEGER NOT NULL DEFAULT 1,
    "onboardingStatus" "OnboardingStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "onboardingStartedAt" TIMESTAMP(3),
    "onboardingCompletedAt" TIMESTAMP(3),
    "onboardingSkippedPhases" INTEGER[],
    
    -- Metadata
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TenantProfile_tenantId_key" ON "TenantProfile"("tenantId");

ALTER TABLE "TenantProfile" ADD CONSTRAINT "TenantProfile_tenantId_fkey" 
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =============================================================================
-- DEPARTMENT (Organizational Structure)
-- =============================================================================

CREATE TABLE "Department" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "parentId" UUID,
    
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" VARCHAR(500),
    "type" "DepartmentType" NOT NULL DEFAULT 'DEPARTMENT',
    
    "headId" UUID,
    "costCenterId" UUID,
    
    "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 0,
    "path" TEXT,
    
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Department_tenantId_code_key" ON "Department"("tenantId", "code");
CREATE INDEX "Department_tenantId_status_idx" ON "Department"("tenantId", "status");
CREATE INDEX "Department_tenantId_parentId_idx" ON "Department"("tenantId", "parentId");
CREATE INDEX "Department_tenantId_level_idx" ON "Department"("tenantId", "level");

ALTER TABLE "Department" ADD CONSTRAINT "Department_tenantId_fkey" 
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Department" ADD CONSTRAINT "Department_parentId_fkey" 
    FOREIGN KEY ("parentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- =============================================================================
-- COST CENTER
-- =============================================================================

CREATE TABLE "CostCenter" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" VARCHAR(500),
    
    "managerId" UUID,
    "budget" DECIMAL(15,2),
    "budgetCurrency" VARCHAR(3) DEFAULT 'INR',
    "fiscalYear" INTEGER,
    
    "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CostCenter_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CostCenter_tenantId_code_key" ON "CostCenter"("tenantId", "code");
CREATE INDEX "CostCenter_tenantId_status_idx" ON "CostCenter"("tenantId", "status");

ALTER TABLE "CostCenter" ADD CONSTRAINT "CostCenter_tenantId_fkey" 
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add costCenter FK to Department
ALTER TABLE "Department" ADD CONSTRAINT "Department_costCenterId_fkey" 
    FOREIGN KEY ("costCenterId") REFERENCES "CostCenter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- =============================================================================
-- TEAM (Within Department)
-- =============================================================================

CREATE TABLE "Team" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "departmentId" UUID NOT NULL,
    
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" VARCHAR(500),
    
    "leadId" UUID,
    
    "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Team_tenantId_code_key" ON "Team"("tenantId", "code");
CREATE INDEX "Team_tenantId_departmentId_idx" ON "Team"("tenantId", "departmentId");
CREATE INDEX "Team_tenantId_status_idx" ON "Team"("tenantId", "status");

ALTER TABLE "Team" ADD CONSTRAINT "Team_tenantId_fkey" 
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Team" ADD CONSTRAINT "Team_departmentId_fkey" 
    FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =============================================================================
-- TEAM MEMBER (Resource-Team Assignment)
-- =============================================================================

CREATE TABLE "TeamMember" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "teamId" UUID NOT NULL,
    "resourceId" UUID NOT NULL,
    
    "role" VARCHAR(100),
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TeamMember_teamId_resourceId_key" ON "TeamMember"("teamId", "resourceId");
CREATE INDEX "TeamMember_resourceId_idx" ON "TeamMember"("resourceId");

ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" 
    FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_resourceId_fkey" 
    FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =============================================================================
-- BUSINESS ROLE (Organizational Function)
-- =============================================================================

CREATE TABLE "BusinessRole" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" VARCHAR(500),
    
    "category" "RoleCategory" NOT NULL DEFAULT 'INDIVIDUAL',
    "level" "GradeLevel",
    
    -- Capabilities
    "canApprove" BOOLEAN NOT NULL DEFAULT false,
    "canManage" BOOLEAN NOT NULL DEFAULT false,
    "canBillable" BOOLEAN NOT NULL DEFAULT true,
    
    -- Competencies (JSON array of requirements)
    "competencies" JSONB,
    
    "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessRole_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BusinessRole_tenantId_code_key" ON "BusinessRole"("tenantId", "code");
CREATE INDEX "BusinessRole_tenantId_category_idx" ON "BusinessRole"("tenantId", "category");
CREATE INDEX "BusinessRole_tenantId_status_idx" ON "BusinessRole"("tenantId", "status");

ALTER TABLE "BusinessRole" ADD CONSTRAINT "BusinessRole_tenantId_fkey" 
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =============================================================================
-- RESOURCE BUSINESS ROLE (Many-to-Many Assignment)
-- =============================================================================

CREATE TABLE "ResourceBusinessRole" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "resourceId" UUID NOT NULL,
    "businessRoleId" UUID NOT NULL,
    
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    
    "assignedBy" UUID NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResourceBusinessRole_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ResourceBusinessRole_resource_role_from_key" 
    ON "ResourceBusinessRole"("resourceId", "businessRoleId", "effectiveFrom");
CREATE INDEX "ResourceBusinessRole_businessRoleId_idx" ON "ResourceBusinessRole"("businessRoleId");

ALTER TABLE "ResourceBusinessRole" ADD CONSTRAINT "ResourceBusinessRole_resourceId_fkey" 
    FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ResourceBusinessRole" ADD CONSTRAINT "ResourceBusinessRole_businessRoleId_fkey" 
    FOREIGN KEY ("businessRoleId") REFERENCES "BusinessRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =============================================================================
-- GRADE BAND (Compensation Levels)
-- =============================================================================

CREATE TABLE "GradeBand" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    
    "code" VARCHAR(10) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "level" INTEGER NOT NULL,
    
    "minSalary" DECIMAL(15,2),
    "maxSalary" DECIMAL(15,2),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    
    "billRateMin" DECIMAL(10,2),
    "billRateMax" DECIMAL(10,2),
    
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GradeBand_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GradeBand_tenantId_code_key" ON "GradeBand"("tenantId", "code");
CREATE INDEX "GradeBand_tenantId_level_idx" ON "GradeBand"("tenantId", "level");

ALTER TABLE "GradeBand" ADD CONSTRAINT "GradeBand_tenantId_fkey" 
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =============================================================================
-- USER INVITATION (Pending Invites)
-- =============================================================================

CREATE TABLE "UserInvitation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    
    "email" VARCHAR(255) NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    
    "roleId" UUID NOT NULL,
    "resourceId" UUID,
    
    "token" VARCHAR(64) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    
    "invitedBy" UUID NOT NULL,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    
    "message" TEXT,

    CONSTRAINT "UserInvitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserInvitation_token_key" ON "UserInvitation"("token");
CREATE UNIQUE INDEX "UserInvitation_tenantId_email_key" ON "UserInvitation"("tenantId", "email");
CREATE INDEX "UserInvitation_expiresAt_idx" ON "UserInvitation"("expiresAt");
CREATE INDEX "UserInvitation_status_idx" ON "UserInvitation"("status");

ALTER TABLE "UserInvitation" ADD CONSTRAINT "UserInvitation_tenantId_fkey" 
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserInvitation" ADD CONSTRAINT "UserInvitation_roleId_fkey" 
    FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UserInvitation" ADD CONSTRAINT "UserInvitation_resourceId_fkey" 
    FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- =============================================================================
-- APPROVAL MATRIX TEMPLATE
-- =============================================================================

CREATE TABLE "ApprovalMatrixTemplate" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    
    "name" VARCHAR(200) NOT NULL,
    "description" VARCHAR(500),
    
    "requestType" VARCHAR(50) NOT NULL,
    "conditions" JSONB NOT NULL DEFAULT '[]',
    "steps" JSONB NOT NULL DEFAULT '[]',
    
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalMatrixTemplate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ApprovalMatrixTemplate_tenantId_requestType_idx" 
    ON "ApprovalMatrixTemplate"("tenantId", "requestType");
CREATE INDEX "ApprovalMatrixTemplate_tenantId_isActive_idx" 
    ON "ApprovalMatrixTemplate"("tenantId", "isActive");

ALTER TABLE "ApprovalMatrixTemplate" ADD CONSTRAINT "ApprovalMatrixTemplate_tenantId_fkey" 
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =============================================================================
-- DELEGATION RULE
-- =============================================================================

CREATE TABLE "DelegationRule" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    
    "name" VARCHAR(200) NOT NULL,
    "description" VARCHAR(500),
    
    "delegatorType" "DelegatorType" NOT NULL DEFAULT 'ANY_USER',
    "delegatorId" UUID,
    
    "autoDelegate" BOOLEAN NOT NULL DEFAULT false,
    "triggerDays" INTEGER,
    
    "maxDuration" INTEGER,
    "allowedTypes" TEXT[],
    
    "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DelegationRule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DelegationRule_tenantId_status_idx" ON "DelegationRule"("tenantId", "status");

ALTER TABLE "DelegationRule" ADD CONSTRAINT "DelegationRule_tenantId_fkey" 
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =============================================================================
-- SLA CONFIGURATION
-- =============================================================================

CREATE TABLE "SlaConfiguration" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    
    "name" VARCHAR(200) NOT NULL,
    "requestType" VARCHAR(50) NOT NULL,
    "priority" VARCHAR(20) NOT NULL,
    
    "responseTime" INTEGER NOT NULL,
    "resolutionTime" INTEGER NOT NULL,
    
    "escalationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "escalateAfter" INTEGER,
    "escalateTo" UUID,
    
    "useBusinessHours" BOOLEAN NOT NULL DEFAULT true,
    
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SlaConfiguration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SlaConfiguration_tenant_type_priority_key" 
    ON "SlaConfiguration"("tenantId", "requestType", "priority");

ALTER TABLE "SlaConfiguration" ADD CONSTRAINT "SlaConfiguration_tenantId_fkey" 
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =============================================================================
-- ONBOARDING CHECKLIST (Progress Tracking)
-- =============================================================================

CREATE TABLE "OnboardingChecklist" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    
    "phase" INTEGER NOT NULL,
    "stepCode" VARCHAR(50) NOT NULL,
    "stepName" VARCHAR(200) NOT NULL,
    
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "completedBy" UUID,
    
    "data" JSONB,
    "notes" TEXT,
    
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnboardingChecklist_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OnboardingChecklist_tenant_phase_step_key" 
    ON "OnboardingChecklist"("tenantId", "phase", "stepCode");
CREATE INDEX "OnboardingChecklist_tenantId_phase_idx" ON "OnboardingChecklist"("tenantId", "phase");

ALTER TABLE "OnboardingChecklist" ADD CONSTRAINT "OnboardingChecklist_tenantId_fkey" 
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =============================================================================
-- ADD COLUMNS TO EXISTING RESOURCE TABLE
-- =============================================================================

ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "departmentId" UUID;
ALTER TABLE "Resource" ADD COLUMN IF NOT EXISTS "gradeBandId" UUID;

CREATE INDEX IF NOT EXISTS "Resource_tenantId_departmentId_idx" ON "Resource"("tenantId", "departmentId");
CREATE INDEX IF NOT EXISTS "Resource_gradeBandId_idx" ON "Resource"("gradeBandId");

ALTER TABLE "Resource" ADD CONSTRAINT "Resource_departmentId_fkey" 
    FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Resource" ADD CONSTRAINT "Resource_gradeBandId_fkey" 
    FOREIGN KEY ("gradeBandId") REFERENCES "GradeBand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- =============================================================================
-- ADD DEPARTMENT HEAD AND TEAM LEAD FOREIGN KEYS
-- =============================================================================

ALTER TABLE "Department" ADD CONSTRAINT "Department_headId_fkey" 
    FOREIGN KEY ("headId") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Team" ADD CONSTRAINT "Team_leadId_fkey" 
    FOREIGN KEY ("leadId") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CostCenter" ADD CONSTRAINT "CostCenter_managerId_fkey" 
    FOREIGN KEY ("managerId") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- =============================================================================
-- SEED DEFAULT BUSINESS ROLES (for new tenants)
-- =============================================================================

-- Note: These will be created per-tenant during onboarding, not globally
-- This is just the template structure

COMMENT ON TABLE "TenantProfile" IS 'Extended organization identity and onboarding state';
COMMENT ON TABLE "Department" IS 'Organizational structure - departments and business units';
COMMENT ON TABLE "Team" IS 'Teams within departments';
COMMENT ON TABLE "TeamMember" IS 'Resource assignments to teams';
COMMENT ON TABLE "CostCenter" IS 'Cost centers for budget tracking';
COMMENT ON TABLE "BusinessRole" IS 'Business/organizational roles (not system permissions)';
COMMENT ON TABLE "ResourceBusinessRole" IS 'Assignment of business roles to resources';
COMMENT ON TABLE "GradeBand" IS 'Salary/rate bands for compensation';
COMMENT ON TABLE "UserInvitation" IS 'Pending user invitations';
COMMENT ON TABLE "ApprovalMatrixTemplate" IS 'Reusable approval workflow templates';
COMMENT ON TABLE "DelegationRule" IS 'Rules for approval delegation';
COMMENT ON TABLE "SlaConfiguration" IS 'SLA configurations by request type and priority';
COMMENT ON TABLE "OnboardingChecklist" IS 'Tracks onboarding progress per tenant';
