import { readFile } from 'node:fs/promises';
import path from 'node:path';

import prisma from '../lib/prisma';
import { getDashboardMetrics } from '../modules/dashboard/dashboard.service';
import { getExecutiveMetrics } from '../modules/analytics/analytics.service';
import {
  REPORTING_DICTIONARY_VERSION,
  REPORTING_METRIC_DICTIONARY,
  type ReportingMetricDictionaryEntry,
} from '../config/reporting-dictionary';

type Mismatch = {
  tenantId: string;
  metricId: string;
  expected: number;
  actual: number;
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function round0(value: number): number {
  return Math.round(value);
}

async function getTenantIds(): Promise<string[]> {
  const tenants = await prisma.tenant.findMany({
    where: { deletedAt: null },
    select: { id: true },
  });

  return tenants.map((tenant) => tenant.id);
}

async function deriveDashboardSqlMetrics(tenantId: string) {
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [activeResourceCount, benchCount, activeAllocations, pendingAllocations, rolloffs, resources] =
    await Promise.all([
      prisma.resource.count({
        where: {
          tenantId,
          status: 'ACTIVE',
          deletedAt: null,
        },
      }),
      prisma.resource.count({
        where: {
          tenantId,
          status: 'ACTIVE',
          deletedAt: null,
          benchSince: { not: null },
        },
      }),
      prisma.allocation.count({
        where: {
          tenantId,
          status: 'ACTIVE',
          deletedAt: null,
          startDate: { lte: now },
          endDate: { gte: now },
        },
      }),
      prisma.allocation.count({
        where: {
          tenantId,
          status: { in: ['PROPOSED', 'CONFIRMED'] },
          deletedAt: null,
        },
      }),
      prisma.allocation.count({
        where: {
          tenantId,
          status: { in: ['ACTIVE', 'CONFIRMED'] },
          deletedAt: null,
          endDate: { gte: now, lte: thirtyDaysFromNow },
        },
      }),
      prisma.resource.findMany({
        where: {
          tenantId,
          status: 'ACTIVE',
          deletedAt: null,
        },
        include: {
          allocations: {
            where: {
              status: 'ACTIVE',
              deletedAt: null,
              startDate: { lte: now },
              endDate: { gte: now },
            },
            select: {
              percentage: true,
              isBillable: true,
            },
          },
        },
      }),
    ]);

  let totalCapacity = 0;
  let totalBillable = 0;
  let totalNonBillable = 0;

  for (const resource of resources) {
    totalCapacity += resource.capacity;
    for (const allocation of resource.allocations) {
      if (allocation.isBillable) {
        totalBillable += allocation.percentage;
      } else {
        totalNonBillable += allocation.percentage;
      }
    }
  }

  const utilizationCurrent =
    totalCapacity > 0 ? round1((totalBillable / totalCapacity) * 100) : 0;
  const utilizationBillable =
    totalCapacity > 0 ? round1((totalBillable / totalCapacity) * 100) : 0;
  const utilizationNonBillable =
    totalCapacity > 0 ? round1((totalNonBillable / totalCapacity) * 100) : 0;

  return {
    activeResourceCount,
    benchCount,
    activeAllocations,
    pendingAllocations,
    rolloffs,
    utilizationCurrent,
    utilizationBillable,
    utilizationNonBillable,
    benchCostMonthly: benchCount * 150000,
  };
}

async function deriveExecutiveSqlMetrics(tenantId: string) {
  const now = new Date();

  const resources = await prisma.resource.findMany({
    where: { tenantId, deletedAt: null },
    include: {
      allocations: {
        where: {
          status: 'ACTIVE',
          deletedAt: null,
          startDate: { lte: now },
          endDate: { gte: now },
        },
        select: { percentage: true, isBillable: true },
      },
    },
  });

  const activeResources = resources.filter((resource) => resource.status === 'ACTIVE');
  const benchResources = activeResources.filter((resource) => resource.benchSince !== null);

  let totalCapacity = 0;
  let totalBillable = 0;

  for (const resource of activeResources) {
    totalCapacity += resource.capacity;
    const resourceBillable = resource.allocations
      .filter((allocation) => allocation.isBillable)
      .reduce((sum, allocation) => sum + allocation.percentage, 0);
    totalBillable += resourceBillable;
  }

  return {
    totalResources: resources.length,
    activeResources: activeResources.length,
    benchCount: benchResources.length,
    utilizationRate: totalCapacity > 0 ? round0((totalBillable / totalCapacity) * 100) : 0,
    benchCostMonthly: benchResources.length * 150000,
  };
}

function assertNumericParity(
  tenantId: string,
  metricId: string,
  expected: number,
  actual: number,
  mismatches: Mismatch[],
): void {
  if (expected !== actual) {
    mismatches.push({
      tenantId,
      metricId,
      expected,
      actual,
    });
  }
}

async function assertFrontendLabels(entries: ReportingMetricDictionaryEntry[]): Promise<string[]> {
  const root = path.resolve(__dirname, '../../../../');
  const dashboardPagePath = path.join(root, 'apps/frontend/src/pages/DashboardPage.tsx');
  const analyticsPagePath = path.join(root, 'apps/frontend/src/pages/AnalyticsPage.tsx');

  const [dashboardPageContent, analyticsPageContent] = await Promise.all([
    readFile(dashboardPagePath, 'utf-8'),
    readFile(analyticsPagePath, 'utf-8'),
  ]);

  const combinedContent = `${dashboardPageContent}\n${analyticsPageContent}`;
  const missingLabels: string[] = [];

  for (const entry of entries) {
    for (const label of entry.uiLabels) {
      if (!combinedContent.includes(label)) {
        missingLabels.push(`${entry.id}: ${label}`);
      }
    }
  }

  return missingLabels;
}

async function main(): Promise<void> {
  const entries = REPORTING_METRIC_DICTIONARY;
  const mismatches: Mismatch[] = [];

  const tenantIds = await getTenantIds();
  const labelFailures = await assertFrontendLabels(entries);

  for (const tenantId of tenantIds) {
    const [dashboardApi, dashboardSql, executiveApi, executiveSql] = await Promise.all([
      getDashboardMetrics(tenantId),
      deriveDashboardSqlMetrics(tenantId),
      getExecutiveMetrics(tenantId),
      deriveExecutiveSqlMetrics(tenantId),
    ]);

    assertNumericParity(
      tenantId,
      'DASH_RESOURCES_TOTAL_ACTIVE',
      dashboardSql.activeResourceCount,
      dashboardApi.resources.total,
      mismatches,
    );
    assertNumericParity(
      tenantId,
      'DASH_RESOURCES_TOTAL_ACTIVE::ACTIVE',
      dashboardSql.activeResourceCount,
      dashboardApi.resources.active,
      mismatches,
    );
    assertNumericParity(
      tenantId,
      'DASH_RESOURCES_ON_BENCH',
      dashboardSql.benchCount,
      dashboardApi.resources.onBench,
      mismatches,
    );
    assertNumericParity(
      tenantId,
      'DASH_ALLOCATIONS_ACTIVE',
      dashboardSql.activeAllocations,
      dashboardApi.allocations.active,
      mismatches,
    );
    assertNumericParity(
      tenantId,
      'DASH_ALLOCATIONS_PENDING',
      dashboardSql.pendingAllocations,
      dashboardApi.allocations.pending,
      mismatches,
    );
    assertNumericParity(
      tenantId,
      'DASH_ROLLOFFS_30D',
      dashboardSql.rolloffs,
      dashboardApi.allocations.rolloffsNext30Days,
      mismatches,
    );
    assertNumericParity(
      tenantId,
      'DASH_UTIL_CURRENT',
      dashboardSql.utilizationCurrent,
      dashboardApi.utilization.current,
      mismatches,
    );
    assertNumericParity(
      tenantId,
      'DASH_UTIL_BILLABLE',
      dashboardSql.utilizationBillable,
      dashboardApi.utilization.billable,
      mismatches,
    );
    assertNumericParity(
      tenantId,
      'DASH_UTIL_NON_BILLABLE',
      dashboardSql.utilizationNonBillable,
      dashboardApi.utilization.nonBillable,
      mismatches,
    );
    assertNumericParity(
      tenantId,
      'DASH_BENCH_COST_MONTHLY',
      dashboardSql.benchCostMonthly,
      dashboardApi.financials.benchCostMonthly,
      mismatches,
    );

    assertNumericParity(
      tenantId,
      'AN_EXEC_TOTAL_RESOURCES',
      executiveSql.totalResources,
      executiveApi.summary.totalResources,
      mismatches,
    );
    assertNumericParity(
      tenantId,
      'AN_EXEC_ACTIVE_RESOURCES',
      executiveSql.activeResources,
      executiveApi.summary.activeResources,
      mismatches,
    );
    assertNumericParity(
      tenantId,
      'AN_EXEC_UTILIZATION_RATE',
      executiveSql.utilizationRate,
      executiveApi.summary.utilizationRate,
      mismatches,
    );
    assertNumericParity(
      tenantId,
      'AN_EXEC_BENCH_COUNT',
      executiveSql.benchCount,
      executiveApi.summary.benchCount,
      mismatches,
    );
    assertNumericParity(
      tenantId,
      'AN_EXEC_BENCH_COST_MONTHLY',
      executiveSql.benchCostMonthly,
      executiveApi.summary.benchCostMonthly,
      mismatches,
    );
  }

  if (labelFailures.length > 0 || mismatches.length > 0) {
    console.error('❌ Reporting dictionary parity FAILED');
    console.error(`Dictionary version: ${REPORTING_DICTIONARY_VERSION}`);

    if (labelFailures.length > 0) {
      console.error('Missing frontend labels:');
      console.table(labelFailures.map((item) => ({ missingLabel: item })));
    }

    if (mismatches.length > 0) {
      console.error('API vs SQL mismatches:');
      console.table(mismatches);
    }

    process.exit(1);
  }

  console.log('✅ Reporting dictionary parity PASSED');
  console.log(`Dictionary version: ${REPORTING_DICTIONARY_VERSION}`);
  console.log(`Metrics in dictionary: ${entries.length}`);
  console.log(`Tenants checked: ${tenantIds.length}`);
}

main()
  .catch((error) => {
    console.error('❌ Reporting parity script failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
