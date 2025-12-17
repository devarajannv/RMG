-- CreateEnum
CREATE TYPE "ImportPurpose" AS ENUM ('MIGRATION', 'SYNC', 'MANUAL');

-- CreateEnum
CREATE TYPE "DuplicateAction" AS ENUM ('SKIP', 'UPDATE', 'FLAG');

-- CreateEnum
CREATE TYPE "ImportJobStatus" AS ENUM ('PENDING_ANALYSIS', 'ANALYZING', 'PENDING_APPROVAL', 'APPROVED', 'IMPORTING', 'COMPLETED', 'COMPLETED_WITH_ERRORS', 'FAILED', 'ROLLED_BACK');

-- CreateEnum
CREATE TYPE "ImportRecordStatus" AS ENUM ('PENDING', 'PROCESSING', 'IMPORTED', 'UPDATED', 'SKIPPED', 'ERROR', 'FLAGGED');

-- CreateTable
CREATE TABLE "ImportJob" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "sourceFileName" VARCHAR(255) NOT NULL,
    "sourceFileType" VARCHAR(50) NOT NULL,
    "sourceFileSize" INTEGER NOT NULL,
    "sourceFilePath" VARCHAR(500) NOT NULL,
    "importPurpose" "ImportPurpose" NOT NULL DEFAULT 'MIGRATION',
    "duplicateAction" "DuplicateAction" NOT NULL DEFAULT 'SKIP',
    "detectedEntities" JSONB,
    "fieldMappings" JSONB,
    "dependencyOrder" JSONB,
    "referencesToCreate" JSONB,
    "autonomyLevel" INTEGER NOT NULL DEFAULT 1,
    "sourceFingerprint" VARCHAR(64),
    "status" "ImportJobStatus" NOT NULL DEFAULT 'PENDING_ANALYSIS',
    "analysisStarted" TIMESTAMP(3),
    "analysisCompleted" TIMESTAMP(3),
    "importStarted" TIMESTAMP(3),
    "importCompleted" TIMESTAMP(3),
    "totalRecords" INTEGER NOT NULL DEFAULT 0,
    "importedRecords" INTEGER NOT NULL DEFAULT 0,
    "skippedRecords" INTEGER NOT NULL DEFAULT 0,
    "errorRecords" INTEGER NOT NULL DEFAULT 0,
    "autoCreatedRefs" JSONB,
    "canRollback" BOOLEAN NOT NULL DEFAULT true,
    "rollbackExpires" TIMESTAMP(3),
    "rolledBackAt" TIMESTAMP(3),
    "rolledBackBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportMapping" (
    "id" UUID NOT NULL,
    "importJobId" UUID NOT NULL,
    "sourceColumn" VARCHAR(100) NOT NULL,
    "sourceSampleValues" JSONB,
    "targetEntity" VARCHAR(50) NOT NULL,
    "targetField" VARCHAR(100) NOT NULL,
    "confidence" DECIMAL(3,2) NOT NULL,
    "aiReasoning" VARCHAR(500),
    "userApproved" BOOLEAN NOT NULL DEFAULT false,
    "userOverridden" BOOLEAN NOT NULL DEFAULT false,
    "transformationType" VARCHAR(50),
    "transformationConfig" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportJobRecord" (
    "id" UUID NOT NULL,
    "importJobId" UUID NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "sourceData" JSONB NOT NULL,
    "targetEntity" VARCHAR(50) NOT NULL,
    "targetId" UUID,
    "status" "ImportRecordStatus" NOT NULL DEFAULT 'PENDING',
    "confidence" DECIMAL(3,2),
    "errors" JSONB,
    "warnings" JSONB,
    "previousData" JSONB,
    "wasCreated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportJobRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImportJob_tenantId_status_idx" ON "ImportJob"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ImportJob_tenantId_createdAt_idx" ON "ImportJob"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "ImportJob_tenantId_sourceFingerprint_idx" ON "ImportJob"("tenantId", "sourceFingerprint");

-- CreateIndex
CREATE INDEX "ImportMapping_importJobId_idx" ON "ImportMapping"("importJobId");

-- CreateIndex
CREATE UNIQUE INDEX "ImportMapping_importJobId_sourceColumn_key" ON "ImportMapping"("importJobId", "sourceColumn");

-- CreateIndex
CREATE INDEX "ImportJobRecord_importJobId_status_idx" ON "ImportJobRecord"("importJobId", "status");

-- CreateIndex
CREATE INDEX "ImportJobRecord_importJobId_targetEntity_idx" ON "ImportJobRecord"("importJobId", "targetEntity");

-- AddForeignKey
ALTER TABLE "ImportMapping" ADD CONSTRAINT "ImportMapping_importJobId_fkey" FOREIGN KEY ("importJobId") REFERENCES "ImportJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportJobRecord" ADD CONSTRAINT "ImportJobRecord_importJobId_fkey" FOREIGN KEY ("importJobId") REFERENCES "ImportJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
