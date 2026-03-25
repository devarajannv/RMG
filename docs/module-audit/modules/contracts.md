# Module Audit Dossier: contracts

## Metadata
- Module: `contracts`
- Wave: `wave-2`
- Last Updated: 2026-03-04 08:25:00 UTC
- Reviewer: GitHub Copilot (GPT-5.3-Codex)
- Status: COMPLETE (Deep Audit Wave 2 + Remediation Update)

## 1. Objective & Scope
Handles contract lifecycle (draft/activate/terminate/renew), client association, and project linking via `/api/v1/contracts` endpoints.

## 2. Current Functionality (Code-Evidenced)
- Canonical contracts module now exposes runtime entry points under `apps/api/src/modules/contracts/`.
- Mounting to `/api/v1/contracts` is done in `apps/api/src/index.ts`.
- Application contract routes are mounted from `apps/api/src/modules/contracts/index.ts`.

## 3. Product Objective Alignment
Functional alignment is moderate-strong, but structural module-boundary drift lowers maintainability and governance confidence.

## 4. Functional Gaps (Real Scenarios)
- `listContracts` accepts arbitrary `sortBy` and forwards to Prisma orderBy without allowlist, risking runtime contract breakage.
- `updateContract` does not revalidate `accountMgrId` existence or `contractNumber` uniqueness before update.
- `renewContract` performs multi-step writes without transaction, allowing partial renewal state on failure.

## 5. Improvement Opportunities
- Add sort allowlist and validation parity in update path.
- Transaction-wrap renew flow and other multi-step mutations.

## 6. Code Quality
- Service covers broad lifecycle needs and is readable.
- Runtime boundary ownership is now normalized through the contracts module entrypoint.

## 7. Database Schema Quality
- Contract model has proper tenant uniqueness and lifecycle indexes (`tenantId+contractNumber`, status/endDate/renewalDate indexes).
- Schema is adequate for operational and reporting needs.

## 8. Enterprise Security Posture
- Route-level authz is applied consistently (`contract:read`, `contract:write`).
- No unsafe raw SQL usage observed.
- Input hardening for sort and update references needs improvement.

## 9. Reliability & Resilience
- Core lifecycle transitions are guarded by status checks.
- Renewal path’s non-transactional multi-write behavior is a reliability risk.

## 10. Data Integrity & Correctness
- Create path validates core references and duplicate contract number.
- Update path can defer integrity failures to DB layer due to missing prechecks.

## 11. Performance Tuning (Code)
- List queries are paginated and relation includes are bounded.
- Sort-field validation absence can cause avoidable runtime failures rather than performance issues.

## 12. Performance Tuning (Database)
- Indexes support expected tenant/client/status/end-date patterns.
- No raw-query performance risk observed.

## 13. API / Contract Quality
- Endpoint surface is rich and useful.
- Contract quality still needs sort/update validation hardening, but ownership ambiguity is closed.

## 14. Observability / Operability
- Audit log events exist for major lifecycle actions.
- Operational ownership is now anchored through `modules/contracts` route/service entrypoints.

## 15. Compliance / Governance
- Audit trail exists and module ownership boundary is now explicit for enterprise auditability.

## 16. Test Confidence / Release Safety
- Test artifacts exist in both `modules/clients` and `modules/contracts`, but not all map directly to runtime implementation.
- Confidence is moderate; traceability from tests to production code should be tightened.

## Scoring (Deep Audit Wave 2)
- Functional Fit: 7.7/10
- Code Quality: 6.4/10
- Schema Quality: 7.8/10
- Security: 6.5/10
- Reliability: 6.4/10
- Data Integrity: 6.5/10
- Perf Code: 6.8/10
- Perf DB: 7.8/10
- Contract Quality: 6.1/10
- Operability: 6.3/10
- Compliance: 6.5/10
- Test/Release: 6.5/10
- Weighted Overall: 67.8/100 (L3 Stable-Needs-Hardening)

## Findings Register
| ID | Severity | Finding | Evidence | Recommendation |
|---|---|---|---|---|
| CON-F01 | Resolved | Contracts runtime ownership boundary normalized | `index.ts` now mounts `contractRoutes` from `modules/contracts`; runtime entrypoints added in contracts module | Closed on 2026-03-04 with compile validation |
| CON-F02 | High | Unvalidated `sortBy` can produce runtime query errors | `listContracts` in `contract.service.ts` uses dynamic orderBy field | Add allowlist for contract sort fields and reject invalid values with 400 |
| CON-F03 | Medium | Update path lacks full referential/uniqueness prechecks | `updateContract` omits account manager existence and contract-number uniqueness checks | Add update-time validations consistent with create semantics |
| CON-F04 | Medium | Renewal flow is not transaction-bound | `renewContract` performs update+create+audit without `prisma.$transaction` | Use transaction to guarantee atomic renewal semantics |

## Action Plan
| Priority | Action | Owner | Effort | Target Date | Success Metric |
|---|---|---|---|---|---|
| Done | Resolve contracts module ownership boundary | Platform architecture + contracts owner | M | 2026-03-04 | Runtime routes now mount from canonical contracts module |
| P0 | Add contract sort allowlist + validation tests | Contracts owner | S | 2026-03-03 | Invalid sort fields return 400, no runtime orderBy failures |
| P1 | Add update-time manager/contractNumber validation | Contracts owner | S | 2026-03-04 | Update path parity with create validations |
| P1 | Transaction-wrap contract renewal flow | Contracts owner | S | 2026-03-05 | Renewal is atomic and rollback-safe under failure tests |
