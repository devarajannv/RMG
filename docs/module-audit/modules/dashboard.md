# Module Audit Dossier: dashboard

## Metadata
- Module: `dashboard`
- Wave: `wave-4`
- Last Updated: 2026-02-24 13:00:00 UTC
- Reviewer: GitHub Copilot (GPT-5.3-Codex)
- Status: COMPLETE (Deep Audit Wave 4 + Remediation Update)

## 1. Objective & Scope
Delivers operational dashboard views: summary metrics, utilization trends, bench analysis, practice utilization, capacity forecast, and skill demand.

## 2. Current Functionality (Code-Evidenced)
- Controller applies `authenticate` + `authorize('report:read')` across dashboard endpoints.
- Service composes metrics from resources, projects, allocations, and practices in parallel for the headline view.

## 3. Product Objective Alignment
Strong Writer alignment: dashboard insights are core non-AI functionality.

## 4. Functional Gaps (Real Scenarios)
- `getUtilizationTrend` performs per-period query loops (allocations + resource count) that scale poorly on large date windows.
- Some outputs are placeholders (`trend: 'stable'`, hardcoded target/cost assumptions) rather than tenant-configured or historical.

## 5. Improvement Opportunities
- Batch period computations or pre-aggregate utilization snapshots.
- Replace hardcoded target/cost constants with tenant settings/config.
- Tighten input validation for `weeks` and enforce upper bound in `capacity-forecast` endpoint.

## 6. Code Quality
Readable route/service separation; service file is broad and mixes analytics computation with fallback assumptions.

## 7. Database Schema Quality
Uses relevant domain entities and scoped filters; no unsafe raw SQL patterns found.

## 8. Enterprise Security Posture
Authz coverage is consistent for all exposed dashboard routes.

## 9. Reliability & Resilience
High-level metrics endpoint benefits from Promise-based parallel queries; trend generation loops raise timeout risk at scale.

## 10. Data Integrity & Correctness
Point-in-time counts are credible; trend semantics can drift due to placeholders and fixed assumptions.

## 11. Performance Tuning (Code)
Main hotspot is iterative period scanning with DB calls inside loops.

## 12. Performance Tuning (Database)
No immediate query safety issues; indexing/aggregation strategy should be reviewed for trend endpoints under load.

## 13. API / Contract Quality
Contracts are straightforward and mostly validated with zod; `weeks` parsing is permissive.

## 14. Observability / Operability
No module-level latency/error metrics for expensive dashboard calculations.

## 15. Compliance / Governance
Read-only reporting path has low compliance risk; governance score is limited by deterministic-data quality gaps.

## 16. Test Confidence / Release Safety
Comprehensive test file exists, but includes stale call signatures (`getUtilizationTrend` arguments) that indicate drift risk.

## Scoring (Deep Audit Wave 4)
- Functional Fit: 7.3/10
- Code Quality: 6.8/10
- Schema Quality: 7.0/10
- Security: 7.3/10
- Reliability: 6.4/10
- Data Integrity: 6.6/10
- Perf Code: 6.2/10
- Perf DB: 6.8/10
- Contract Quality: 6.9/10
- Operability: 6.5/10
- Compliance: 6.9/10
- Test/Release: 6.8/10
- Weighted Overall: 68.7/100 (L3 Stable)

## Findings Register
| ID | Severity | Finding | Evidence | Recommendation |
|---|---|---|---|---|
| DASHBOARD-F01 | Medium | Utilization trend endpoint uses query-per-period loop and can degrade with long windows | `getUtilizationTrend` in `dashboard.service.ts` loops and queries per period | Replace looped query pattern with pre-aggregated snapshots or batched queries |
| DASHBOARD-F02 | Resolved | Placeholder static trend output removed in utilization summary | `dashboard.service.ts` now derives trend deterministically from computed utilization rate | Closed on 2026-03-04 with targeted test validation |
| DASHBOARD-F03 | Medium | Test drift indicates weak release signal for trend endpoint contract | `dashboard.service.comprehensive.test.ts` uses outdated method shape | Align tests to current signatures and add contract tests on controller layer |

## Action Plan
| Priority | Action | Owner | Effort | Target Date | Success Metric |
|---|---|---|---|---|---|
| P1 | Rework trend computation path for bounded query complexity | Dashboard owner | M | 2026-03-09 | P95 trend endpoint latency remains stable as period window increases |
| P1 | Remove hardcoded utilization/cost assumptions | Dashboard owner | S | 2026-03-06 | Tenant-configured targets used in all dashboard summaries |
| P1 | Repair and harden dashboard tests | Dashboard owner + QA | S | 2026-03-07 | Tests compile with current signatures and cover endpoint contracts |
