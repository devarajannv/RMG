-- CreateEnum
CREATE TYPE "FunctionCategory" AS ENUM ('APPROVAL', 'MANAGEMENT', 'FINANCIAL', 'ADMINISTRATIVE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "FunctionScopeType" AS ENUM ('TENANT', 'PRACTICE', 'DEPARTMENT', 'PROJECT', 'TEAM');

-- CreateEnum
CREATE TYPE "AssignmentApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "ApproverType" ADD VALUE 'FUNCTION';

-- AlterTable
ALTER TABLE "ApprovalStep" ADD COLUMN     "approvalFunctionId" UUID;

-- CreateTable
CREATE TABLE "ApprovalFunction" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "category" "FunctionCategory" NOT NULL DEFAULT 'APPROVAL',
    "scopeType" "FunctionScopeType" NOT NULL DEFAULT 'TENANT',
    "allowMultipleHolders" BOOLEAN NOT NULL DEFAULT true,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "canDelegate" BOOLEAN NOT NULL DEFAULT true,
    "maxDelegationDays" INTEGER,
    "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ApprovalFunction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FunctionAssignment" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "functionId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "scopeType" "FunctionScopeType",
    "scopeEntityId" UUID,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "isDelegated" BOOLEAN NOT NULL DEFAULT false,
    "delegatedFromId" UUID,
    "delegationReason" VARCHAR(500),
    "assignedById" UUID NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvalStatus" "AssignmentApprovalStatus" NOT NULL DEFAULT 'APPROVED',
    "approvedById" UUID,
    "approvedAt" TIMESTAMP(3),
    "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "revokedAt" TIMESTAMP(3),
    "revokedById" UUID,
    "revocationReason" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FunctionAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApprovalFunction_tenantId_status_idx" ON "ApprovalFunction"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ApprovalFunction_tenantId_category_idx" ON "ApprovalFunction"("tenantId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalFunction_tenantId_code_key" ON "ApprovalFunction"("tenantId", "code");

-- CreateIndex
CREATE INDEX "FunctionAssignment_tenantId_functionId_status_idx" ON "FunctionAssignment"("tenantId", "functionId", "status");

-- CreateIndex
CREATE INDEX "FunctionAssignment_tenantId_userId_status_idx" ON "FunctionAssignment"("tenantId", "userId", "status");

-- CreateIndex
CREATE INDEX "FunctionAssignment_tenantId_scopeType_scopeEntityId_idx" ON "FunctionAssignment"("tenantId", "scopeType", "scopeEntityId");

-- CreateIndex
CREATE INDEX "FunctionAssignment_effectiveFrom_effectiveTo_idx" ON "FunctionAssignment"("effectiveFrom", "effectiveTo");

-- AddForeignKey
ALTER TABLE "ApprovalStep" ADD CONSTRAINT "ApprovalStep_approvalFunctionId_fkey" FOREIGN KEY ("approvalFunctionId") REFERENCES "ApprovalFunction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalFunction" ADD CONSTRAINT "ApprovalFunction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunctionAssignment" ADD CONSTRAINT "FunctionAssignment_functionId_fkey" FOREIGN KEY ("functionId") REFERENCES "ApprovalFunction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunctionAssignment" ADD CONSTRAINT "FunctionAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunctionAssignment" ADD CONSTRAINT "FunctionAssignment_delegatedFromId_fkey" FOREIGN KEY ("delegatedFromId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunctionAssignment" ADD CONSTRAINT "FunctionAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
