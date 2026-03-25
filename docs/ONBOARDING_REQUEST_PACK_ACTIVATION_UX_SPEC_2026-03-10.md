# Onboarding Request Pack Activation UX Specification

**Document Created:** March 10, 2026  
**Status:** Draft Proposal - No Implementation Yet  
**Depends On:**
- [REQUEST_PACK_AND_INTAKE_BLUEPRINT_SPEC_2026-03-10.md](REQUEST_PACK_AND_INTAKE_BLUEPRINT_SPEC_2026-03-10.md)
- [PROFESSIONAL_SERVICES_CORE_PACK_SPEC_2026-03-10.md](PROFESSIONAL_SERVICES_CORE_PACK_SPEC_2026-03-10.md)
- [V1_REQUEST_BLUEPRINT_SCHEMA_SPEC_2026-03-10.md](V1_REQUEST_BLUEPRINT_SCHEMA_SPEC_2026-03-10.md)

---

## 1. Purpose

This document defines the onboarding UX for activating request packs.

The goal is to ensure that a tenant admin can:
- choose an operational baseline quickly
- map required role placeholders once
- understand what becomes ready immediately
- understand what still needs follow-up
- activate a usable request baseline without entering a full request designer flow

This activation experience should be the bridge between:
- organization onboarding
- request pack architecture
- runtime request usability

---

## 2. UX principles

### 2.1 Activation, not authoring

Onboarding should activate a working baseline, not ask the admin to build request types.

### 2.2 Recommended by default

The system should pre-select a recommended pack based on organization profile.

### 2.3 Narrow decisions only

Onboarding should ask only for decisions that materially affect go-live readiness:
- which packs to activate
- which org roles map to pack placeholders
- whether to accept defaults

### 2.4 Honest readiness reporting

The system must distinguish:
- fully ready flows
- partially ready flows
- blocked flows

### 2.5 Defer advanced customization

Detailed blueprint design must not sit inside onboarding.

---

## 3. Placement in onboarding

This should live inside the Governance phase of onboarding, after:
- org structure is defined
- business roles are defined
- people setup exists

Recommended sequence:
1. Organization Identity
2. Org Structure
3. Roles & Permissions
4. People Setup
5. Governance
   - Delegations
   - Request Pack Activation
   - Workflow readiness summary

---

## 4. Activation flow overview

The activation UX should have 5 steps.

### Step 1: Operating model recommendation
### Step 2: Request pack selection
### Step 3: Role placeholder mapping
### Step 4: Readiness validation
### Step 5: Activation summary and confirm

This should be a guided flow, not a dense settings page.

---

## 5. Step 1: Operating model recommendation

### Purpose
Infer a recommended request pack set from the tenant’s business model.

### Inputs used
- industry
- organization type
- services vs internal operations emphasis
- onboarding data entered earlier

### UX behavior
Show a recommendation card such as:

- `Recommended for you: Professional Services Core`
- rationale: “Best fit for organizations managing customer delivery, project setup, and staffing.”

### User choices
- accept recommendation
- explore other available packs
- continue with recommended baseline

### Rules
- one recommended pack should be preselected
- other packs should remain optional and collapsed by default

---

## 6. Step 2: Request pack selection

### Purpose
Allow the tenant admin to enable one or more curated packs.

### UX layout
Each pack appears as a selectable card with:
- pack name
- short description
- maturity level
- included request count
- required role mappings count
- complexity badge
- “recommended” badge where applicable

### v1 pack presentation
#### Pack card fields
- name
- summary
- blueprints included
- who it is for
- dependencies covered
- estimated setup effort

### Example pack card
`Professional Services Core`
- Includes: Customer Onboarding, MSA Creation, SOW Creation, Project Setup, Resource Allocation
- Best for: customer delivery organizations
- Effort: Low
- Role mappings needed: 5

### Interaction rules
- default recommended pack selected
- user may add a secondary pack
- user should see warning if too many packs are added in onboarding

### v1 limit
Recommendation: max 2 packs selectable during onboarding in v1.

Reason:
- reduces cognitive load
- prevents activation sprawl before readiness is understood

---

## 7. Step 3: Role placeholder mapping

### Purpose
Map pack-defined role placeholders to the tenant’s already-created roles.

### Why this exists
Workflows must not rely on hardcoded users.
Packs must activate against tenant role structure created during onboarding.

### Example placeholders
For `Professional Services Core`:
- `ACCOUNT_OWNER`
- `DELIVERY_OWNER`
- `PROJECT_MANAGER`
- `PRACTICE_LEAD`
- `FINANCE_APPROVER`

### UX layout
A mapping table:

| Pack Placeholder | Description | Required? | Tenant Role Mapping | Status |
|------------------|-------------|-----------|---------------------|--------|
| PROJECT_MANAGER | Owns delivery execution | Yes | [dropdown] | Mapped |
| PRACTICE_LEAD | Approves staffing | Yes | [dropdown] | Missing |

### Mapping controls
Each row should allow:
- role dropdown populated from onboarding-created business roles
- optional fallback mapping where appropriate
- info tooltip describing the placeholder’s function

### Validation rules
- required placeholders must be mapped before full activation
- optional placeholders can be deferred
- if no roles exist for a required category, system should link back to Roles setup

### UX copy
Use operational wording, not technical workflow jargon.

For example:
- “Who should act as Project Manager in request workflows?”
not:
- “Bind placeholder PROJECT_MANAGER to role target.”

---

## 8. Step 4: Readiness validation

### Purpose
Show whether the selected packs can function immediately.

### Validation categories
#### A. Organization readiness
- required roles exist
- required users exist in mapped roles where needed
- required structure exists if pack depends on department/team/practice

#### B. Workflow readiness
- placeholder mappings completed
- workflow templates resolvable
- fallback approval behavior known

#### C. Data readiness
- some flows may depend on later-created business objects
- e.g. `RESOURCE_ALLOCATION_BATCH` depends on `PROJECT_SETUP` completion, which is expected later

This should not be treated as onboarding failure.

### Output states
Each blueprint within the selected pack should show one of:
- `Ready`
- `Partially Ready`
- `Blocked`

### Meaning
- `Ready` = can be created and submitted immediately once business context exists
- `Partially Ready` = pack activated, but one or more mappings or defaults need attention
- `Blocked` = cannot be meaningfully used until a required mapping/configuration is resolved

### Example
For `Professional Services Core` after role mapping:
- `CUSTOMER_ONBOARDING` → Ready
- `MSA_CREATION` → Ready
- `SOW_CREATION` → Ready
- `PROJECT_SETUP` → Ready
- `RESOURCE_ALLOCATION_BATCH` → Ready with dependency note

### Important note
Dependency chains like `PROJECT_SETUP` before `RESOURCE_ALLOCATION_BATCH` should not mark the pack blocked. They are normal operational sequencing, not onboarding defects.

---

## 9. Step 5: Activation summary and confirm

### Purpose
Make activation explicit and intelligible.

### Summary should show
- selected packs
- mapped placeholders
- blueprints activated
- blueprint readiness states
- unresolved optional items
- recommended next actions

### Example summary
- Pack activated: Professional Services Core
- Blueprints enabled: 5
- Fully ready: 4
- Partially ready: 1
- Required mappings completed: 5/5
- Recommended next step: create your first Customer Onboarding request

### Confirm action
Primary CTA:
- `Activate Pack`

Secondary CTA:
- `Save and finish later`

### Post-activation result
System should:
- persist pack activation
- create tenant blueprint bindings
- apply workflow mappings
- show success state
- offer navigation to first-use actions

---

## 10. Post-activation success state

The success screen should not just say “Completed.”
It should orient the tenant admin into the next operational step.

### Success content
- what was activated
- what became available in the tenant app
- what can be configured later
- first recommended next action

### Example CTAs
- `Review Request Types`
- `Open Workflows`
- `Create First Customer Onboarding Request`
- `Finish Onboarding`

Recommendation: one primary CTA only.

Best primary CTA for v1:
- `Finish Onboarding`

Then show secondary links for exploration.

---

## 11. Error and recovery states

### 11.1 Missing roles
If required role mappings cannot be completed:
- show blocking message
- link back to roles setup
- preserve current pack choices

### 11.2 No users available for mapped roles
If pack requires active users for certain roles:
- mark as partially ready
- allow activation if safe
- explain that workflows may not route until users are assigned

### 11.3 Workflow template resolution issue
If a pack workflow template cannot be instantiated:
- block activation for that blueprint
- do not silently auto-correct
- show plain-language explanation

### 11.4 Partial activation
In v1, avoid partial pack activation at blueprint granularity if possible.

Preferred behavior:
- activate the pack with clear readiness flags
- keep unresolved blueprints visible but marked as not fully ready

This is better than silently omitting some blueprints.

---

## 12. Data model outputs from activation

The activation flow should output:
- selected pack codes
- tenant role placeholder mappings
- tenant-enabled blueprint set
- default workflow bindings
- activation readiness snapshot

### Readiness snapshot should capture
- activation timestamp
- unresolved placeholders
- unresolved optional recommendations
- blueprint readiness summary

This snapshot should be visible later under Organization Admin.

---

## 13. Admin follow-up UX after onboarding

After onboarding, tenant admins should be able to revisit activation under:
- `Organization Admin > Request Packs`
- `Organization Admin > Request Types`

### Allowed post-onboarding actions
- activate another pack
- edit placeholder mappings
- inspect readiness summary
- refine blueprint fields later

### Not required in v1 onboarding
- full blueprint editing
- field-level schema authoring
- dependency rule authoring

---

## 14. UX copy recommendations

Use business-friendly language.

### Prefer
- “Request Packs”
- “Ready to use”
- “Requires role mapping”
- “Needs follow-up”
- “Recommended for your organization”

### Avoid
- “Schema”
- “Blueprint contract”
- “Dependency rule engine”
- “Placeholder binding” in user-facing UI

Technical terms belong in admin advanced views, not onboarding.

---

## 15. v1 screen sequence recommendation

### Screen A: Recommended operational setup
- recommendation card
- pack intro
- continue CTA

### Screen B: Select request packs
- pack cards
- recommended preselected
- lightweight compare

### Screen C: Map approval and operating roles
- mapping table
- required vs optional markers

### Screen D: Review readiness
- readiness statuses per blueprint
- unresolved items
- explanation of normal operational sequencing

### Screen E: Activate and finish
- activation summary
- confirm CTA
- success state

This is the leanest workable guided flow.

---

## 16. Success criteria

This UX is successful if:
- a tenant admin can activate the recommended pack in minutes
- role mappings are understandable without technical training
- the admin knows what is ready immediately and what is not
- no advanced request design work is required during onboarding
- downstream runtime request failures due to invisible setup gaps are materially reduced

---

## 17. Decision summary

Best v1 onboarding activation UX:
- recommend a pack automatically
- let the tenant confirm or adjust pack selection
- map role placeholders once
- validate readiness transparently
- activate a working baseline
- defer blueprint customization until after onboarding

This preserves fast onboarding while enabling a request-type-driven architecture underneath.

---

## 18. Next step

After this UX spec, the next document should be:
- implementation plan tying together:
  - pack storage
  - blueprint schema storage/validation
  - onboarding activation workflow
  - runtime renderer introduction
  - migration from current seeded request types
