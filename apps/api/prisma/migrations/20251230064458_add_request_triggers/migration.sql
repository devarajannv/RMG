-- CreateEnum
CREATE TYPE "TriggerSourceType" AS ENUM ('WEBHOOK', 'MANUAL', 'SCHEDULED', 'API', 'INTERNAL');

-- CreateEnum
CREATE TYPE "InboundWebhookSource" AS ENUM ('HUBSPOT', 'SALESFORCE', 'STRIPE', 'JIRA', 'SLACK', 'TEAMS', 'CUSTOM');

-- CreateEnum
CREATE TYPE "TriggerEventStatus" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "TriggerExecutionStatus" AS ENUM ('SUCCESS', 'SKIPPED_FILTER', 'SKIPPED_DUPLICATE', 'SKIPPED_INACTIVE', 'FAILED_MAPPING', 'FAILED_VALIDATION', 'FAILED_ERROR');

-- AlterTable
ALTER TABLE "TenantRequestTypeConfig" ADD COLUMN     "autoAssignToRequester" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "escalationPolicy" JSONB,
ADD COLUMN     "fieldValidations" JSONB,
ADD COLUMN     "onApprovalActions" JSONB,
ADD COLUMN     "onRejectionActions" JSONB,
ADD COLUMN     "requiredFields" TEXT[],
ADD COLUMN     "requiresApproval" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "RequestTrigger" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "sourceType" "TriggerSourceType" NOT NULL,
    "webhookId" UUID,
    "eventType" VARCHAR(100) NOT NULL,
    "eventFilter" JSONB,
    "requestTypeConfigId" UUID NOT NULL,
    "fieldMapping" JSONB NOT NULL,
    "defaultPriority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "defaultMetadata" JSONB,
    "approvalChainId" UUID,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "requireConfirmation" BOOLEAN NOT NULL DEFAULT false,
    "deduplicationKey" VARCHAR(200),
    "deduplicationHours" INTEGER,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "RequestTrigger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboundWebhook" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "source" "InboundWebhookSource" NOT NULL,
    "description" VARCHAR(500),
    "secretKey" VARCHAR(200) NOT NULL,
    "signatureHeader" VARCHAR(100),
    "signatureAlgo" VARCHAR(50),
    "endpointPath" VARCHAR(100) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastReceivedAt" TIMESTAMP(3),
    "totalEventsReceived" INTEGER NOT NULL DEFAULT 0,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InboundWebhook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboundWebhookEvent" (
    "id" UUID NOT NULL,
    "webhookId" UUID NOT NULL,
    "eventType" VARCHAR(100) NOT NULL,
    "payload" JSONB NOT NULL,
    "headers" JSONB,
    "status" "TriggerEventStatus" NOT NULL DEFAULT 'PENDING',
    "processedAt" TIMESTAMP(3),
    "errorMessage" VARCHAR(1000),
    "signatureValid" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InboundWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TriggerExecution" (
    "id" UUID NOT NULL,
    "triggerId" UUID NOT NULL,
    "webhookEventId" UUID,
    "inputPayload" JSONB NOT NULL,
    "matchedFilter" BOOLEAN NOT NULL DEFAULT true,
    "status" "TriggerExecutionStatus" NOT NULL,
    "requestId" UUID,
    "mappedFields" JSONB,
    "errorMessage" VARCHAR(1000),
    "skippedReason" VARCHAR(500),
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationMs" INTEGER,

    CONSTRAINT "TriggerExecution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RequestTrigger_tenantId_isActive_idx" ON "RequestTrigger"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "RequestTrigger_tenantId_sourceType_eventType_idx" ON "RequestTrigger"("tenantId", "sourceType", "eventType");

-- CreateIndex
CREATE UNIQUE INDEX "RequestTrigger_tenantId_name_key" ON "RequestTrigger"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "InboundWebhook_endpointPath_key" ON "InboundWebhook"("endpointPath");

-- CreateIndex
CREATE INDEX "InboundWebhook_tenantId_isActive_idx" ON "InboundWebhook"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "InboundWebhook_endpointPath_idx" ON "InboundWebhook"("endpointPath");

-- CreateIndex
CREATE UNIQUE INDEX "InboundWebhook_tenantId_name_key" ON "InboundWebhook"("tenantId", "name");

-- CreateIndex
CREATE INDEX "InboundWebhookEvent_webhookId_createdAt_idx" ON "InboundWebhookEvent"("webhookId", "createdAt");

-- CreateIndex
CREATE INDEX "InboundWebhookEvent_status_idx" ON "InboundWebhookEvent"("status");

-- CreateIndex
CREATE INDEX "TriggerExecution_triggerId_executedAt_idx" ON "TriggerExecution"("triggerId", "executedAt");

-- CreateIndex
CREATE INDEX "TriggerExecution_requestId_idx" ON "TriggerExecution"("requestId");

-- AddForeignKey
ALTER TABLE "RequestTrigger" ADD CONSTRAINT "RequestTrigger_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestTrigger" ADD CONSTRAINT "RequestTrigger_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "InboundWebhook"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestTrigger" ADD CONSTRAINT "RequestTrigger_requestTypeConfigId_fkey" FOREIGN KEY ("requestTypeConfigId") REFERENCES "TenantRequestTypeConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestTrigger" ADD CONSTRAINT "RequestTrigger_approvalChainId_fkey" FOREIGN KEY ("approvalChainId") REFERENCES "ApprovalChain"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboundWebhook" ADD CONSTRAINT "InboundWebhook_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboundWebhookEvent" ADD CONSTRAINT "InboundWebhookEvent_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "InboundWebhook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TriggerExecution" ADD CONSTRAINT "TriggerExecution_triggerId_fkey" FOREIGN KEY ("triggerId") REFERENCES "RequestTrigger"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TriggerExecution" ADD CONSTRAINT "TriggerExecution_webhookEventId_fkey" FOREIGN KEY ("webhookEventId") REFERENCES "InboundWebhookEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TriggerExecution" ADD CONSTRAINT "TriggerExecution_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE SET NULL ON UPDATE CASCADE;
