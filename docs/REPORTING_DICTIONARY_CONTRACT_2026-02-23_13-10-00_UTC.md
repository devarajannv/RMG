# Reporting Dictionary Contract (WS-5)

Date: 2026-02-23  
Timestamp (UTC): 2026-02-23 13:10:00 UTC  
Scope: Dashboard + Analytics core metrics parity and label contract

## Objective

Establish a single contract for reporting metrics that binds:
- API field paths
- Canonical UI labels
- Formula definitions
- Source models
- Executable parity validation

## Dictionary Version

- Version: `2026-02-23.ws5.v1`
- Source of truth (code): `apps/api/src/config/reporting-dictionary.ts`
- Parity gate command: `npm run reporting:check:parity --workspace=@rmgaas/api`

## Contracted Metrics

| Metric ID | API Path | API Field | Canonical Label | Formula | Source Models |
|---|---|---|---|---|---|
| `DASH_UTIL_CURRENT` | `/api/v1/dashboard/metrics` | `utilization.current` | Utilization Rate | `round1(billable_alloc_pct / active_capacity * 100)` | `Resource`, `Allocation` |
| `DASH_UTIL_BILLABLE` | `/api/v1/dashboard/metrics` | `utilization.billable` | Billable % | `round1(billable_alloc_pct / active_capacity * 100)` | `Resource`, `Allocation` |
| `DASH_UTIL_NON_BILLABLE` | `/api/v1/dashboard/metrics` | `utilization.nonBillable` | Non-Billable % | `round1(non_billable_alloc_pct / active_capacity * 100)` | `Resource`, `Allocation` |
| `DASH_RESOURCES_TOTAL_ACTIVE` | `/api/v1/dashboard/metrics` | `resources.total` | Total Resources | `count(active resources)` | `Resource` |
| `DASH_RESOURCES_ON_BENCH` | `/api/v1/dashboard/metrics` | `resources.onBench` | On Bench | `count(active resources with benchSince)` | `Resource` |
| `DASH_ALLOCATIONS_ACTIVE` | `/api/v1/dashboard/metrics` | `allocations.active` | Active Allocations | `count(active allocations in current date window)` | `Allocation` |
| `DASH_ALLOCATIONS_PENDING` | `/api/v1/dashboard/metrics` | `allocations.pending` | Pending Allocations | `count(status in PROPOSED, CONFIRMED)` | `Allocation` |
| `DASH_ROLLOFFS_30D` | `/api/v1/dashboard/metrics` | `allocations.rolloffsNext30Days` | Roll-offs (30 days) | `count(ending in next 30 days)` | `Allocation` |
| `DASH_BENCH_COST_MONTHLY` | `/api/v1/dashboard/metrics` | `financials.benchCostMonthly` | Bench Cost | `resources.onBench * 150000` | `Resource` |
| `AN_EXEC_UTILIZATION_RATE` | `/api/v1/analytics/executive` | `summary.utilizationRate` | Utilization Rate | `round0(billable_alloc_pct / active_capacity * 100)` | `Resource`, `Allocation` |
| `AN_EXEC_BENCH_COUNT` | `/api/v1/analytics/executive` | `summary.benchCount` | On Bench | `count(active resources with benchSince)` | `Resource` |
| `AN_EXEC_BENCH_COST_MONTHLY` | `/api/v1/analytics/executive` | `summary.benchCostMonthly` | Monthly Bench Cost | `summary.benchCount * 150000` | `Resource` |

## UI Label Contract

The current baseline labels are anchored in:
- `apps/frontend/src/pages/DashboardPage.tsx`
- `apps/frontend/src/pages/AnalyticsPage.tsx`

If these labels are changed, the dictionary or parity gate must be updated in the same PR.

## Parity Gate Coverage

Executable gate:
- `apps/api/src/scripts/check-reporting-dictionary-parity.ts`

Checks performed:
1. Frontend label presence checks for every `uiLabels` entry.
2. API-vs-DB parity checks (tenant-scoped) for core dashboard metrics.
3. API-vs-DB parity checks (tenant-scoped) for analytics executive summary metrics.

Failure behavior:
- Any mismatch exits non-zero and prints mismatch tables.

## Notes

- Financial analytics summary fields beyond executive core (for example `summary.monthlyBenchCost`) are currently label-contracted and can be expanded to SQL parity in a subsequent WS-5 increment.
- This contract is intentionally scoped to existing Writer reporting surfaces and does not introduce new schema.
