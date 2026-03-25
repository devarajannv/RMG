# Module Audit Dossier: functions

## Metadata
- Module: `functions`
- Wave: `wave-3`
- Last Updated: 2026-02-24 12:00:00 UTC
- Reviewer: GitHub Copilot (GPT-5.3-Codex)
- Status: COMPLETE (Deep Audit Wave 3)

## Baseline Evidence Snapshot
- TypeScript files: 6
- Route files: 2
- Controller files: 1
- Service files: 1
- Test files (co-located): 0
- Route endpoints (router method count): 13
- Route auth references (`authenticate`): 4
- Route authorization references (`authorize` + `requireRoles`): 6
- Prisma call signatures (rough count): 26
- Transaction usage (`prisma.$transaction`): 0
- Raw query usage (`$queryRaw/$executeRaw`): 0
- Unsafe raw usage (`$queryRawUnsafe/$executeRawUnsafe`): 0
- Direct audit writes (`prisma.auditLog.create`): 0

## 1. Objective & Scope
Manages approval-function definitions, holder assignments, revocation, and delegation workflows.

## 2. Current Functionality (Code-Evidenced)
- Main and assignment routes are in `functions.routes.ts` and `assignments.routes.ts`.
- Core business logic is in `functions.service.ts` with tenant-scoped filters and role-based route protection.

## 3. Product Objective Alignment
Strong alignment with approval governance model and separation of capability from org hierarchy.

## 4. Functional Gaps (Real Scenarios)
- `listFunctionAssignments` allows arbitrary `sortBy` key in dynamic orderBy, creating runtime failure risk.
- Complex multi-step assignment/delegation flows are not transaction-bound.
- No co-located tests in module folder for critical governance logic.

## 5. Improvement Opportunities
- Add sort allowlist parity for assignment listing.
- Transaction-wrap delegation/assignment mutation sequences.
- Add module-specific test coverage for delegation constraints and conflict cases.

## 6. Code Quality
Service is structured and domain-aware; dynamic query construction needs tighter guardrails.

## 7. Database Schema Quality
Function and assignment schemas support scope/status/effective-date semantics well.

## 8. Enterprise Security Posture
Route protection via `authenticate` and `requireRoles` is good.
Contract-hardening needed around dynamic sort input.

## 9. Reliability & Resilience
Reliability is moderate; absence of transactional boundaries in governance-critical flows is a risk.

## 10. Data Integrity & Correctness
Tenant and status filters are consistently applied; race/idempotency scenarios need explicit coverage.

## 11. Performance Tuning (Code)
Pagination is present; query-shape safety is the larger concern than throughput.

## 12. Performance Tuning (Database)
No raw SQL exposure; ORM patterns are straightforward.

## 13. API / Contract Quality
API is practical and expressive; assignment sorting contract is currently weak.

## 14. Observability / Operability
Logging exists for key mutations; add assignment/delegation audit events for full governance traceability.

## 15. Compliance / Governance
Module is governance-critical; observability and test depth should match criticality.

## 16. Test Confidence / Release Safety
Current module-local tests are missing; release confidence is moderate.

## Scoring (Deep Audit Wave 3)
- Functional Fit: 8.0/10
- Code Quality: 7.0/10
- Schema Quality: 7.5/10
- Security: 7.2/10
- Reliability: 6.6/10
- Data Integrity: 6.9/10
- Perf Code: 7.1/10
- Perf DB: 7.5/10
- Contract Quality: 6.8/10
- Operability: 6.8/10
- Compliance: 7.3/10
- Test/Release: 6.0/10
- Weighted Overall: 70.5/100 (L3 Stable)

## Findings Register
| ID | Severity | Finding | Evidence | Recommendation |
|---|---|---|---|---|
| FUNC-F01 | High | Assignment listing uses unvalidated dynamic sort key | `orderBy: { [options.sortBy || 'createdAt'] ... }` in `functions.service.ts` | Add allowlist and reject invalid sort fields |
| FUNC-F02 | Medium | Complex assignment/delegation flows are not transaction-bound | multi-step updates in `functions.service.ts` | Wrap critical mutation paths in transactions |
| FUNC-F03 | Medium | Module-local tests are missing for governance-critical logic | no co-located tests in module folder | Add tests for delegation rules, conflicts, and revocation invariants |


## Action Plan
| Priority | Action | Owner | Effort | Target Date | Success Metric |
|---|---|---|---|---|---|
| P0 | Enforce assignment sort allowlist | Functions owner | S | 2026-03-03 | Invalid sort values return 400, no runtime orderBy failures |
| P1 | Transaction-wrap delegation/assignment mutation sets | Functions owner | M | 2026-03-06 | No partial mutation states under injected failures |
| P1 | Add governance-focused test suite | Functions owner + QA | M | 2026-03-07 | Delegation/revocation invariants covered and passing |
