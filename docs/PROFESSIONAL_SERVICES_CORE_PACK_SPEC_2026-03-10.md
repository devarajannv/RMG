# Professional Services Core Pack Specification

**Document Created:** March 10, 2026  
**Status:** Draft Proposal - No Implementation Yet  
**Depends On:** [REQUEST_PACK_AND_INTAKE_BLUEPRINT_SPEC_2026-03-10.md](REQUEST_PACK_AND_INTAKE_BLUEPRINT_SPEC_2026-03-10.md)

---

## 1. Purpose

This document defines the first shipping request pack for RMGaaS:

- `Professional Services Core`

It is intended to be the default operational pack for services organizations using RMGaaS for customer delivery, project setup, and resource allocation.

This pack is the best v1 starting point because:
- it matches the current seeded backend dependency chain
- it aligns with the product’s strongest resource/project/contract model
- it supports the real business path from customer intake to resource staffing
- it provides immediate Writer value without requiring advanced customization on day 1

---

## 2. Pack goals

The pack should allow a newly onboarded tenant to do the following with minimal setup:

1. onboard a customer/opportunity context
2. establish commercial agreement context
3. define the statement of work context
4. create project setup context
5. request resource allocation against a prepared project

The pack should favor:
- rapid activation
- strong defaults
- visible dependencies
- progressive refinement later

---

## 3. Included blueprints

The pack should ship with these first-class request blueprints.

### 3.1 Wave 1 mandatory blueprints

1. `CUSTOMER_ONBOARDING`
2. `MSA_CREATION`
3. `SOW_CREATION`
4. `PROJECT_SETUP`
5. `RESOURCE_ALLOCATION_BATCH`

### 3.2 Wave 2 optional blueprints

6. `RESOURCE_EXTENSION`
7. `PROJECT_CLOSURE`

Wave 2 should not block the first pack launch.

---

## 4. Pack dependency chain

The operational chain should be explicit:

- `CUSTOMER_ONBOARDING` → enables `MSA_CREATION`
- `MSA_CREATION` → enables `SOW_CREATION`
- `SOW_CREATION` → enables `PROJECT_SETUP`
- `PROJECT_SETUP` → enables `RESOURCE_ALLOCATION_BATCH`

This chain should be surfaced in both:
- onboarding activation summary
- runtime request intake readiness

Dependencies must not remain backend-only hidden rules.

---

## 5. Pack activation prerequisites

The pack should require the following onboarding foundations before activation.

### 5.1 Required organization foundations

- tenant identity configured
- org structure minimally available
- users available for admin and approver mapping
- business roles configured
- at least one delivery role and one approval role available

### 5.2 Required placeholder mappings

The pack should define these role placeholders:

- `ACCOUNT_OWNER`
- `DELIVERY_OWNER`
- `PROJECT_MANAGER`
- `PRACTICE_LEAD`
- `FINANCE_APPROVER`
- `SALES_APPROVER` (optional, depending on org)
- `PMO_APPROVER` (optional, depending on org)

### 5.3 Activation fallback rules

If a placeholder is not mapped:
- the pack may still activate
- affected request blueprints should be flagged as partially ready
- onboarding summary must show which flows are not fully submittable yet

---

## 6. Runtime design rules for this pack

### 6.1 General runtime behavior

All blueprints in this pack must support:
- `Save Draft`
- `Submit for Approval`
- visible readiness blockers before submit
- dependency visibility
- request detail editing for `DRAFT` and `RETURNED`

### 6.2 Rendering modes

Recommended default rendering modes:

- `CUSTOMER_ONBOARDING` → `DRAWER`
- `MSA_CREATION` → `DRAWER`
- `SOW_CREATION` → `PAGE`
- `PROJECT_SETUP` → `PAGE`
- `RESOURCE_ALLOCATION_BATCH` → `PAGE`

Reason:
- the first two are simpler and early in the chain
- the latter three have higher dependency and entity complexity

---

## 7. Blueprint definitions

---

## 7.1 CUSTOMER_ONBOARDING

### Purpose
Create or formalize customer context required for downstream commercial and delivery setup.

### Business intent
This request establishes the customer record and minimum operational details needed before MSA creation.

### Common fields
- title: required for draft and submit
- description: optional for draft and submit
- priority: visible, default `MEDIUM`
- urgency justification: conditional on `CRITICAL`
- needed by: optional

### Entity bindings
- `client`
  - visible: yes
  - required for draft: no
  - required for submit: no if creating a new client inline, yes if selecting existing
  - behavior: can create new client context or link existing

### Custom fields
Recommended fields:
- customer legal name
- customer display name
- customer type
- billing country
- primary contact name
- primary contact email
- engagement owner
- expected start window
- notes

### Dependency rules
- none

### Workflow policy
- requires approval: yes
- default workflow: account / sales / delivery approval
- draft allowed: yes

### Submit readiness rules
Submit blocked unless:
- legal name exists
- primary contact exists
- engagement owner is identified

---

## 7.2 MSA_CREATION

### Purpose
Initiate master agreement setup for a customer.

### Business intent
Create the commercial agreement context that downstream SOW and project setup depend on.

### Common fields
- title: required for draft and submit
- description: optional
- priority: visible
- urgency justification: conditional
- needed by: recommended for submit

### Entity bindings
- `client`
  - visible: yes
  - required for draft: recommended
  - required for submit: yes
- `priorRequest`
  - type: `CUSTOMER_ONBOARDING`
  - visible: system section, not freeform custom field
  - required for submit: yes
  - resolution mode: `AUTO_OR_PICK`

### Custom fields
Recommended fields:
- msa type
- contracting entity
- commercial owner
- effective date target
- renewal model
- governing region
- special terms flag

### Dependency rules
- requires completed `CUSTOMER_ONBOARDING`
- auto-resolve if single completed onboarding request exists for selected client
- prompt if multiple exist
- block submit if none exist

### Workflow policy
- requires approval: yes
- default workflow: sales + finance + legal/delegated commercial approver

### Submit readiness rules
Submit blocked unless:
- client selected
- completed onboarding dependency resolved
- contracting entity provided
- commercial owner provided

---

## 7.3 SOW_CREATION

### Purpose
Define the scoped commercial delivery statement tied to an MSA.

### Business intent
Provide the statement of work context required before project setup.

### Common fields
- title: required
- description: recommended
- priority: visible
- urgency justification: conditional
- needed by: visible

### Entity bindings
- `client`
  - required for submit: yes
- `contract`
  - represents the MSA context
  - required for submit: yes
- `priorRequest`
  - type: `MSA_CREATION`
  - required for submit: yes
  - resolution mode: `AUTO_OR_PICK`

### Custom fields
Recommended fields:
- sow reference
- service line
- delivery model
- billing model
- target start date
- target end date
- commercial summary
- scope summary
- assumptions
- dependency notes

### Dependency rules
- requires completed `MSA_CREATION`
- submit blocked if no valid MSA creation request is linked or resolvable

### Workflow policy
- requires approval: yes
- default workflow: delivery + finance + commercial approver

### Submit readiness rules
Submit blocked unless:
- client selected
- contract/MSA context selected
- MSA dependency resolved
- target start date present
- service line present

---

## 7.4 PROJECT_SETUP

### Purpose
Create the project delivery context after commercial approval is in place.

### Business intent
Establish the project shell, ownership, delivery model, and internal structure required before staffing.

### Common fields
- title: required
- description: optional
- priority: visible
- needed by: visible

### Entity bindings
- `client`
  - required for submit: yes
- `contract`
  - required for submit: yes
- `project`
  - create-new behavior expected at submit outcome, not as pre-existing selection
- `priorRequest`
  - type: `SOW_CREATION`
  - required for submit: yes
  - resolution mode: `AUTO_OR_PICK`

### Custom fields
Recommended fields:
- proposed project code
- project name
- delivery owner
- project manager
- practice / delivery unit
- cost center
- billability model
- margin tracking required?
- target start date
- reporting cadence

### Dependency rules
- requires completed `SOW_CREATION`
- block submit if no valid SOW dependency resolved

### Workflow policy
- requires approval: yes
- default workflow: delivery owner + finance/PMO

### Submit readiness rules
Submit blocked unless:
- client selected
- contract selected
- SOW dependency resolved
- project manager identified
- delivery owner identified
- target start date identified

---

## 7.5 RESOURCE_ALLOCATION_BATCH

### Purpose
Request one or more resource allocations against a prepared project.

### Business intent
Operational staffing request following project setup.

### Common fields
- title: required
- description: optional but encouraged
- priority: visible
- urgency justification: conditional on `CRITICAL`
- needed by: visible

### Entity bindings
- `project`
  - visible: yes
  - required for draft: recommended
  - required for submit: yes
- `client`
  - derived from project when possible
- `contract`
  - derived from project/setup when possible
- `priorRequest`
  - type: `PROJECT_SETUP`
  - required for submit: yes
  - resolution mode: `AUTO_OR_PICK`

### Custom fields
Recommended fields:
- allocation mode (single/batch)
- requested start date
- requested end date
- role or skill requirement
- practice / capability
- headcount count
- allocation percentage
- location preference
- billable / non-billable
- justification / business driver

### Dependency rules
- requires completed `PROJECT_SETUP`
- auto-resolve project setup if exactly one completed setup exists for selected project
- prompt user when multiple valid completed setup requests exist
- block submit when no valid setup request exists

### Workflow policy
- requires approval: yes
- default workflow: project manager + practice lead + optional finance review for billable impact

### Submit readiness rules
Submit blocked unless:
- project selected
- project setup dependency resolved
- requested start date present
- requested role/skill present
- headcount or batch rows present
- urgency justification present if `CRITICAL`

### Special UX note
This blueprint is the clearest proof case for the new intake model. It must not use the current generic minimal modal pattern in final form.

---

## 8. Pack-level defaults

### 8.1 Draft policy

All v1 blueprints in this pack should allow drafts.

### 8.2 Attachment policy

Default:
- attachments allowed for all blueprints
- attachment requirements remain optional in v1 unless legally mandatory

### 8.3 Approval policy

Default:
- approval required for all blueprints in this pack
- auto-approval should not be default behavior for Professional Services Core

### 8.4 SLA policy

Default:
- medium-priority SLA profile per blueprint
- tenant can override later

---

## 9. Onboarding activation UX for this pack

### 9.1 Activation entry

During onboarding governance phase, admin sees:
- recommended pack: `Professional Services Core`
- short explanation of what it enables
- expected role mappings required

### 9.2 Role mapping step

Admin maps placeholders to existing business roles:
- `ACCOUNT_OWNER`
- `DELIVERY_OWNER`
- `PROJECT_MANAGER`
- `PRACTICE_LEAD`
- `FINANCE_APPROVER`

Optional placeholders can be deferred.

### 9.3 Readiness validation step

System validates:
- mapped placeholders exist
- at least one user exists in critical mapped roles where needed
- onboarding governance baseline is sufficient

### 9.4 Activation summary

System should show:
- pack activated: yes/no
- blueprints ready immediately
- blueprints partially ready
- unresolved mappings
- recommended next actions

Example summary:
- 5 blueprints enabled
- 3 fully ready
- 2 require final approver mapping

---

## 10. Pack-specific tenant overrides allowed in v1

Allowed:
- rename blueprint labels
- adjust descriptions
- change default priority
- toggle optional fields
- adjust approver role mappings
- adjust SLA values

Not allowed in initial v1 standard mode:
- remove mandatory dependency chain semantics
- completely rewrite runtime mode
- replace core entity bindings with arbitrary unrelated ones

These restrictions keep the pack stable and operational.

---

## 11. Success criteria for this pack

The pack is successful if a newly onboarded professional services tenant can:
- activate the pack during onboarding
- create and submit the first request in the chain without custom design work
- understand why downstream requests are blocked when prerequisites do not exist
- staff a project through `RESOURCE_ALLOCATION_BATCH` without hidden backend-only blockers
- refine labels and policies later without breaking the default chain

---

## 12. Immediate follow-up

After this pack spec, the next design artifact should be:

1. **v1 Blueprint Schema Definition**
   - exact JSON / typed contract structure
   - common field config format
   - entity binding config format
   - dependency rule config format

Then:
2. **Onboarding activation UX specification**
3. **Runtime request intake UX specification for Professional Services Core**

---

## 13. Recommendation summary

Ship `Professional Services Core` first because it:
- fits the existing domain model best
- uses already-seeded dependency logic
- exposes the exact design flaws needing correction
- delivers the highest operational value for the current product

This should be the reference pack used to prove the request blueprint architecture before wider rollout.
