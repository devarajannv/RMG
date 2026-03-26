import { z } from 'zod';

export const requestBlueprintDomainValues = [
	'PROFESSIONAL_SERVICES',
	'INTERNAL_OPERATIONS',
	'PEOPLE_OPERATIONS',
	'FINANCE',
	'OTHER',
] as const;

export const requestPackMaturityLevelValues = ['STARTER', 'STANDARD', 'ADVANCED'] as const;
export const requestBlueprintRenderModeValues = ['MODAL', 'DRAWER', 'PAGE', 'WIZARD'] as const;
export const requestBlueprintComplexityLevelValues = ['SIMPLE', 'STANDARD', 'ADVANCED'] as const;
export const commonFieldKeyValues = [
	'title',
	'description',
	'priority',
	'urgencyJustification',
	'neededBy',
	'onBehalfOf',
	'attachments',
] as const;
export const entityTypeValues = [
	'client',
	'project',
	'contract',
	'resource',
	'allocation',
	'user',
	'department',
	'team',
	'costCenter',
	'priorRequest',
] as const;
export const customFieldTypeValues = [
	'TEXT',
	'TEXTAREA',
	'NUMBER',
	'DATE',
	'DATETIME',
	'SELECT',
	'MULTI_SELECT',
	'CHECKBOX',
	'RADIO',
	'USER_PICKER',
] as const;

const primitiveValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

const conditionSchema = z.object({
	left: z.string().min(1).max(100),
	op: z.enum(['EQUALS', 'NOT_EQUALS', 'IN', 'NOT_IN', 'IS_EMPTY', 'IS_NOT_EMPTY']),
	right: z.unknown().optional(),
});

type ConditionGroup = {
	operator: 'AND' | 'OR';
	conditions: Array<z.infer<typeof conditionSchema> | ConditionGroup>;
};

const conditionGroupSchema: z.ZodType<ConditionGroup> = z.lazy(() =>
	z.object({
		operator: z.enum(['AND', 'OR']),
		conditions: z.array(z.union([conditionSchema, conditionGroupSchema])).min(1),
	})
);

const validationRuleSchema = z.object({
	type: z.enum(['MIN_LENGTH', 'MAX_LENGTH', 'MIN', 'MAX', 'REGEX']),
	value: z.union([z.string(), z.number()]),
	message: z.string().min(1).max(500),
});

const filterRuleSchema = z.object({
	field: z.string().min(1).max(100),
	op: z.enum(['EQUALS', 'IN', 'NOT_EQUALS']),
	value: z.unknown(),
});

const resolutionPolicySchema = z.object({
	strategy: z.enum(['AUTO_FIRST', 'PROMPT_ON_AMBIGUITY', 'MANUAL_ONLY']),
	emptyStateMessage: z.string().max(500).optional(),
	multipleMatchMessage: z.string().max(500).optional(),
});

const blueprintIdentitySchema = z.object({
	code: z.string().trim().min(1).max(50).regex(/^[A-Z0-9_]+$/),
	name: z.string().trim().min(1).max(100),
	description: z.string().trim().max(500).optional(),
	domain: z.enum(requestBlueprintDomainValues),
	category: z.string().trim().min(1).max(100),
	icon: z.string().trim().max(50).optional(),
	version: z.number().int().min(1),
	isSystemBlueprint: z.boolean(),
	packCode: z.string().trim().min(1).max(50).regex(/^[A-Z0-9_]+$/).optional(),
	maturityLevel: z.enum(requestPackMaturityLevelValues),
});

const blueprintRuntimeSchema = z.object({
	renderMode: z.enum(requestBlueprintRenderModeValues),
	complexityLevel: z.enum(requestBlueprintComplexityLevelValues),
	allowDraft: z.boolean(),
	allowSubmit: z.boolean(),
	allowEditAfterReturn: z.boolean(),
	allowAttachments: z.boolean(),
	maxAttachments: z.number().int().min(1).max(50).optional(),
	maxAttachmentSizeMb: z.number().int().min(1).max(100).optional(),
});

const commonFieldConfigSchema = z.object({
	key: z.enum(commonFieldKeyValues),
	visible: z.boolean(),
	editable: z.boolean(),
	requiredForDraft: z.boolean(),
	requiredForSubmit: z.boolean(),
	label: z.string().trim().max(100).optional(),
	helpText: z.string().trim().max(500).optional(),
	placeholder: z.string().trim().max(200).optional(),
	defaultValue: primitiveValueSchema.optional(),
	visibilityCondition: conditionGroupSchema.optional(),
	requirementCondition: conditionGroupSchema.optional(),
});

const entityBindingConfigSchema = z.object({
	key: z.string().trim().min(1).max(100),
	entityType: z.enum(entityTypeValues),
	label: z.string().trim().min(1).max(100),
	visible: z.boolean(),
	editable: z.boolean(),
	selectionMode: z.enum(['SINGLE', 'MULTI']),
	requiredForDraft: z.boolean(),
	requiredForSubmit: z.boolean(),
	autoResolve: z.boolean(),
	allowManualSelection: z.boolean(),
	derivedFrom: z.string().trim().max(100).optional(),
	helpText: z.string().trim().max(500).optional(),
	filterRules: z.array(filterRuleSchema).optional(),
	resolutionPolicy: resolutionPolicySchema.optional(),
});

const customFieldConfigSchema = z.object({
	fieldKey: z.string().trim().min(1).max(100),
	label: z.string().trim().min(1).max(100),
	type: z.enum(customFieldTypeValues),
	group: z.string().trim().max(100).optional(),
	displayOrder: z.number().int().min(1),
	placeholder: z.string().trim().max(200).optional(),
	helpText: z.string().trim().max(500).optional(),
	defaultValue: z.unknown().optional(),
	requiredForDraft: z.boolean(),
	requiredForSubmit: z.boolean(),
	options: z.array(z.object({ label: z.string().min(1).max(100), value: z.string().min(1).max(100) })).optional(),
	validation: z.array(validationRuleSchema).optional(),
	visibilityCondition: conditionGroupSchema.optional(),
	requirementCondition: conditionGroupSchema.optional(),
});

const dependencyRuleConfigSchema = z.object({
	ruleKey: z.string().trim().min(1).max(100),
	dependencyType: z.enum(['PRIOR_REQUEST', 'RELATED_RECORD', 'CONFIGURATION']),
	blockingStage: z.enum(['CREATE', 'SUBMIT']),
	message: z.string().trim().min(1).max(500),
	requiredRequestTypeCode: z.string().trim().max(50).regex(/^[A-Z0-9_]+$/).optional(),
	requiredStatus: z.string().trim().max(50).optional(),
	requiredEntityBindingKey: z.string().trim().max(100).optional(),
	resolutionMode: z.enum(['AUTO_ONLY', 'AUTO_OR_PICK', 'USER_MUST_SELECT', 'HARD_BLOCK']).optional(),
	autoResolveIfSingle: z.boolean().optional(),
	promptIfMultiple: z.boolean().optional(),
});

const workflowPolicyConfigSchema = z.object({
	requiresApproval: z.boolean(),
	workflowTemplateCode: z.string().trim().max(100).optional(),
	slaProfileCode: z.string().trim().max(100).optional(),
	defaultPriority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
	autoApproveWhenNoChainResolved: z.boolean(),
});

const overridePolicyConfigSchema = z.object({
	editableSections: z.array(z.enum([
		'identity-labels',
		'runtime',
		'commonFields',
		'entityBindings',
		'customFields',
		'dependencyRules',
		'workflowPolicy',
	])).min(1),
	lockedKeys: z.array(z.string().trim().min(1).max(100)).optional(),
	mode: z.enum(['PACK_SAFE', 'STANDARD_EDITABLE', 'ADVANCED_EDITABLE']),
});

export const requestBlueprintSchemaV1 = z.object({
	schemaVersion: z.literal('1.0'),
	identity: blueprintIdentitySchema,
	runtime: blueprintRuntimeSchema,
	commonFields: z.array(commonFieldConfigSchema),
	entityBindings: z.array(entityBindingConfigSchema),
	customFields: z.array(customFieldConfigSchema),
	dependencyRules: z.array(dependencyRuleConfigSchema),
	workflowPolicy: workflowPolicyConfigSchema,
	overridePolicy: overridePolicyConfigSchema,
}).superRefine((blueprint, ctx) => {
	const hasTitleField = blueprint.commonFields.some((field) => field.key === 'title');
	if (!hasTitleField) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: 'Blueprints must include the title common field.',
			path: ['commonFields'],
		});
	}

	const attachmentsField = blueprint.commonFields.find((field) => field.key === 'attachments');
	if (attachmentsField && !blueprint.runtime.allowAttachments) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: 'Attachments field cannot be configured when attachments are disabled.',
			path: ['commonFields'],
		});
	}

	const duplicateCheck = (
		values: string[],
		path: (string | number)[],
		label: string,
	) => {
		const seen = new Set<string>();
		for (const value of values) {
			if (seen.has(value)) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: `Duplicate ${label}: ${value}`,
					path,
				});
			}
			seen.add(value);
		}
	};

	duplicateCheck(blueprint.commonFields.map((field) => field.key), ['commonFields'], 'common field key');
	duplicateCheck(blueprint.entityBindings.map((binding) => binding.key), ['entityBindings'], 'entity binding key');
	duplicateCheck(blueprint.customFields.map((field) => field.fieldKey), ['customFields'], 'custom field key');
	duplicateCheck(blueprint.dependencyRules.map((rule) => rule.ruleKey), ['dependencyRules'], 'dependency rule key');

	const entityBindingKeys = new Set(blueprint.entityBindings.map((binding) => binding.key));
	blueprint.dependencyRules.forEach((rule, index) => {
		if (rule.requiredEntityBindingKey && !entityBindingKeys.has(rule.requiredEntityBindingKey)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: `Dependency rule references unknown entity binding: ${rule.requiredEntityBindingKey}`,
				path: ['dependencyRules', index, 'requiredEntityBindingKey'],
			});
		}
	});

	const customFieldOrder = blueprint.customFields.map((field) => field.displayOrder);
	duplicateCheck(customFieldOrder.map(String), ['customFields'], 'custom field display order');
});

export type RequestBlueprintV1 = z.infer<typeof requestBlueprintSchemaV1>;
export type CommonFieldConfig = z.infer<typeof commonFieldConfigSchema>;
export type EntityBindingConfig = z.infer<typeof entityBindingConfigSchema>;
export type CustomFieldConfig = z.infer<typeof customFieldConfigSchema>;
export type DependencyRuleConfig = z.infer<typeof dependencyRuleConfigSchema>;

export function parseRequestBlueprintDefinition(input: unknown): RequestBlueprintV1 {
	return requestBlueprintSchemaV1.parse(input);
}

export function validateRequestBlueprintDefinition(input: unknown) {
	return requestBlueprintSchemaV1.safeParse(input);
}
