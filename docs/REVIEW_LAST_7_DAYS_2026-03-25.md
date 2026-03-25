# Review: Last 7 Days of Updates

Date: 2026-03-25
Scope: Conversation-driven updates, recent documentation, recent committed work, and current in-progress worktree threads
Status: Review snapshot

## 1. Executive Summary

Over the last 7 days, the work has expanded from a narrow PeopleStrong integration discussion into a broader product-structure and implementation-readiness review across six connected threads:

1. PeopleStrong as system-of-record for employee base data
2. NewVision internal tenant operating mode versus external tenant bootstrap mode
3. Tenant app information architecture and Organization Admin migration
4. Request pack and request blueprint runtime architecture
5. Workbook and CSV-based tenant seeding for NewVision
6. Frontend QA, E2E coverage, and current implementation/remediation work

The main conclusion is that the repository now has strong planning coverage and substantial in-progress implementation activity, but several major threads remain open at once and need explicit sequencing. The highest immediate risk is not lack of ideas. It is parallel drift across architecture, frontend behavior, seed data, security hardening, and request runtime work without one consolidated operational review.

## 2. Evidence Reviewed

This review is based on:

- architecture and alignment sources in [ARCHITECTURE.md](/home/devarajan/RMG/RMG/ARCHITECTURE.md) and [ALIGNMENT_TRACKER.md](/home/devarajan/RMG/RMG/ALIGNMENT_TRACKER.md)
- current integration strategy in [.context/INTEGRATIONS.md](/home/devarajan/RMG/RMG/.context/INTEGRATIONS.md)
- recent PeopleStrong design and implementation planning docs under [docs](/home/devarajan/RMG/RMG/docs)
- operating-model and IA docs created on 2026-03-24
- defect tracking in [docs/FRONTEND_DEFECT_LOG_2026-03-16_14-08-08_UTC.md](/home/devarajan/RMG/RMG/docs/FRONTEND_DEFECT_LOG_2026-03-16_14-08-08_UTC.md)
- recent git history for the last 7 days
- current modified and untracked worktree files across backend, frontend, infrastructure, docs, tests, and seed inputs

## 3. What Is Firmly Decided

### 3.1 PeopleStrong scope

- Phase 1 is unidirectional only: PeopleStrong to RMG
- PeopleStrong is the upstream source for employee base data
- RMG remains the source of truth for operational and commercial entities such as allocations, projects, customers, contracts, and invoicing
- Schema should not mutate dynamically at runtime based on PeopleStrong payloads

This is captured in [.context/INTEGRATIONS.md](/home/devarajan/RMG/RMG/.context/INTEGRATIONS.md) and expanded in [docs/PEOPLESTRONG_INTEGRATION_DESIGN_2026-03-24.md](/home/devarajan/RMG/RMG/docs/PEOPLESTRONG_INTEGRATION_DESIGN_2026-03-24.md).

### 3.2 Public-doc constraint for PeopleStrong events

Public PeopleStrong documentation does not expose a stable named webhook event list such as employee.created or employee.updated. The documented outbound model is domain-oriented and incremental, not a public vendor event catalog.

That led to a key integration decision:

- accept vendor/domain delivery contracts from PeopleStrong
- map them into RMG internal canonical events

Recommended canonical events:

- employee.upsert
- employee.transfer
- employee.promotion
- employee.confirmation
- employee.exit
- employee.leave.recorded

This is documented in [docs/PEOPLESTRONG_EVENT_CONTRACT_RECOMMENDATION_2026-03-24.md](/home/devarajan/RMG/RMG/docs/PEOPLESTRONG_EVENT_CONTRACT_RECOMMENDATION_2026-03-24.md).

### 3.3 Tenant-app IA direction

The tenant app is now clearly separated by responsibility scope:

- My Settings for personal controls
- Organization Admin for tenant-wide administration

That approved direction is documented in [docs/INFORMATION_ARCHITECTURE_DECISION_2026-03-10.md](/home/devarajan/RMG/RMG/docs/INFORMATION_ARCHITECTURE_DECISION_2026-03-10.md), and several current frontend changes are aligned to it.

### 3.4 NewVision versus external tenant model

The product should support two operating modes:

- NewVision internal tenant: direct admin-first mode, no forced onboarding
- external customer tenant: guided onboarding first, then steady-state admin surfaces

This is documented in [docs/TARGET_OPERATING_MODEL_NEWVISION_VS_EXTERNAL_TENANTS_2026-03-24.md](/home/devarajan/RMG/RMG/docs/TARGET_OPERATING_MODEL_NEWVISION_VS_EXTERNAL_TENANTS_2026-03-24.md) and [docs/IA_MIGRATION_MAP_NEWVISION_EXTERNAL_TENANTS_2026-03-24.md](/home/devarajan/RMG/RMG/docs/IA_MIGRATION_MAP_NEWVISION_EXTERNAL_TENANTS_2026-03-24.md).

## 4. Major Updates By Thread

### 4.1 PeopleStrong integration planning is now well specified

The planning set for PeopleStrong is materially complete at the design level:

- source-of-truth matrix in [docs/PEOPLESTRONG_SOURCE_OF_TRUTH_MATRIX_2026-03-24.md](/home/devarajan/RMG/RMG/docs/PEOPLESTRONG_SOURCE_OF_TRUTH_MATRIX_2026-03-24.md)
- main architecture and sync design in [docs/PEOPLESTRONG_INTEGRATION_DESIGN_2026-03-24.md](/home/devarajan/RMG/RMG/docs/PEOPLESTRONG_INTEGRATION_DESIGN_2026-03-24.md)
- backend implementation plan in [docs/IMPLEMENTATION_PLAN_PEOPLESTRONG_BACKEND_2026-03-24.md](/home/devarajan/RMG/RMG/docs/IMPLEMENTATION_PLAN_PEOPLESTRONG_BACKEND_2026-03-24.md)
- frontend UX plan in [docs/IMPLEMENTATION_PLAN_PEOPLESTRONG_FRONTEND_UX_2026-03-24.md](/home/devarajan/RMG/RMG/docs/IMPLEMENTATION_PLAN_PEOPLESTRONG_FRONTEND_UX_2026-03-24.md)
- backend execution checklist in [docs/TASK_BREAKDOWN_PEOPLESTRONG_BACKEND_SCHEMA_ENDPOINTS_2026-03-24.md](/home/devarajan/RMG/RMG/docs/TASK_BREAKDOWN_PEOPLESTRONG_BACKEND_SCHEMA_ENDPOINTS_2026-03-24.md)
- frontend route checklist in [docs/CHECKLIST_PEOPLESTRONG_FRONTEND_ROUTES_2026-03-24.md](/home/devarajan/RMG/RMG/docs/CHECKLIST_PEOPLESTRONG_FRONTEND_ROUTES_2026-03-24.md)

Current assessment:

- design maturity is high
- implementation status is still effectively zero in the actual product code for PeopleStrong-specific modules
- this thread is ready for sequencing, not more architectural discovery

### 4.2 NewVision internal mode and admin IA were clarified

The last 7 days produced a more realistic operating model for the tenant app:

- NewVision should not be trapped behind a first-run onboarding gate
- onboarding should be treated as a guided assistant and orchestration layer
- durable admin screens should own the underlying data domains

This is one of the most important product-level clarifications made this week because it avoids wasting existing onboarding work while fixing the mismatch between NewVision’s real operating needs and the original setup-only assumption.

Current assessment:

- architecture direction is clearer than before
- frontend route and page cleanup is actively moving toward this model
- some admin destinations still rely on onboarding-phase implementations rather than durable screens

### 4.3 Request packs and request blueprints moved from concept toward implementation

There is now a visible bridge between the older workflow/request-type system and a newer blueprint-driven intake model.

Planning context:

- [docs/IMPLEMENTATION_PLAN_REQUEST_PACKS_AND_BLUEPRINTS_2026-03-10.md](/home/devarajan/RMG/RMG/docs/IMPLEMENTATION_PLAN_REQUEST_PACKS_AND_BLUEPRINTS_2026-03-10.md)
- [docs/REQUEST_FLOW_SYSTEM.md](/home/devarajan/RMG/RMG/docs/REQUEST_FLOW_SYSTEM.md)

Current in-progress code indicates actual implementation work is underway:

- new Prisma migration for request packs and blueprints in [apps/api/prisma/migrations/20260310143337_add_request_packs_and_blueprints/migration.sql](/home/devarajan/RMG/RMG/apps/api/prisma/migrations/20260310143337_add_request_packs_and_blueprints/migration.sql)
- seed script in [apps/api/prisma/seed-request-blueprints.ts](/home/devarajan/RMG/RMG/apps/api/prisma/seed-request-blueprints.ts)
- frontend request blueprint types in [apps/frontend/src/types/request-types.ts](/home/devarajan/RMG/RMG/apps/frontend/src/types/request-types.ts)
- runtime request blueprint lookup in [apps/frontend/src/hooks/useRequestTypes.ts](/home/devarajan/RMG/RMG/apps/frontend/src/hooks/useRequestTypes.ts)
- substantial blueprint-driven request create flow work in [apps/frontend/src/pages/RequestsPage.tsx](/home/devarajan/RMG/RMG/apps/frontend/src/pages/RequestsPage.tsx)
- request detail support for draft-edit-return-submit behavior in [apps/frontend/src/pages/RequestDetailPage.tsx](/home/devarajan/RMG/RMG/apps/frontend/src/pages/RequestDetailPage.tsx)

Current assessment:

- this is no longer a documentation-only thread
- the frontend is moving toward runtime-defined request intake
- backend persistence and seeding scaffolding exists in the worktree, but this thread needs coordinated backend, seed, and E2E review before it is considered stable

### 4.4 Workbook and CSV tenant seeding became a real bootstrap option

The operational seed plan for NewVision moved from idea to executable direction.

Planning document:

- [docs/IMPLEMENTATION_PLAN_RMG_WORKBOOK_SEED_2026-03-24.md](/home/devarajan/RMG/RMG/docs/IMPLEMENTATION_PLAN_RMG_WORKBOOK_SEED_2026-03-24.md)

New seed inputs and code now exist in the worktree:

- [RMG_Master_File_My Copy.csv](/home/devarajan/RMG/RMG/RMG_Master_File_My%20Copy.csv)
- [RMG_Master_File_My Copy.xlsm](/home/devarajan/RMG/RMG/RMG_Master_File_My%20Copy.xlsm)
- [Porjects Master.csv](/home/devarajan/RMG/RMG/Porjects%20Master.csv)
- [apps/api/prisma/seed-rmg-csv.ts](/home/devarajan/RMG/RMG/apps/api/prisma/seed-rmg-csv.ts)

The seed script is attempting to bootstrap:

- tenant
- practices
- locations
- grade bands
- departments and teams
- business roles
- skills
- clients
- projects
- resources
- manager links
- resource-role assignments
- team memberships
- allocations

Current assessment:

- this is strategically important because it supports the NewVision internal-mode decision
- however, this thread now needs serious validation around field quality, duplicate handling, naming normalization, business plausibility, and downstream KPI correctness

### 4.5 Frontend QA and E2E coverage advanced, but open defects remain

Committed git history for the last 7 days shows one concrete commit:

- test: add screen-level e2e coverage for login dashboard and requests

Relevant files include E2E suites and the updated defect log.

The defect log now covers four screens and records three notable product outcomes:

- DEF-LOGIN-001: missing forgot-password route
- DEF-LOGIN-002: missing register or request-access route
- DEF-REQUEST-001: request detail sidebar shows Unknown Type and v0 for new drafts
- DEF-DASHBOARD-001: implausible dashboard KPI issue, now marked resolved

Source: [docs/FRONTEND_DEFECT_LOG_2026-03-16_14-08-08_UTC.md](/home/devarajan/RMG/RMG/docs/FRONTEND_DEFECT_LOG_2026-03-16_14-08-08_UTC.md)

Current assessment:

- QA coverage is becoming useful and product-facing rather than purely technical
- at least two auth-navigation gaps and one request-detail metadata defect are still open
- the dashboard KPI issue is a useful warning that seed data and metric logic must be reviewed together, not independently

### 4.6 Security and infrastructure hardening are actively being folded into the product

The repository already contains earlier security implementation plans that claim closure of prior audits:

- [docs/IMPLEMENTATION_PLAN_SECURITY_REMEDIATION_2026-02-19_105522.md](/home/devarajan/RMG/RMG/docs/IMPLEMENTATION_PLAN_SECURITY_REMEDIATION_2026-02-19_105522.md)
- [docs/IMPLEMENTATION_PLAN_ENTERPRISE_SECURITY_2026-02-20_141909.md](/home/devarajan/RMG/RMG/docs/IMPLEMENTATION_PLAN_ENTERPRISE_SECURITY_2026-02-20_141909.md)

Current worktree changes show that these themes are still being actively enforced in runtime code and deployment config:

- CSRF token handling in [apps/frontend/src/lib/api.ts](/home/devarajan/RMG/RMG/apps/frontend/src/lib/api.ts)
- token persistence reduction in [apps/frontend/src/stores/authStore.ts](/home/devarajan/RMG/RMG/apps/frontend/src/stores/authStore.ts)
- cookie-aware permissions in [apps/frontend/src/hooks/usePermissions.ts](/home/devarajan/RMG/RMG/apps/frontend/src/hooks/usePermissions.ts)
- WebSocket auth moved out of URL query strings in [apps/frontend/src/hooks/useWebSocket.ts](/home/devarajan/RMG/RMG/apps/frontend/src/hooks/useWebSocket.ts)
- production and staging compose hardening in [docker-compose.prod.yml](/home/devarajan/RMG/RMG/docker-compose.prod.yml), [docker-compose.staging.yml](/home/devarajan/RMG/RMG/docker-compose.staging.yml), and [docker-compose.yml](/home/devarajan/RMG/RMG/docker-compose.yml)
- nginx hardening in [docker/nginx.frontend.conf](/home/devarajan/RMG/RMG/docker/nginx.frontend.conf) and [docker/nginx.prod.conf](/home/devarajan/RMG/RMG/docker/nginx.prod.conf)
- dependency hygiene setup in [.github/dependabot.yml](/home/devarajan/RMG/RMG/.github/dependabot.yml)

Current assessment:

- this stream is materially active in code, not just in docs
- it overlaps with auth behavior, E2E setup, and frontend session handling, so it should be reviewed as a cross-cutting change set rather than as isolated config edits

## 5. Committed Progress Versus In-Progress Work

### 5.1 Committed progress in the last 7 days

Observed committed progress is relatively narrow but useful:

- added screen-level E2E coverage around login, dashboard, and requests
- updated defect log with confirmed findings and one resolved dashboard issue

This means the git history understates the total amount of active work because much of the current effort is still uncommitted.

### 5.2 In-progress uncommitted work now spans multiple domains

The current worktree shows simultaneous in-flight changes across:

- request packs and blueprints
- request create and request detail runtime behavior
- settings and Organization Admin IA split
- dialog prevent-dismiss behavior on many admin and CRUD forms
- cookie and CSRF-aware auth flow
- WebSocket auth handling
- docker and nginx hardening
- E2E auth-state storage and setup
- workbook and CSV seeding scripts

This is a high-value but high-risk state because several of these threads interact directly.

Examples of coupling:

- blueprint-driven requests interact with request detail UX, seed data, workflow routing, and E2E coverage
- cookie auth changes interact with permissions, frontend API behavior, WebSocket auth, and Playwright auth state
- NewVision admin IA interacts with settings-page changes, onboarding reuse, and future PeopleStrong admin surfaces

## 6. Open Threads Requiring Detailed Review

### 6.1 PeopleStrong is ready for implementation sequencing

Open question is no longer architecture. It is execution order.

Needs review on:

- exact backend module boundaries
- persistence model for raw delivery logs, canonical events, sync state, and exceptions
- admin monitoring surfaces versus first-pass MVP scope
- relationship between PeopleStrong sync and workbook seed for NewVision bootstrap

### 6.2 NewVision bootstrap path needs one approved operational story

There are now two bootstrap mechanisms in play:

- workbook or CSV import-based seeding
- future PeopleStrong inbound synchronization

These cannot remain parallel ideas indefinitely. The product needs one approved rule for how a NewVision tenant reaches first operational state.

Needs review on:

- which source initializes people and org structure first
- whether workbook seed is a one-time bootstrap only or a repeatable reconciliation tool
- what remains editable after bootstrap

### 6.3 Request blueprint runtime needs one coherent acceptance bar

This thread is large and product-critical.

Needs review on:

- which request types are truly in Phase 1
- whether current frontend runtime logic matches the intended backend contract
- attachment behavior and create-then-submit behavior
- handling of returned requests, dependency blockers, and versioning
- impact on current workflow builder and seeded request types

### 6.4 Seed data quality must be treated as product logic, not import plumbing

The resolved dashboard KPI defect already showed that mathematically valid values can still be operationally implausible.

Needs review on:

- normalization rules for roles, practices, clients, and project statuses
- duplicate and ghost-resource handling
- manager-link correctness
- benchmark expectations for utilization, bench, active projects, and active allocations after seed

### 6.5 Security hardening needs integrated regression review

The current security-related work is meaningful, but it changes user-facing behavior.

Needs review on:

- login and token refresh under cookie-supported auth
- WebSocket reconnect and auth handshake stability
- frontend uploads under CSRF protection
- staging and production deploy assumptions after compose and nginx hardening

## 7. Current Risks

### 7.1 Too many high-impact threads are moving together

Request runtime, auth behavior, admin IA, data seeding, and security are all active simultaneously. That increases the chance of hidden regressions and invalid assumptions between threads.

### 7.2 Planning is ahead of implementation in some areas and behind implementation in others

PeopleStrong is strongly documented but not yet built.
Request blueprints and seed import now have active code movement that may outpace the final operational review.

### 7.3 Product credibility still depends on foundational data quality

Several major features only become trustworthy when foundational org, people, project, and allocation data are correct. This remains aligned with the core architecture warning that organization onboarding and baseline data are foundational blockers.

## 8. Recommended Immediate Priority Order

### Priority 1

Stabilize the current in-progress request blueprint and request-detail change set.

Reason:

- this touches request creation, submission, attachments, dependency handling, and draft lifecycle
- it is already deep in the worktree
- it is easy for this thread to drift without an explicit review gate

### Priority 2

Validate workbook and CSV seeding end to end against business-plausible dashboard and resource metrics.

Reason:

- NewVision internal mode depends on a credible bootstrap path
- seed quality directly affects dashboard trust and operational usability

### Priority 3

Close the remaining open frontend defects with small, explicit fixes.

Reason:

- the missing auth routes and request metadata issue are bounded and visible defects
- these are good cleanup items before broader admin and integration rollout

### Priority 4

Sequence PeopleStrong implementation after bootstrap and admin-surface assumptions are confirmed.

Reason:

- the integration design is ready
- but it should land against a stable baseline model for people, org structure, and admin operations

## 9. Bottom Line

The last 7 days materially improved clarity across the product. The biggest gains were not in raw code volume. They were in architectural correctness:

- PeopleStrong scope is now precise
- vendor event assumptions were corrected using public documentation
- NewVision versus external tenant behavior is now much better defined
- Organization Admin is becoming the durable home for tenant-wide operations
- request blueprints have moved from abstract planning toward actual runtime implementation
- workbook seeding has become a practical bootstrap path

The next review should not be another broad discovery pass. It should be a sequencing and stabilization review focused on:

1. request blueprint runtime readiness
2. seed-data plausibility and bootstrap correctness
3. auth and security regression risk
4. then PeopleStrong implementation kickoff