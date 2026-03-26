# Module Audit Dossier: resources

## Metadata
- Module: `resources`
- Wave: `wave-2`
- Last Updated: 2026-02-24 11:00:00 UTC
- Reviewer: GitHub Copilot (GPT-5.3-Codex)
- Status: COMPLETE (Deep Audit Wave 2)

## 1. Objective & Scope
Owns resource lifecycle: create/update/deactivate, bench/utilization visibility, skills linkage, and automated exit cascade behavior.

## 2. Current Functionality (Code-Evidenced)
- Route authn/authz and Zod validation are present in `apps/api/src/modules/resources/resource.controller.ts`.
- Core lifecycle logic with tenant-scoped reads/writes is implemented in `apps/api/src/modules/resources/resource.service.ts`.
- Exit cascade engine exists in `apps/api/src/modules/resources/resource-exit-cascade.service.ts` (allocation cutoff + audit + notification queueing).
- Module is mounted through `apps/api/src/index.ts` with dedicated `/resources`, `/resources/import`, and `/skills` routes.

## 3. Product Objective Alignment
Strong Writer alignment: module is operational without AI and supports real workforce operations including exit handling.

## 4. Functional Gaps (Real Scenarios)
- `listResources` computes `total` before in-memory `isOnBench` filtering, causing pagination/total mismatch when bench filter is applied.
- Update path allows relation connect/disconnect by raw IDs (`practiceId`, `locationId`, `managerId`) without explicit update-time tenant ownership revalidation.
- Exit notification delivery remains non-operational (queue log only; TODO mail adapter not implemented).

## 5. Improvement Opportunities
- Push bench filtering into DB query semantics to keep pagination contract truthful.
- Revalidate relation IDs on update with tenant-bound lookups before connect.
- Move exit cascade multi-step updates to explicit transaction boundaries for rollback-safe behavior.

## 6. Code Quality
- Good modular decomposition across resource, skill, import, and cascade services.
- Large service methods and “god-level” cascade comments signal maintainability drift under future change.

## 7. Database Schema Quality
- Resource schema has strong tenant-scoped uniqueness (`tenantId+employeeId`, `tenantId+email`) and useful indexes.
- Allocation/resource relations are normalized and indexed for common operational lookups.

## 8. Enterprise Security Posture
- Controller permission gates are consistently applied (`resource:read`, `resource:write`).
- Security hardening needed on update-time relation binding to prevent cross-tenant reference misuse if foreign IDs leak.

## 9. Reliability & Resilience
- Guardrails prevent destructive status changes while active allocations exist.
- Exit cascade handles partial per-allocation failures but currently lacks all-or-nothing transaction safety.

## 10. Data Integrity & Correctness
- Duplicate checks and audit logging are well-covered for create/update/delete.
- Bench-state derivation is correct per-resource but list-level count contract can be inconsistent due to post-query filtering.

## 11. Performance Tuning (Code)
- `listResources` includes allocations/skills per row and computes bench status in memory, which can become expensive for large pages.
- Exit cascade loops allocation updates sequentially; suitable for small batches but not high-volume exits.

## 12. Performance Tuning (Database)
- No raw SQL/unsafe primitives observed.
- Existing indexes align with common tenant/status/date filters for resource and allocation access.

## 13. API / Contract Quality
- Endpoint contract is mostly stable and consistently validated.
- Bench filter pagination semantics should be corrected to avoid client-side data-contract confusion.

## 14. Observability / Operability
- Structured logging and audit writes are present in critical flows.
- Notification subsystem integration remains a known operational gap.

## 15. Compliance / Governance
- Strong audit event coverage for resource lifecycle and exit cascade.
- Governance confidence improves after notification delivery and transactional guarantees are formalized.

## 16. Test Confidence / Release Safety
- Module includes `resource.service.comprehensive.test.ts` and `resource-exit-cascade.service.test.ts`.
- Confidence is moderate-high for core logic, moderate for externalized operational workflows (notifications).

## Scoring (Deep Audit Wave 2)
- Functional Fit: 8.4/10
- Code Quality: 7.3/10
- Schema Quality: 7.8/10
- Security: 7.0/10
- Reliability: 7.2/10
- Data Integrity: 7.6/10
- Perf Code: 7.0/10
- Perf DB: 7.8/10
- Contract Quality: 7.3/10
- Operability: 7.2/10
- Compliance: 7.4/10
- Test/Release: 7.0/10
- Weighted Overall: 73.8/100 (L4 Production-Strong)

## Findings Register
| ID | Severity | Finding | Evidence | Recommendation |
|---|---|---|---|---|
| RES-F01 | High | Pagination total can be incorrect when bench filter is applied | `listResources` counts before in-memory `isOnBench` filter in `resource.service.ts` | Move bench predicate to DB-level query or recompute total after filter semantics |
| RES-F02 | Medium | Update relation-binding does not fully revalidate tenant ownership | `updateResource` relation connect paths in `resource.service.ts` | Add tenant-bound existence checks for `practiceId`, `locationId`, `managerId` before relation updates |
| RES-F03 | Medium | Exit cascade notification flow is not operational | TODO marker in `resource-exit-cascade.service.ts` | Implement notifier adapter and integration tests for manager notifications |

## Action Plan
| Priority | Action | Owner | Effort | Target Date | Success Metric |
|---|---|---|---|---|---|
| P0 | Fix bench filter pagination correctness | Resources owner | S | 2026-03-03 | `total` and `data` remain contract-consistent for all filter combinations |
| P1 | Add tenant ownership checks for update-time relation IDs | Resources owner | M | 2026-03-05 | Invalid/cross-tenant relation IDs rejected with 4xx |
| P1 | Implement exit notification adapter + tests | Platform ops + resources owner | M | 2026-03-07 | Exit cascade emits delivered notifications in integration tests |
