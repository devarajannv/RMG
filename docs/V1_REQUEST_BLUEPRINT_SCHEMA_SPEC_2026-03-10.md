# V1 Request Blueprint Schema Specification

**Document Created:** March 10, 2026  
**Status:** Draft Proposal - No Implementation Yet  
**Depends On:**
- [REQUEST_PACK_AND_INTAKE_BLUEPRINT_SPEC_2026-03-10.md](REQUEST_PACK_AND_INTAKE_BLUEPRINT_SPEC_2026-03-10.md)
- [PROFESSIONAL_SERVICES_CORE_PACK_SPEC_2026-03-10.md](PROFESSIONAL_SERVICES_CORE_PACK_SPEC_2026-03-10.md)

---

## 1. Purpose

This document freezes the proposed v1 schema for a `Request Blueprint`.

The schema must be:
- explicit enough to drive runtime request intake
- structured enough to support tenant-safe customization later
- narrow enough to ship in v1 without becoming a generic form engine project

This is the contract that should sit between:
- request pack activation
- admin request-type configuration
- runtime create/edit/submit UX
- backend validation orchestration

---

## 2. Design constraints

### 2.1 Must support in v1
- pre-built operational request blueprints
- request-type-specific field presentation
- common field configuration
- related entity selection
- dependency visibility and submit blocking
- draft vs submit requirement split
- runtime mode selection
- workflow linkage

### 2.2 Must not try to solve in v1
- arbitrary nested form DSL
- dynamic scripting language for validation
- multi-page wizard graph builder
- tenant-authored custom backend execution logic
- unconstrained blueprint mutation of system packs

---

## 3. Top-level schema

A v1 blueprint should contain these sections:

```ts
interface RequestBlueprintV1 {
  schemaVersion: '1.0';
  identity: BlueprintIdentity;
  runtime: BlueprintRuntime;
  commonFields: CommonFieldConfig[];
  entityBindings: EntityBindingConfig[];
  customFields: CustomFieldConfig[];
  dependencyRules: DependencyRuleConfig[];
  workflowPolicy: WorkflowPolicyConfig;
  overridePolicy: OverridePolicyConfig;
}
```

---

## 4. Identity section

```ts
interface BlueprintIdentity {
  code: string;
  name: string;
  description?: string;
  domain: 'PROFESSIONAL_SERVICES' | 'INTERNAL_OPERATIONS' | 'PEOPLE_OPERATIONS' | 'FINANCE' | 'OTHER';
  category: string;
  icon?: string;
  version: number;
  isSystemBlueprint: boolean;
  packCode?: string;
  maturityLevel: 'STARTER' | 'STANDARD' | 'ADVANCED';
}
```

### Notes
- `code` must remain stable and map to existing request type codes where applicable.
- `category` is a grouping label, not a dependency or workflow semantic.
- `packCode` identifies which request pack originally shipped the blueprint.

---

## 5. Runtime section

```ts
interface BlueprintRuntime {
  renderMode: 'MODAL' | 'DRAWER' | 'PAGE' | 'WIZARD';
  complexityLevel: 'SIMPLE' | 'STANDARD' | 'ADVANCED';
  allowDraft: boolean;
  allowSubmit: boolean;
  allowEditAfterReturn: boolean;
  allowAttachments: boolean;
  maxAttachments?: number;
  maxAttachmentSizeMb?: number;
}
```

### Notes
- `renderMode` determines the presentation container.
- `complexityLevel` is advisory and can drive UX choices.
- `allowDraft` and `allowSubmit` are runtime behaviors, not just metadata.

---

## 6. Common fields section

These fields are platform-standard and should not be redefined as custom fields in v1.

### Supported common field keys
- `title`
- `description`
- `priority`
- `urgencyJustification`
- `neededBy`
- `onBehalfOf`
- `attachments`

```ts
type CommonFieldKey =
  | 'title'
  | 'description'
  | 'priority'
  | 'urgencyJustification'
  | 'neededBy'
  | 'onBehalfOf'
  | 'attachments';

interface CommonFieldConfig {
  key: CommonFieldKey;
  visible: boolean;
  editable: boolean;
  requiredForDraft: boolean;
  requiredForSubmit: boolean;
  label?: string;
  helpText?: string;
  placeholder?: string;
  defaultValue?: string | number | boolean | null;
  visibilityCondition?: ConditionGroup;
  requirementCondition?: ConditionGroup;
}
```

### v1 rules
- `title` should exist on all blueprints.
- `urgencyJustification` should support conditional requirement based on `priority`.
- `attachments` can be visible only if runtime attachments are allowed.

---

## 7. Entity bindings section

Entity bindings connect the intake experience to real business records.

### Supported entity types in v1
- `client`
- `project`
- `contract`
- `resource`
- `allocation`
- `user`
- `department`
- `team`
- `costCenter`
- `priorRequest`

```ts
type EntityType =
  | 'client'
  | 'project'
  | 'contract'
  | 'resource'
  | 'allocation'
  | 'user'
  | 'department'
  | 'team'
  | 'costCenter'
  | 'priorRequest';

interface EntityBindingConfig {
  key: string;
  entityType: EntityType;
  label: string;
  visible: boolean;
  editable: boolean;
  selectionMode: 'SINGLE' | 'MULTI';
  requiredForDraft: boolean;
  requiredForSubmit: boolean;
  autoResolve: boolean;
  allowManualSelection: boolean;
  derivedFrom?: string;
  helpText?: string;
  filterRules?: FilterRule[];
  resolutionPolicy?: ResolutionPolicy;
}
```

### Special case: `priorRequest`
`priorRequest` is the standardized entity binding for lifecycle dependencies.

For example:
- a `RESOURCE_ALLOCATION_BATCH` blueprint can bind a `priorRequest` constrained to `PROJECT_SETUP`

### v1 guidance
- use entity bindings instead of freeform IDs in `requestData`
- prefer explicit bindings over hidden backend-only assumptions

---

## 8. Custom fields section

Custom fields represent request-specific input beyond common fields and entity bindings.

### Supported field types in v1
- `TEXT`
- `TEXTAREA`
- `NUMBER`
- `DATE`
- `DATETIME`
- `SELECT`
- `MULTI_SELECT`
- `CHECKBOX`
- `RADIO`
- `USER_PICKER`

```ts
type CustomFieldType =
  | 'TEXT'
  | 'TEXTAREA'
  | 'NUMBER'
  | 'DATE'
  | 'DATETIME'
  | 'SELECT'
  | 'MULTI_SELECT'
  | 'CHECKBOX'
  | 'RADIO'
  | 'USER_PICKER';

interface CustomFieldConfig {
  fieldKey: string;
  label: string;
  type: CustomFieldType;
  group?: string;
  displayOrder: number;
  placeholder?: string;
  helpText?: string;
  defaultValue?: unknown;
  requiredForDraft: boolean;
  requiredForSubmit: boolean;
  options?: Array<{ label: string; value: string }>;
  validation?: ValidationRule[];
  visibilityCondition?: ConditionGroup;
  requirementCondition?: ConditionGroup;
}
```

### v1 restrictions
- no nested repeaters
- no arbitrary code expressions
- no cross-field scripting beyond simple condition groups

---

## 9. Dependency rules section

Dependency rules formalize lifecycle and prerequisite logic.

```ts
interface DependencyRuleConfig {
  ruleKey: string;
  dependencyType: 'PRIOR_REQUEST' | 'RELATED_RECORD' | 'CONFIGURATION';
  blockingStage: 'CREATE' | 'SUBMIT';
  message: string;
  requiredRequestTypeCode?: string;
  requiredStatus?: string;
  requiredEntityBindingKey?: string;
  resolutionMode?: 'AUTO_ONLY' | 'AUTO_OR_PICK' | 'USER_MUST_SELECT' | 'HARD_BLOCK';
  autoResolveIfSingle?: boolean;
  promptIfMultiple?: boolean;
}
```

### Example
For `RESOURCE_ALLOCATION_BATCH`:
- `dependencyType = PRIOR_REQUEST`
- `blockingStage = SUBMIT`
- `requiredRequestTypeCode = PROJECT_SETUP`
- `requiredStatus = COMPLETED`
- `resolutionMode = AUTO_OR_PICK`

### v1 intent
Dependency rules must be rendered to the user as submit-readiness blockers or dependency selectors.

---

## 10. Workflow policy section

```ts
interface WorkflowPolicyConfig {
  requiresApproval: boolean;
  workflowTemplateCode?: string;
  slaProfileCode?: string;
  defaultPriority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  autoApproveWhenNoChainResolved: boolean;
}
```

### v1 note
- `workflowTemplateCode` should link to a reusable workflow template or chain binding.
- `autoApproveWhenNoChainResolved` should default conservatively for enterprise packs.

---

## 11. Override policy section

This controls what tenant admins can change safely.

```ts
interface OverridePolicyConfig {
  editableSections: Array<
    | 'identity-labels'
    | 'runtime'
    | 'commonFields'
    | 'entityBindings'
    | 'customFields'
    | 'dependencyRules'
    | 'workflowPolicy'
  >;
  lockedKeys?: string[];
  mode: 'PACK_SAFE' | 'STANDARD_EDITABLE' | 'ADVANCED_EDITABLE';
}
```

### v1 recommendation
System blueprints in starter packs should use `PACK_SAFE` or `STANDARD_EDITABLE`.

This allows:
- field labels
- optional visibility
- workflow mappings
- SLA changes

But prevents tenants from accidentally breaking the pack’s dependency chain.

---

## 12. Shared rule primitives

### 12.1 Condition groups

```ts
interface ConditionGroup {
  operator: 'AND' | 'OR';
  conditions: Array<Condition | ConditionGroup>;
}

interface Condition {
  left: string;
  op: 'EQUALS' | 'NOT_EQUALS' | 'IN' | 'NOT_IN' | 'IS_EMPTY' | 'IS_NOT_EMPTY';
  right?: unknown;
}
```

### 12.2 Validation rules

```ts
interface ValidationRule {
  type: 'MIN_LENGTH' | 'MAX_LENGTH' | 'MIN' | 'MAX' | 'REGEX';
  value: string | number;
  message: string;
}
```

### 12.3 Filter rules

```ts
interface FilterRule {
  field: string;
  op: 'EQUALS' | 'IN' | 'NOT_EQUALS';
  value: unknown;
}
```

### 12.4 Resolution policy

```ts
interface ResolutionPolicy {
  strategy: 'AUTO_FIRST' | 'PROMPT_ON_AMBIGUITY' | 'MANUAL_ONLY';
  emptyStateMessage?: string;
  multipleMatchMessage?: string;
}
```

---

## 13. Example blueprint shape

Illustrative example for `RESOURCE_ALLOCATION_BATCH`:

```ts
const resourceAllocationBatchBlueprint: RequestBlueprintV1 = {
  schemaVersion: '1.0',
  identity: {
    code: 'RESOURCE_ALLOCATION_BATCH',
    name: 'Resource Allocation',
    description: 'Request staffing against a prepared project',
    domain: 'PROFESSIONAL_SERVICES',
    category: 'Staffing',
    version: 1,
    isSystemBlueprint: true,
    packCode: 'PRO_SERVICES_CORE',
    maturityLevel: 'STANDARD',
  },
  runtime: {
    renderMode: 'PAGE',
    complexityLevel: 'ADVANCED',
    allowDraft: true,
    allowSubmit: true,
    allowEditAfterReturn: true,
    allowAttachments: true,
  },
  commonFields: [
    { key: 'title', visible: true, editable: true, requiredForDraft: true, requiredForSubmit: true },
    { key: 'description', visible: true, editable: true, requiredForDraft: false, requiredForSubmit: false },
    { key: 'priority', visible: true, editable: true, requiredForDraft: false, requiredForSubmit: false },
    { key: 'urgencyJustification', visible: true, editable: true, requiredForDraft: false, requiredForSubmit: false,
      requirementCondition: { operator: 'AND', conditions: [{ left: 'priority', op: 'EQUALS', right: 'CRITICAL' }] } },
    { key: 'neededBy', visible: true, editable: true, requiredForDraft: false, requiredForSubmit: false },
  ],
  entityBindings: [
    {
      key: 'project',
      entityType: 'project',
      label: 'Project',
      visible: true,
      editable: true,
      selectionMode: 'SINGLE',
      requiredForDraft: false,
      requiredForSubmit: true,
      autoResolve: false,
      allowManualSelection: true,
    },
    {
      key: 'projectSetupRequest',
      entityType: 'priorRequest',
      label: 'Project Setup Request',
      visible: true,
      editable: true,
      selectionMode: 'SINGLE',
      requiredForDraft: false,
      requiredForSubmit: true,
      autoResolve: true,
      allowManualSelection: true,
    },
  ],
  customFields: [
    { fieldKey: 'requestedStartDate', label: 'Requested Start Date', type: 'DATE', displayOrder: 1, requiredForDraft: false, requiredForSubmit: true },
    { fieldKey: 'requestedSkill', label: 'Required Skill / Role', type: 'TEXT', displayOrder: 2, requiredForDraft: false, requiredForSubmit: true },
    { fieldKey: 'headcount', label: 'Headcount', type: 'NUMBER', displayOrder: 3, requiredForDraft: false, requiredForSubmit: true },
  ],
  dependencyRules: [
    {
      ruleKey: 'requires-project-setup',
      dependencyType: 'PRIOR_REQUEST',
      blockingStage: 'SUBMIT',
      message: 'A completed Project Setup request must be linked before submission.',
      requiredRequestTypeCode: 'PROJECT_SETUP',
      requiredStatus: 'COMPLETED',
      resolutionMode: 'AUTO_OR_PICK',
      autoResolveIfSingle: true,
      promptIfMultiple: true,
    },
  ],
  workflowPolicy: {
    requiresApproval: true,
    workflowTemplateCode: 'RESOURCE_ALLOCATION_DEFAULT',
    slaProfileCode: 'STANDARD_OPERATIONS',
    defaultPriority: 'MEDIUM',
    autoApproveWhenNoChainResolved: false,
  },
  overridePolicy: {
    editableSections: ['identity-labels', 'commonFields', 'entityBindings', 'workflowPolicy'],
    mode: 'STANDARD_EDITABLE',
  },
};
```

---

## 14. Storage recommendation

In v1, the blueprint should be stored as structured JSON on the request type or a dedicated blueprint table, but the application should treat it as a typed contract.

Recommendation:
- implementation can store JSON
- code must validate it against a typed schema
- admin UI must edit it through controlled forms, not raw JSON by default

This preserves agility without sacrificing safety.

---

## 15. Migration guidance

### Existing request types
Existing seeded request types should be migrated into this schema by:
- preserving `code`
- mapping current defaults into `identity` and `workflowPolicy`
- converting current `requiredFields` into `customFields` or `entityBindings`
- converting hardcoded prerequisite chains into `dependencyRules`

### First migration targets
- `CUSTOMER_ONBOARDING`
- `MSA_CREATION`
- `SOW_CREATION`
- `PROJECT_SETUP`
- `RESOURCE_ALLOCATION_BATCH`

---

## 16. Decision summary

The best v1 schema is:
- typed
- sectioned
- explicit about draft vs submit
- explicit about entity bindings
- explicit about dependencies
- narrow enough to ship

It should not be a freeform dynamic form engine.

---

## 17. Next artifact

After this schema is accepted, the next document should be:
- onboarding activation UX spec for pack selection and role mapping

That should define:
- onboarding screens
- validation states
- unresolved mapping behavior
- activation summary behavior
