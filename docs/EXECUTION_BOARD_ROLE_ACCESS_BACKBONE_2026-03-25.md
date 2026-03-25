# Role And Access Backbone Execution Board

## Objective
Stabilize the tenant access backbone required for PMO go-live by making permissions canonical, runtime-safe, and administrable from the Organization Admin role screen.

## Ownership Model
- Product Owner: PMO process owner
- Business Owner: Organization Admin lead
- Backend Owner: API/RBAC engineer
- Frontend Owner: Tenant admin UI engineer
- QA Owner: Functional + regression QA

## Phase Board

| Phase | Scope | Owner | Estimate | Status |
| --- | --- | --- | --- | --- |
| Phase 1 | Canonical permission catalog and alias map | Backend Owner | 1 day | Completed |
| Phase 2 | Runtime auth hydration from relational + legacy permissions | Backend Owner | 0.5 day | Completed |
| Phase 3 | Role API contract alignment for permission keys | Backend Owner | 0.5 day | Completed |
| Phase 4 | Catalog endpoint for admin UI | Backend Owner | 0.25 day | Completed |
| Phase 5 | Role screen redesign, hidden level, grouped permissions, PMO preset | Frontend Owner | 1 day | Completed |
| Phase 6 | Compatibility cleanup across role consumers | Frontend Owner | 0.5 day | Completed |
| Phase 7 | Targeted regression tests | QA Owner | 0.5 day | Completed |
| Phase 8 | PMO system-role provisioning path | Backend Owner + Frontend Owner | 0.5 day | Completed |
| Phase 9 | PMO functional validation | Product Owner + QA Owner | 0.5 day | Completed |
| Phase 10 | PMO document taxonomy governance | Backend Owner + Frontend Owner | 0.5 day | Completed |
| Phase 11 | PMO operational exception blueprint | Backend Owner | 0.5 day | Completed |
| Phase 12 | Request pack activation path | Backend Owner | 0.25 day | Completed |
| Phase 13 | Live PMO smoke and upload error hardening | Backend Owner + QA Owner | 0.25 day | Completed |

## Deliverables
- Canonical permission registry in backend source
- Backward-compatible singular/plural alias handling
- Effective permission hydration in auth middleware
- Catalog-driven role design screen
- PMO blueprint preset
- PMO baseline system-role provisioning endpoint and admin action
- Tenant-admin document taxonomy policy with document-service enforcement
- Seeded PMO operational exception request blueprint in the Professional Services Core pack
- Tenant request-pack activation endpoint so activated-only request pickers can surface Professional Services Core blueprints
- Route-level upload error handling so document multipart validation failures return client-safe business errors instead of generic 500 responses
- Targeted backend and frontend test coverage
- Live API smoke validation against the seeded `newvision` tenant

## Exit Criteria
- A role can be created from business-readable permissions without using internal permission IDs.
- Effective access includes both relational permissions and valid legacy grants.
- Existing screens that still check legacy plural permission keys continue to function.
- PMO blueprint can be applied from the role designer, or provisioned directly as a tenant system role and then refined through assignment.
- PMO document categories can be centrally administered and are enforced on document writes.
- PMO exception intake exists as a governed request blueprint rather than an ad hoc side channel.
- Activated-only blueprint pickers can be made live for a tenant by activating the Professional Services Core request pack.
- Live smoke confirms the PMO exception blueprint is visible for `newvision`, exception requests can be created, and invalid document categories return `DOCUMENT_TAXONOMY_VIOLATION` rather than an internal error.

## Validation Snapshot
- `PRO_SERVICES_CORE` activation returned `200 ACTIVE` for tenant `newvision`.
- Activated-only blueprint listing included `PMO_OPERATIONAL_EXCEPTION`.
- Live PMO exception request creation returned `201` and generated request `NEW-2026-00027`.
- Invalid document upload returned `400 DOCUMENT_TAXONOMY_VIOLATION` after upload error handling was hardened.
