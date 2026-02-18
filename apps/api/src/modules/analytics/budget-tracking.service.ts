/**
 * Budget vs Actual Tracking Service - GOD LEVEL Implementation
 * 
 * Comprehensive analytics for:
 * - Project budget burn tracking
 * - Hours budget vs actual hours worked
 * - Cost budget vs actual costs incurred
 * - Revenue tracking and forecasting
 * - Practice/team financial performance
 * - Variance analysis with alerts
 * - Trend analysis and projections
 * 
 * @module analytics/budget-tracking
 */

import prisma from '../../lib/prisma';
import { logger } from '../../lib/logger';
import { ProjectType, ProjectStatus } from '@prisma/client';

// ============================================================================
// Types
// ============================================================================

export interface ProjectBudgetStatus {
  projectId: string;
  projectCode: string;
  projectName: string;
  clientName: string | null;
  projectType: ProjectType;
  status: ProjectStatus;
  
  // Hours Budget
  budgetHours: number;
  actualHours: number;
  remainingHours: number;
  hoursBurnRate: number; // percentage
  hoursVariance: number; // positive = under, negative = over
  
  // Cost Budget
  budgetAmount: number;
  actualCost: number;
  remainingBudget: number;
  costBurnRate: number; // percentage
  costVariance: number;
  
  // Revenue
  billableHours: number;
  nonBillableHours: number;
  billablePercentage: number;
  estimatedRevenue: number;
  actualRevenue: number; // based on approved timesheets
  
  // Timeline
  startDate: Date;
  endDate: Date | null;
  daysElapsed: number;
  daysRemaining: number;
  timeElapsedPercentage: number;
  
  // Health indicators
  healthStatus: 'HEALTHY' | 'AT_RISK' | 'CRITICAL';
  alerts: BudgetAlert[];
  
  // Forecast
  projectedTotalHours: number;
  projectedTotalCost: number;
  projectedEndDate: Date | null;
  isOnTrack: boolean;
}

export interface BudgetAlert {
  type: 'HOURS_OVERSPEND' | 'COST_OVERSPEND' | 'TIMELINE_RISK' | 'UTILIZATION_LOW' | 'NO_BUDGET';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
  metric?: string;
  threshold?: number;
  currentValue?: number;
}

export interface TeamBudgetPerformance {
  practiceId: string;
  practiceName: string;
  practiceCode: string;
  
  // Aggregated metrics
  totalProjects: number;
  activeProjects: number;
  
  // Hours
  totalBudgetHours: number;
  totalActualHours: number;
  hoursBurnRate: number;
  
  // Cost
  totalBudgetAmount: number;
  totalActualCost: number;
  costBurnRate: number;
  
  // Revenue
  totalBillableHours: number;
  totalEstimatedRevenue: number;
  billabilityRate: number;
  
  // Health
  healthyProjects: number;
  atRiskProjects: number;
  criticalProjects: number;
  
  // Utilization vs target
  targetUtilization: number;
  actualUtilization: number;
  utilizationGap: number;
}

export interface BudgetTrendData {
  period: string; // YYYY-MM or YYYY-WW
  budgetHours: number;
  actualHours: number;
  budgetCost: number;
  actualCost: number;
  variance: number;
  cumulativeBudget: number;
  cumulativeActual: number;
}

export interface BudgetForecast {
  projectId: string;
  currentBurnRate: number; // hours/day
  projectedCompletionDate: Date;
  projectedTotalHours: number;
  projectedTotalCost: number;
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  assumptions: string[];
  scenarios: {
    optimistic: { hours: number; cost: number; date: Date };
    realistic: { hours: number; cost: number; date: Date };
    pessimistic: { hours: number; cost: number; date: Date };
  };
}

export interface VarianceReport {
  totalVariance: number;
  varianceByProject: Array<{
    projectId: string;
    projectCode: string;
    variance: number;
    variancePercentage: number;
  }>;
  varianceByPractice: Array<{
    practiceId: string;
    practiceName: string;
    variance: number;
    variancePercentage: number;
  }>;
  varianceByMonth: Array<{
    month: string;
    plannedCost: number;
    actualCost: number;
    variance: number;
  }>;
  topOverspends: Array<{
    projectId: string;
    projectCode: string;
    overspend: number;
    percentageOver: number;
  }>;
  topUnderspends: Array<{
    projectId: string;
    projectCode: string;
    underspend: number;
    percentageUnder: number;
  }>;
}

export interface ExecutiveBudgetSummary {
  // Overall financial health
  totalBudgetedAmount: number;
  totalActualSpend: number;
  overallVariance: number;
  overallVariancePercentage: number;
  
  // Hours tracking
  totalBudgetedHours: number;
  totalActualHours: number;
  hoursVariance: number;
  
  // Revenue
  totalEstimatedRevenue: number;
  totalActualRevenue: number;
  revenueVariance: number;
  
  // Project health
  totalProjects: number;
  projectsOnTrack: number;
  projectsAtRisk: number;
  projectsCritical: number;
  
  // Efficiency metrics
  overallUtilization: number;
  overallBillability: number;
  revenuePerHour: number;
  costPerHour: number;
  grossMargin: number;
  
  // Trends
  monthOverMonthChange: number;
  quarterOverQuarterChange: number;
  
  // Alerts
  criticalAlerts: BudgetAlert[];
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_BILL_RATE = 125; // USD/hour
const DEFAULT_COST_RATE = 75; // USD/hour

// ============================================================================
// Core Service Functions
// ============================================================================

/**
 * Get comprehensive budget status for a single project
 */
export async function getProjectBudgetStatus(
  tenantId: string,
  projectId: string
): Promise<ProjectBudgetStatus | null> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId, deletedAt: null },
    include: {
      client: { select: { name: true } },
      practice: { select: { id: true, name: true, targetUtilization: true } },
      allocations: {
        where: { deletedAt: null },
        select: {
          id: true,
          percentage: true,
          startDate: true,
          endDate: true,
          status: true,
          isBillable: true,
          billRate: true,
          resource: {
            select: { id: true, costPerHour: true },
          },
        },
      },
      timesheetEntries: {
        where: { deletedAt: null },
        select: {
          id: true,
          hours: true,
          date: true,
          isBillable: true,
          billRate: true,
          status: true,
          resource: {
            select: { costPerHour: true },
          },
        },
      },
    },
  });

  if (!project) return null;

  // Calculate actual hours and costs
  const approvedEntries = project.timesheetEntries.filter(
    e => e.status === 'APPROVED' || e.status === 'INVOICED'
  );

  const actualHours = approvedEntries.reduce(
    (sum, e) => sum + Number(e.hours), 
    0
  );

  const billableHours = approvedEntries
    .filter(e => e.isBillable)
    .reduce((sum, e) => sum + Number(e.hours), 0);

  const nonBillableHours = actualHours - billableHours;

  // Calculate costs
  const actualCost = approvedEntries.reduce((sum, e) => {
    const rate = e.resource.costPerHour 
      ? Number(e.resource.costPerHour) 
      : DEFAULT_COST_RATE;
    return sum + (Number(e.hours) * rate);
  }, 0);

  // Calculate revenue
  const actualRevenue = approvedEntries
    .filter(e => e.isBillable)
    .reduce((sum, e) => {
      const rate = e.billRate 
        ? Number(e.billRate) 
        : (project.defaultRate ? Number(project.defaultRate) : DEFAULT_BILL_RATE);
      return sum + (Number(e.hours) * rate);
    }, 0);

  // Estimated revenue based on billable hours
  const avgBillRate = project.defaultRate 
    ? Number(project.defaultRate) 
    : DEFAULT_BILL_RATE;
  const estimatedRevenue = billableHours * avgBillRate;

  // Budget values
  const budgetHours = project.budgetHours || 0;
  const budgetAmount = project.budgetAmount ? Number(project.budgetAmount) : 0;

  // Calculate timeline
  const now = new Date();
  const startDate = new Date(project.startDate);
  const endDate = project.endDate ? new Date(project.endDate) : null;

  const daysElapsed = Math.max(0, Math.floor(
    (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  ));

  const daysRemaining = endDate 
    ? Math.max(0, Math.floor((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  const totalDays = endDate 
    ? Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    : daysElapsed;

  const timeElapsedPercentage = totalDays > 0 
    ? Math.round((daysElapsed / totalDays) * 100) 
    : 0;

  // Calculate burn rates
  const hoursBurnRate = budgetHours > 0 
    ? Math.round((actualHours / budgetHours) * 100) 
    : 0;

  const costBurnRate = budgetAmount > 0 
    ? Math.round((actualCost / budgetAmount) * 100) 
    : 0;

  // Calculate variances
  const hoursVariance = budgetHours - actualHours;
  const costVariance = budgetAmount - actualCost;
  const remainingHours = Math.max(0, budgetHours - actualHours);
  const remainingBudget = Math.max(0, budgetAmount - actualCost);

  // Calculate billable percentage
  const billablePercentage = actualHours > 0 
    ? Math.round((billableHours / actualHours) * 100) 
    : 0;

  // Generate alerts
  const alerts = generateProjectAlerts({
    budgetHours,
    actualHours,
    budgetAmount,
    actualCost,
    hoursBurnRate,
    costBurnRate,
    timeElapsedPercentage,
    billablePercentage,
  });

  // Determine health status
  const healthStatus = determineHealthStatus(hoursBurnRate, costBurnRate, timeElapsedPercentage);

  // Forecast
  const burnRatePerDay = daysElapsed > 0 ? actualHours / daysElapsed : 0;
  const projectedTotalHours = daysRemaining > 0 
    ? actualHours + (burnRatePerDay * daysRemaining)
    : actualHours;

  const costPerHour = actualHours > 0 ? actualCost / actualHours : DEFAULT_COST_RATE;
  const projectedTotalCost = projectedTotalHours * costPerHour;

  // Project on track assessment
  const isOnTrack = 
    (budgetHours === 0 || hoursBurnRate <= timeElapsedPercentage + 10) &&
    (budgetAmount === 0 || costBurnRate <= timeElapsedPercentage + 10);

  // Projected end date if over budget
  let projectedEndDate: Date | null = null;
  if (budgetHours > 0 && burnRatePerDay > 0 && remainingHours > 0) {
    const daysToComplete = remainingHours / burnRatePerDay;
    projectedEndDate = new Date(now.getTime() + (daysToComplete * 24 * 60 * 60 * 1000));
  }

  return {
    projectId: project.id,
    projectCode: project.code,
    projectName: project.name,
    clientName: project.client?.name || null,
    projectType: project.type,
    status: project.status,
    
    budgetHours,
    actualHours: Math.round(actualHours * 100) / 100,
    remainingHours: Math.round(remainingHours * 100) / 100,
    hoursBurnRate,
    hoursVariance: Math.round(hoursVariance * 100) / 100,
    
    budgetAmount: Math.round(budgetAmount * 100) / 100,
    actualCost: Math.round(actualCost * 100) / 100,
    remainingBudget: Math.round(remainingBudget * 100) / 100,
    costBurnRate,
    costVariance: Math.round(costVariance * 100) / 100,
    
    billableHours: Math.round(billableHours * 100) / 100,
    nonBillableHours: Math.round(nonBillableHours * 100) / 100,
    billablePercentage,
    estimatedRevenue: Math.round(estimatedRevenue * 100) / 100,
    actualRevenue: Math.round(actualRevenue * 100) / 100,
    
    startDate,
    endDate,
    daysElapsed,
    daysRemaining,
    timeElapsedPercentage,
    
    healthStatus,
    alerts,
    
    projectedTotalHours: Math.round(projectedTotalHours * 100) / 100,
    projectedTotalCost: Math.round(projectedTotalCost * 100) / 100,
    projectedEndDate,
    isOnTrack,
  };
}

/**
 * Get budget status for all projects in tenant
 */
export async function getAllProjectsBudgetStatus(
  tenantId: string,
  filters?: {
    status?: ProjectStatus[];
    type?: ProjectType[];
    practiceId?: string;
    clientId?: string;
    healthStatus?: ('HEALTHY' | 'AT_RISK' | 'CRITICAL')[];
    hasBudget?: boolean;
  }
): Promise<{
  projects: ProjectBudgetStatus[];
  summary: {
    total: number;
    healthy: number;
    atRisk: number;
    critical: number;
    noBudget: number;
  };
}> {
  const where: any = { tenantId, deletedAt: null };

  if (filters?.status) {
    where.status = { in: filters.status };
  }
  if (filters?.type) {
    where.type = { in: filters.type };
  }
  if (filters?.practiceId) {
    where.practiceId = filters.practiceId;
  }
  if (filters?.clientId) {
    where.clientId = filters.clientId;
  }
  if (filters?.hasBudget === true) {
    where.OR = [
      { budgetHours: { gt: 0 } },
      { budgetAmount: { gt: 0 } },
    ];
  }

  const projects = await prisma.project.findMany({
    where,
    select: { id: true },
  });

  const budgetStatuses = await Promise.all(
    projects.map(p => getProjectBudgetStatus(tenantId, p.id))
  );

  const validStatuses = budgetStatuses.filter(
    (s): s is ProjectBudgetStatus => s !== null
  );

  // Apply health filter if specified
  let filteredStatuses = validStatuses;
  if (filters?.healthStatus) {
    filteredStatuses = validStatuses.filter(
      s => filters.healthStatus!.includes(s.healthStatus)
    );
  }

  // Calculate summary
  const summary = {
    total: filteredStatuses.length,
    healthy: filteredStatuses.filter(s => s.healthStatus === 'HEALTHY').length,
    atRisk: filteredStatuses.filter(s => s.healthStatus === 'AT_RISK').length,
    critical: filteredStatuses.filter(s => s.healthStatus === 'CRITICAL').length,
    noBudget: filteredStatuses.filter(
      s => s.budgetHours === 0 && s.budgetAmount === 0
    ).length,
  };

  return {
    projects: filteredStatuses.sort((a, b) => {
      // Sort by health status (critical first), then by burn rate
      const healthOrder = { CRITICAL: 0, AT_RISK: 1, HEALTHY: 2 };
      const healthDiff = healthOrder[a.healthStatus] - healthOrder[b.healthStatus];
      if (healthDiff !== 0) return healthDiff;
      return b.hoursBurnRate - a.hoursBurnRate;
    }),
    summary,
  };
}

/**
 * Get budget performance by practice/team
 */
export async function getTeamBudgetPerformance(
  tenantId: string
): Promise<TeamBudgetPerformance[]> {
  const practices = await prisma.practice.findMany({
    where: { tenantId, status: 'ACTIVE' },
    include: {
      projects: {
        where: { deletedAt: null, status: { in: ['ACTIVE', 'PIPELINE'] } },
        include: {
          timesheetEntries: {
            where: { 
              deletedAt: null,
              status: { in: ['APPROVED', 'INVOICED'] },
            },
            select: {
              hours: true,
              isBillable: true,
              billRate: true,
              resource: { select: { costPerHour: true } },
            },
          },
        },
      },
      resources: {
        where: { status: 'ACTIVE', deletedAt: null },
        select: {
          allocations: {
            where: {
              status: 'ACTIVE',
              deletedAt: null,
            },
            select: { percentage: true, isBillable: true },
          },
        },
      },
    },
  });

  return practices.map(practice => {
    const activeProjects = practice.projects.filter(
      p => p.status === 'ACTIVE'
    );

    // Aggregate budgets
    let totalBudgetHours = 0;
    let totalBudgetAmount = 0;
    let totalActualHours = 0;
    let totalActualCost = 0;
    let totalBillableHours = 0;
    let totalEstimatedRevenue = 0;

    let healthyCount = 0;
    let atRiskCount = 0;
    let criticalCount = 0;

    for (const project of practice.projects) {
      totalBudgetHours += project.budgetHours || 0;
      totalBudgetAmount += project.budgetAmount ? Number(project.budgetAmount) : 0;

      for (const entry of project.timesheetEntries) {
        const hours = Number(entry.hours);
        totalActualHours += hours;
        
        const costRate = entry.resource.costPerHour 
          ? Number(entry.resource.costPerHour) 
          : DEFAULT_COST_RATE;
        totalActualCost += hours * costRate;

        if (entry.isBillable) {
          totalBillableHours += hours;
          const billRate = entry.billRate 
            ? Number(entry.billRate) 
            : DEFAULT_BILL_RATE;
          totalEstimatedRevenue += hours * billRate;
        }
      }

      // Determine project health
      const hoursBurn = project.budgetHours 
        ? (totalActualHours / project.budgetHours) * 100 
        : 0;
      const costBurn = project.budgetAmount 
        ? (totalActualCost / Number(project.budgetAmount)) * 100 
        : 0;
      const health = determineHealthStatus(hoursBurn, costBurn, 50);
      
      if (health === 'HEALTHY') healthyCount++;
      else if (health === 'AT_RISK') atRiskCount++;
      else criticalCount++;
    }

    // Calculate utilization
    let totalCapacity = 0;
    let totalAllocated = 0;
    let totalBillableAlloc = 0;

    for (const resource of practice.resources) {
      totalCapacity += 100;
      for (const alloc of resource.allocations) {
        totalAllocated += alloc.percentage;
        if (alloc.isBillable) {
          totalBillableAlloc += alloc.percentage;
        }
      }
    }

    const actualUtilization = totalCapacity > 0 
      ? Math.round((totalAllocated / totalCapacity) * 100) 
      : 0;

    const billabilityRate = totalActualHours > 0 
      ? Math.round((totalBillableHours / totalActualHours) * 100) 
      : 0;

    return {
      practiceId: practice.id,
      practiceName: practice.name,
      practiceCode: practice.code,
      
      totalProjects: practice.projects.length,
      activeProjects: activeProjects.length,
      
      totalBudgetHours: Math.round(totalBudgetHours),
      totalActualHours: Math.round(totalActualHours * 100) / 100,
      hoursBurnRate: totalBudgetHours > 0 
        ? Math.round((totalActualHours / totalBudgetHours) * 100) 
        : 0,
      
      totalBudgetAmount: Math.round(totalBudgetAmount * 100) / 100,
      totalActualCost: Math.round(totalActualCost * 100) / 100,
      costBurnRate: totalBudgetAmount > 0 
        ? Math.round((totalActualCost / totalBudgetAmount) * 100) 
        : 0,
      
      totalBillableHours: Math.round(totalBillableHours * 100) / 100,
      totalEstimatedRevenue: Math.round(totalEstimatedRevenue * 100) / 100,
      billabilityRate,
      
      healthyProjects: healthyCount,
      atRiskProjects: atRiskCount,
      criticalProjects: criticalCount,
      
      targetUtilization: practice.targetUtilization || 85,
      actualUtilization,
      utilizationGap: (practice.targetUtilization || 85) - actualUtilization,
    };
  }).sort((a, b) => b.totalActualCost - a.totalActualCost);
}

/**
 * Get budget trend data for time series analysis
 */
export async function getBudgetTrends(
  tenantId: string,
  projectId: string | null,
  periodType: 'weekly' | 'monthly' = 'monthly',
  monthsBack: number = 6
): Promise<BudgetTrendData[]> {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - monthsBack);
  startDate.setDate(1);

  const where: any = {
    tenantId,
    deletedAt: null,
    date: { gte: startDate },
    status: { in: ['APPROVED', 'INVOICED'] },
  };

  if (projectId) {
    where.projectId = projectId;
  }

  const entries = await prisma.timesheetEntry.findMany({
    where,
    select: {
      date: true,
      hours: true,
      resource: { select: { costPerHour: true } },
      project: { 
        select: { 
          budgetHours: true, 
          budgetAmount: true,
          startDate: true,
          endDate: true,
        } 
      },
    },
    orderBy: { date: 'asc' },
  });

  // Group by period
  const periodMap = new Map<string, {
    hours: number;
    cost: number;
    budgetHours: number;
    budgetCost: number;
  }>();

  for (const entry of entries) {
    const date = new Date(entry.date);
    const period = periodType === 'monthly'
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      : `${date.getFullYear()}-W${String(getWeekNumber(date)).padStart(2, '0')}`;

    if (!periodMap.has(period)) {
      periodMap.set(period, { hours: 0, cost: 0, budgetHours: 0, budgetCost: 0 });
    }

    const data = periodMap.get(period)!;
    const hours = Number(entry.hours);
    const costRate = entry.resource.costPerHour 
      ? Number(entry.resource.costPerHour) 
      : DEFAULT_COST_RATE;

    data.hours += hours;
    data.cost += hours * costRate;

    // Pro-rate budget for the period (rough estimate)
    const projectBudgetHours = entry.project.budgetHours || 0;
    const projectBudgetAmount = entry.project.budgetAmount 
      ? Number(entry.project.budgetAmount) 
      : 0;

    if (entry.project.startDate && entry.project.endDate) {
      const projectDuration = Math.ceil(
        (new Date(entry.project.endDate).getTime() - 
         new Date(entry.project.startDate).getTime()) / 
        (1000 * 60 * 60 * 24 * 30)
      );
      if (projectDuration > 0) {
        data.budgetHours += projectBudgetHours / projectDuration;
        data.budgetCost += projectBudgetAmount / projectDuration;
      }
    }
  }

  // Convert to array and calculate cumulative
  const trends: BudgetTrendData[] = [];
  let cumulativeBudget = 0;
  let cumulativeActual = 0;

  const sortedPeriods = Array.from(periodMap.entries()).sort(
    ([a], [b]) => a.localeCompare(b)
  );

  for (const [period, data] of sortedPeriods) {
    cumulativeBudget += data.budgetCost;
    cumulativeActual += data.cost;

    trends.push({
      period,
      budgetHours: Math.round(data.budgetHours * 100) / 100,
      actualHours: Math.round(data.hours * 100) / 100,
      budgetCost: Math.round(data.budgetCost * 100) / 100,
      actualCost: Math.round(data.cost * 100) / 100,
      variance: Math.round((data.budgetCost - data.cost) * 100) / 100,
      cumulativeBudget: Math.round(cumulativeBudget * 100) / 100,
      cumulativeActual: Math.round(cumulativeActual * 100) / 100,
    });
  }

  return trends;
}

/**
 * Generate budget forecast for a project
 */
export async function generateBudgetForecast(
  tenantId: string,
  projectId: string
): Promise<BudgetForecast | null> {
  const status = await getProjectBudgetStatus(tenantId, projectId);
  if (!status) return null;

  // Calculate historical burn rate (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentEntries = await prisma.timesheetEntry.findMany({
    where: {
      tenantId,
      projectId,
      deletedAt: null,
      date: { gte: thirtyDaysAgo },
      status: { in: ['APPROVED', 'INVOICED'] },
    },
    select: { hours: true, date: true },
  });

  // Calculate daily burn rate
  const totalRecentHours = recentEntries.reduce(
    (sum, e) => sum + Number(e.hours), 
    0
  );
  
  const uniqueDays = new Set(
    recentEntries.map(e => new Date(e.date).toISOString().split('T')[0])
  ).size;

  const avgBurnRatePerDay = uniqueDays > 0 
    ? totalRecentHours / uniqueDays 
    : (status.actualHours / Math.max(1, status.daysElapsed));

  // Calculate confidence based on data quality
  let confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
  if (uniqueDays >= 20 && status.daysElapsed >= 30) {
    confidenceLevel = 'HIGH';
  } else if (uniqueDays >= 10 && status.daysElapsed >= 14) {
    confidenceLevel = 'MEDIUM';
  }

  // Assumptions
  const assumptions: string[] = [];
  if (status.budgetHours === 0) {
    assumptions.push('No budget hours defined - using time-based estimation');
  }
  if (confidenceLevel === 'LOW') {
    assumptions.push('Limited historical data - forecast reliability is low');
  }
  assumptions.push(`Based on ${uniqueDays} days of recent data`);
  assumptions.push(`Average burn rate: ${avgBurnRatePerDay.toFixed(2)} hours/day`);

  // Calculate projections
  const remainingWorkDays = status.endDate 
    ? Math.ceil((status.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  const projectedHours = status.actualHours + (avgBurnRatePerDay * remainingWorkDays);
  const avgCostPerHour = status.actualHours > 0 
    ? status.actualCost / status.actualHours 
    : DEFAULT_COST_RATE;
  const projectedCost = projectedHours * avgCostPerHour;

  // Completion date
  let projectedCompletionDate = status.endDate || new Date();
  if (status.budgetHours > 0 && status.remainingHours > 0 && avgBurnRatePerDay > 0) {
    const daysToComplete = status.remainingHours / avgBurnRatePerDay;
    projectedCompletionDate = new Date(Date.now() + (daysToComplete * 24 * 60 * 60 * 1000));
  }

  // Scenarios (±20% variance)
  const optimisticFactor = 0.8;
  const pessimisticFactor = 1.2;

  return {
    projectId,
    currentBurnRate: Math.round(avgBurnRatePerDay * 100) / 100,
    projectedCompletionDate,
    projectedTotalHours: Math.round(projectedHours * 100) / 100,
    projectedTotalCost: Math.round(projectedCost * 100) / 100,
    confidenceLevel,
    assumptions,
    scenarios: {
      optimistic: {
        hours: Math.round(projectedHours * optimisticFactor * 100) / 100,
        cost: Math.round(projectedCost * optimisticFactor * 100) / 100,
        date: new Date(
          Date.now() + 
          ((status.remainingHours / avgBurnRatePerDay) * pessimisticFactor * 24 * 60 * 60 * 1000)
        ),
      },
      realistic: {
        hours: Math.round(projectedHours * 100) / 100,
        cost: Math.round(projectedCost * 100) / 100,
        date: projectedCompletionDate,
      },
      pessimistic: {
        hours: Math.round(projectedHours * pessimisticFactor * 100) / 100,
        cost: Math.round(projectedCost * pessimisticFactor * 100) / 100,
        date: new Date(
          Date.now() + 
          ((status.remainingHours / avgBurnRatePerDay) * pessimisticFactor * 24 * 60 * 60 * 1000)
        ),
      },
    },
  };
}

/**
 * Generate variance report
 */
export async function generateVarianceReport(
  tenantId: string,
  options?: {
    projectIds?: string[];
    practiceIds?: string[];
    startDate?: Date;
    endDate?: Date;
  }
): Promise<VarianceReport> {
  const { projects } = await getAllProjectsBudgetStatus(tenantId, {
    status: ['ACTIVE', 'COMPLETED'],
  });

  // Filter if project IDs specified
  let filteredProjects = projects;
  if (options?.projectIds?.length) {
    filteredProjects = projects.filter(
      p => options.projectIds!.includes(p.projectId)
    );
  }

  // Calculate total variance
  const totalVariance = filteredProjects.reduce(
    (sum, p) => sum + p.costVariance, 
    0
  );

  // Variance by project
  const varianceByProject = filteredProjects.map(p => ({
    projectId: p.projectId,
    projectCode: p.projectCode,
    variance: p.costVariance,
    variancePercentage: p.budgetAmount > 0 
      ? Math.round((p.costVariance / p.budgetAmount) * 100) 
      : 0,
  })).sort((a, b) => a.variance - b.variance);

  // Get practices for grouping
  const practiceProjects = await prisma.project.findMany({
    where: { 
      tenantId, 
      id: { in: filteredProjects.map(p => p.projectId) },
    },
    select: { 
      id: true, 
      practice: { select: { id: true, name: true } },
    },
  });

  const practiceMap = new Map<string, {
    practiceId: string;
    practiceName: string;
    variance: number;
    budget: number;
  }>();

  for (const project of filteredProjects) {
    const practiceProject = practiceProjects.find(pp => pp.id === project.projectId);
    const practiceId = practiceProject?.practice?.id || 'unassigned';
    const practiceName = practiceProject?.practice?.name || 'Unassigned';

    if (!practiceMap.has(practiceId)) {
      practiceMap.set(practiceId, {
        practiceId,
        practiceName,
        variance: 0,
        budget: 0,
      });
    }

    const data = practiceMap.get(practiceId)!;
    data.variance += project.costVariance;
    data.budget += project.budgetAmount;
  }

  const varianceByPractice = Array.from(practiceMap.values()).map(p => ({
    practiceId: p.practiceId,
    practiceName: p.practiceName,
    variance: Math.round(p.variance * 100) / 100,
    variancePercentage: p.budget > 0 
      ? Math.round((p.variance / p.budget) * 100) 
      : 0,
  })).sort((a, b) => a.variance - b.variance);

  // Monthly variance (from trends)
  const trends = await getBudgetTrends(tenantId, null, 'monthly', 6);
  const varianceByMonth = trends.map(t => ({
    month: t.period,
    plannedCost: t.budgetCost,
    actualCost: t.actualCost,
    variance: t.variance,
  }));

  // Top overspends and underspends
  const topOverspends = varianceByProject
    .filter(v => v.variance < 0)
    .slice(0, 5)
    .map(v => ({
      projectId: v.projectId,
      projectCode: v.projectCode,
      overspend: Math.abs(v.variance),
      percentageOver: Math.abs(v.variancePercentage),
    }));

  const topUnderspends = varianceByProject
    .filter(v => v.variance > 0)
    .slice(-5)
    .reverse()
    .map(v => ({
      projectId: v.projectId,
      projectCode: v.projectCode,
      underspend: v.variance,
      percentageUnder: v.variancePercentage,
    }));

  return {
    totalVariance: Math.round(totalVariance * 100) / 100,
    varianceByProject,
    varianceByPractice,
    varianceByMonth,
    topOverspends,
    topUnderspends,
  };
}

/**
 * Get executive budget summary
 */
export async function getExecutiveBudgetSummary(
  tenantId: string
): Promise<ExecutiveBudgetSummary> {
  const { projects, summary } = await getAllProjectsBudgetStatus(tenantId, {
    status: ['ACTIVE', 'PIPELINE'],
  });

  // Aggregate totals
  let totalBudgetedAmount = 0;
  let totalActualSpend = 0;
  let totalBudgetedHours = 0;
  let totalActualHours = 0;
  let totalEstimatedRevenue = 0;
  let totalActualRevenue = 0;
  let totalBillableHours = 0;

  const criticalAlerts: BudgetAlert[] = [];

  for (const project of projects) {
    totalBudgetedAmount += project.budgetAmount;
    totalActualSpend += project.actualCost;
    totalBudgetedHours += project.budgetHours;
    totalActualHours += project.actualHours;
    totalEstimatedRevenue += project.estimatedRevenue;
    totalActualRevenue += project.actualRevenue;
    totalBillableHours += project.billableHours;

    // Collect critical alerts
    for (const alert of project.alerts) {
      if (alert.severity === 'CRITICAL') {
        criticalAlerts.push({
          ...alert,
          message: `[${project.projectCode}] ${alert.message}`,
        });
      }
    }
  }

  const overallVariance = totalBudgetedAmount - totalActualSpend;
  const overallVariancePercentage = totalBudgetedAmount > 0 
    ? Math.round((overallVariance / totalBudgetedAmount) * 100) 
    : 0;

  const hoursVariance = totalBudgetedHours - totalActualHours;
  const revenueVariance = totalEstimatedRevenue - totalActualRevenue;

  // Efficiency metrics
  const overallUtilization = totalBudgetedHours > 0 
    ? Math.round((totalActualHours / totalBudgetedHours) * 100) 
    : 0;
  
  const overallBillability = totalActualHours > 0 
    ? Math.round((totalBillableHours / totalActualHours) * 100) 
    : 0;

  const revenuePerHour = totalActualHours > 0 
    ? Math.round((totalActualRevenue / totalActualHours) * 100) / 100 
    : 0;

  const costPerHour = totalActualHours > 0 
    ? Math.round((totalActualSpend / totalActualHours) * 100) / 100 
    : 0;

  const grossMargin = totalActualRevenue > 0 
    ? Math.round(((totalActualRevenue - totalActualSpend) / totalActualRevenue) * 100) 
    : 0;

  // Calculate trends (requires historical data)
  const trends = await getBudgetTrends(tenantId, null, 'monthly', 6);
  
  let monthOverMonthChange = 0;
  let quarterOverQuarterChange = 0;

  if (trends.length >= 2) {
    const lastMonth = trends[trends.length - 1];
    const prevMonth = trends[trends.length - 2];
    monthOverMonthChange = prevMonth.actualCost > 0 
      ? Math.round(((lastMonth.actualCost - prevMonth.actualCost) / prevMonth.actualCost) * 100)
      : 0;
  }

  if (trends.length >= 6) {
    const lastQuarter = trends.slice(-3).reduce((sum, t) => sum + t.actualCost, 0);
    const prevQuarter = trends.slice(-6, -3).reduce((sum, t) => sum + t.actualCost, 0);
    quarterOverQuarterChange = prevQuarter > 0 
      ? Math.round(((lastQuarter - prevQuarter) / prevQuarter) * 100)
      : 0;
  }

  return {
    totalBudgetedAmount: Math.round(totalBudgetedAmount * 100) / 100,
    totalActualSpend: Math.round(totalActualSpend * 100) / 100,
    overallVariance: Math.round(overallVariance * 100) / 100,
    overallVariancePercentage,
    
    totalBudgetedHours: Math.round(totalBudgetedHours),
    totalActualHours: Math.round(totalActualHours * 100) / 100,
    hoursVariance: Math.round(hoursVariance * 100) / 100,
    
    totalEstimatedRevenue: Math.round(totalEstimatedRevenue * 100) / 100,
    totalActualRevenue: Math.round(totalActualRevenue * 100) / 100,
    revenueVariance: Math.round(revenueVariance * 100) / 100,
    
    totalProjects: summary.total,
    projectsOnTrack: summary.healthy,
    projectsAtRisk: summary.atRisk,
    projectsCritical: summary.critical,
    
    overallUtilization,
    overallBillability,
    revenuePerHour,
    costPerHour,
    grossMargin,
    
    monthOverMonthChange,
    quarterOverQuarterChange,
    
    criticalAlerts: criticalAlerts.slice(0, 10), // Top 10 critical alerts
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate alerts based on budget metrics
 */
function generateProjectAlerts(metrics: {
  budgetHours: number;
  actualHours: number;
  budgetAmount: number;
  actualCost: number;
  hoursBurnRate: number;
  costBurnRate: number;
  timeElapsedPercentage: number;
  billablePercentage: number;
}): BudgetAlert[] {
  const alerts: BudgetAlert[] = [];

  // No budget alert
  if (metrics.budgetHours === 0 && metrics.budgetAmount === 0) {
    alerts.push({
      type: 'NO_BUDGET',
      severity: 'INFO',
      message: 'No budget defined for this project',
    });
  }

  // Hours overspend
  if (metrics.budgetHours > 0) {
    if (metrics.hoursBurnRate > 100) {
      alerts.push({
        type: 'HOURS_OVERSPEND',
        severity: 'CRITICAL',
        message: `Hours budget exceeded by ${metrics.hoursBurnRate - 100}%`,
        metric: 'hoursBurnRate',
        threshold: 100,
        currentValue: metrics.hoursBurnRate,
      });
    } else if (metrics.hoursBurnRate > metrics.timeElapsedPercentage + 15) {
      alerts.push({
        type: 'HOURS_OVERSPEND',
        severity: 'WARNING',
        message: `Hours burn rate (${metrics.hoursBurnRate}%) ahead of timeline (${metrics.timeElapsedPercentage}%)`,
        metric: 'hoursBurnRate',
        threshold: metrics.timeElapsedPercentage + 15,
        currentValue: metrics.hoursBurnRate,
      });
    }
  }

  // Cost overspend
  if (metrics.budgetAmount > 0) {
    if (metrics.costBurnRate > 100) {
      alerts.push({
        type: 'COST_OVERSPEND',
        severity: 'CRITICAL',
        message: `Cost budget exceeded by ${metrics.costBurnRate - 100}%`,
        metric: 'costBurnRate',
        threshold: 100,
        currentValue: metrics.costBurnRate,
      });
    } else if (metrics.costBurnRate > metrics.timeElapsedPercentage + 15) {
      alerts.push({
        type: 'COST_OVERSPEND',
        severity: 'WARNING',
        message: `Cost burn rate (${metrics.costBurnRate}%) ahead of timeline (${metrics.timeElapsedPercentage}%)`,
        metric: 'costBurnRate',
        threshold: metrics.timeElapsedPercentage + 15,
        currentValue: metrics.costBurnRate,
      });
    }
  }

  // Timeline risk
  if (metrics.timeElapsedPercentage > 90 && metrics.hoursBurnRate < 80) {
    alerts.push({
      type: 'TIMELINE_RISK',
      severity: 'WARNING',
      message: 'Project timeline nearly complete but work appears behind schedule',
      metric: 'timeElapsedPercentage',
      threshold: 90,
      currentValue: metrics.timeElapsedPercentage,
    });
  }

  // Low utilization/billability
  if (metrics.actualHours > 100 && metrics.billablePercentage < 60) {
    alerts.push({
      type: 'UTILIZATION_LOW',
      severity: 'WARNING',
      message: `Low billable percentage (${metrics.billablePercentage}%)`,
      metric: 'billablePercentage',
      threshold: 60,
      currentValue: metrics.billablePercentage,
    });
  }

  return alerts;
}

/**
 * Determine project health status
 */
function determineHealthStatus(
  hoursBurnRate: number,
  costBurnRate: number,
  timeElapsedPercentage: number
): 'HEALTHY' | 'AT_RISK' | 'CRITICAL' {
  // Critical if over budget
  if (hoursBurnRate > 100 || costBurnRate > 100) {
    return 'CRITICAL';
  }

  // At risk if burning faster than timeline
  const burnVsTime = Math.max(hoursBurnRate, costBurnRate) - timeElapsedPercentage;
  if (burnVsTime > 20) {
    return 'AT_RISK';
  }

  // At risk if approaching budget limit
  if (hoursBurnRate > 85 || costBurnRate > 85) {
    return 'AT_RISK';
  }

  return 'HEALTHY';
}

/**
 * Get ISO week number
 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// ============================================================================
// Logging
// ============================================================================

logger.info('Budget Tracking Service initialized');
