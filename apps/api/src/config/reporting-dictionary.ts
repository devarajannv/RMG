export type ReportingSurface = 'dashboard' | 'analytics';

export interface ReportingMetricDictionaryEntry {
  id: string;
  surface: ReportingSurface;
  apiPath: string;
  apiField: string;
  canonicalLabel: string;
  uiLabels: string[];
  formula: string;
  sourceModels: string[];
  parityCheck: 'sql-derived' | 'label-only';
}

export const REPORTING_DICTIONARY_VERSION = '2026-02-23.ws5.v1';

export const REPORTING_METRIC_DICTIONARY: ReportingMetricDictionaryEntry[] = [
  {
    id: 'DASH_UTIL_CURRENT',
    surface: 'dashboard',
    apiPath: '/api/v1/dashboard/metrics',
    apiField: 'utilization.current',
    canonicalLabel: 'Utilization Rate',
    uiLabels: ['Utilization Rate'],
    formula:
      'round1((sum(active allocation percentage where isBillable=true) / sum(active resource capacity)) * 100)',
    sourceModels: ['Resource', 'Allocation'],
    parityCheck: 'sql-derived',
  },
  {
    id: 'DASH_UTIL_BILLABLE',
    surface: 'dashboard',
    apiPath: '/api/v1/dashboard/metrics',
    apiField: 'utilization.billable',
    canonicalLabel: 'Billable %',
    uiLabels: ['Billable', 'Utilization Breakdown'],
    formula: 'round1((sum(active allocation percentage where isBillable=true) / sum(active resource capacity)) * 100)',
    sourceModels: ['Resource', 'Allocation'],
    parityCheck: 'sql-derived',
  },
  {
    id: 'DASH_UTIL_NON_BILLABLE',
    surface: 'dashboard',
    apiPath: '/api/v1/dashboard/metrics',
    apiField: 'utilization.nonBillable',
    canonicalLabel: 'Non-Billable %',
    uiLabels: ['Non-Billable', 'Utilization Breakdown'],
    formula: 'round1((sum(active allocation percentage where isBillable=false) / sum(active resource capacity)) * 100)',
    sourceModels: ['Resource', 'Allocation'],
    parityCheck: 'sql-derived',
  },
  {
    id: 'DASH_RESOURCES_TOTAL_ACTIVE',
    surface: 'dashboard',
    apiPath: '/api/v1/dashboard/metrics',
    apiField: 'resources.total',
    canonicalLabel: 'Total Resources',
    uiLabels: ['Total Resources'],
    formula: 'count(Resource where status=ACTIVE and deletedAt is null)',
    sourceModels: ['Resource'],
    parityCheck: 'sql-derived',
  },
  {
    id: 'DASH_RESOURCES_ON_BENCH',
    surface: 'dashboard',
    apiPath: '/api/v1/dashboard/metrics',
    apiField: 'resources.onBench',
    canonicalLabel: 'On Bench',
    uiLabels: ['On Bench', 'Bench Resources'],
    formula: 'count(Resource where status=ACTIVE and benchSince is not null and deletedAt is null)',
    sourceModels: ['Resource'],
    parityCheck: 'sql-derived',
  },
  {
    id: 'DASH_ALLOCATIONS_ACTIVE',
    surface: 'dashboard',
    apiPath: '/api/v1/dashboard/metrics',
    apiField: 'allocations.active',
    canonicalLabel: 'Active Allocations',
    uiLabels: ['Active Allocations'],
    formula: 'count(Allocation where status=ACTIVE and active in current date window and deletedAt is null)',
    sourceModels: ['Allocation'],
    parityCheck: 'sql-derived',
  },
  {
    id: 'DASH_ALLOCATIONS_PENDING',
    surface: 'dashboard',
    apiPath: '/api/v1/dashboard/metrics',
    apiField: 'allocations.pending',
    canonicalLabel: 'Pending Allocations',
    uiLabels: ['Pending Allocations', 'Pending Approvals'],
    formula: 'count(Allocation where status in [PROPOSED, CONFIRMED] and deletedAt is null)',
    sourceModels: ['Allocation'],
    parityCheck: 'sql-derived',
  },
  {
    id: 'DASH_ROLLOFFS_30D',
    surface: 'dashboard',
    apiPath: '/api/v1/dashboard/metrics',
    apiField: 'allocations.rolloffsNext30Days',
    canonicalLabel: 'Roll-offs (30 days)',
    uiLabels: ['Roll-offs (30 days)', 'Upcoming Roll-offs'],
    formula: 'count(Allocation where status in [ACTIVE, CONFIRMED] and endDate in [today, today+30d])',
    sourceModels: ['Allocation'],
    parityCheck: 'sql-derived',
  },
  {
    id: 'DASH_BENCH_COST_MONTHLY',
    surface: 'dashboard',
    apiPath: '/api/v1/dashboard/metrics',
    apiField: 'financials.benchCostMonthly',
    canonicalLabel: 'Bench Cost',
    uiLabels: ['Bench Cost'],
    formula: 'resources.onBench * 150000 (INR baseline)',
    sourceModels: ['Resource'],
    parityCheck: 'sql-derived',
  },
  {
    id: 'AN_EXEC_UTILIZATION_RATE',
    surface: 'analytics',
    apiPath: '/api/v1/analytics/executive',
    apiField: 'summary.utilizationRate',
    canonicalLabel: 'Utilization Rate',
    uiLabels: ['Utilization Rate'],
    formula:
      'round0((sum(active allocation percentage where isBillable=true) / sum(active resource capacity)) * 100)',
    sourceModels: ['Resource', 'Allocation'],
    parityCheck: 'sql-derived',
  },
  {
    id: 'AN_EXEC_BENCH_COUNT',
    surface: 'analytics',
    apiPath: '/api/v1/analytics/executive',
    apiField: 'summary.benchCount',
    canonicalLabel: 'On Bench',
    uiLabels: ['On Bench'],
    formula: 'count(Resource where status=ACTIVE and benchSince is not null and deletedAt is null)',
    sourceModels: ['Resource'],
    parityCheck: 'sql-derived',
  },
  {
    id: 'AN_EXEC_BENCH_COST_MONTHLY',
    surface: 'analytics',
    apiPath: '/api/v1/analytics/executive',
    apiField: 'summary.benchCostMonthly',
    canonicalLabel: 'Monthly Bench Cost',
    uiLabels: ['Monthly Bench Cost'],
    formula: 'summary.benchCount * 150000 (INR baseline)',
    sourceModels: ['Resource'],
    parityCheck: 'sql-derived',
  },
  {
    id: 'AN_FIN_MONTHLY_BENCH_COST',
    surface: 'analytics',
    apiPath: '/api/v1/analytics/financial',
    apiField: 'summary.monthlyBenchCost',
    canonicalLabel: 'Monthly Bench Cost',
    uiLabels: ['Monthly Bench Cost'],
    formula: 'sum(resource.costPerHour*176 or fallback 150000 for each bench resource)',
    sourceModels: ['Resource', 'Practice', 'Location'],
    parityCheck: 'label-only',
  },
];
