-- CreateEnum
CREATE TYPE "RequestCategory" AS ENUM ('RESOURCE', 'PROJECT', 'CONTRACT', 'HR', 'FINANCE', 'ADMIN', 'OTHER');

-- CreateEnum
CREATE TYPE "SlaCalculationType" AS ENUM ('CLOCK_HOURS', 'BUSINESS_HOURS', 'BUSINESS_DAYS');

-- CreateEnum
CREATE TYPE "RequestVisibility" AS ENUM ('TENANT', 'PRACTICE', 'PARTICIPANTS', 'CONFIDENTIAL');

-- CreateEnum
CREATE TYPE "RollbackPermission" AS ENUM ('REQUESTER', 'APPROVERS', 'ADMIN_ONLY', 'NONE');

-- CreateEnum
CREATE TYPE "ApprovalChainStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ApprovalChainScope" AS ENUM ('TENANT', 'PRACTICE', 'PROJECT');

-- CreateEnum
CREATE TYPE "ApproverType" AS ENUM ('ROLE', 'USER', 'MANAGER', 'RESOURCE_MANAGER', 'PRACTICE_HEAD', 'PROJECT_MANAGER', 'CONTRACT_OWNER', 'CUSTOM');

-- CreateEnum
CREATE TYPE "PracticeSource" AS ENUM ('REQUESTER', 'RESOURCE', 'PROJECT');

-- CreateEnum
CREATE TYPE "RoleAssignmentMode" AS ENUM ('ANY', 'ALL', 'ROUND_ROBIN', 'LEAST_LOADED');

-- CreateEnum
CREATE TYPE "ApprovalMode" AS ENUM ('ANY', 'ALL', 'MAJORITY');

-- CreateEnum
CREATE TYPE "ConflictResolution" AS ENUM ('REJECTION_WINS', 'APPROVAL_WINS', 'FIRST_WINS', 'MAJORITY');

-- CreateEnum
CREATE TYPE "ConditionOperator" AS ENUM ('EQUALS', 'NOT_EQUALS', 'GREATER_THAN', 'LESS_THAN', 'GREATER_THAN_OR_EQUALS', 'LESS_THAN_OR_EQUALS', 'CONTAINS', 'NOT_CONTAINS', 'IN', 'NOT_IN', 'IS_NULL', 'IS_NOT_NULL');

-- CreateEnum
CREATE TYPE "RuleActionType" AS ENUM ('ADD_APPROVAL_CHAIN', 'ADD_APPROVAL_STEP', 'SKIP_STEP', 'OVERRIDE_PRIORITY', 'OVERRIDE_APPROVER', 'REQUIRE_ADDITIONAL_DOCUMENT');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'RETURNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD', 'BLOCKED', 'REVERSED');

-- CreateEnum
CREATE TYPE "ApprovalActionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SKIPPED', 'DELEGATED', 'EXPIRED', 'ESCALATED', 'REASSIGNED');

-- CreateEnum
CREATE TYPE "ApprovalDecision" AS ENUM ('APPROVED', 'REJECTED', 'RETURNED', 'ABSTAINED');

-- CreateEnum
CREATE TYPE "AttachmentScanStatus" AS ENUM ('PENDING', 'CLEAN', 'INFECTED', 'SCAN_FAILED');

-- CreateEnum
CREATE TYPE "RequestAction" AS ENUM ('CREATED', 'UPDATED', 'SUBMITTED', 'APPROVED', 'REJECTED', 'RETURNED', 'CANCELLED', 'COMPLETED', 'ON_HOLD', 'RESUMED', 'ESCALATED', 'REASSIGNED', 'DELEGATED', 'COMMENTED', 'ATTACHMENT_ADDED', 'ATTACHMENT_REMOVED', 'WATCHER_ADDED', 'WATCHER_REMOVED', 'ROLLBACK_INITIATED', 'ROLLBACK_COMPLETED', 'ROLLBACK_FAILED', 'PRIORITY_CHANGED', 'SLA_BREACHED');

-- CreateEnum
CREATE TYPE "RollbackOperation" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE');

-- CreateEnum
CREATE TYPE "RollbackStepStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "RollbackStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'PARTIAL_FAILED', 'FAILED');

-- CreateEnum
CREATE TYPE "DelegationApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SlaBreachType" AS ENUM ('RESPONSE_SLA', 'RESOLUTION_SLA', 'APPROVAL_STEP_SLA');

-- CreateEnum
CREATE TYPE "HolidayType" AS ENUM ('NATIONAL', 'REGIONAL', 'COMPANY', 'OPTIONAL', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('REQUEST_ASSIGNED', 'REQUEST_APPROVED', 'REQUEST_REJECTED', 'REQUEST_RETURNED', 'REQUEST_COMMENTED', 'REQUEST_ESCALATED', 'REQUEST_COMPLETED', 'SLA_WARNING', 'SLA_BREACHED', 'DELEGATION_CREATED', 'DELEGATION_EXPIRING', 'DELEGATION_REVOKED', 'REMINDER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'SLACK', 'TEAMS');

-- CreateEnum
CREATE TYPE "WebhookEvent" AS ENUM ('REQUEST_CREATED', 'REQUEST_SUBMITTED', 'REQUEST_APPROVED', 'REQUEST_REJECTED', 'REQUEST_COMPLETED', 'REQUEST_CANCELLED', 'SLA_BREACHED');

-- CreateTable
CREATE TABLE "RequestType" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "category" "RequestCategory" NOT NULL,
    "defaultPriority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "responseSlaHours" INTEGER NOT NULL DEFAULT 24,
    "resolutionSlaHours" INTEGER NOT NULL DEFAULT 72,
    "slaCalculationType" "SlaCalculationType" NOT NULL DEFAULT 'BUSINESS_HOURS',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSystemType" BOOLEAN NOT NULL DEFAULT true,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
    "allowDraft" BOOLEAN NOT NULL DEFAULT true,
    "allowAttachments" BOOLEAN NOT NULL DEFAULT true,
    "maxAttachmentSizeMb" INTEGER NOT NULL DEFAULT 10,
    "maxAttachments" INTEGER NOT NULL DEFAULT 5,
    "formSchema" JSONB,
    "formSchemaVersion" INTEGER NOT NULL DEFAULT 1,
    "requiredFields" TEXT[],
    "sensitiveFields" TEXT[],
    "onApprovalHandler" VARCHAR(100),
    "onRejectionHandler" VARCHAR(100),
    "onCancellationHandler" VARCHAR(100),
    "allowRollback" BOOLEAN NOT NULL DEFAULT true,
    "rollbackWindowDays" INTEGER NOT NULL DEFAULT 30,
    "rollbackRequiresApproval" BOOLEAN NOT NULL DEFAULT true,
    "rollbackPermission" "RollbackPermission" NOT NULL DEFAULT 'ADMIN_ONLY',
    "visibilityScope" "RequestVisibility" NOT NULL DEFAULT 'TENANT',
    "retentionDays" INTEGER NOT NULL DEFAULT 2555,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequestType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantRequestTypeConfig" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "requestTypeId" UUID NOT NULL,
    "responseSlaHours" INTEGER,
    "resolutionSlaHours" INTEGER,
    "defaultPriority" "Priority",
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "approvalChainId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantRequestTypeConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalChain" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "description" VARCHAR(500),
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "ApprovalChainStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "publishedById" UUID,
    "practiceId" UUID,
    "scope" "ApprovalChainScope" NOT NULL DEFAULT 'TENANT',
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "clonedFromId" UUID,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ApprovalChain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalStep" (
    "id" UUID NOT NULL,
    "chainId" UUID NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "instructions" VARCHAR(1000),
    "approverType" "ApproverType" NOT NULL,
    "approverRoleId" UUID,
    "approverUserId" UUID,
    "practiceSource" "PracticeSource",
    "roleAssignmentMode" "RoleAssignmentMode" NOT NULL DEFAULT 'ANY',
    "fallbackType" "ApproverType",
    "fallbackRoleId" UUID,
    "fallbackUserId" UUID,
    "skipIfUnresolvable" BOOLEAN NOT NULL DEFAULT false,
    "approvalMode" "ApprovalMode" NOT NULL DEFAULT 'ANY',
    "onConflict" "ConflictResolution" NOT NULL DEFAULT 'REJECTION_WINS',
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "canDelegate" BOOLEAN NOT NULL DEFAULT true,
    "skipCondition" JSONB,
    "autoApproveAfterHours" INTEGER,
    "autoApproveCondition" JSONB,
    "slaHours" INTEGER,
    "escalateAfterHours" INTEGER,
    "escalateToType" "ApproverType",
    "escalateToRoleId" UUID,
    "escalateToUserId" UUID,
    "reminderAfterHours" INTEGER NOT NULL DEFAULT 24,
    "reminderIntervalHours" INTEGER NOT NULL DEFAULT 24,
    "maxReminders" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalRule" (
    "id" UUID NOT NULL,
    "requestTypeId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "conditionField" VARCHAR(100) NOT NULL,
    "conditionOperator" "ConditionOperator" NOT NULL,
    "conditionValue" VARCHAR(500) NOT NULL,
    "actionType" "RuleActionType" NOT NULL,
    "addChainId" UUID,
    "addStepAfter" INTEGER,
    "skipStepOrder" INTEGER,
    "overridePriority" "Priority",
    "overrideApproverUserId" UUID,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Request" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "requestNumber" VARCHAR(50) NOT NULL,
    "typeId" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "requestData" JSONB NOT NULL,
    "locale" VARCHAR(10) NOT NULL DEFAULT 'en',
    "requesterId" UUID NOT NULL,
    "onBehalfOfId" UUID,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "urgencyJustification" VARCHAR(500),
    "requestedCompletionDate" DATE,
    "status" "RequestStatus" NOT NULL DEFAULT 'DRAFT',
    "approvalChainId" UUID,
    "approvalChainVersion" INTEGER,
    "currentStepOrder" INTEGER NOT NULL DEFAULT 0,
    "submittedAt" TIMESTAMP(3),
    "responseDueAt" TIMESTAMP(3),
    "resolutionDueAt" TIMESTAMP(3),
    "firstResponseAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "responseSlaBreached" BOOLEAN NOT NULL DEFAULT false,
    "resolutionSlaBreached" BOOLEAN NOT NULL DEFAULT false,
    "escalatedAt" TIMESTAMP(3),
    "escalationLevel" INTEGER NOT NULL DEFAULT 0,
    "slaPausedAt" TIMESTAMP(3),
    "slaPauseDurationMins" INTEGER NOT NULL DEFAULT 0,
    "resourceId" UUID,
    "projectId" UUID,
    "allocationId" UUID,
    "contractId" UUID,
    "externalRef" VARCHAR(200),
    "externalUrl" VARCHAR(500),
    "dependsOnId" UUID,
    "blockedReason" VARCHAR(200),
    "isReversal" BOOLEAN NOT NULL DEFAULT false,
    "originalRequestId" UUID,
    "rollbackData" JSONB,
    "canRollback" BOOLEAN NOT NULL DEFAULT true,
    "rollbackDeadline" TIMESTAMP(3),
    "rollbackStatus" "RollbackStatus",
    "reversedAt" TIMESTAMP(3),
    "reversedById" UUID,
    "resultEntityType" VARCHAR(50),
    "resultEntityId" UUID,
    "executionNotes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestApproval" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "stepId" UUID NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "stepName" VARCHAR(100) NOT NULL,
    "approverId" UUID NOT NULL,
    "assignedVia" "ApproverType" NOT NULL,
    "assignmentReason" VARCHAR(200),
    "delegatedFromId" UUID,
    "delegationId" UUID,
    "reassignedFromId" UUID,
    "reassignedById" UUID,
    "reassignedAt" TIMESTAMP(3),
    "reassignmentReason" VARCHAR(500),
    "status" "ApprovalActionStatus" NOT NULL DEFAULT 'PENDING',
    "decision" "ApprovalDecision",
    "comments" TEXT,
    "dueAt" TIMESTAMP(3),
    "viewedAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "lastReminderAt" TIMESTAMP(3),
    "reminderCount" INTEGER NOT NULL DEFAULT 0,
    "escalatedAt" TIMESTAMP(3),
    "escalatedToId" UUID,
    "ipAddress" VARCHAR(45),
    "userAgent" VARCHAR(500),
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequestApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestComment" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "parentId" UUID,
    "content" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "RequestComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestHistory" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "action" "RequestAction" NOT NULL,
    "fromStatus" "RequestStatus",
    "toStatus" "RequestStatus",
    "details" JSONB,
    "rollbackReason" VARCHAR(500),
    "affectedEntities" JSONB,
    "ipAddress" VARCHAR(45),
    "userAgent" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequestHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestAttachment" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "fileName" VARCHAR(255) NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "filePath" VARCHAR(500) NOT NULL,
    "checksum" VARCHAR(64),
    "scanStatus" "AttachmentScanStatus" NOT NULL DEFAULT 'PENDING',
    "scannedAt" TIMESTAMP(3),
    "scanResult" VARCHAR(200),
    "uploadedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "RequestAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestWatcher" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "addedById" UUID NOT NULL,
    "notifyOnStatusChange" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnComment" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnApproval" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequestWatcher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestAffectedResource" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "resourceId" UUID NOT NULL,
    "role" VARCHAR(100),

    CONSTRAINT "RequestAffectedResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestSequence" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RequestSequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestLock" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "lockedById" UUID NOT NULL,
    "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequestLock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RollbackStep" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "entityType" VARCHAR(50) NOT NULL,
    "entityId" UUID NOT NULL,
    "operation" "RollbackOperation" NOT NULL,
    "beforeState" JSONB NOT NULL,
    "afterState" JSONB NOT NULL,
    "status" "RollbackStepStatus" NOT NULL DEFAULT 'PENDING',
    "executedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RollbackStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Delegation" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "delegatorId" UUID NOT NULL,
    "delegateId" UUID NOT NULL,
    "requestTypeIds" UUID[],
    "practiceIds" UUID[],
    "maxAmount" DECIMAL(15,2),
    "startDate" TIMESTAMPTZ NOT NULL,
    "endDate" TIMESTAMPTZ NOT NULL,
    "reason" VARCHAR(500),
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "approvalStatus" "DelegationApprovalStatus" NOT NULL DEFAULT 'APPROVED',
    "approvedById" UUID,
    "approvedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokedById" UUID,
    "revocationReason" VARCHAR(500),
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Delegation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlaBreachEvent" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "breachType" "SlaBreachType" NOT NULL,
    "breachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "actualAt" TIMESTAMP(3),
    "escalationLevel" INTEGER NOT NULL DEFAULT 1,
    "escalatedToId" UUID,
    "escalatedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "resolutionNotes" VARCHAR(500),

    CONSTRAINT "SlaBreachEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlaPriorityMatrix" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "requestTypeId" UUID,
    "priority" "Priority" NOT NULL,
    "responseSlaHours" INTEGER NOT NULL,
    "resolutionSlaHours" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlaPriorityMatrix_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessHoursConfig" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata',
    "startHour" INTEGER NOT NULL DEFAULT 9,
    "startMinute" INTEGER NOT NULL DEFAULT 0,
    "endHour" INTEGER NOT NULL DEFAULT 18,
    "endMinute" INTEGER NOT NULL DEFAULT 0,
    "workDays" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5]::INTEGER[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessHoursConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Holiday" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "type" "HolidayType" NOT NULL DEFAULT 'COMPANY',
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "locationIds" UUID[],
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurringMonth" INTEGER,
    "recurringDay" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestTemplate" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "requestTypeId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "defaultData" JSONB NOT NULL,
    "defaultPriority" "Priority",
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "practiceIds" UUID[],
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "RequestTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "message" TEXT NOT NULL,
    "requestId" UUID,
    "entityType" VARCHAR(50),
    "entityId" UUID,
    "actionUrl" VARCHAR(500),
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "emailSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "eventType" "NotificationType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Webhook" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "secret" VARCHAR(200) NOT NULL,
    "events" "WebhookEvent"[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "retryDelaySeconds" INTEGER NOT NULL DEFAULT 60,
    "lastTriggeredAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Webhook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookLog" (
    "id" UUID NOT NULL,
    "webhookId" UUID NOT NULL,
    "event" "WebhookEvent" NOT NULL,
    "payload" JSONB NOT NULL,
    "statusCode" INTEGER,
    "response" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "nextRetryAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArchivedRequest" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "originalData" JSONB NOT NULL,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedReason" VARCHAR(100) NOT NULL,

    CONSTRAINT "ArchivedRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RequestType_code_key" ON "RequestType"("code");

-- CreateIndex
CREATE INDEX "RequestType_category_idx" ON "RequestType"("category");

-- CreateIndex
CREATE INDEX "RequestType_isActive_idx" ON "RequestType"("isActive");

-- CreateIndex
CREATE INDEX "TenantRequestTypeConfig_tenantId_idx" ON "TenantRequestTypeConfig"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantRequestTypeConfig_tenantId_requestTypeId_key" ON "TenantRequestTypeConfig"("tenantId", "requestTypeId");

-- CreateIndex
CREATE INDEX "ApprovalChain_tenantId_status_idx" ON "ApprovalChain"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ApprovalChain_tenantId_practiceId_idx" ON "ApprovalChain"("tenantId", "practiceId");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalChain_tenantId_code_version_key" ON "ApprovalChain"("tenantId", "code", "version");

-- CreateIndex
CREATE INDEX "ApprovalStep_chainId_idx" ON "ApprovalStep"("chainId");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalStep_chainId_stepOrder_key" ON "ApprovalStep"("chainId", "stepOrder");

-- CreateIndex
CREATE INDEX "ApprovalRule_requestTypeId_isActive_idx" ON "ApprovalRule"("requestTypeId", "isActive");

-- CreateIndex
CREATE INDEX "ApprovalRule_tenantId_idx" ON "ApprovalRule"("tenantId");

-- CreateIndex
CREATE INDEX "Request_tenantId_status_idx" ON "Request"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Request_tenantId_requesterId_idx" ON "Request"("tenantId", "requesterId");

-- CreateIndex
CREATE INDEX "Request_tenantId_typeId_idx" ON "Request"("tenantId", "typeId");

-- CreateIndex
CREATE INDEX "Request_tenantId_priority_idx" ON "Request"("tenantId", "priority");

-- CreateIndex
CREATE INDEX "Request_tenantId_submittedAt_idx" ON "Request"("tenantId", "submittedAt");

-- CreateIndex
CREATE INDEX "Request_tenantId_responseSlaBreached_idx" ON "Request"("tenantId", "responseSlaBreached");

-- CreateIndex
CREATE INDEX "Request_tenantId_resolutionSlaBreached_idx" ON "Request"("tenantId", "resolutionSlaBreached");

-- CreateIndex
CREATE INDEX "Request_tenantId_resourceId_idx" ON "Request"("tenantId", "resourceId");

-- CreateIndex
CREATE INDEX "Request_tenantId_projectId_idx" ON "Request"("tenantId", "projectId");

-- CreateIndex
CREATE INDEX "Request_tenantId_createdAt_idx" ON "Request"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Request_tenantId_requestNumber_key" ON "Request"("tenantId", "requestNumber");

-- CreateIndex
CREATE INDEX "RequestApproval_requestId_stepOrder_idx" ON "RequestApproval"("requestId", "stepOrder");

-- CreateIndex
CREATE INDEX "RequestApproval_approverId_status_idx" ON "RequestApproval"("approverId", "status");

-- CreateIndex
CREATE INDEX "RequestApproval_dueAt_status_idx" ON "RequestApproval"("dueAt", "status");

-- CreateIndex
CREATE INDEX "RequestApproval_status_idx" ON "RequestApproval"("status");

-- CreateIndex
CREATE UNIQUE INDEX "RequestApproval_requestId_stepId_approverId_key" ON "RequestApproval"("requestId", "stepId", "approverId");

-- CreateIndex
CREATE INDEX "RequestComment_requestId_createdAt_idx" ON "RequestComment"("requestId", "createdAt");

-- CreateIndex
CREATE INDEX "RequestComment_parentId_idx" ON "RequestComment"("parentId");

-- CreateIndex
CREATE INDEX "RequestHistory_requestId_createdAt_idx" ON "RequestHistory"("requestId", "createdAt");

-- CreateIndex
CREATE INDEX "RequestHistory_userId_idx" ON "RequestHistory"("userId");

-- CreateIndex
CREATE INDEX "RequestHistory_action_idx" ON "RequestHistory"("action");

-- CreateIndex
CREATE INDEX "RequestAttachment_requestId_idx" ON "RequestAttachment"("requestId");

-- CreateIndex
CREATE INDEX "RequestAttachment_scanStatus_idx" ON "RequestAttachment"("scanStatus");

-- CreateIndex
CREATE INDEX "RequestWatcher_userId_idx" ON "RequestWatcher"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RequestWatcher_requestId_userId_key" ON "RequestWatcher"("requestId", "userId");

-- CreateIndex
CREATE INDEX "RequestAffectedResource_requestId_idx" ON "RequestAffectedResource"("requestId");

-- CreateIndex
CREATE INDEX "RequestAffectedResource_resourceId_idx" ON "RequestAffectedResource"("resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "RequestAffectedResource_requestId_resourceId_key" ON "RequestAffectedResource"("requestId", "resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "RequestSequence_tenantId_year_key" ON "RequestSequence"("tenantId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "RequestLock_requestId_key" ON "RequestLock"("requestId");

-- CreateIndex
CREATE INDEX "RequestLock_expiresAt_idx" ON "RequestLock"("expiresAt");

-- CreateIndex
CREATE INDEX "RollbackStep_requestId_stepOrder_idx" ON "RollbackStep"("requestId", "stepOrder");

-- CreateIndex
CREATE INDEX "Delegation_tenantId_delegatorId_idx" ON "Delegation"("tenantId", "delegatorId");

-- CreateIndex
CREATE INDEX "Delegation_tenantId_delegateId_idx" ON "Delegation"("tenantId", "delegateId");

-- CreateIndex
CREATE INDEX "Delegation_tenantId_startDate_endDate_idx" ON "Delegation"("tenantId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "SlaBreachEvent_requestId_idx" ON "SlaBreachEvent"("requestId");

-- CreateIndex
CREATE INDEX "SlaBreachEvent_breachedAt_idx" ON "SlaBreachEvent"("breachedAt");

-- CreateIndex
CREATE INDEX "SlaBreachEvent_breachType_idx" ON "SlaBreachEvent"("breachType");

-- CreateIndex
CREATE UNIQUE INDEX "SlaPriorityMatrix_tenantId_requestTypeId_priority_key" ON "SlaPriorityMatrix"("tenantId", "requestTypeId", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessHoursConfig_tenantId_key" ON "BusinessHoursConfig"("tenantId");

-- CreateIndex
CREATE INDEX "Holiday_tenantId_date_idx" ON "Holiday"("tenantId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Holiday_tenantId_date_name_key" ON "Holiday"("tenantId", "date", "name");

-- CreateIndex
CREATE INDEX "RequestTemplate_tenantId_requestTypeId_idx" ON "RequestTemplate"("tenantId", "requestTypeId");

-- CreateIndex
CREATE INDEX "RequestTemplate_tenantId_isPublic_idx" ON "RequestTemplate"("tenantId", "isPublic");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_tenantId_createdAt_idx" ON "Notification"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_type_idx" ON "Notification"("userId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_eventType_channel_key" ON "NotificationPreference"("userId", "eventType", "channel");

-- CreateIndex
CREATE INDEX "Webhook_tenantId_isActive_idx" ON "Webhook"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "WebhookLog_webhookId_createdAt_idx" ON "WebhookLog"("webhookId", "createdAt");

-- CreateIndex
CREATE INDEX "ArchivedRequest_tenantId_idx" ON "ArchivedRequest"("tenantId");

-- CreateIndex
CREATE INDEX "ArchivedRequest_archivedAt_idx" ON "ArchivedRequest"("archivedAt");

-- AddForeignKey
ALTER TABLE "TenantRequestTypeConfig" ADD CONSTRAINT "TenantRequestTypeConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantRequestTypeConfig" ADD CONSTRAINT "TenantRequestTypeConfig_requestTypeId_fkey" FOREIGN KEY ("requestTypeId") REFERENCES "RequestType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantRequestTypeConfig" ADD CONSTRAINT "TenantRequestTypeConfig_approvalChainId_fkey" FOREIGN KEY ("approvalChainId") REFERENCES "ApprovalChain"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalChain" ADD CONSTRAINT "ApprovalChain_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalChain" ADD CONSTRAINT "ApprovalChain_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalChain" ADD CONSTRAINT "ApprovalChain_clonedFromId_fkey" FOREIGN KEY ("clonedFromId") REFERENCES "ApprovalChain"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalStep" ADD CONSTRAINT "ApprovalStep_chainId_fkey" FOREIGN KEY ("chainId") REFERENCES "ApprovalChain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalStep" ADD CONSTRAINT "ApprovalStep_approverRoleId_fkey" FOREIGN KEY ("approverRoleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalStep" ADD CONSTRAINT "ApprovalStep_approverUserId_fkey" FOREIGN KEY ("approverUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRule" ADD CONSTRAINT "ApprovalRule_requestTypeId_fkey" FOREIGN KEY ("requestTypeId") REFERENCES "RequestType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRule" ADD CONSTRAINT "ApprovalRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "RequestType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_onBehalfOfId_fkey" FOREIGN KEY ("onBehalfOfId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_approvalChainId_fkey" FOREIGN KEY ("approvalChainId") REFERENCES "ApprovalChain"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_allocationId_fkey" FOREIGN KEY ("allocationId") REFERENCES "Allocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_dependsOnId_fkey" FOREIGN KEY ("dependsOnId") REFERENCES "Request"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_originalRequestId_fkey" FOREIGN KEY ("originalRequestId") REFERENCES "Request"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestApproval" ADD CONSTRAINT "RequestApproval_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestApproval" ADD CONSTRAINT "RequestApproval_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "ApprovalStep"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestApproval" ADD CONSTRAINT "RequestApproval_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestApproval" ADD CONSTRAINT "RequestApproval_delegatedFromId_fkey" FOREIGN KEY ("delegatedFromId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestApproval" ADD CONSTRAINT "RequestApproval_reassignedFromId_fkey" FOREIGN KEY ("reassignedFromId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestComment" ADD CONSTRAINT "RequestComment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestComment" ADD CONSTRAINT "RequestComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestComment" ADD CONSTRAINT "RequestComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "RequestComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestHistory" ADD CONSTRAINT "RequestHistory_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestHistory" ADD CONSTRAINT "RequestHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestAttachment" ADD CONSTRAINT "RequestAttachment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestAttachment" ADD CONSTRAINT "RequestAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestWatcher" ADD CONSTRAINT "RequestWatcher_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestWatcher" ADD CONSTRAINT "RequestWatcher_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestWatcher" ADD CONSTRAINT "RequestWatcher_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestAffectedResource" ADD CONSTRAINT "RequestAffectedResource_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestAffectedResource" ADD CONSTRAINT "RequestAffectedResource_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestSequence" ADD CONSTRAINT "RequestSequence_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestLock" ADD CONSTRAINT "RequestLock_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestLock" ADD CONSTRAINT "RequestLock_lockedById_fkey" FOREIGN KEY ("lockedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RollbackStep" ADD CONSTRAINT "RollbackStep_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delegation" ADD CONSTRAINT "Delegation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delegation" ADD CONSTRAINT "Delegation_delegatorId_fkey" FOREIGN KEY ("delegatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delegation" ADD CONSTRAINT "Delegation_delegateId_fkey" FOREIGN KEY ("delegateId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlaBreachEvent" ADD CONSTRAINT "SlaBreachEvent_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlaBreachEvent" ADD CONSTRAINT "SlaBreachEvent_escalatedToId_fkey" FOREIGN KEY ("escalatedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlaPriorityMatrix" ADD CONSTRAINT "SlaPriorityMatrix_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlaPriorityMatrix" ADD CONSTRAINT "SlaPriorityMatrix_requestTypeId_fkey" FOREIGN KEY ("requestTypeId") REFERENCES "RequestType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessHoursConfig" ADD CONSTRAINT "BusinessHoursConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Holiday" ADD CONSTRAINT "Holiday_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestTemplate" ADD CONSTRAINT "RequestTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestTemplate" ADD CONSTRAINT "RequestTemplate_requestTypeId_fkey" FOREIGN KEY ("requestTypeId") REFERENCES "RequestType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Webhook" ADD CONSTRAINT "Webhook_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookLog" ADD CONSTRAINT "WebhookLog_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "Webhook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
