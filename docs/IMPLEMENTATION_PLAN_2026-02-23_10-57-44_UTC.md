# Detailed Implementation Plan (Items 1–8)

Date: 2026-02-23  
Timestamp (UTC): 2026-02-23 10:57:44 UTC  
Type: Planning only (no code changes included)

Latest Execution Update (2026-02-24 06:40:52 UTC): Added combined invoice-linkage reconciliation report endpoint `GET /api/v1/audit-logs/invoice-linkage/reconciliation-report` with tenant-scoped aggregation by `invoiceReference` across Requests, Timesheet entries, and derived Timesheet periods; validated with `AUDIT-017/018` and API type-check.

## Source Artifacts Used
- docs/ITEMS_1_TO_7_SPRINT_BOARD.md (Timestamp: 2026-02-23 10:53:00 UTC)
- docs/AUDIT_TRAIL_SPRINT_BOARD.md (Timestamp: 2026-02-23 10:53:00 UTC)
- apps/api/src/modules/timesheets/timesheet.service.ts
- apps/api/src/modules/currency/currency.service.ts
- apps/api/src/modules/requests/request.service.ts
- apps/api/src/modules/audit/audit.service.ts
- apps/api/src/modules/allocations/allocation.service.ts
- apps/api/src/modules/dashboard/dashboard.service.ts
- apps/api/src/modules/dashboard/dashboard.controller.ts
- apps/frontend/src/pages/DashboardPage.tsx
- apps/api/prisma/schema.prisma

---

## 1) Scope and Intent
This plan operationalizes Items 1–7 plus Item 8 hardening backlog into concrete implementation workstreams with explicit code locations, data impact, expected outcomes, and post-implementation validation.

---

## 2) Workstream-by-Workstream Implementation Matrix

### WS-1: Tenant-configurable contract/project invoicing taxonomy (Item 1)

What is to be implemented/fixed?
- Introduce tenant-governed taxonomy policy for contract-led/project-led/hybrid invoicing and enforce it at workflow decision time.

Where (file and line)?
- Planning definition: docs/ITEMS_1_TO_7_SPRINT_BOARD.md#L28-L45
- Contract financial classification anchors: apps/api/prisma/schema.prisma#L440-L519
- Project financial classification anchors: apps/api/prisma/schema.prisma#L521-L589
- Tenant-level config anchors: apps/api/prisma/schema.prisma#L16-L60, apps/api/prisma/schema.prisma#L1495-L1537, apps/api/prisma/schema.prisma#L2873-L2922

Why does it need to be implemented/fixed?
- Current billing type fields exist but tenant-specific policy governance is not fully formalized/enforced across workflow paths.

Impacted modules
- organization/onboarding, requests/workflow, contracts, projects, settings UI.

Which tables are affected and why?
- Tenant: policy root and tenant defaults.
- Contract: current billingType/currency classification.
- Project: current billingType fallback/override classification.
- TenantRequestTypeConfig (or dedicated policy table): tenant-level behavior controls and effective policy.

Expected outcome
- Tenant can configure taxonomy without code changes; workflow validations consistently enforce policy.

How to validate post-fix?
- API tests for allowed/blocked taxonomy combinations.
- Request submission tests proving policy evaluation by tenant.
- Tenant-switch tests ensuring no cross-tenant policy leakage.

---

### WS-2: Billability domain model (eligibility, intent, outcome) + partial billing (Item 2)

What is to be implemented/fixed?
- Refactor billability semantics into three explicit states (eligibility, intent, billing outcome) and support partial billing attribution.

Where (file and line)?
- Planning definition: docs/ITEMS_1_TO_7_SPRINT_BOARD.md#L46-L63
- Current timesheet billability fields/status flow: apps/api/prisma/schema.prisma#L756-L842
- Timesheet lifecycle operations: apps/api/src/modules/timesheets/timesheet.service.ts#L446-L609
- Allocation billability anchor (current operational intent path): apps/api/src/modules/allocations/allocation.service.ts#L132-L470

Why does it need to be implemented/fixed?
- Existing booleans/status values do not cleanly separate operational intent from invoice outcome, causing semantic drift in reporting and workflow logic.

Impacted modules
- timesheets, allocations, dashboard/reporting, requests entity handlers.

Which tables are affected and why?
- TimesheetEntry: holds isBillable and status; needs explicit state model support.
- TimesheetPeriod: aggregated state/output for approvals and reporting.
- Allocation: upstream billability intent source.

Expected outcome
- Billing analytics and workflow actions reflect explicit states; partial billing is representable and query-safe.

How to validate post-fix?
- Unit tests for state transition rules.
- Aggregation parity tests for billable/non-billable/partial scenarios.
- Historical report snapshots for mixed billing periods.

---

### WS-3: As-was historical semantics (Item 3)

What is to be implemented/fixed?
- Preserve immutable decision-time snapshots so historical reports replay exactly as-was.

Where (file and line)?
- Planning definition: docs/ITEMS_1_TO_7_SPRINT_BOARD.md#L64-L81
- Request history persistence anchor: apps/api/src/modules/requests/request.service.ts#L141-L159
- Request history table schema: apps/api/prisma/schema.prisma#L1932-L1957
- Audit log table schema: apps/api/prisma/schema.prisma#L923-L940

Why does it need to be implemented/fixed?
- Without immutable snapshots of decision context, historical outputs drift as current configuration changes.

Impacted modules
- requests, audit, reporting, dashboard analytics.

Which tables are affected and why?
- RequestHistory: current lifecycle history store; can hold decision context.
- AuditLog: canonical compliance event store for immutable replay.

Expected outcome
- Same historical query on same period returns stable results independent of current settings.

How to validate post-fix?
- Replay tests across policy/version changes.
- Differential tests: current-state vs as-was endpoints.
- Audit trail completeness checks for historical windows.

---

### WS-4: Override workflow governance + mandatory audit trail (Item 4)

What is to be implemented/fixed?
- Implement approval-governed override outcomes (approved/rejected/expired/cancelled) with immutable evidence.

Where (file and line)?
- Planning definition: docs/ITEMS_1_TO_7_SPRINT_BOARD.md#L82-L99
- Audit hardening requirement: docs/AUDIT_TRAIL_SPRINT_BOARD.md#L74-L96
- Request/approval enums anchor: apps/api/prisma/schema.prisma#L2648-L2712
- Global audit action enum anchor (needs extension): apps/api/prisma/schema.prisma#L942-L970

Why does it need to be implemented/fixed?
- Governance requirement mandates non-repudiable override outcomes; current global audit action taxonomy does not model all target override outcomes explicitly.

Impacted modules
- requests/workflow, approvals, audit, compliance reporting.

Which tables are affected and why?
- AuditLog + AuditAction enum: must represent override outcomes explicitly.
- RequestHistory/approval-related tables: must correlate decisions with approver context.

Expected outcome
- Every override decision has complete actor/reason/timestamp lineage and deterministic final state reconstruction.

How to validate post-fix?
- Workflow integration tests for each outcome path.
- Evidence export checks showing complete chain.
- Negative tests blocking unauthorized or under-specified overrides.

---

### WS-5: Reporting dictionary and dashboard label contract (Item 5)

What is to be implemented/fixed?
- Align metric definitions, labels, and formulas to a single approved dictionary and audited event source contract.

Where (file and line)?
- Planning definition: docs/ITEMS_1_TO_7_SPRINT_BOARD.md#L100-L117
- Dashboard backend metric service anchor: apps/api/src/modules/dashboard/dashboard.service.ts#L91-L140
- Dashboard controller API contract anchor: apps/api/src/modules/dashboard/dashboard.controller.ts#L23-L92
- Dashboard UI metric/label usage anchor: apps/frontend/src/pages/DashboardPage.tsx#L39-L776

Why does it need to be implemented/fixed?
- Label/formula drift undermines trust and creates discrepancy between UI and backend semantic intent.

Impacted modules
- dashboard backend, dashboard frontend, analytics/reporting docs.

Which tables are affected and why?
- Primarily read-side impact across Resource/Allocation/Project/Timesheet* and AuditLog-backed reporting sources.
- No mandatory write-schema change unless new dictionary/version table is introduced.

Expected outcome
- UI labels, backend responses, and analytics definitions are consistent and traceable.

How to validate post-fix?
- Metric dictionary conformance tests.
- SQL parity tests against dashboard API payloads.
- UI snapshot checks for label consistency.

---

### WS-6: Migration, backfill, and global tenant-safe rollout (Item 6)

What is to be implemented/fixed?
- Execute schema/data migration with reconciliation gates and rollback-safe rollout sequence.

Where (file and line)?
- Planning definition: docs/ITEMS_1_TO_7_SPRINT_BOARD.md#L118-L135
- Audit rollout sequence requirement: docs/AUDIT_TRAIL_SPRINT_BOARD.md#L143-L166
- Primary schema impact surface: apps/api/prisma/schema.prisma (billing, timesheet, audit, request history areas)

Why does it need to be implemented/fixed?
- Multiple semantic and audit changes require controlled cutover to avoid tenant data drift.

Impacted modules
- prisma migrations, services emitting/reading billing/audit events, reporting pipelines.

Which tables are affected and why?
- AuditLog, RequestHistory, TimesheetEntry, TimesheetPeriod, Contract, Project, and any new policy/audit support tables.

Expected outcome
- Safe global rollout with no correctness regressions and auditable reconciliation evidence.

How to validate post-fix?
- Pre/post migration reconciliation reports.
- Dual-write parity checks (old/new event paths).
- Rollback rehearsal in staging-like environment.

---

### WS-7: Audit-trail coverage closure (Item 7)

What is to be implemented/fixed?
- Close all missing high-risk audit paths and remove direct bypasses of canonical helper.

Where (file and line)?
- Planning definition: docs/ITEMS_1_TO_7_SPRINT_BOARD.md#L136-L153
- Canonical helper anchor: apps/api/src/modules/audit/audit.service.ts#L120-L157
- Direct audit bypass examples: apps/api/src/modules/allocations/allocation.service.ts#L153, apps/api/src/modules/allocations/allocation.service.ts#L405, apps/api/src/modules/allocations/allocation.service.ts#L449
- Missing timesheet lifecycle audit paths: apps/api/src/modules/timesheets/timesheet.service.ts#L446-L609
- Missing currency governance audit paths: apps/api/src/modules/currency/currency.service.ts#L30-L301

Why does it need to be implemented/fixed?
- Compliance and forensics require complete, consistent, and redaction-safe event capture.

Impacted modules
- audit, allocations, timesheets, currency, requests entity handlers, projects.

Which tables are affected and why?
- AuditLog: canonical event sink and compliance source.
- Domain tables (TimesheetEntry/TimesheetPeriod/Currency/ExchangeRate/Allocation): source-of-change entities that must emit events.

Expected outcome
- 100% required activity coverage with no privileged mutation path left unaudited.

How to validate post-fix?
- Coverage matrix rerun (exists/partial/missing) after implementation.
- Static search gate for forbidden direct audit writes.
- Redaction integrity checks for PII fields.

---

### WS-8: Canonical audit hardening + request alignment + invoice linkage foundation (Item 8)

What is to be implemented/fixed?
- Complete Item 8 hardening: canonical contract enforcement, request dual-write correlation, and invoice-linkage event foundation.

Where (file and line)?
- Item 8 strategy definition: docs/AUDIT_TRAIL_SPRINT_BOARD.md#L19-L183
- Request history action calls: apps/api/src/modules/requests/request.service.ts#L757, apps/api/src/modules/requests/request.service.ts#L974, apps/api/src/modules/requests/request.service.ts#L1123, apps/api/src/modules/requests/request.service.ts#L1230, apps/api/src/modules/requests/request.service.ts#L1300
- Request lifecycle persistence helper: apps/api/src/modules/requests/request.service.ts#L141-L159
- Invoice-gap evidence (status exists, model missing): apps/api/prisma/schema.prisma#L801-L808 (INVOICED status present; no Invoice model currently declared)

Why does it need to be implemented/fixed?
- Request UX history and compliance audit must remain aligned; billing linkage cannot be fully auditable without explicit invoice event model.

Impacted modules
- requests, audit, billing/invoicing foundation, reporting/compliance exports.

Which tables are affected and why?
- RequestHistory and AuditLog for dual-write/correlation.
- TimesheetEntry/TimesheetPeriod for invoice-link transitions.
- New invoice/event tables likely required to support traceability lifecycle.

Expected outcome
- Unified evidence trail across request actions and canonical audit, with future-proof invoice linkage traceability.

How to validate post-fix?
- Correlation ID parity tests between RequestHistory and AuditLog.
- End-to-end traceability test from approval to billing linkage.
- Compliance export verification for selected tenants/date ranges.

---

## 3) Impacted Modules Summary (Consolidated)
- API modules: audit, requests, timesheets, currency, allocations, projects, dashboard, onboarding/organization settings.
- Data layer: prisma schema + migrations + reconciliation scripts.
- Frontend: dashboard metrics/labels and settings/taxonomy governance UI touchpoints.

---

## 4) Affected Tables Summary (Consolidated)
Existing (directly impacted):
- Tenant, TenantProfile, TenantRequestTypeConfig
- Contract, Project
- TimesheetEntry, TimesheetPeriod
- Currency, ExchangeRate
- RequestHistory
- AuditLog

Likely new/extended:
- AuditAction enum extensions for override outcomes.
- Policy/versioning table(s) if Tenant.settings JSON is not sufficient.
- Invoice/event linkage tables for timesheet-to-invoice traceability.

---

## 5) Validation Plan (Program-Level)
1. Unit level
- State transitions, policy validation, event payload shaping/redaction.

2. Integration level
- Request/approval/timesheet/currency flows emit expected canonical events.
- Dashboard metrics remain semantically aligned after domain changes.

3. Data validation
- Backfill and migration reconciliation with pre/post parity thresholds.
- Historical as-was replay invariance checks.

4. Compliance checks
- Event completeness (no critical gap).
- Non-repudiation and immutable audit evidence chain.

5. Release gates
- All gates defined in the source sprint-board docs must pass before broad enablement.

---

## 6) Constraints and Notes
- This document started as a planning artifact; actual implementation outcomes are captured in Section 7.
- Final implementation sequencing should follow blockers first:
  1) Taxonomy + billability model + audit coverage closure
  2) As-was + override governance
  3) Reporting contract + migration cutover
  4) Invoice-linkage foundation and full compliance evidence pack

---

## 7) Implementation Outcome Update

Update Date: 2026-02-23  
Update Timestamp (UTC): 2026-02-23 11:47:00 UTC

### Implemented in this pass

1. WS-7 audit closure (partial completion)
  - Updated: apps/api/src/modules/allocations/allocation.service.ts
  - Updated: apps/api/src/modules/timesheets/timesheet.service.ts
  - Updated: apps/api/src/modules/timesheets/timesheet.controller.ts
  - Updated: apps/api/src/modules/currency/currency.service.ts
  - Updated: apps/api/src/modules/currency/currency.controller.ts

2. WS-8 request alignment (partial completion)
  - Updated: apps/api/src/modules/requests/request.service.ts

### Validation results

  - Command: npm run type-check --workspace=@rmgaas/api
  - Command: npm run test:unit --workspace=@rmgaas/api -- src/modules/currency/currency.service.comprehensive.test.ts src/modules/contracts/contract.service.comprehensive.test.ts
  - Command: npm run test:unit --workspace=@rmgaas/api -- src/modules/timesheets/timesheet.service.comprehensive.test.ts src/modules/requests/request.service.comprehensive.test.ts
  - Failure observed in request test setup: prisma.requestType.findFirst mock missing (REQ-001..REQ-005 in createRequest block).

### Not implemented in this pass


### Reason for deferrals


### Incremental Update (Next Slice)

Update Date: 2026-02-23  
Update Timestamp (UTC): 2026-02-23 11:52:05 UTC

Implemented:
  - Updated: apps/api/prisma/schema.prisma
  - Added migration: apps/api/prisma/migrations/20260223115000_extend_audit_action_taxonomy/migration.sql
  - Updated: apps/api/src/modules/requests/request.service.ts

Validation:
  - Command: npm run generate --workspace=@rmgaas/api
  - Command: npm run type-check --workspace=@rmgaas/api
  - Command: npm run test:unit --workspace=@rmgaas/api -- src/modules/timesheets/timesheet.service.comprehensive.test.ts src/modules/currency/currency.service.comprehensive.test.ts

Open:

### Incremental Update (Latest)

Update Date: 2026-02-23  
Update Timestamp (UTC): 2026-02-23 12:16:36 UTC

Implemented:
- Fixed request comprehensive test harness to align with service call shape (`requestType.findFirst`).
  - Updated: apps/api/src/modules/requests/request.service.comprehensive.test.ts

Validation:
- Request comprehensive suite: PASS
  - Command: npm run test:unit --workspace=@rmgaas/api -- src/modules/requests/request.service.comprehensive.test.ts
- Prior REQ-001..REQ-005 mock mismatch is now resolved.

Open:
- Request trigger-service tests still show failures (`FAILED_ERROR` in field mapping/dedup/manual execution), outside changed files in this slice.

### Incremental Update (WS-8 Invoice-Linkage Foundation)

Update Date: 2026-02-24  
Update Timestamp (UTC): 2026-02-24 05:54:18 UTC

Implemented:
- Added canonical WS-8 invoice-linkage event contract:
  - `apps/api/src/config/invoice-linkage-events.ts`
- Added canonical audit emitter helper:
  - `createInvoiceLinkageAuditEvent(...)` in `apps/api/src/modules/audit/audit.service.ts`
- Added reconciliation gate for invoice-linkage foundation events:
  - `apps/api/src/scripts/reconcile-invoice-linkage-events.ts`
  - `apps/api/package.json` script: `audit:reconcile:invoice-linkage`
- Added targeted tests for the new helper:
  - `apps/api/src/modules/audit/audit.service.comprehensive.test.ts` (`AUDIT-015`, `AUDIT-016`)

Validation:
- API targeted tests: PASS
  - Command: `npx vitest run src/modules/audit/audit.service.comprehensive.test.ts` (16/16)
- API type-check: PASS
  - Command: `npx tsc --noEmit`
- WS-8 reconciliation gate: PASS
  - Command: `npm run audit:reconcile:invoice-linkage` (0 rows scanned in current environment)
- WS-7/WS-8 guard reruns: PASS
  - Command: `npm run audit:check:bypass`
  - Command: `npm run audit:reconcile:domains`

### Incremental Update (Next Slice)

Update Date: 2026-02-23  
Update Timestamp (UTC): 2026-02-23 12:14:28 UTC

Implemented:
- Migrated remaining direct audit writes in request execution paths to canonical helper:
  - apps/api/src/modules/requests/entity-handlers/allocation.handler.ts
  - apps/api/src/modules/requests/entity-handlers/project.handler.ts
  - apps/api/src/modules/requests/entity-handlers/contract.handler.ts
  - apps/api/src/modules/requests/entity-handlers/resource.handler.ts
  - apps/api/src/modules/requests/post-approval-actions.service.ts
- Added static bypass guard for scoped modules:
  - scripts/check-audit-bypass.sh
  - apps/api/package.json (`audit:check:bypass`)

Validation:
- Static bypass guard: PASS
  - Command: npm run audit:check:bypass --workspace=@rmgaas/api
- API type-check: PASS
  - Command: npm run type-check --workspace=@rmgaas/api
- Targeted tests: PASS (timesheets + currency)
  - Command: npm run test:unit --workspace=@rmgaas/api -- src/modules/timesheets/timesheet.service.comprehensive.test.ts src/modules/currency/currency.service.comprehensive.test.ts
- Request targeted tests: PARTIAL FAIL in trigger service tests (`FAILED_ERROR` in field mapping/dedup/manual execution cases), outside changed files in this slice.

Open:
- WS-4 override workflow behavior implementation remains pending.
- WS-6 migration rollout execution and reconciliation runbook remain pending.

### Incremental Update (Next Slice)

Update Date: 2026-02-23  
Update Timestamp (UTC): 2026-02-23 12:28:00 UTC

Implemented:
- Added delegation override outcome workflow behavior:
  - `apps/api/src/modules/requests/approval-chain.service.ts`
    - Added `approveDelegation` and `rejectDelegation` service operations
    - Added automatic delegation expiry sweep used in delegation resolution/listing paths
    - Added canonical immutable audit writes for delegation create/approve/reject/cancel/expire actions
  - `apps/api/src/modules/requests/approval-chain.schemas.ts`
    - Added `approveDelegationSchema` and `rejectDelegationSchema`
  - `apps/api/src/modules/requests/approval-chain.controller.ts`
    - Added `approveDelegation` and `rejectDelegation` handlers
  - `apps/api/src/modules/requests/delegation.routes.ts`
    - Added `POST /:id/approve` and `POST /:id/reject` routes with role gates

Validation:
- API type-check: PASS
  - Command: `npx tsc --noEmit`
- Request workflow integration suite: PASS
  - Command: `npx vitest run src/modules/requests/workflow-integration.test.ts` (18/18)
- Scoped audit bypass guard: PASS
  - Command: `npm run audit:check:bypass`

Open:
- WS-6 migration rollout execution and reconciliation runbook remain pending.

### Incremental Update (Next Slice)

Update Date: 2026-02-23  
Update Timestamp (UTC): 2026-02-23 12:38:00 UTC

Implemented:
- WS-6 migration/reconciliation execution layer:
  - Added reconciliation script: `apps/api/src/scripts/reconcile-request-audit.ts`
    - Validates tenant/action parity between mapped `RequestHistory` and canonical `AuditLog` actions.
  - Added package command: `apps/api/package.json`
    - `audit:reconcile:requests`
  - Added operational runbook: `docs/WS6_MIGRATION_RECONCILIATION_RUNBOOK_2026-02-23_12-35-00_UTC.md`
    - Rollout sequence, reconciliation gate, rollback, evidence capture.

Validation:
- API type-check: PASS
  - Command: `npx tsc --noEmit`
- Reconciliation gate: PASS in current environment
  - Command: `npm run audit:reconcile:requests`
  - Result: `RequestHistory ↔ AuditLog reconciliation PASSED` (mapped row counts currently `0/0`)

Open:
- Broader non-request migration/backfill slices (WS-1/WS-2/WS-3 data model transitions) remain pending.

### Incremental Update (Next Slice)

Update Date: 2026-02-23  
Update Timestamp (UTC): 2026-02-23 12:44:00 UTC

Implemented:
- Expanded WS-6 migration reconciliation coverage beyond request-history parity:
  - Added `apps/api/src/scripts/reconcile-domain-audit-integrity.ts`
    - Validates tenant/action integrity of canonical audit references for `TimesheetPeriod`, `Currency`, and `ExchangeRate` domains.
    - Fails when non-delete lifecycle/governance audit events reference missing entities.
  - Added `apps/api/package.json` command:
    - `audit:reconcile:domains`

Validation:
- API type-check: PASS
  - Command: `npx tsc --noEmit`
- Domain integrity reconciliation gate: PASS in current environment
  - Command: `npm run audit:reconcile:domains`
  - Result: `TimesheetPeriod/Currency/ExchangeRate` scanned rows currently `0/0/0`
- Request parity reconciliation gate re-run: PASS
  - Command: `npm run audit:reconcile:requests`
  - Result: mapped row counts currently `0/0`

Open:
- Broader WS-1/WS-2/WS-3 semantic data-model/backfill transitions remain pending.

### Incremental Update (Next Slice)

Update Date: 2026-02-23  
Update Timestamp (UTC): 2026-02-23 13:10:00 UTC

Implemented:
- WS-5 reporting dictionary contract for dashboard/analytics core metrics:
  - Added dictionary source file:
    - `apps/api/src/config/reporting-dictionary.ts`
  - Added executable parity gate:
    - `apps/api/src/scripts/check-reporting-dictionary-parity.ts`
  - Added API workspace command:
    - `apps/api/package.json` → `reporting:check:parity`
  - Published reporting contract document:
    - `docs/REPORTING_DICTIONARY_CONTRACT_2026-02-23_13-10-00_UTC.md`

Validation:
- API type-check: PASS
  - Command: `npx tsc --noEmit`
- Reporting dictionary parity gate: executed
  - Command: `npm run reporting:check:parity`

Open:
- Expand WS-5 parity coverage from dashboard/analytics core metrics to additional reporting surfaces (requests/report catalog and budget-tracking extended summary fields).

### Incremental Update (Next Slice)

Update Date: 2026-02-23  
Update Timestamp (UTC): 2026-02-23 13:34:13 UTC

Implemented:
- WS-1 (Tenant taxonomy):
  - Added tenant-configurable billing taxonomy contract and storage in `Tenant.settings`:
    - `apps/api/src/config/billing-taxonomy.ts`
  - Added admin API controls in organization module:
    - `GET /api/v1/organization/billing-taxonomy`
    - `PATCH /api/v1/organization/billing-taxonomy`
  - Added organization settings UI controls for taxonomy governance:
    - `apps/frontend/src/pages/SettingsPage.tsx`
  - Enforced taxonomy policy evaluation in request create/submit paths:
    - `apps/api/src/modules/requests/request.service.ts`

- WS-2 (Billability domain model + partial attribution):
  - Added explicit billability domain resolver (`eligibility/intent/outcome`):
    - `apps/api/src/config/billability-domain.ts`
  - Extended timesheet flows to support partial billing attribution (`billableRatio`), persist domain snapshot in `customFields`, and compute ratio-based billable hours:
    - `apps/api/src/modules/timesheets/timesheet.controller.ts`
    - `apps/api/src/modules/timesheets/timesheet.service.ts`

- WS-3 (As-was historical semantics):
  - Persisted immutable decision context snapshots in request history for submit/approve/reject events:
    - `apps/api/src/modules/requests/request.service.ts`
  - Made request history contract explicit with default `as-was` mode metadata:
    - `apps/api/src/modules/requests/request.controller.ts`
  - Added timesheet submit audit metadata for as-was billability replay context:
    - `apps/api/src/modules/timesheets/timesheet.service.ts`

Validation:
- API type-check: PASS
  - Command: `npx tsc --noEmit`
- Targeted API tests: PASS
  - Command: `npx vitest run src/modules/organization/organization.service.comprehensive.test.ts src/modules/requests/workflow-integration.test.ts src/modules/timesheets/timesheet.service.comprehensive.test.ts`
  - Result: 71/71 tests passed
- Frontend type-check: PASS
  - Command: `npx tsc --noEmit`

Open:
- WS-8 deferred invoice-linkage foundation remains deferred by plan scope.

### Incremental Update (WS-8 Runtime Invoice Linkage)

Update Date: 2026-02-24  
Update Timestamp (UTC): 2026-02-24 06:07:52 UTC

Implemented:
- Request runtime invoice linkage flow:
  - Added request service methods:
    - `linkRequestToInvoice(...)`
    - `unlinkRequestFromInvoice(...)`
  - Enforced tenant-scoped request lookup and status guard (`APPROVED`/`COMPLETED` for linking).
  - Persisted invoice-linkage metadata in `Request.requestData` without schema migration.
  - Emitted canonical WS-8 audit events via `createInvoiceLinkageAuditEvent(...)` for link/unlink/reject outcomes.
  - Files:
    - `apps/api/src/modules/requests/request.service.ts`
    - `apps/api/src/modules/requests/request.controller.ts`
    - `apps/api/src/modules/requests/request.routes.ts`

- Timesheet runtime invoice linkage flow:
  - Added timesheet service methods:
    - `linkTimesheetEntryToInvoice(...)`
    - `unlinkTimesheetEntryFromInvoice(...)`
  - Enforced tenant-scoped entry lookup and status guard (`APPROVED` before linking).
  - Applied `INVOICED` transition on link and restoration to `APPROVED` on unlink where applicable.
  - Persisted invoice-linkage metadata in `TimesheetEntry.customFields` without schema migration.
  - Emitted canonical WS-8 audit events via `createInvoiceLinkageAuditEvent(...)` for link/unlink/reject outcomes.
  - Files:
    - `apps/api/src/modules/timesheets/timesheet.service.ts`
    - `apps/api/src/modules/timesheets/timesheet.controller.ts`

- Added targeted regression tests:
  - `apps/api/src/modules/requests/request.service.comprehensive.test.ts` (`REQ-025`, `REQ-026`)
  - `apps/api/src/modules/timesheets/timesheet.invoice-linkage.test.ts` (`TS-INV-001`, `TS-INV-002`)

Validation:
- Targeted invoice-linkage tests: PASS
  - Command: `npx vitest run src/modules/requests/request.service.comprehensive.test.ts src/modules/timesheets/timesheet.invoice-linkage.test.ts`
  - Result: 28/28 tests passed
- API type-check: PASS
  - Command: `npx tsc --noEmit`

### Incremental Update (WS-8 Period-Level Linkage + Reconciliation Hardening)

Update Date: 2026-02-24  
Update Timestamp (UTC): 2026-02-24 06:13:18 UTC

Implemented:
- Added period-level runtime invoice-linkage operations in timesheet domain:
  - `linkTimesheetPeriodToInvoice(...)`
  - `unlinkTimesheetPeriodFromInvoice(...)`
  - File: `apps/api/src/modules/timesheets/timesheet.service.ts`
- Added period-level API endpoints:
  - `POST /api/v1/timesheets/periods/:periodId/invoice-link`
  - `DELETE /api/v1/timesheets/periods/:periodId/invoice-link`
  - File: `apps/api/src/modules/timesheets/timesheet.controller.ts`
- Runtime behavior:
  - Period link enforces `TimesheetPeriod.status = APPROVED` and links all eligible period entries.
  - Period unlink removes linkage for entries in period by explicit `invoiceReference`.
  - Canonical invoice-linkage audit events emitted at `TimesheetPeriod` entity level.

- Strengthened reconciliation gate for non-zero linkage rows:
  - `apps/api/src/scripts/reconcile-invoice-linkage-events.ts`
  - Added referenced-entity integrity assertions for invoice-linkage audit rows:
    - `Request`
    - `TimesheetEntry`
    - `TimesheetPeriod`
    - `Allocation`
    - `Contract`

- Extended tests:
  - `apps/api/src/modules/timesheets/timesheet.invoice-linkage.test.ts`
    - Added `TS-INV-003` and `TS-INV-004` for period-level link/unlink coverage.

Validation:
- Targeted tests: PASS
  - Command: `npx vitest run src/modules/timesheets/timesheet.invoice-linkage.test.ts src/modules/requests/request.service.comprehensive.test.ts`
  - Result: 30/30 tests passed
- API type-check: PASS
  - Command: `npx tsc --noEmit`
- WS-8 reconciliation gate: PASS
  - Command: `npm run audit:reconcile:invoice-linkage`

### Incremental Update (WS-8 Reconciliation Query Filters)

Update Date: 2026-02-24  
Update Timestamp (UTC): 2026-02-24 06:18:15 UTC

Implemented:
- Added `invoiceReference` list filtering for requests:
  - Extended `RequestFilters` with `invoiceReference`.
  - Applied Prisma JSON path filter on `Request.requestData.invoiceReference`.
  - Files:
    - `apps/api/src/modules/requests/request.service.ts`
    - `apps/api/src/modules/requests/request.controller.ts`

- Added `invoiceReference` list filtering for timesheet entries:
  - Extended `TimesheetFilters` with `invoiceReference`.
  - Applied Prisma JSON path filter on `TimesheetEntry.customFields.invoiceReference`.
  - Files:
    - `apps/api/src/modules/timesheets/timesheet.service.ts`
    - `apps/api/src/modules/timesheets/timesheet.controller.ts`

- Added targeted test coverage:
  - `REQ-027` validates request list filter where-clause.
    - `apps/api/src/modules/requests/request.service.comprehensive.test.ts`
  - `TS-INV-005` validates timesheet list filter where-clause.
    - `apps/api/src/modules/timesheets/timesheet.invoice-linkage.test.ts`

Validation:
- Targeted tests: PASS
  - Command: `npx vitest run src/modules/requests/request.service.comprehensive.test.ts src/modules/timesheets/timesheet.invoice-linkage.test.ts`
  - Result: 32/32 tests passed
- API type-check: PASS
  - Command: `npx tsc --noEmit`
