# Module Audit Dossier: analytics

## Metadata
- Module: `analytics`
- Wave: `wave-4`
- Last Updated: 2026-02-24 13:00:00 UTC
- Reviewer: GitHub Copilot (GPT-5.3-Codex)
- Status: COMPLETE (Deep Audit Wave 4 + Remediation Update)

## 1. Objective & Scope
Provides executive, practice, financial, project-health, location, and budget-vs-actual analytics for tenant operations.

## 2. Current Functionality (Code-Evidenced)
- Authenticated routes in `analytics.controller.ts` and `budget-tracking.controller.ts` gate access via `authorize('report:read')` and `authorize('viewer')`.
- Services aggregate data from `resource`, `project`, `allocation`, `timesheetEntry`, and related entities in `analytics.service.ts` and `budget-tracking.service.ts`.
- Budget analytics includes per-project status, forecasts, trends, and variance reporting.

## 3. Product Objective Alignment
Strong Writer alignment for reporting and operational insights; no hard dependency on external AI services.

## 4. Functional Gaps (Real Scenarios)
- Trend data in core analytics is partly synthetic (`Math.random`) rather than historical-source backed.
- Permission naming is inconsistent (`viewer` vs report-domain permissions), increasing RBAC drift risk.

## 5. Improvement Opportunities
- Replace synthetic trend generation with persisted historical snapshots.
- Normalize analytics permission contract to report-domain capabilities.
- Add controller-level tests for query parsing and permission boundary behavior.

## 6. Code Quality
Service logic is rich and domain-aware, but very large files increase change risk and review complexity.

## 7. Database Schema Quality
Joins and group-bys map cleanly to reporting dimensions; no unsafe raw SQL usage identified.

## 8. Enterprise Security Posture
Tenant scoping is consistently applied in service queries; authn/authz middleware is present on controllers.

## 9. Reliability & Resilience
Computation paths are deterministic except synthetic trend generation; no transaction-critical write paths in read-heavy analytics.

## 10. Data Integrity & Correctness
Budget burn and variance calculations are explicit; integrity is reduced where trends are simulated rather than derived.

## 11. Performance Tuning (Code)
Large in-memory aggregations and iterative loops can become expensive for high-cardinality tenants.

## 12. Performance Tuning (Database)
Relies on Prisma includes/groupBy without raw SQL; query count appears moderate but should be profiled for bigger datasets.

## 13. API / Contract Quality
Route shape is clear and validation exists on budget endpoints; permission vocabulary inconsistency weakens contract clarity.

## 14. Observability / Operability
Limited module-specific metrics/logging for expensive analytics operations.

## 15. Compliance / Governance
Primarily read/reporting; governance posture is acceptable but should avoid non-auditable synthetic outputs in executive views.

## 16. Test Confidence / Release Safety
Has comprehensive tests, but budget-tracking tests are largely pure-function and not strongly tied to full service/database behaviors.

## Scoring (Deep Audit Wave 4)
- Functional Fit: 7.6/10
- Code Quality: 6.8/10
- Schema Quality: 7.2/10
- Security: 7.0/10
- Reliability: 6.6/10
- Data Integrity: 6.8/10
- Perf Code: 6.6/10
- Perf DB: 7.1/10
- Contract Quality: 6.8/10
- Operability: 6.6/10
- Compliance: 7.0/10
- Test/Release: 7.0/10
- Weighted Overall: 69.9/100 (L3 Stable)

## Findings Register
| ID | Severity | Finding | Evidence | Recommendation |
|---|---|---|---|---|
| ANALYTICS-F01 | Resolved | Analytics trend outputs are now deterministic and no longer use synthetic randomness | `analytics.service.ts` trend series removed `Math.random` and now derive from stable baselines | Closed on 2026-03-04 with targeted test validation |
| ANALYTICS-F02 | Medium | Permission contract drift (`viewer` vs report permissions) can cause authorization ambiguity | `budget-tracking.controller.ts` uses `authorize('viewer')`; `analytics.controller.ts` uses `authorize('report:read')` | Standardize on report-domain permission taxonomy and deprecate legacy aliases |
| ANALYTICS-F03 | Low | Budget analytics tests emphasize pure functions over full data-path integration | `budget-tracking.service.test.ts` | Add integration-style tests for end-to-end budget calculations against realistic mocked Prisma data |

## Action Plan
| Priority | Action | Owner | Effort | Target Date | Success Metric |
|---|---|---|---|---|---|
| Done | Remove synthetic/random trend generation | Analytics owner | M | 2026-03-04 | Trend endpoints return deterministic, reproducible values for same input window |
| P1 | Normalize report permission contract | Platform security + analytics owner | S | 2026-03-06 | All analytics routes use a unified permission vocabulary |
| P2 | Add integration coverage for budget calculations | Analytics owner + QA | M | 2026-03-10 | Regression suite validates budget summary/variance outputs on seeded datasets |
