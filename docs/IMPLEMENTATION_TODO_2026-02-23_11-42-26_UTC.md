# Implementation TODO List (Derived from IMPLEMENTATION_PLAN_2026-02-23_10-57-44_UTC.md)

Date: 2026-02-23  
Timestamp (UTC): 2026-02-23 11:42:26 UTC
Source Plan: docs/IMPLEMENTATION_PLAN_2026-02-23_10-57-44_UTC.md

Latest Update (2026-02-24 06:40:52 UTC): Added combined invoice-linkage reconciliation report endpoint `GET /api/v1/audit-logs/invoice-linkage/reconciliation-report` with passing validations (`AUDIT-017/018`, API type-check).

## Status Legend
- PENDING: Not started
- IN_PROGRESS: Active work
- DONE: Implemented and validated
- DEFERRED: Requires larger migration/cross-team decision

---

## WS-1 Tenant Taxonomy (Item 1)
- [x] Define tenant taxonomy storage contract (Tenant.settings vs dedicated table) — DONE
- [x] Implement policy evaluation in request/workflow submit paths — DONE
- [x] Add API/UI controls for taxonomy configuration — DONE
- [x] Add tenant isolation tests for taxonomy reads/writes — DONE

## WS-2 Billability Domain Model (Item 2)
- [x] Introduce eligibility/intent/outcome domain representation — DONE
- [x] Add partial billing attribution model and transitions — DONE
- [x] Refactor timesheet and allocation services to use new semantics — DONE
- [x] Add regression tests for mixed billability scenarios — DONE

## WS-3 As-Was Historical Semantics (Item 3)
- [x] Persist immutable decision context snapshots — DONE
- [x] Ensure historical query contract uses as-was by default — DONE
- [x] Add replay invariance validation tests — DONE

## WS-4 Override Governance + Mandatory Audit (Item 4)
- [x] Implement override outcome workflow (approved/rejected/expired/cancelled) — DONE (delegation override path)
- [x] Enforce approval/permission gates for override actions — DONE (delegation approve/reject role gates)
- [x] Emit immutable outcome audit events with reason/context (taxonomy foundation) — DONE

## WS-5 Reporting Dictionary Contract (Item 5)
- [x] Publish dictionary mapping metrics to event definitions — DONE (dashboard/analytics core contract)
- [x] Align backend and frontend labels/formulas to dictionary — DONE (label contract + executable checks)
- [x] Add parity checks for API vs SQL source-of-truth — DONE

## WS-6 Migration/Backfill/Rollout (Item 6)
- [x] Prepare schema/data migration scripts for updated model — DONE (audit action taxonomy slice)
- [x] Implement dual-write/dual-read validation phase — DONE (request-history/audit reconciliation script)
- [x] Produce reconciliation and rollback runbook evidence — DONE (WS-6 runbook + executable gate)

## WS-7 Audit Coverage Closure (Item 7)
- [x] Replace direct audit writes in allocation service with canonical helper — DONE
- [x] Add timesheet lifecycle audit events (submit/approve/reject) — DONE
- [x] Add currency governance audit events (currency and FX CRUD) — DONE
- [x] Add static check/report for direct `prisma.auditLog.create` in scoped modules — DONE

## WS-8 Canonical Hardening + Request Alignment (Item 8)
- [x] Dual-write request lifecycle actions to canonical audit — DONE
- [x] Add correlation metadata between RequestHistory and AuditLog — DONE
- [x] Design invoice-linkage event foundation — DONE

---

## Validation TODO
- [x] Run API type-check (`npm run type-check --workspace=@rmgaas/api`) — DONE
- [x] Run targeted tests for touched modules — DONE (currency/contracts/timesheets/request comprehensive passed)
- [x] Re-run audit coverage matrix for WS-7/WS-8 scope — DONE
- [x] Update implementation plan with actual outcome status and evidence — DONE

## Next Slice Notes (2026-02-23 11:52:05 UTC)
- Completed schema taxonomy extension for `AuditAction` and added migration script.
- Updated request dual-write mapping to use request-specific audit actions (`REQUEST_RETURNED`, `REQUEST_CANCELLED`).

## Next Slice Notes (2026-02-23 12:14:28 UTC)
- Migrated remaining direct audit writes in request handlers and post-approval audit action path to canonical `createAuditLog` helper.
- Added static guard script: `scripts/check-audit-bypass.sh` and npm script `audit:check:bypass` in API package.
- Guard now reports no direct `prisma.auditLog.create` usage in scoped modules (allocations, timesheets, currency, requests).

## Next Slice Notes (2026-02-23 12:28:00 UTC)
- Implemented delegation override lifecycle behavior in approval workflow:
	- approve/reject delegation decisions (`/api/v1/delegations/:id/approve`, `/api/v1/delegations/:id/reject`)
	- cancellation and automatic expiry lifecycle handling
	- immutable audit events for `OVERRIDE_APPROVED`, `OVERRIDE_REJECTED`, `OVERRIDE_CANCELLED`, `OVERRIDE_EXPIRED`
- Added request-time expiry sweep for stale delegations before active delegation lookup/listing.
- Validation evidence:
	- `npx tsc --noEmit` (PASS)
	- `npx vitest run src/modules/requests/workflow-integration.test.ts` (PASS, 18/18)
	- `npm run audit:check:bypass` (PASS)

## Next Slice Notes (2026-02-23 12:38:00 UTC)
- Added WS-6 migration/reconciliation execution artifacts:
	- `apps/api/src/scripts/reconcile-request-audit.ts`
	- `docs/WS6_MIGRATION_RECONCILIATION_RUNBOOK_2026-02-23_12-35-00_UTC.md`
	- `apps/api/package.json` script: `audit:reconcile:requests`
- Validation evidence:
	- `npx tsc --noEmit` (PASS)
	- `npm run audit:reconcile:requests` (PASS; mapped row counts currently 0/0 in this environment)

## Next Slice Notes (2026-02-23 12:44:00 UTC)
- Expanded WS-6 reconciliation coverage beyond request history parity:
	- Added script: `apps/api/src/scripts/reconcile-domain-audit-integrity.ts`
	- Added API npm script: `audit:reconcile:domains`
- New reconciliation gate validates non-delete audit-reference integrity for:
	- `TimesheetPeriod` lifecycle events (`SUBMIT`, `APPROVE`, `REJECT`)
	- `Currency` governance events (`CREATE`, `UPDATE`, `DELETE`)
	- `ExchangeRate` governance events (`CREATE`, `UPDATE`)
- Validation evidence:
	- `npx tsc --noEmit` (PASS)
	- `npm run audit:reconcile:domains` (PASS; scanned rows currently 0/0/0 in this environment)
	- `npm run audit:reconcile:requests` (PASS; mapped rows currently 0/0)

## Next Slice Notes (2026-02-23 13:10:00 UTC)
- Implemented WS-5 reporting dictionary contract and parity gate for core reporting surfaces:
	- Added dictionary source: `apps/api/src/config/reporting-dictionary.ts`
	- Added parity gate: `apps/api/src/scripts/check-reporting-dictionary-parity.ts`
	- Added command: `npm run reporting:check:parity --workspace=@rmgaas/api`
	- Published contract doc: `docs/REPORTING_DICTIONARY_CONTRACT_2026-02-23_13-10-00_UTC.md`
- Scope covered in this slice:
	- Dashboard metrics core fields (`resources`, `utilization`, `allocations`, `bench cost`)
	- Analytics executive summary core fields (`active/bench/utilization/bench-cost`)
	- Frontend label contract across dashboard and analytics pages

## Next Slice Notes (2026-02-23 13:34:13 UTC)
- Completed WS-1 tenant taxonomy contract and enforcement:
	- Added taxonomy config and policy evaluator: `apps/api/src/config/billing-taxonomy.ts`
	- Added admin API controls: `GET/PATCH /api/v1/organization/billing-taxonomy`
	- Added settings UI controls in organization tab for invoicing model + billing type policy
	- Enforced taxonomy in request create/submit lifecycle paths
- Completed WS-2 billability domain semantics + partial attribution:
	- Added domain resolver: `apps/api/src/config/billability-domain.ts`
	- Added `billableRatio` support in timesheet create/update/weekly save
	- Refactored weekly and stats calculations to use ratio-based attribution
	- Persisted domain state in `TimesheetEntry.customFields.billabilityDomain`
- Completed WS-3 as-was semantics hardening:
	- Persisted immutable decision context snapshots in request history details on submit/approve/reject
	- Explicit default history contract mode metadata (`as-was`) in request history endpoint
	- Added audit snapshot metadata for timesheet submit lifecycle
- Validation evidence:
	- `npx tsc --noEmit` (API PASS)
	- `npx vitest run src/modules/organization/organization.service.comprehensive.test.ts src/modules/requests/workflow-integration.test.ts src/modules/timesheets/timesheet.service.comprehensive.test.ts` (PASS, 71/71)
	- `npx tsc --noEmit` (frontend PASS)

## Next Slice Notes (2026-02-24 05:54:18 UTC)
- Completed WS-8 invoice-linkage event foundation (canonical hardening increment):
	- Added event contract: `apps/api/src/config/invoice-linkage-events.ts`
	- Added canonical emitter helper: `createInvoiceLinkageAuditEvent(...)` in `apps/api/src/modules/audit/audit.service.ts`
	- Added reconciliation gate script: `apps/api/src/scripts/reconcile-invoice-linkage-events.ts`
	- Added API npm command: `audit:reconcile:invoice-linkage`
	- Added targeted audit tests (`AUDIT-015`, `AUDIT-016`) in `apps/api/src/modules/audit/audit.service.comprehensive.test.ts`
- Validation evidence:
	- `npx vitest run src/modules/audit/audit.service.comprehensive.test.ts` (PASS, 16/16)
	- `npx tsc --noEmit` (API PASS)
	- `npm run audit:reconcile:invoice-linkage` (PASS, 0 rows scanned)
	- `npm run audit:check:bypass` (PASS)
	- `npm run audit:reconcile:domains` (PASS)

## Next Slice Notes (2026-02-24 06:07:52 UTC)
- Completed WS-8 runtime invoice-linkage implementation (request + timesheet operational paths):
	- Added request runtime link/unlink service operations with canonical invoice-linkage audit events:
	  - `apps/api/src/modules/requests/request.service.ts`
	- Added request API endpoints:
	  - `POST /api/v1/requests/:id/invoice-link`
	  - `DELETE /api/v1/requests/:id/invoice-link`
	  - Files: `apps/api/src/modules/requests/request.controller.ts`, `apps/api/src/modules/requests/request.routes.ts`
	- Added timesheet entry runtime link/unlink service operations with `INVOICED` status transition and canonical invoice-linkage audit events:
	  - `apps/api/src/modules/timesheets/timesheet.service.ts`
	- Added timesheet API endpoints:
	  - `POST /api/v1/timesheets/:id/invoice-link`
	  - `DELETE /api/v1/timesheets/:id/invoice-link`
	  - File: `apps/api/src/modules/timesheets/timesheet.controller.ts`
	- Added targeted regression tests:
	  - `apps/api/src/modules/requests/request.service.comprehensive.test.ts` (`REQ-025`, `REQ-026`)
	  - `apps/api/src/modules/timesheets/timesheet.invoice-linkage.test.ts` (`TS-INV-001`, `TS-INV-002`)
- Validation evidence:
	- `npx vitest run src/modules/requests/request.service.comprehensive.test.ts src/modules/timesheets/timesheet.invoice-linkage.test.ts` (PASS, 28/28)
	- `npx tsc --noEmit` (API PASS)

## Next Slice Notes (2026-02-24 06:13:18 UTC)
- Extended WS-8 runtime invoice-linkage with period-level operations and reconciliation hardening:
	- Added timesheet period linkage operations:
	  - `linkTimesheetPeriodToInvoice(...)`
	  - `unlinkTimesheetPeriodFromInvoice(...)`
	  - File: `apps/api/src/modules/timesheets/timesheet.service.ts`
	- Added timesheet period API endpoints:
	  - `POST /api/v1/timesheets/periods/:periodId/invoice-link`
	  - `DELETE /api/v1/timesheets/periods/:periodId/invoice-link`
	  - File: `apps/api/src/modules/timesheets/timesheet.controller.ts`
	- Strengthened invoice-linkage reconciliation gate:
	  - Added referenced-entity integrity assertions for `Request`, `TimesheetEntry`, `TimesheetPeriod`, `Allocation`, and `Contract`
	  - File: `apps/api/src/scripts/reconcile-invoice-linkage-events.ts`
	- Extended invoice-linkage tests with period-level coverage:
	  - `TS-INV-003`, `TS-INV-004`
	  - File: `apps/api/src/modules/timesheets/timesheet.invoice-linkage.test.ts`
- Validation evidence:
	- `npx vitest run src/modules/timesheets/timesheet.invoice-linkage.test.ts src/modules/requests/request.service.comprehensive.test.ts` (PASS, 30/30)
	- `npx tsc --noEmit` (API PASS)
	- `npm run audit:reconcile:invoice-linkage` (PASS)

## Next Slice Notes (2026-02-24 06:18:15 UTC)
- Added finance reconciliation filter support by `invoiceReference` in listing APIs:
	- Requests listing filter (`Request.requestData.invoiceReference`):
	  - `apps/api/src/modules/requests/request.service.ts`
	  - `apps/api/src/modules/requests/request.controller.ts`
	- Timesheet entries listing filter (`TimesheetEntry.customFields.invoiceReference`):
	  - `apps/api/src/modules/timesheets/timesheet.service.ts`
	  - `apps/api/src/modules/timesheets/timesheet.controller.ts`
- Added targeted regression coverage:
	- `REQ-027` in `apps/api/src/modules/requests/request.service.comprehensive.test.ts`
	- `TS-INV-005` in `apps/api/src/modules/timesheets/timesheet.invoice-linkage.test.ts`
- Validation evidence:
	- `npx vitest run src/modules/requests/request.service.comprehensive.test.ts src/modules/timesheets/timesheet.invoice-linkage.test.ts` (PASS, 32/32)
	- `npx tsc --noEmit` (API PASS)
