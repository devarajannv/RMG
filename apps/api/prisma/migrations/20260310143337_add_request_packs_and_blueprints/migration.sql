-- CreateEnum
CREATE TYPE "RequestBlueprintDomain" AS ENUM ('PROFESSIONAL_SERVICES', 'INTERNAL_OPERATIONS', 'PEOPLE_OPERATIONS', 'FINANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "RequestPackMaturityLevel" AS ENUM ('STARTER', 'STANDARD', 'ADVANCED');

-- CreateEnum
CREATE TYPE "RequestBlueprintRenderMode" AS ENUM ('MODAL', 'DRAWER', 'PAGE', 'WIZARD');

-- CreateEnum
CREATE TYPE "RequestBlueprintComplexityLevel" AS ENUM ('SIMPLE', 'STANDARD', 'ADVANCED');

-- CreateEnum
CREATE TYPE "RequestPackActivationStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "RequestPack" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "domain" "RequestBlueprintDomain" NOT NULL,
    "maturityLevel" "RequestPackMaturityLevel" NOT NULL DEFAULT 'STANDARD',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "iconName" VARCHAR(50),
    "activationDependencies" JSONB,
    "recommendedOrgProfiles" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequestPack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestBlueprint" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "requestTypeId" UUID,
    "schemaVersion" VARCHAR(10) NOT NULL DEFAULT '1.0',
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "domain" "RequestBlueprintDomain" NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "icon" VARCHAR(50),
    "version" INTEGER NOT NULL DEFAULT 1,
    "isSystemBlueprint" BOOLEAN NOT NULL DEFAULT true,
    "maturityLevel" "RequestPackMaturityLevel" NOT NULL DEFAULT 'STANDARD',
    "renderMode" "RequestBlueprintRenderMode" NOT NULL DEFAULT 'DRAWER',
    "complexityLevel" "RequestBlueprintComplexityLevel" NOT NULL DEFAULT 'STANDARD',
    "allowDraft" BOOLEAN NOT NULL DEFAULT true,
    "allowSubmit" BOOLEAN NOT NULL DEFAULT true,
    "allowEditAfterReturn" BOOLEAN NOT NULL DEFAULT true,
    "allowAttachments" BOOLEAN NOT NULL DEFAULT true,
    "maxAttachments" INTEGER,
    "maxAttachmentSizeMb" INTEGER,
    "commonFields" JSONB NOT NULL,
    "entityBindings" JSONB NOT NULL,
    "customFields" JSONB NOT NULL,
    "dependencyRules" JSONB NOT NULL,
    "workflowPolicy" JSONB NOT NULL,
    "overridePolicy" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequestBlueprint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestPackBlueprint" (
    "id" UUID NOT NULL,
    "packId" UUID NOT NULL,
    "blueprintId" UUID NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequestPackBlueprint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantRequestPackActivation" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "packId" UUID NOT NULL,
    "status" "RequestPackActivationStatus" NOT NULL DEFAULT 'ACTIVE',
    "activatedByUserId" UUID,
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activationSummary" JSONB,
    "readinessSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantRequestPackActivation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantRolePlaceholderMapping" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "activationId" UUID NOT NULL,
    "placeholderCode" VARCHAR(50) NOT NULL,
    "placeholderLabel" VARCHAR(100),
    "businessRoleId" UUID,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantRolePlaceholderMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RequestPack_code_key" ON "RequestPack"("code");

-- CreateIndex
CREATE INDEX "RequestPack_isActive_idx" ON "RequestPack"("isActive");

-- CreateIndex
CREATE INDEX "RequestPack_domain_idx" ON "RequestPack"("domain");

-- CreateIndex
CREATE INDEX "RequestPack_sortOrder_idx" ON "RequestPack"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "RequestBlueprint_code_key" ON "RequestBlueprint"("code");

-- CreateIndex
CREATE UNIQUE INDEX "RequestBlueprint_requestTypeId_key" ON "RequestBlueprint"("requestTypeId");

-- CreateIndex
CREATE INDEX "RequestBlueprint_domain_idx" ON "RequestBlueprint"("domain");

-- CreateIndex
CREATE INDEX "RequestBlueprint_isSystemBlueprint_idx" ON "RequestBlueprint"("isSystemBlueprint");

-- CreateIndex
CREATE INDEX "RequestPackBlueprint_blueprintId_idx" ON "RequestPackBlueprint"("blueprintId");

-- CreateIndex
CREATE UNIQUE INDEX "RequestPackBlueprint_packId_blueprintId_key" ON "RequestPackBlueprint"("packId", "blueprintId");

-- CreateIndex
CREATE INDEX "TenantRequestPackActivation_tenantId_idx" ON "TenantRequestPackActivation"("tenantId");

-- CreateIndex
CREATE INDEX "TenantRequestPackActivation_status_idx" ON "TenantRequestPackActivation"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TenantRequestPackActivation_tenantId_packId_key" ON "TenantRequestPackActivation"("tenantId", "packId");

-- CreateIndex
CREATE INDEX "TenantRolePlaceholderMapping_tenantId_idx" ON "TenantRolePlaceholderMapping"("tenantId");

-- CreateIndex
CREATE INDEX "TenantRolePlaceholderMapping_businessRoleId_idx" ON "TenantRolePlaceholderMapping"("businessRoleId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantRolePlaceholderMapping_activationId_placeholderCode_key" ON "TenantRolePlaceholderMapping"("activationId", "placeholderCode");

-- AddForeignKey
ALTER TABLE "RequestBlueprint" ADD CONSTRAINT "RequestBlueprint_requestTypeId_fkey" FOREIGN KEY ("requestTypeId") REFERENCES "RequestType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestPackBlueprint" ADD CONSTRAINT "RequestPackBlueprint_packId_fkey" FOREIGN KEY ("packId") REFERENCES "RequestPack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestPackBlueprint" ADD CONSTRAINT "RequestPackBlueprint_blueprintId_fkey" FOREIGN KEY ("blueprintId") REFERENCES "RequestBlueprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantRequestPackActivation" ADD CONSTRAINT "TenantRequestPackActivation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantRequestPackActivation" ADD CONSTRAINT "TenantRequestPackActivation_packId_fkey" FOREIGN KEY ("packId") REFERENCES "RequestPack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantRolePlaceholderMapping" ADD CONSTRAINT "TenantRolePlaceholderMapping_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantRolePlaceholderMapping" ADD CONSTRAINT "TenantRolePlaceholderMapping_activationId_fkey" FOREIGN KEY ("activationId") REFERENCES "TenantRequestPackActivation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantRolePlaceholderMapping" ADD CONSTRAINT "TenantRolePlaceholderMapping_businessRoleId_fkey" FOREIGN KEY ("businessRoleId") REFERENCES "BusinessRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;
