# Implementation Plan: Request Packs, Blueprints, and Onboarding Activation

**Document Created:** March 10, 2026  
**Status:** Draft Proposal - No Implementation Yet  
**Priority:** High  
**Scope:** Request runtime UX, request pack activation, blueprint architecture, onboarding integration

**Depends On:**
- [REQUEST_PACK_AND_INTAKE_BLUEPRINT_SPEC_2026-03-10.md](REQUEST_PACK_AND_INTAKE_BLUEPRINT_SPEC_2026-03-10.md)
- [PROFESSIONAL_SERVICES_CORE_PACK_SPEC_2026-03-10.md](PROFESSIONAL_SERVICES_CORE_PACK_SPEC_2026-03-10.md)
- [V1_REQUEST_BLUEPRINT_SCHEMA_SPEC_2026-03-10.md](V1_REQUEST_BLUEPRINT_SCHEMA_SPEC_2026-03-10.md)
- [ONBOARDING_REQUEST_PACK_ACTIVATION_UX_SPEC_2026-03-10.md](ONBOARDING_REQUEST_PACK_ACTIVATION_UX_SPEC_2026-03-10.md)

---

## 1. Objective

Implement a request-type-driven intake architecture that provides:
- fast onboarding through request pack activation
- usable pre-built operational requests
- explicit draft vs submit rules
- visible dependency handling
- progressive tenant customization

This implementation must replace the current gap where the backend enforces business rules that the runtime request UI does not expose.

---

## 2. Desired end state

After implementation:
- new tenants activate request packs during onboarding
- selected packs create tenant-ready request blueprints
- runtime request creation/editing renders from blueprint definitions
- submit-readiness is visible before action
- seeded operational request types become first-class blueprints
- admins can refine safely after activation

---

## 3. Scope boundaries

### In scope
- request pack data model
- request blueprint schema validation and storage
- onboarding activation flow for packs
- runtime intake renderer for first-class blueprints
- dependency visibility and resolution UX
- Professional Services Core pack implementation
- migration of first seeded operational request types

### Out of scope for first implementation
- general-purpose visual form builder for arbitrary blueprints
- full advanced tenant blueprint authoring UX
- all possible packs
- all historical seeded request types
- custom execution logic authored by tenants

---

## 4. Delivery strategy

Use a phased approach.

### Phase 1: Data model and schema foundations
### Phase 2: Pack activation in onboarding
### Phase 3: Runtime intake renderer for Professional Services Core
### Phase 4: Admin visibility and light customization
### Phase 5: Hardening, migration, and rollout

This keeps runtime correctness ahead of broad configurability.

---

## 5. Phase 1: Data model and schema foundations

### Goal
Introduce pack and blueprint storage/validation without yet replacing all runtime flows.

### Backend work
1. Add request pack persistence model
2. Add blueprint persistence model or blueprint JSON storage strategy
3. Add schema validation for blueprint payloads
4. Add tenant pack activation model
5. Add tenant placeholder mapping model
6. Add readiness snapshot model

### Recommended persistence concepts
- `RequestPack`
- `RequestBlueprint`
- `TenantRequestPackActivation`
- `TenantBlueprintOverride`
- `TenantRolePlaceholderMapping`
- `ActivationReadinessSnapshot`

### API work
Add backend APIs for:
- list available packs
- get pack details
- preview activation requirements
- activate pack for tenant
- fetch tenant active blueprints
- fetch blueprint by request type code

### Migration work
- map seeded request types into v1 blueprint schema
- preserve current request type codes
- preserve existing workflow semantics
- map lifecycle prerequisite chain into blueprint dependency rules

### Exit criteria
- blueprint schema is persisted and validated
- Professional Services Core pack exists in data form
- 5 wave-1 blueprints exist in stored blueprint form
- activation data models exist

---

## 6. Phase 2: Pack activation in onboarding

### Goal
Allow tenants to activate the Professional Services Core pack during onboarding Governance.

### Frontend work
1. add Request Pack Activation step to Governance phase
2. implement recommended pack screen
3. implement pack selection screen
4. implement role placeholder mapping UI
5. implement readiness validation review
6. implement activation summary and success state

### Backend work
1. activation preview endpoint
2. activation execution endpoint
3. readiness computation endpoint or inline activation preview contract
4. persistence of activation outputs

### Validation behavior
The onboarding flow must:
- distinguish ready / partially ready / blocked
- not treat expected operational dependency chains as onboarding failures
- preserve user mappings when validation fails

### Exit criteria
- tenant admin can activate Professional Services Core during onboarding
- pack activation persists role mappings and readiness snapshot
- onboarding completes without requiring full request authoring

---

## 7. Phase 3: Runtime intake renderer for Professional Services Core

### Goal
Replace the generic request create/edit experience for the first 5 operational blueprints.

### Frontend work
1. create a runtime intake renderer driven by blueprint schema
2. support common fields
3. support entity bindings
4. support custom fields
5. support dependency display and dependency selection
6. support draft vs submit readiness separation
7. support create, edit, save draft, submit, and returned-edit flows

### Rendering approach
- simple renderer abstraction, not a generic low-code platform
- runtime selects surface type based on blueprint `renderMode`

### Initial supported modes
- `DRAWER`
- `PAGE`

Recommendation:
- do not start with all 4 rendering modes in implementation
- map `MODAL` and `DRAWER` to shared compact renderer if needed
- focus on `PAGE` for complex Professional Services Core flows

### Backend work
1. request create/update endpoints must accept normalized blueprint-driven payloads
2. dependency resolution endpoints may be needed for prior-request selection
3. request type details endpoint should return blueprint runtime contract for the selected type

### Critical rule
Submit buttons must no longer appear “ready” when required entity bindings or dependencies are missing and not user-addressable.

### Exit criteria
- `CUSTOMER_ONBOARDING`
- `MSA_CREATION`
- `SOW_CREATION`
- `PROJECT_SETUP`
- `RESOURCE_ALLOCATION_BATCH`

all render through blueprint-driven intake rather than generic ad hoc fields.

---

## 8. Phase 4: Admin visibility and light customization

### Goal
Allow tenant admins to inspect and lightly refine activated blueprints without entering advanced authoring.

### Frontend work
Extend `Organization Admin > Request Types` to include:
- pack membership visibility
- blueprint overview
- editable labels and descriptions
- editable optional field visibility
- editable workflow mapping
- readiness diagnostics

### Backend work
Add APIs for:
- fetching tenant blueprint effective configuration
- saving safe overrides
- fetching pack activation readiness state after onboarding

### Constraints
Allow only safe overrides in initial release:
- labels
- help text
- visibility of optional fields
- default priority
- workflow mapping
- SLA profile selection

Do not allow in first admin release:
- changing dependency semantics
- removing mandatory entity bindings
- rewriting system blueprint structure

### Exit criteria
- admins can understand and lightly adjust the activated pack
- no raw JSON editing required

---

## 9. Phase 5: Hardening, migration, and rollout

### Goal
Stabilize the system for broader use and reduce legacy behavior.

### Workstreams
1. migrate remaining seeded request types incrementally
2. deprecate hidden hardcoded runtime assumptions where blueprint equivalents exist
3. add telemetry for submit blockers and draft abandonment
4. add test coverage for blueprint-driven flows
5. document tenant admin operations

### Legacy cleanup
Over time:
- hidden dependency maps in service logic should become derived from blueprint configuration or validated against it
- generic create modal should no longer be the default path for blueprint-backed request types

### Exit criteria
- Professional Services Core is stable in production-like testing
- blueprint runtime paths have strong automated coverage
- legacy generic request creation is limited to non-blueprint or fallback types only

---

## 10. Recommended implementation order by object

### 10.1 First objects to implement
- pack records
- blueprint records
- activation records
- role mapping records
- readiness snapshot records

### 10.2 First APIs to implement
- list packs
- get pack details
- preview activation
- activate pack
- list tenant effective blueprints
- get blueprint by request code

### 10.3 First runtime types to support
- common fields
- `project` binding
- `client` binding
- `contract` binding
- `priorRequest` binding
- simple custom fields

### 10.4 First dependency mode to support
- `AUTO_OR_PICK`

This is the most useful for Professional Services Core.

---

## 11. File-level implementation guidance

### Backend areas likely impacted
- request type services/controllers/routes
- onboarding governance services/controllers/routes
- request create/update/submit service path
- database schema / Prisma models
- seed data for packs and blueprints

### Frontend areas likely impacted
- Governance onboarding phase
- Requests page and request creation flow
- Request detail edit flow
- Organization Admin > Request Types
- supporting hooks, types, and query contracts

### Important principle
Do not try to retrofit all behavior into the current generic request modal.
Build a blueprint-aware intake layer and route the relevant request types through it.

---

## 12. Testing strategy

### Backend tests
- blueprint schema validation
- pack activation preview
- pack activation persistence
- role mapping validation
- dependency resolution behavior
- create/update/submit with blueprint-backed types

### Frontend tests
- onboarding pack selection flow
- role mapping flow
- readiness review screen
- blueprint-driven request rendering
- submit blocker visibility
- create draft / submit / edit / returned edit paths

### End-to-end scenarios
1. activate Professional Services Core during onboarding
2. create Customer Onboarding request
3. submit MSA Creation after dependency resolution
4. submit SOW Creation
5. create Project Setup
6. create Resource Allocation with visible dependency resolution

---

## 13. Risks and mitigations

### Risk 1: trying to build a full low-code platform
Mitigation:
- keep v1 blueprint schema narrow
- support only bounded field and dependency types

### Risk 2: onboarding becomes too heavy
Mitigation:
- only activate recommended packs
- defer advanced customization
- restrict onboarding choices to pack selection and role mapping

### Risk 3: runtime and backend rules drift
Mitigation:
- use one blueprint contract as shared source
- preserve backend as validation authority
- render readiness from the same schema concepts

### Risk 4: existing request types remain inconsistent
Mitigation:
- migrate the dependency chain first
- treat non-migrated types as legacy/fallback until converted

---

## 14. Acceptance criteria for the overall initiative

The initiative is complete enough for v1 when:
- Professional Services Core can be activated during onboarding
- the five wave-1 blueprints are usable without custom authoring
- the runtime UI exposes fields and dependencies needed for successful submit
- hidden backend-only blockers are materially reduced
- tenant admins can review and lightly refine the baseline after activation

---

## 15. Recommended immediate build sequence

### Sequence A - Foundations
1. persistence models
2. blueprint schema validator
3. seed Professional Services Core pack and 5 blueprints

### Sequence B - Onboarding
4. pack activation APIs
5. Governance phase UI for activation
6. readiness snapshot and summary

### Sequence C - Runtime
7. blueprint fetch contract
8. runtime intake renderer
9. wire five Professional Services Core request types to renderer

### Sequence D - Admin
10. request type admin visibility for active pack and blueprint overrides

### Sequence E - Hardening
11. tests, migration cleanup, rollout guardrails

---

## 16. Recommendation summary

Best implementation approach:
- start with one pack
- start with one blueprint schema
- start with one real dependency chain
- prove onboarding + runtime + admin coherence together
- avoid broad generalization until Professional Services Core works end to end

This is the lowest-risk path to fixing the current architectural mismatch without exploding onboarding effort or implementation scope.
