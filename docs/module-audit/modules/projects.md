# Module Audit Dossier: projects

## Metadata
- Module: `projects`
- Wave: `wave-2`
- Last Updated: 2026-02-24 11:00:00 UTC
- Reviewer: GitHub Copilot (GPT-5.3-Codex)
- Status: COMPLETE (Deep Audit Wave 2)

## 1. Objective & Scope
Manages project master data, status/health lifecycle, budget metadata, and allocation-aware project summaries.

## 2. Current Functionality (Code-Evidenced)
- Permissioned routes and request validation are defined in `apps/api/src/modules/projects/project.controller.ts`.
- Service layer handles create/update/delete/list/stats logic in `project.service.ts`.
- Project routes are mounted under `/api/v1/projects` via `apps/api/src/index.ts`.

## 3. Product Objective Alignment
Strong Writer fit: projects support downstream allocations, timesheets, and request workflows as expected.

## 4. Functional Gaps (Real Scenarios)
- Create path validates cross-entity references; update path does not revalidate new `clientId`, `contractId`, `managerId`, or `practiceId` before update.
- Delete path checks active allocations by `projectId` without explicit tenant condition in count query.
- No transactional bundling for mutate + audit writes, allowing partial success on failure boundaries.

## 5. Improvement Opportunities
- Add update-time referential validation parity with create.
- Include `tenantId` hard filters in all count/safety checks for governance consistency.
- Wrap mutation + audit write in transactions for stronger consistency.

## 6. Code Quality
- Readable and generally cohesive service methods.
- Validation asymmetry between create/update increases maintenance and defect risk.

## 7. Database Schema Quality
- Strong schema contracts: `tenantId+code` uniqueness plus tenant/status/type/date indexes.
- Foreign-key topology (client/contract/manager/practice) fits operational usage.

## 8. Enterprise Security Posture
- Route-level authz is consistently applied (`project:read`, `project:write`).
- Security posture is good, but tenant-scope consistency in all guard queries should be explicit.

## 9. Reliability & Resilience
- Lifecycle and duplicate guards are present.
- Lack of transaction around update+audit can produce inconsistent auditing if failures happen between steps.

## 10. Data Integrity & Correctness
- Project code uniqueness and deletion safeguards exist.
- Missing update-time FK validation can defer failures to DB constraints and produce less actionable errors.

## 11. Performance Tuning (Code)
- List/get paths use include-heavy reads; acceptable for moderate data volume.
- Summary computation is in-memory and may become expensive for very large allocation sets.

## 12. Performance Tuning (Database)
- Query patterns match declared indexes on project model.
- No raw SQL/unsafe query primitives detected.

## 13. API / Contract Quality
- API shape is predictable and sorted/paginated.
- Contract quality drops where update behavior diverges from create validation semantics.

## 14. Observability / Operability
- Service logs project creation/deletion and writes audit events for key mutations.
- Operational diagnostics are adequate but not exhaustive for validation failures.

## 15. Compliance / Governance
- Audit trail exists for major mutation events.
- Governance strengthens after transaction and tenant-scope consistency hardening.

## 16. Test Confidence / Release Safety
- `project.service.comprehensive.test.ts` is present.
- Confidence moderate-high for happy paths; medium for update reference-validation edge cases.

## Scoring (Deep Audit Wave 2)
- Functional Fit: 8.2/10
- Code Quality: 7.0/10
- Schema Quality: 7.8/10
- Security: 7.0/10
- Reliability: 7.0/10
- Data Integrity: 7.1/10
- Perf Code: 7.0/10
- Perf DB: 7.7/10
- Contract Quality: 7.0/10
- Operability: 7.1/10
- Compliance: 7.3/10
- Test/Release: 7.0/10
- Weighted Overall: 71.6/100 (L3 Stable)

## Findings Register
| ID | Severity | Finding | Evidence | Recommendation |
|---|---|---|---|---|
| PROJ-F01 | High | Update path lacks referential validation parity with create path | `updateProject` vs `createProject` in `project.service.ts` | Validate `clientId`, `contractId`, `managerId`, `practiceId` on update before persistence |
| PROJ-F02 | Medium | Safety check query omits explicit tenant filter | `activeAllocations` count in `deleteProject` in `project.service.ts` | Add `tenantId` scoping in defensive checks for consistency |
| PROJ-F03 | Medium | Mutation and audit write are not transaction-bound | separate `project.update` then `auditLog.create` in `project.service.ts` | Wrap in `prisma.$transaction` for atomic behavior |

## Action Plan
| Priority | Action | Owner | Effort | Target Date | Success Metric |
|---|---|---|---|---|---|
| P0 | Add update-time foreign-key validation parity | Projects owner | M | 2026-03-04 | Invalid references return controlled 4xx errors |
| P1 | Add explicit tenant scoping to safety count checks | Projects owner | S | 2026-03-05 | All guard queries include tenant predicate |
| P1 | Transaction-wrap mutate + audit pairs | Projects owner | S | 2026-03-06 | No partial mutation/audit outcomes in failure tests |
