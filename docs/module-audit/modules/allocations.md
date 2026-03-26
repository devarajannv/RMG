# Module Audit Dossier: allocations

## Metadata
- Module: `allocations`
- Wave: `wave-2`
- Last Updated: 2026-02-24 11:00:00 UTC
- Reviewer: GitHub Copilot (GPT-5.3-Codex)
- Status: COMPLETE (Deep Audit Wave 2 + Remediation Update)

## 1. Objective & Scope
Manages staffing allocations, conflict detection, lifecycle transitions, rolloff tracking, and resource availability calculations.

## 2. Current Functionality (Code-Evidenced)
- Controller includes broad route set with permission gates in `apps/api/src/modules/allocations/allocation.controller.ts`.
- Core validation/conflict checks and lifecycle transitions are in `allocation.service.ts`.
- Audit logging exists via centralized `createAuditLog` calls.

## 3. Product Objective Alignment
Strong alignment for Writer operations: module can support allocation request-to-execution lifecycle without AI dependency.

## 4. Functional Gaps (Real Scenarios)
- Bulk create explicitly bypasses conflict detection (`skipConflictCheck=true`), allowing over-allocation in bulk workflows.
- Route-side conflict check uses inline dynamic `require('../../lib/prisma')`, deviating from standard dependency patterns and weakening maintainability/testability.
- Sort allowlist includes `allocationPercentage`, which does not map to schema field (`percentage`) and can trigger runtime query errors when requested.

## 5. Improvement Opportunities
- Add optional strict mode for bulk create to enforce conflicts per item.
- Replace inline dynamic Prisma import in controller with service-level abstraction.
- Correct sort allowlist and add contract tests for all sortable fields.

## 6. Code Quality
- Business rules are clear and readable.
- Some implementation shortcuts (dynamic require, permissive bulk path) reduce consistency and predictability.

## 7. Database Schema Quality
- Allocation model has strong tenant/date/status indexing (`tenantId+resourceId+dates`, `tenantId+projectId+dates`, `tenantId+status`).
- Schema supports operational query patterns well for rolloffs and availability windows.

## 8. Enterprise Security Posture
- Route permissions (`allocation:read/write/approve`) are consistently enforced.
- No unsafe raw SQL usage observed.
- Minor hardening needed: ensure all helper lookups maintain explicit tenant scope.

## 9. Reliability & Resilience
- Lifecycle updates and conflict checks are robust for single-item paths.
- Bulk path prioritizes throughput over strict consistency and may introduce downstream correction burden.

## 10. Data Integrity & Correctness
- Single create/update flows enforce resource/project existence and date rules.
- Bulk create conflict bypass is a material data-quality risk.

## 11. Performance Tuning (Code)
- `getResourceAvailability` iterates day-by-day and filters allocations in-memory, which can be expensive over long ranges.
- Bulk create performs sequential operations; predictable but slower at scale.

## 12. Performance Tuning (Database)
- Query patterns are index-friendly for common filters.
- No raw SQL or unbounded scans were identified in critical paths.

## 13. API / Contract Quality
- Endpoint contract is rich and mostly consistent.
- Sort-field contract mismatch (`allocationPercentage`) can surface as avoidable 500-class errors.

## 14. Observability / Operability
- Allocation mutations produce audit logs and structured logging.
- Limited operational telemetry around bulk partial-failure behavior beyond returned errors array.

## 15. Compliance / Governance
- Audit coverage is present for create/update/delete flows.
- Governance strengthens after closing bulk conflict-bypass loophole.

## 16. Test Confidence / Release Safety
- Module includes `allocation.service.comprehensive.test.ts`.
- Confidence is moderate-high for core service logic; targeted tests needed for controller sort contracts and bulk conflict policy.

## Scoring (Deep Audit Wave 2)
- Functional Fit: 8.1/10
- Code Quality: 6.9/10
- Schema Quality: 7.7/10
- Security: 6.8/10
- Reliability: 6.8/10
- Data Integrity: 6.7/10
- Perf Code: 6.8/10
- Perf DB: 7.7/10
- Contract Quality: 6.6/10
- Operability: 7.0/10
- Compliance: 7.2/10
- Test/Release: 6.8/10
- Weighted Overall: 70.4/100 (L3 Stable)

## Findings Register
| ID | Severity | Finding | Evidence | Recommendation |
|---|---|---|---|---|
| ALLOC-F01 | Resolved | Bulk allocation path now enforces conflict validation | `bulkCreateAllocations` now calls `createAllocation(...)` with default conflict checks in `allocation.service.ts` | Closed on 2026-03-04 with targeted test validation |
| ALLOC-F02 | Medium | Sort contract includes non-existent field | `ALLOWED_ALLOC_SORT` includes `allocationPercentage` in `allocation.service.ts` | Replace with `percentage` and add contract tests |
| ALLOC-F03 | Medium | Controller uses dynamic Prisma require instead of service abstraction | `/check-conflicts` handler in `allocation.controller.ts` | Move capacity lookup into service layer and keep DI/import pattern consistent |

## Action Plan
| Priority | Action | Owner | Effort | Target Date | Success Metric |
|---|---|---|---|---|---|
| Done | Enforce conflict checks in bulk create by default | Allocations owner | S | 2026-03-04 | Bulk requests cannot create over-allocation without explicit approved override |
| P1 | Fix allocation sort allowlist + regression tests | Allocations owner | S | 2026-03-04 | All declared sort fields execute without runtime failures |
| P1 | Refactor conflict-check route to service-owned data access | Allocations owner | S | 2026-03-05 | Controller contains no direct Prisma imports |
