# Module Audit Dossier: timesheets

## Metadata
- Module: `timesheets`
- Wave: `wave-2`
- Last Updated: 2026-02-24 16:55:00 UTC
- Reviewer: GitHub Copilot (GPT-5.3-Codex)
- Status: COMPLETE (Deep Audit Wave 2 + Remediation Update)

## 1. Objective & Scope
Implements timesheet entry lifecycle, weekly save/submit/approve/reject flow, invoice linkage, access control, and summary analytics.

## 2. Current Functionality (Code-Evidenced)
- Controller exposes rich operational routes in `apps/api/src/modules/timesheets/timesheet.controller.ts`.
- Service provides CRUD, period transitions, invoice-link logic, and access-control helpers in `timesheet.service.ts`.
- Module is mounted under `/api/v1/timesheets` from `apps/api/src/index.ts`.

## 3. Product Objective Alignment
Strong operational alignment with Writer goals, including approval workflow and invoice linkage support.

## 4. Functional Gaps (Real Scenarios)
- Scoped-read fallback gap is remediated: non-`timesheet:read:all` users without a linked resource now fail closed with 403, and scoped users requesting explicit `resourceId` must pass `canAccessResourceTimesheet` checks.
- Access-check rule mismatch: `canModifyTimesheetEntry` allows only `DRAFT`, but update/delete service supports `DRAFT` and `REJECTED`.
- Module instantiates a new `PrismaClient` directly instead of using shared singleton, increasing connection-pool risk.
- Period invoice link/unlink iterates entry-by-entry updates without transaction.

## 5. Improvement Opportunities
- Harmonize modify permissions with service lifecycle rules (`REJECTED` edits).
- Replace local `new PrismaClient()` with shared Prisma client.
- Batch invoice-link updates in transaction with controlled chunking.

## 6. Code Quality
- Feature richness is high and domain logic is explicit.
- File size and responsibility breadth in service reduce maintainability.

## 7. Database Schema Quality
- TimesheetEntry/Period schema has strong tenant/date/status indexes and period uniqueness constraint.
- Schema supports major workflow and analytics requirements.

## 8. Enterprise Security Posture
- Route permissions are consistently present.
- Scoped-read behavior is hardened in list route to prevent tenant-wide fallback for scoped readers.
- Some helper lookups rely on email linkage with weaker explicit tenant assertions.

## 9. Reliability & Resilience
- Core submit/approve/reject paths use transactions.
- Invoice-link loops are non-transactional and can leave partial linkage under failure.

## 10. Data Integrity & Correctness
- Billability ratio handling and period aggregates are thoughtfully implemented.
- Modify-rule mismatch between guard and mutation semantics creates correctness friction for rejected-entry workflows.

## 11. Performance Tuning (Code)
- Pagination exists for list endpoints.
- Invoice period link/unlink and weekly save loops are O(n) with per-row updates; acceptable at small n, expensive at scale.

## 12. Performance Tuning (Database)
- Indexes align with dominant filters (`tenantId/resourceId/date`, status/date).
- No raw SQL risk found.

## 13. API / Contract Quality
- API breadth is strong and mostly consistent.
- Contract inconsistency exists between authorization helper behavior and update/delete business rules.

## 14. Observability / Operability
- Audit events exist for submit/approve/reject and invoice linkage actions.
- Operational diagnostics would benefit from explicit metrics on authorization denials and partial linkage failures.

## 15. Compliance / Governance
- Audit traceability for critical lifecycle actions is strong.
- Governance posture improved by closing scoped-read fallback overexposure path.

## 16. Test Confidence / Release Safety
- Module includes `timesheet.service.comprehensive.test.ts` and `timesheet.invoice-linkage.test.ts`.
- Added `timesheet.routes.integration.test.ts` and `timesheets.remediation.e2e.test.ts` for scoped-read fail-closed validation.

## Validation Evidence
- Fast targeted tests:
	- `cd apps/api && npx vitest run src/modules/timesheets/timesheet.routes.integration.test.ts`
	- Result: PASS (3/3)
- Higher-fidelity functional test:
	- Test ID / Scenario: `TIMESHEETS-HF-001` (scoped reader without linked resource is denied unscoped list access)
	- Command: `cd apps/api && npx vitest run src/test/e2e/timesheets.remediation.e2e.test.ts`
	- Environment: live API endpoint (`http://localhost:4000`) with DB-backed tenant/user/role state
	- Result: PASS (1/1)

## Scoring (Deep Audit Wave 2)
- Functional Fit: 8.0/10
- Code Quality: 6.8/10
- Schema Quality: 8.0/10
- Security: 7.3/10
- Reliability: 7.1/10
- Data Integrity: 7.5/10
- Perf Code: 6.8/10
- Perf DB: 7.8/10
- Contract Quality: 7.2/10
- Operability: 7.1/10
- Compliance: 7.6/10
- Test/Release: 7.8/10
- Weighted Overall: 74.0/100 (L4 Production-Strong)

## Findings Register
| ID | Severity | Finding | Evidence | Recommendation |
|---|---|---|---|---|
| TS-F01 | Resolved | Scoped list read now fails closed for non-all-read users without linked resource and enforces explicit resource access checks | `timesheet.controller.ts` `GET /timesheets` now denies missing-linked-resource and unauthorized explicit `resourceId` access | Closed on 2026-02-24 with fast + higher-fidelity validation evidence |
| TS-F02 | Medium | Modify guard mismatches service lifecycle rules for `REJECTED` entries | `canModifyTimesheetEntry` vs `updateTimesheetEntry` in `timesheet.service.ts` | Align authorization helper and mutation logic; add rejected-entry regression tests |
| TS-F03 | Medium | Service uses direct `new PrismaClient()` instead of shared client | top of `timesheet.service.ts` | Reuse shared Prisma singleton to avoid connection management drift |
| TS-F04 | Medium | Period invoice link/unlink is non-transactional and iterative | looped `timesheetEntry.update` in `timesheet.service.ts` | Use transaction and batched updates for atomic linkage changes |

## Action Plan
| Priority | Action | Owner | Effort | Target Date | Success Metric |
|---|---|---|---|---|---|
| Done | Close scoped-read fallback gap | Timesheets owner + security | S | 2026-02-24 | Non-privileged users cannot list tenant-wide data without explicit scope |
| P1 | Align modify guard with rejected-entry rules | Timesheets owner | S | 2026-03-04 | Rejected entries can be edited/deleted only under intended policy |
| P1 | Migrate to shared Prisma client + add pool regression checks | Timesheets owner | S | 2026-03-05 | No direct Prisma client instantiation in module |
| P1 | Transactionalize period invoice link/unlink operations | Timesheets owner | M | 2026-03-07 | Invoice period operations are atomic under fault injection |
