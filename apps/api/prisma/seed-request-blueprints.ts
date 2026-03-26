import { Prisma, PrismaClient } from '@prisma/client';

import {
  professionalServicesCoreBlueprints,
  professionalServicesCorePack,
  professionalServicesCoreRequestTypes,
} from '../src/modules/requests/request-blueprint.seed-data';

export async function seedRequestBlueprints(prisma: PrismaClient) {
  const seededRequestTypes = [] as string[];

  for (const definition of professionalServicesCoreRequestTypes) {
    const existing = await prisma.requestType.findFirst({
      where: {
        code: definition.code,
        tenantId: null,
      },
    });

    if (existing) {
      await prisma.requestType.update({
        where: { id: existing.id },
        data: {
          name: definition.name,
          description: definition.description,
          category: definition.category,
          defaultPriority: definition.defaultPriority,
          responseSlaHours: definition.responseSlaHours,
          resolutionSlaHours: definition.resolutionSlaHours,
          slaCalculationType: definition.slaCalculationType,
          requiresApproval: definition.requiresApproval,
          allowRollback: definition.allowRollback,
          rollbackWindowDays: definition.rollbackWindowDays,
          rollbackPermission: definition.rollbackPermission,
          visibilityScope: definition.visibilityScope,
          onApprovalHandler: definition.onApprovalHandler,
          formSchema: definition.formSchema as Prisma.InputJsonValue,
          requiredFields: definition.requiredFields,
          isActive: true,
          isSystemType: true,
          allowDraft: true,
          allowAttachments: true,
          maxAttachmentSizeMb: 10,
          maxAttachments: 5,
        },
      });
      seededRequestTypes.push(existing.id);
      continue;
    }

    const created = await prisma.requestType.create({
      data: {
        code: definition.code,
        name: definition.name,
        description: definition.description,
        category: definition.category,
        defaultPriority: definition.defaultPriority,
        responseSlaHours: definition.responseSlaHours,
        resolutionSlaHours: definition.resolutionSlaHours,
        slaCalculationType: definition.slaCalculationType,
        requiresApproval: definition.requiresApproval,
        allowRollback: definition.allowRollback,
        rollbackWindowDays: definition.rollbackWindowDays,
        rollbackPermission: definition.rollbackPermission,
        visibilityScope: definition.visibilityScope,
        onApprovalHandler: definition.onApprovalHandler,
        formSchema: definition.formSchema as Prisma.InputJsonValue,
        requiredFields: definition.requiredFields,
        sensitiveFields: [],
        isActive: true,
        isSystemType: true,
        allowDraft: true,
        allowAttachments: true,
        maxAttachmentSizeMb: 10,
        maxAttachments: 5,
      },
    });

    seededRequestTypes.push(created.id);
  }

  const pack = await prisma.requestPack.upsert({
    where: { code: professionalServicesCorePack.code },
    update: {
      name: professionalServicesCorePack.name,
      description: professionalServicesCorePack.description,
      domain: professionalServicesCorePack.domain,
      maturityLevel: professionalServicesCorePack.maturityLevel,
      iconName: professionalServicesCorePack.iconName,
      sortOrder: professionalServicesCorePack.sortOrder,
      isActive: true,
      recommendedOrgProfiles: professionalServicesCorePack.recommendedOrgProfiles,
      activationDependencies: professionalServicesCorePack.activationDependencies,
    },
    create: {
      code: professionalServicesCorePack.code,
      name: professionalServicesCorePack.name,
      description: professionalServicesCorePack.description,
      domain: professionalServicesCorePack.domain,
      maturityLevel: professionalServicesCorePack.maturityLevel,
      iconName: professionalServicesCorePack.iconName,
      sortOrder: professionalServicesCorePack.sortOrder,
      isActive: true,
      recommendedOrgProfiles: professionalServicesCorePack.recommendedOrgProfiles,
      activationDependencies: professionalServicesCorePack.activationDependencies,
    },
  });

  for (const [index, blueprint] of professionalServicesCoreBlueprints.entries()) {
    const requestType = await prisma.requestType.findFirst({
      where: {
        code: blueprint.identity.code,
        tenantId: null,
      },
      select: { id: true },
    });

    if (!requestType) {
      throw new Error(`System request type not found for blueprint ${blueprint.identity.code}`);
    }

    const savedBlueprint = await prisma.requestBlueprint.upsert({
      where: { code: blueprint.identity.code },
      update: {
        requestTypeId: requestType.id,
        schemaVersion: blueprint.schemaVersion,
        name: blueprint.identity.name,
        description: blueprint.identity.description,
        domain: blueprint.identity.domain,
        category: blueprint.identity.category,
        icon: blueprint.identity.icon,
        version: blueprint.identity.version,
        isSystemBlueprint: blueprint.identity.isSystemBlueprint,
        maturityLevel: blueprint.identity.maturityLevel,
        renderMode: blueprint.runtime.renderMode,
        complexityLevel: blueprint.runtime.complexityLevel,
        allowDraft: blueprint.runtime.allowDraft,
        allowSubmit: blueprint.runtime.allowSubmit,
        allowEditAfterReturn: blueprint.runtime.allowEditAfterReturn,
        allowAttachments: blueprint.runtime.allowAttachments,
        maxAttachments: blueprint.runtime.maxAttachments,
        maxAttachmentSizeMb: blueprint.runtime.maxAttachmentSizeMb,
        commonFields: blueprint.commonFields,
        entityBindings: blueprint.entityBindings,
        customFields: blueprint.customFields,
        dependencyRules: blueprint.dependencyRules,
        workflowPolicy: blueprint.workflowPolicy,
        overridePolicy: blueprint.overridePolicy,
      },
      create: {
        code: blueprint.identity.code,
        requestTypeId: requestType.id,
        schemaVersion: blueprint.schemaVersion,
        name: blueprint.identity.name,
        description: blueprint.identity.description,
        domain: blueprint.identity.domain,
        category: blueprint.identity.category,
        icon: blueprint.identity.icon,
        version: blueprint.identity.version,
        isSystemBlueprint: blueprint.identity.isSystemBlueprint,
        maturityLevel: blueprint.identity.maturityLevel,
        renderMode: blueprint.runtime.renderMode,
        complexityLevel: blueprint.runtime.complexityLevel,
        allowDraft: blueprint.runtime.allowDraft,
        allowSubmit: blueprint.runtime.allowSubmit,
        allowEditAfterReturn: blueprint.runtime.allowEditAfterReturn,
        allowAttachments: blueprint.runtime.allowAttachments,
        maxAttachments: blueprint.runtime.maxAttachments,
        maxAttachmentSizeMb: blueprint.runtime.maxAttachmentSizeMb,
        commonFields: blueprint.commonFields,
        entityBindings: blueprint.entityBindings,
        customFields: blueprint.customFields,
        dependencyRules: blueprint.dependencyRules,
        workflowPolicy: blueprint.workflowPolicy,
        overridePolicy: blueprint.overridePolicy,
      },
    });

    await prisma.requestPackBlueprint.upsert({
      where: {
        packId_blueprintId: {
          packId: pack.id,
          blueprintId: savedBlueprint.id,
        },
      },
      update: {
        sortOrder: index + 1,
        isRequired: true,
      },
      create: {
        packId: pack.id,
        blueprintId: savedBlueprint.id,
        sortOrder: index + 1,
        isRequired: true,
      },
    });
  }

  return {
    packCode: professionalServicesCorePack.code,
    requestTypeCount: seededRequestTypes.length,
    blueprintCount: professionalServicesCoreBlueprints.length,
  };
}

async function main() {
  const prisma = new PrismaClient();

  try {
    const result = await seedRequestBlueprints(prisma);
    console.log(`✅ Seeded ${result.packCode} (${result.requestTypeCount} request types, ${result.blueprintCount} blueprints)`);
  } catch (error) {
    console.error('❌ Failed to seed request blueprints:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void main();
}
