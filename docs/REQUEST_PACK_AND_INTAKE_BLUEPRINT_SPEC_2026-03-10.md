# Request Pack & Intake Blueprint Specification

**Document Created:** March 10, 2026  
**Status:** Draft Proposal - No Implementation Yet  
**Scope:** Tenant app request intake architecture  
**Audience:** Product, Architecture, Backend, Frontend, Onboarding

---

## 1. Purpose

This specification defines how RMGaaS should achieve both:

1. **Fast tenant onboarding** through pre-built operational request packs
2. **Enterprise-grade flexibility** through request-type-driven intake blueprints and later tenant customization

This document exists because the current product has a strong backend workflow engine but an incomplete runtime intake experience. The current UI exposes only a generic request form, while the backend enforces hidden dependencies, lifecycle prerequisites, and request-specific business rules.

The result is predictable failure modes:
- users can create a request they cannot meaningfully complete
- submit can fail for requirements the UI never exposed
- request types are seeded, but not fully operational as intake products

This specification is intended to correct that architectural mismatch.

---

## 2. Design goals

### 2.1 Primary goals

- Keep onboarding time low for new tenants
- Make pre-built requests truly usable out of the box
- Preserve the Writer principle: complete traditional UX without AI
- Ensure submit failures are visible and understandable before action
- Support progressive customization rather than forcing design-time complexity on day 1

### 2.2 Non-goals

- Forcing every tenant admin to design request schemas during onboarding
- Replacing the current workflow engine
- Duplicating backend validation logic in frontend-only form rules
- Treating every request type as a full wizard regardless of complexity

---

## 3. Product principles

### 3.1 Packs are the onboarding default

New tenants should start from curated request packs, not a blank request-type catalog.

### 3.2 Blueprints are complete operational definitions

A pre-built request type is not just a code and a label. It must include:
- visible fields
- entity bindings
- dependency behavior
- draft vs submit validation semantics
- workflow defaults

### 3.3 Progressive customization

The tenant should be able to:
- go live quickly with a recommended baseline
- refine later without redesigning the entire request model first

### 3.4 Honest submit-readiness

The UI must not offer `Submit for Approval` when required business context is missing and impossible to provide from the current screen.

### 3.5 One runtime contract

Create, edit, save draft, and submit should all operate against the same request intake blueprint.

---

## 4. Core architecture

The solution uses 3 layers.

### 4.1 Layer 1: Request Pack

A curated bundle of operational request blueprints for a business domain.

A pack includes:
- pack metadata
- included request blueprints
- recommended workflows
- dependency graph
- activation rules
- default maturity level

Examples:
- Professional Services Core
- Internal IT & Access
- HR Operations
- Finance Controls

### 4.2 Layer 2: Request Blueprint

The operational definition of a single request type.

A request blueprint defines:
- business metadata
- intake fields
- related entity bindings
- custom field schema
- dependency rules
- draft rules
- submit rules
- workflow policy
- runtime rendering mode

### 4.3 Layer 3: Tenant Overrides

Optional tenant-specific adjustments applied after activation.

Overrides may change:
- field labels
- visibility
- requiredness
- workflow mapping
- SLA settings
- attachment settings
- terminology

Overrides should not require rebuilding a request from scratch.

---

## 5. Request Pack model

### 5.1 Pack metadata

Each pack should define:
- `code`
- `name`
- `description`
- `domain`
- `recommendedOrgProfiles`
- `maturityLevel`: `STARTER | STANDARD | ADVANCED`
- `activationDependencies`
- `includedBlueprintCodes`

### 5.2 Example pack: Professional Services Core

Includes:
- `CUSTOMER_ONBOARDING`
- `MSA_CREATION`
- `SOW_CREATION`
- `PROJECT_SETUP`
- `RESOURCE_ALLOCATION_BATCH`
- `RESOURCE_EXTENSION`
- `PROJECT_CLOSURE`

Pack-level dependency graph:
- `MSA_CREATION` depends on `CUSTOMER_ONBOARDING`
- `SOW_CREATION` depends on `MSA_CREATION`
- `PROJECT_SETUP` depends on `SOW_CREATION`
- `RESOURCE_ALLOCATION_BATCH` depends on `PROJECT_SETUP`

### 5.3 Activation behavior

Pack activation should:
- enable included blueprints for the tenant
- apply default workflows
- map workflow steps to role placeholders
- flag unresolved onboarding gaps
- make requests immediately usable where possible

Pack activation should not require full schema authoring.

---

## 6. Request Blueprint model

Each request blueprint should have 5 domains.

### 6.1 Business metadata

- `code`
- `name`
- `description`
- `category`
- `icon`
- `defaultPriority`
- `draftAllowed`
- `attachmentsAllowed`
- `maxAttachments`
- `maxAttachmentSizeMb`
- `visibilityScope`
- `retentionPolicy`

### 6.2 Common intake fields

Common fields are reusable across most request types.

Supported baseline set:
- `title`
- `description`
- `priority`
- `urgencyJustification`
- `neededBy`
- `onBehalfOf`
- `attachments`

Each common field must define:
- visible?
- editable?
- required for draft?
- required for submit?
- help text
- conditional visibility rules

### 6.3 Entity bindings

Entity bindings represent structured links to existing tenant records.

Supported initial entity types:
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

Each entity binding must define:
- entity type
- label
- visible?
- editable?
- required for draft?
- required for submit?
- single-select or multi-select
- data source query
- filtering rules
- display template
- auto-resolve behavior
- ambiguity resolution behavior

### 6.4 Custom fields

Custom fields are request-specific fields beyond common fields and entity bindings.

Supported input types:
- text
- long text
- number
- currency
- date
- datetime
- select
- multi-select
- checkbox
- radio
- user picker
- rich text
- table / line items (advanced phase)

Each custom field must define:
- `fieldKey`
- `label`
- `type`
- `placeholder`
- `defaultValue`
- `requiredForDraft`
- `requiredForSubmit`
- `validationRules`
- `visibilityRules`
- `helpText`
- `group`
- `displayOrder`

### 6.5 Submission rules

Submission rules must be explicit rather than hidden in code paths.

A blueprint can define:
- missing field blockers
- missing entity blockers
- conditional blockers
- warnings
- computed submit readiness explanations

Example:
- `urgencyJustification` required only if `priority = CRITICAL`
- `project` required for submit, optional for draft
- `contract` required only if `billingMode = FIXED_BID`

---

## 7. Dependency rule model

This is the missing piece in the current design.

### 7.1 Dependency types

A blueprint may depend on:
- prior request type completion
- related record existence
- specific status of a linked entity
- onboarding configuration presence

### 7.2 Request-to-request dependency contract

For dependencies on prior requests, define:
- `requiredRequestTypeCode`
- `requiredStatus` (usually `COMPLETED`)
- `resolutionMode`
- `userMustSelect`
- `autoResolveIfSingleMatch`
- `allowSubmitWithoutDependency`
- `blockCreateIfMissing`
- `blockingMessage`

### 7.3 Resolution modes

Supported modes:
- `AUTO_ONLY`
  - system silently resolves if one valid match exists
- `AUTO_OR_PICK`
  - auto-resolve when one valid match exists, prompt user if many
- `USER_MUST_SELECT`
  - always user-driven selection
- `HARD_BLOCK`
  - request cannot be submitted until prerequisite exists

### 7.4 Example: Resource Allocation

`RESOURCE_ALLOCATION_BATCH` should define:
- prerequisite request type: `PROJECT_SETUP`
- required status: `COMPLETED`
- resolution mode: `AUTO_OR_PICK`
- block submit if missing
- show prerequisite state in the intake UI

That means the user either:
- sees the linked completed setup request automatically
- selects one when ambiguous
- or sees why submit is unavailable

---

## 8. Draft vs submit validation model

Every requirement must declare whether it applies to draft, submit, or both.

### 8.1 Draft validation

Draft should support incomplete work.

Typical draft minimum:
- request type selected
- title present
- optionally one anchor entity if the request type requires context to exist

### 8.2 Submit validation

Submit is the full enforcement point.

Typical submit requirements:
- all submit-required common fields
- all submit-required entity bindings
- all submit-required custom fields
- dependency rules satisfied
- business rules satisfied
- workflow resolution possible

### 8.3 UX implications

- `Save Draft` can be enabled with partial completion
- `Submit for Approval` should display readiness blockers in advance
- backend remains source of truth, but frontend should not hide blockers

---

## 9. Runtime rendering model

Not all request types should use the same form container.

### 9.1 Rendering modes

Each blueprint should declare a preferred runtime surface:
- `MODAL`
- `DRAWER`
- `PAGE`
- `WIZARD`

### 9.2 Complexity guidance

Use:
- `MODAL` for simple requests with common fields only
- `DRAWER` for moderate requests with a few entity bindings
- `PAGE` for complex operations with many fields and attachments
- `WIZARD` for multi-step enterprise processes with dependencies and previews

### 9.3 Shared behavior across modes

All modes must support:
- save draft
- submit for approval
- clear readiness indicators
- field grouping
- dependency visibility
- consistent audit semantics

---

## 10. Onboarding activation flow

Onboarding should activate operational capability, not force design work.

### 10.1 Step 1: Choose org profile

Examples:
- Professional Services
- Managed Services
- Internal Corporate Operations
- Hybrid

### 10.2 Step 2: Choose request packs

Examples:
- Core operations only
- Core + finance
- Core + HR
- Core + access management

### 10.3 Step 3: Map role placeholders

The pack should reference role placeholders such as:
- Project Manager
- Practice Lead
- Finance Approver
- HR Approver
- Delivery Head

Tenant admins map these to roles created during onboarding.

### 10.4 Step 4: Confirm terminology

Examples:
- Client vs Customer
- Practice vs Department
- Resource Manager vs Delivery Manager

### 10.5 Step 5: Activate baseline

System should:
- enable blueprints
- bind workflows
- apply default policies
- generate a readiness summary

### 10.6 Step 6: Post-onboarding refinement

Optional, later:
- change labels
- add fields
- tighten validation
- modify workflow assignment
- enable additional packs

---

## 11. Maturity modes

### 11.1 Starter

Goal: fastest go-live

Characteristics:
- smallest request set
- minimal fields
- aggressive auto-resolution
- recommended workflows only
- few customization options visible

### 11.2 Standard

Goal: practical enterprise baseline

Characteristics:
- full core pack
- explicit entity bindings
- visible dependency status
- moderate customization

### 11.3 Advanced

Goal: full enterprise tailoring

Characteristics:
- full intake designer
- advanced dependency policy editing
- custom field groups
- multi-step request flows
- complex workflow branching

---

## 12. Admin authoring model

`Organization Admin > Request Types` should evolve into 3 layers.

### 12.1 Packs

For most admins:
- activate packs
- deactivate unused packs
- see coverage and readiness
- see which roles still need mapping

### 12.2 Blueprint editor

For standard admins:
- edit field visibility
- edit labels
- change requiredness
- adjust entity bindings
- review dependency settings
- preview runtime UI

### 12.3 Advanced designer

For mature tenants:
- create custom blueprints
- add advanced custom fields
- define dependency policies
- override submission rules
- choose runtime rendering mode

This keeps complexity away from tenants who do not need it.

---

## 13. Taxonomy correction

There is currently a mismatch between service-desk style categories and operational delivery request types.

The system should separate:
- `domain` - broad family of work
- `pack` - curated operational bundle
- `category` - admin grouping label
- `requestTypeCode` - concrete executable type

The current admin taxonomy should not be forced to carry runtime dependency meaning.

---

## 14. Migration strategy

### 14.1 Current state

Current seeded request types exist as metadata and workflow hooks, but they are not complete runtime blueprints.

### 14.2 Migration approach

Phase 1:
- define blueprint schema
- map seeded request types into blueprint records
- preserve existing codes and workflow semantics

Phase 2:
- create pack definitions that bundle existing seeded blueprints
- introduce onboarding pack activation

Phase 3:
- update runtime UI to render from blueprint definitions
- keep backend submission enforcement intact

Phase 4:
- expose standard-level blueprint editing in admin UI

Phase 5:
- expose advanced designer only after baseline runtime is stable

### 14.3 Initial migration candidates

Start with operational chain:
- `CUSTOMER_ONBOARDING`
- `MSA_CREATION`
- `SOW_CREATION`
- `PROJECT_SETUP`
- `RESOURCE_ALLOCATION_BATCH`

These already demonstrate dependency semantics and therefore provide the best test bed.

---

## 15. Success criteria

This architecture is successful if:
- a new tenant can activate a working operational baseline in onboarding
- pre-built requests are actually submittable in real business scenarios
- users only see fields relevant to the request they are creating
- dependencies are visible before submit failure
- admins can refine later without rebuilding from scratch
- advanced flexibility exists but is not forced on day 1

---

## 16. Immediate recommended follow-up artifacts

Before implementation, create:

1. **Pack catalog proposal**
   - which packs ship in v1
   - which blueprints each contains

2. **Blueprint schema proposal**
   - exact fields for common fields, entity bindings, custom fields, dependency rules

3. **Onboarding activation UX spec**
   - screens, role mapping flow, success/failure states

4. **Runtime request intake UX spec**
   - modal vs drawer vs page selection rules
   - draft vs submit readiness behavior

5. **Migration map**
   - seeded request type → blueprint definition → pack membership

---

## 17. Decision summary

Recommended product direction:
- make pre-built requests the primary onboarding path
- make those pre-built requests complete operational blueprints, not shallow seed data
- move advanced flexibility into post-activation blueprint customization
- model dependencies explicitly in the intake contract
- keep one consistent runtime contract for create, edit, save, and submit

This gives the best balance between:
- low onboarding effort
- high operational usability
- enterprise-grade flexibility
- long-term maintainability
