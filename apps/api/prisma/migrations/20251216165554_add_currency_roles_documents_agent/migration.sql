-- CreateEnum
CREATE TYPE "TenantTier" AS ENUM ('FREE', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'TRIAL');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'LOCKED');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FTE', 'CONTRACTOR', 'INTERN');

-- CreateEnum
CREATE TYPE "ResourceStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'NOTICE');

-- CreateEnum
CREATE TYPE "SkillStatus" AS ENUM ('ACTIVE', 'DEPRECATED');

-- CreateEnum
CREATE TYPE "Proficiency" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PROSPECT');

-- CreateEnum
CREATE TYPE "ClientTier" AS ENUM ('STRATEGIC', 'KEY', 'STANDARD');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('MSA', 'SOW', 'AMENDMENT', 'NDA', 'OTHER');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'EXPIRED', 'TERMINATED', 'RENEWED');

-- CreateEnum
CREATE TYPE "BillingType" AS ENUM ('TM', 'FIXED', 'RETAINER', 'MILESTONE', 'HYBRID');

-- CreateEnum
CREATE TYPE "ProjectType" AS ENUM ('BILLABLE', 'INTERNAL', 'PRESALES', 'SUPPORT');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('PIPELINE', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DeliveryModel" AS ENUM ('ONSITE', 'OFFSHORE', 'HYBRID');

-- CreateEnum
CREATE TYPE "HealthStatus" AS ENUM ('GREEN', 'AMBER', 'RED');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AllocationStatus" AS ENUM ('PROPOSED', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PracticeStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('OFFICE', 'REMOTE', 'CLIENT_SITE');

-- CreateEnum
CREATE TYPE "LocationStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "TimesheetStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'INVOICED');

-- CreateEnum
CREATE TYPE "PeriodType" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "PeriodStatus" AS ENUM ('OPEN', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "OpportunityStatus" AS ENUM ('OPEN', 'WON', 'LOST', 'STALLED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'IMPORT', 'RENEW', 'ACTIVATE', 'TERMINATE', 'LINK_CONTRACT', 'UNLINK_CONTRACT', 'APPROVE', 'REJECT', 'SUBMIT');

-- CreateEnum
CREATE TYPE "DocumentClassification" AS ENUM ('PUBLIC', 'INTERNAL', 'RESTRICTED', 'CONFIDENTIAL');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'DELETED');

-- CreateEnum
CREATE TYPE "SignatureStatus" AS ENUM ('PENDING', 'SENT', 'VIEWED', 'SIGNED', 'DECLINED', 'VOIDED');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "tier" "TenantTier" NOT NULL DEFAULT 'FREE',
    "status" "TenantStatus" NOT NULL DEFAULT 'TRIAL',
    "settings" JSONB,
    "logoUrl" VARCHAR(500),
    "primaryColor" VARCHAR(7),
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata',
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "fiscalYearStart" INTEGER NOT NULL DEFAULT 4,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "resourceId" UUID,
    "email" VARCHAR(255) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "failedLogins" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaSecret" VARCHAR(100),
    "microsoftId" VARCHAR(100),
    "googleId" VARCHAR(100),
    "preferences" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "permissions" JSONB NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 0,
    "parentRoleId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "userId" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" UUID NOT NULL,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "practiceId" UUID,
    "managerId" UUID,
    "locationId" UUID,
    "employeeId" VARCHAR(50) NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    "preferredName" VARCHAR(100),
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20),
    "photoUrl" VARCHAR(500),
    "employmentType" "EmploymentType" NOT NULL,
    "band" VARCHAR(10) NOT NULL,
    "designation" VARCHAR(100) NOT NULL,
    "department" VARCHAR(100),
    "dateOfJoining" DATE NOT NULL,
    "dateOfExit" DATE,
    "exitReason" VARCHAR(200),
    "capacity" INTEGER NOT NULL DEFAULT 100,
    "costPerHour" DECIMAL(10,2),
    "billRateDefault" DECIMAL(10,2),
    "status" "ResourceStatus" NOT NULL DEFAULT 'ACTIVE',
    "benchSince" DATE,
    "lastAllocatedAt" DATE,
    "tags" TEXT[],
    "customFields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillCategory" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "color" VARCHAR(7),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkillCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "categoryId" UUID,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "isVerifiable" BOOLEAN NOT NULL DEFAULT false,
    "status" "SkillStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceSkill" (
    "resourceId" UUID NOT NULL,
    "skillId" UUID NOT NULL,
    "proficiency" "Proficiency" NOT NULL,
    "yearsExp" DECIMAL(3,1),
    "lastUsed" DATE,
    "certified" BOOLEAN NOT NULL DEFAULT false,
    "certExpiry" DATE,
    "verifiedBy" UUID,
    "verifiedAt" TIMESTAMP(3),
    "notes" VARCHAR(500),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourceSkill_pkey" PRIMARY KEY ("resourceId","skillId")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "industry" VARCHAR(100),
    "website" VARCHAR(255),
    "logoUrl" VARCHAR(500),
    "status" "ClientStatus" NOT NULL DEFAULT 'ACTIVE',
    "tier" "ClientTier",
    "billingAddress" JSONB,
    "contacts" JSONB,
    "notes" TEXT,
    "customFields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "accountMgrId" UUID,
    "contractNumber" VARCHAR(50) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "type" "ContractType" NOT NULL,
    "description" TEXT,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "signedDate" DATE,
    "value" DECIMAL(15,2),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "billingType" "BillingType" NOT NULL,
    "paymentTerms" VARCHAR(50),
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "renewalDate" DATE,
    "autoRenew" BOOLEAN NOT NULL DEFAULT false,
    "documentUrl" VARCHAR(500),
    "attachments" JSONB,
    "notes" TEXT,
    "customFields" JSONB,
    "externalRefs" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "clientId" UUID,
    "contractId" UUID,
    "managerId" UUID,
    "practiceId" UUID,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "type" "ProjectType" NOT NULL,
    "category" VARCHAR(100),
    "deliveryModel" "DeliveryModel",
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "actualEndDate" DATE,
    "budgetHours" INTEGER,
    "budgetAmount" DECIMAL(15,2),
    "billingType" "BillingType",
    "defaultRate" DECIMAL(10,2),
    "status" "ProjectStatus" NOT NULL DEFAULT 'PIPELINE',
    "healthStatus" "HealthStatus",
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "tags" TEXT[],
    "customFields" JSONB,
    "externalRefs" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Allocation" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "resourceId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "requestedById" UUID,
    "approvedById" UUID,
    "role" VARCHAR(100) NOT NULL,
    "percentage" INTEGER NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "actualEndDate" DATE,
    "status" "AllocationStatus" NOT NULL DEFAULT 'PROPOSED',
    "isBillable" BOOLEAN NOT NULL DEFAULT true,
    "billRate" DECIMAL(10,2),
    "confirmedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" VARCHAR(500),
    "notes" TEXT,
    "customFields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Allocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Practice" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "headId" UUID,
    "parentId" UUID,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "description" VARCHAR(500),
    "targetUtilization" INTEGER,
    "costCenter" VARCHAR(50),
    "status" "PracticeStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Practice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "type" "LocationType" NOT NULL,
    "address" JSONB,
    "timezone" VARCHAR(50) NOT NULL,
    "country" VARCHAR(2) NOT NULL,
    "isOnshore" BOOLEAN NOT NULL DEFAULT false,
    "status" "LocationStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimesheetEntry" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "resourceId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "allocationId" UUID,
    "approvedById" UUID,
    "date" DATE NOT NULL,
    "hours" DECIMAL(4,2) NOT NULL,
    "taskType" VARCHAR(100),
    "description" TEXT,
    "isBillable" BOOLEAN NOT NULL DEFAULT true,
    "isOvertime" BOOLEAN NOT NULL DEFAULT false,
    "billRate" DECIMAL(10,2),
    "status" "TimesheetStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" VARCHAR(500),
    "tags" TEXT[],
    "customFields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TimesheetEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimesheetPeriod" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "resourceId" UUID NOT NULL,
    "approvedById" UUID,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "periodType" "PeriodType" NOT NULL,
    "totalHours" DECIMAL(5,2) NOT NULL,
    "billableHours" DECIMAL(5,2) NOT NULL,
    "overtimeHours" DECIMAL(5,2) NOT NULL,
    "status" "PeriodStatus" NOT NULL DEFAULT 'OPEN',
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimesheetPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "clientId" UUID,
    "ownerId" UUID,
    "externalId" VARCHAR(100) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "stage" VARCHAR(50) NOT NULL,
    "probability" INTEGER,
    "expectedCloseDate" DATE,
    "dealValue" DECIMAL(15,2),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "estimatedHeadcount" INTEGER,
    "requiredSkills" JSONB,
    "estimatedStart" DATE,
    "estimatedDuration" INTEGER,
    "status" "OpportunityStatus" NOT NULL DEFAULT 'OPEN',
    "wonDate" DATE,
    "lostDate" DATE,
    "lostReason" VARCHAR(200),
    "source" VARCHAR(50) NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),
    "externalUrl" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID,
    "entityType" VARCHAR(50) NOT NULL,
    "entityId" UUID NOT NULL,
    "action" "AuditAction" NOT NULL,
    "changes" JSONB,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Currency" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "code" VARCHAR(3) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "symbol" VARCHAR(10) NOT NULL,
    "isBase" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "decimalPlaces" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Currency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExchangeRate" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "fromCurrencyId" UUID NOT NULL,
    "toCurrencyId" UUID NOT NULL,
    "rate" DECIMAL(18,8) NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "source" VARCHAR(50) NOT NULL DEFAULT 'MANUAL',
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "module" VARCHAR(50) NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "scope" VARCHAR(50) NOT NULL DEFAULT 'ALL',
    "description" VARCHAR(200),
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" UUID NOT NULL,
    "permissionId" UUID NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT true,
    "conditions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "RoleAssignmentAudit" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "action" VARCHAR(20) NOT NULL,
    "assignedBy" UUID NOT NULL,
    "reason" VARCHAR(500),
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoleAssignmentAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "mimeType" VARCHAR(100) NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "classification" "DocumentClassification" NOT NULL DEFAULT 'INTERNAL',
    "category" VARCHAR(100),
    "tags" TEXT[],
    "storageProvider" VARCHAR(50) NOT NULL DEFAULT 'LOCAL',
    "storagePath" VARCHAR(500) NOT NULL,
    "checksum" VARCHAR(64),
    "entityType" VARCHAR(50),
    "entityId" UUID,
    "signatureStatus" "SignatureStatus",
    "signatureProvider" VARCHAR(50),
    "signatureRef" VARCHAR(200),
    "currentVersionId" UUID,
    "versionCount" INTEGER NOT NULL DEFAULT 1,
    "uploadedById" UUID NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3),
    "customFields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentVersion" (
    "id" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "storagePath" VARCHAR(500) NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "checksum" VARCHAR(64),
    "changeNotes" VARCHAR(500),
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentAccess" (
    "id" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "roleId" UUID,
    "userId" UUID,
    "practiceId" UUID,
    "canView" BOOLEAN NOT NULL DEFAULT true,
    "canDownload" BOOLEAN NOT NULL DEFAULT false,
    "canEdit" BOOLEAN NOT NULL DEFAULT false,
    "canDelete" BOOLEAN NOT NULL DEFAULT false,
    "canShare" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "grantedById" UUID NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "DocumentAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentAccessLog" (
    "id" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "ipAddress" VARCHAR(45),
    "userAgent" VARCHAR(500),
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentAccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentConversation" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "title" VARCHAR(200),
    "context" JSONB,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentMessage" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "role" VARCHAR(20) NOT NULL,
    "content" TEXT NOT NULL,
    "model" VARCHAR(50),
    "tokens" JSONB,
    "confidence" DECIMAL(3,2),
    "routingTier" VARCHAR(20),
    "responseType" VARCHAR(50),
    "responseData" JSONB,
    "feedback" VARCHAR(20),
    "feedbackNote" VARCHAR(500),
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE INDEX "Tenant_status_idx" ON "Tenant"("status");

-- CreateIndex
CREATE INDEX "Tenant_tier_idx" ON "Tenant"("tier");

-- CreateIndex
CREATE INDEX "User_tenantId_status_idx" ON "User"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "User_tenantId_email_key" ON "User"("tenantId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Role_tenantId_name_key" ON "Role"("tenantId", "name");

-- CreateIndex
CREATE INDEX "Resource_tenantId_status_idx" ON "Resource"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Resource_tenantId_practiceId_idx" ON "Resource"("tenantId", "practiceId");

-- CreateIndex
CREATE INDEX "Resource_tenantId_band_idx" ON "Resource"("tenantId", "band");

-- CreateIndex
CREATE INDEX "Resource_tenantId_benchSince_idx" ON "Resource"("tenantId", "benchSince");

-- CreateIndex
CREATE UNIQUE INDEX "Resource_tenantId_employeeId_key" ON "Resource"("tenantId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Resource_tenantId_email_key" ON "Resource"("tenantId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "SkillCategory_tenantId_name_key" ON "SkillCategory"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_tenantId_name_key" ON "Skill"("tenantId", "name");

-- CreateIndex
CREATE INDEX "ResourceSkill_skillId_idx" ON "ResourceSkill"("skillId");

-- CreateIndex
CREATE INDEX "Client_tenantId_status_idx" ON "Client"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Client_tenantId_tier_idx" ON "Client"("tenantId", "tier");

-- CreateIndex
CREATE UNIQUE INDEX "Client_tenantId_code_key" ON "Client"("tenantId", "code");

-- CreateIndex
CREATE INDEX "Contract_tenantId_clientId_idx" ON "Contract"("tenantId", "clientId");

-- CreateIndex
CREATE INDEX "Contract_tenantId_status_idx" ON "Contract"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Contract_tenantId_endDate_idx" ON "Contract"("tenantId", "endDate");

-- CreateIndex
CREATE INDEX "Contract_tenantId_renewalDate_idx" ON "Contract"("tenantId", "renewalDate");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_tenantId_contractNumber_key" ON "Contract"("tenantId", "contractNumber");

-- CreateIndex
CREATE INDEX "Project_tenantId_status_idx" ON "Project"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Project_tenantId_clientId_idx" ON "Project"("tenantId", "clientId");

-- CreateIndex
CREATE INDEX "Project_tenantId_type_idx" ON "Project"("tenantId", "type");

-- CreateIndex
CREATE INDEX "Project_tenantId_startDate_endDate_idx" ON "Project"("tenantId", "startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "Project_tenantId_code_key" ON "Project"("tenantId", "code");

-- CreateIndex
CREATE INDEX "Allocation_tenantId_resourceId_startDate_endDate_idx" ON "Allocation"("tenantId", "resourceId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "Allocation_tenantId_projectId_startDate_endDate_idx" ON "Allocation"("tenantId", "projectId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "Allocation_tenantId_status_idx" ON "Allocation"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Allocation_tenantId_endDate_idx" ON "Allocation"("tenantId", "endDate");

-- CreateIndex
CREATE INDEX "Practice_tenantId_parentId_idx" ON "Practice"("tenantId", "parentId");

-- CreateIndex
CREATE UNIQUE INDEX "Practice_tenantId_code_key" ON "Practice"("tenantId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Location_tenantId_code_key" ON "Location"("tenantId", "code");

-- CreateIndex
CREATE INDEX "TimesheetEntry_tenantId_resourceId_date_idx" ON "TimesheetEntry"("tenantId", "resourceId", "date");

-- CreateIndex
CREATE INDEX "TimesheetEntry_tenantId_projectId_date_idx" ON "TimesheetEntry"("tenantId", "projectId", "date");

-- CreateIndex
CREATE INDEX "TimesheetEntry_tenantId_status_date_idx" ON "TimesheetEntry"("tenantId", "status", "date");

-- CreateIndex
CREATE INDEX "TimesheetPeriod_tenantId_status_idx" ON "TimesheetPeriod"("tenantId", "status");

-- CreateIndex
CREATE INDEX "TimesheetPeriod_tenantId_periodEnd_idx" ON "TimesheetPeriod"("tenantId", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "TimesheetPeriod_tenantId_resourceId_periodStart_periodEnd_key" ON "TimesheetPeriod"("tenantId", "resourceId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "Opportunity_tenantId_status_idx" ON "Opportunity"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Opportunity_tenantId_stage_idx" ON "Opportunity"("tenantId", "stage");

-- CreateIndex
CREATE INDEX "Opportunity_tenantId_expectedCloseDate_idx" ON "Opportunity"("tenantId", "expectedCloseDate");

-- CreateIndex
CREATE UNIQUE INDEX "Opportunity_tenantId_externalId_source_key" ON "Opportunity"("tenantId", "externalId", "source");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_entityType_entityId_idx" ON "AuditLog"("tenantId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_userId_idx" ON "AuditLog"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_timestamp_idx" ON "AuditLog"("tenantId", "timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_action_idx" ON "AuditLog"("tenantId", "action");

-- CreateIndex
CREATE INDEX "Currency_tenantId_isBase_idx" ON "Currency"("tenantId", "isBase");

-- CreateIndex
CREATE INDEX "Currency_tenantId_isActive_idx" ON "Currency"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Currency_tenantId_code_key" ON "Currency"("tenantId", "code");

-- CreateIndex
CREATE INDEX "ExchangeRate_tenantId_effectiveFrom_idx" ON "ExchangeRate"("tenantId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "ExchangeRate_tenantId_fromCurrencyId_toCurrencyId_idx" ON "ExchangeRate"("tenantId", "fromCurrencyId", "toCurrencyId");

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeRate_tenantId_fromCurrencyId_toCurrencyId_effective_key" ON "ExchangeRate"("tenantId", "fromCurrencyId", "toCurrencyId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "Permission_tenantId_module_idx" ON "Permission"("tenantId", "module");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_tenantId_module_action_scope_key" ON "Permission"("tenantId", "module", "action", "scope");

-- CreateIndex
CREATE INDEX "RoleAssignmentAudit_tenantId_userId_idx" ON "RoleAssignmentAudit"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "RoleAssignmentAudit_tenantId_timestamp_idx" ON "RoleAssignmentAudit"("tenantId", "timestamp");

-- CreateIndex
CREATE INDEX "Document_tenantId_entityType_entityId_idx" ON "Document"("tenantId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "Document_tenantId_classification_idx" ON "Document"("tenantId", "classification");

-- CreateIndex
CREATE INDEX "Document_tenantId_category_idx" ON "Document"("tenantId", "category");

-- CreateIndex
CREATE INDEX "Document_tenantId_status_idx" ON "Document"("tenantId", "status");

-- CreateIndex
CREATE INDEX "DocumentVersion_documentId_idx" ON "DocumentVersion"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentVersion_documentId_versionNumber_key" ON "DocumentVersion"("documentId", "versionNumber");

-- CreateIndex
CREATE INDEX "DocumentAccess_documentId_idx" ON "DocumentAccess"("documentId");

-- CreateIndex
CREATE INDEX "DocumentAccess_roleId_idx" ON "DocumentAccess"("roleId");

-- CreateIndex
CREATE INDEX "DocumentAccess_userId_idx" ON "DocumentAccess"("userId");

-- CreateIndex
CREATE INDEX "DocumentAccessLog_documentId_timestamp_idx" ON "DocumentAccessLog"("documentId", "timestamp");

-- CreateIndex
CREATE INDEX "DocumentAccessLog_userId_timestamp_idx" ON "DocumentAccessLog"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "AgentConversation_tenantId_userId_idx" ON "AgentConversation"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "AgentConversation_tenantId_updatedAt_idx" ON "AgentConversation"("tenantId", "updatedAt");

-- CreateIndex
CREATE INDEX "AgentMessage_conversationId_timestamp_idx" ON "AgentMessage"("conversationId", "timestamp");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_parentRoleId_fkey" FOREIGN KEY ("parentRoleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillCategory" ADD CONSTRAINT "SkillCategory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "SkillCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceSkill" ADD CONSTRAINT "ResourceSkill_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceSkill" ADD CONSTRAINT "ResourceSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceSkill" ADD CONSTRAINT "ResourceSkill_verifiedBy_fkey" FOREIGN KEY ("verifiedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_accountMgrId_fkey" FOREIGN KEY ("accountMgrId") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Allocation" ADD CONSTRAINT "Allocation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Allocation" ADD CONSTRAINT "Allocation_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Allocation" ADD CONSTRAINT "Allocation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Allocation" ADD CONSTRAINT "Allocation_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Allocation" ADD CONSTRAINT "Allocation_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Practice" ADD CONSTRAINT "Practice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Practice" ADD CONSTRAINT "Practice_headId_fkey" FOREIGN KEY ("headId") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Practice" ADD CONSTRAINT "Practice_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimesheetEntry" ADD CONSTRAINT "TimesheetEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimesheetEntry" ADD CONSTRAINT "TimesheetEntry_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimesheetEntry" ADD CONSTRAINT "TimesheetEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimesheetEntry" ADD CONSTRAINT "TimesheetEntry_allocationId_fkey" FOREIGN KEY ("allocationId") REFERENCES "Allocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimesheetEntry" ADD CONSTRAINT "TimesheetEntry_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimesheetPeriod" ADD CONSTRAINT "TimesheetPeriod_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimesheetPeriod" ADD CONSTRAINT "TimesheetPeriod_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimesheetPeriod" ADD CONSTRAINT "TimesheetPeriod_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Currency" ADD CONSTRAINT "Currency_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeRate" ADD CONSTRAINT "ExchangeRate_fromCurrencyId_fkey" FOREIGN KEY ("fromCurrencyId") REFERENCES "Currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeRate" ADD CONSTRAINT "ExchangeRate_toCurrencyId_fkey" FOREIGN KEY ("toCurrencyId") REFERENCES "Currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAccess" ADD CONSTRAINT "DocumentAccess_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAccessLog" ADD CONSTRAINT "DocumentAccessLog_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentMessage" ADD CONSTRAINT "AgentMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AgentConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
