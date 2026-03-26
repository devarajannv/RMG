import { describe, expect, it } from 'vitest';

import {
  professionalServicesCoreBlueprints,
} from './request-blueprint.seed-data';
import {
  validateRequestBlueprintDefinition,
} from './request-blueprint.schemas';

describe('requestBlueprintSchemaV1', () => {
  it('accepts all Professional Services Core blueprints', () => {
    for (const blueprint of professionalServicesCoreBlueprints) {
      const result = validateRequestBlueprintDefinition(blueprint);
      expect(result.success).toBe(true);
    }
  });

  it('rejects blueprints without the title common field', () => {
    const [resourceAllocationBlueprint] = professionalServicesCoreBlueprints.slice(-1);
    const invalidBlueprint = {
      ...resourceAllocationBlueprint,
      commonFields: resourceAllocationBlueprint.commonFields.filter((field) => field.key !== 'title'),
    };

    const result = validateRequestBlueprintDefinition(invalidBlueprint);

    expect(result.success).toBe(false);
    expect(result.success ? [] : result.error.issues.map((issue) => issue.message)).toContain(
      'Blueprints must include the title common field.'
    );
  });

  it('rejects dependency rules that reference a missing entity binding', () => {
    const [msaBlueprint] = professionalServicesCoreBlueprints.filter(
      (blueprint) => blueprint.identity.code === 'MSA_CREATION'
    );

    const invalidBlueprint = {
      ...msaBlueprint,
      dependencyRules: msaBlueprint.dependencyRules.map((rule) => ({
        ...rule,
        requiredEntityBindingKey: 'missingBinding',
      })),
    };

    const result = validateRequestBlueprintDefinition(invalidBlueprint);

    expect(result.success).toBe(false);
    expect(result.success ? [] : result.error.issues.map((issue) => issue.message)).toContain(
      'Dependency rule references unknown entity binding: missingBinding'
    );
  });

  it('includes the PMO operational exception blueprint with governed exception fields', () => {
    const exceptionBlueprint = professionalServicesCoreBlueprints.find(
      (blueprint) => blueprint.identity.code === 'PMO_OPERATIONAL_EXCEPTION'
    );

    expect(exceptionBlueprint).toBeDefined();
    expect(exceptionBlueprint?.customFields.map((field) => field.fieldKey)).toEqual(
      expect.arrayContaining(['exceptionType', 'requestedDisposition', 'accountableOwner', 'impactSummary'])
    );
    expect(exceptionBlueprint?.workflowPolicy.requiresApproval).toBe(true);
  });
});
