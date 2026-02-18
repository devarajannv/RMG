/*
  Warnings:

  - A unique constraint covering the columns `[code,tenantId]` on the table `RequestType` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "RequestType_code_key";

-- AlterTable
ALTER TABLE "RequestType" ADD COLUMN     "clonedFromId" UUID,
ADD COLUMN     "tenantId" UUID;

-- CreateTable
CREATE TABLE "RequestTypeTemplate" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "category" VARCHAR(50) NOT NULL,
    "requestTypes" JSONB NOT NULL,
    "workflows" JSONB NOT NULL,
    "bindings" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT[],
    "iconName" VARCHAR(50),
    "previewImage" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequestTypeTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RequestTypeTemplate_code_key" ON "RequestTypeTemplate"("code");

-- CreateIndex
CREATE INDEX "RequestTypeTemplate_category_idx" ON "RequestTypeTemplate"("category");

-- CreateIndex
CREATE INDEX "RequestTypeTemplate_isActive_idx" ON "RequestTypeTemplate"("isActive");

-- CreateIndex
CREATE INDEX "RequestType_tenantId_idx" ON "RequestType"("tenantId");

-- CreateIndex
CREATE INDEX "RequestType_isSystemType_idx" ON "RequestType"("isSystemType");

-- CreateIndex
CREATE UNIQUE INDEX "RequestType_code_tenantId_key" ON "RequestType"("code", "tenantId");

-- AddForeignKey
ALTER TABLE "RequestType" ADD CONSTRAINT "RequestType_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestType" ADD CONSTRAINT "RequestType_clonedFromId_fkey" FOREIGN KEY ("clonedFromId") REFERENCES "RequestType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
