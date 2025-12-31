/*
  Warnings:

  - Made the column `budgetCurrency` on table `CostCenter` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "ApprovalMatrixTemplate" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "BusinessRole" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "CostCenter" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "budgetCurrency" SET NOT NULL,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "DelegationRule" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Department" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "GradeBand" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "OnboardingChecklist" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ResourceBusinessRole" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SlaConfiguration" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Team" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "TeamMember" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "TenantProfile" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "UserInvitation" ALTER COLUMN "id" DROP DEFAULT;

-- RenameIndex
ALTER INDEX "OnboardingChecklist_tenant_phase_step_key" RENAME TO "OnboardingChecklist_tenantId_phase_stepCode_key";

-- RenameIndex
ALTER INDEX "ResourceBusinessRole_resource_role_from_key" RENAME TO "ResourceBusinessRole_resourceId_businessRoleId_effectiveFro_key";

-- RenameIndex
ALTER INDEX "SlaConfiguration_tenant_type_priority_key" RENAME TO "SlaConfiguration_tenantId_requestType_priority_key";
