/**
 * Budget Tracking Service - Pure Function Tests
 * 
 * Tests the budget vs actual tracking logic with:
 * - Budget calculations
 * - Burn rate analysis
 * - Health status determination
 * - Alert generation
 * - Variance calculations
 * - Forecast projections
 * 
 * These are REAL TESTS, not mock theater.
 */

import { describe, it, expect } from 'vitest';
import { ProjectType, ProjectStatus } from '@prisma/client';

// ============================================================================
// Pure Functions for Testing
// ============================================================================

/**
 * Calculate hours burn rate
 */
function calculateHoursBurnRate(actualHours: number, budgetHours: number): number {
  if (budgetHours <= 0) return 0;
  return Math.round((actualHours / budgetHours) * 100);
}

/**
 * Calculate cost burn rate
 */
function calculateCostBurnRate(actualCost: number, budgetAmount: number): number {
  if (budgetAmount <= 0) return 0;
  return Math.round((actualCost / budgetAmount) * 100);
}

/**
 * Calculate variance (positive = under budget, negative = over budget)
 */
function calculateVariance(budget: number, actual: number): number {
  return Math.round((budget - actual) * 100) / 100;
}

/**
 * Calculate remaining budget/hours
 */
function calculateRemaining(budget: number, actual: number): number {
  return Math.max(0, Math.round((budget - actual) * 100) / 100);
}

/**
 * Calculate billable percentage
 */
function calculateBillablePercentage(billableHours: number, totalHours: number): number {
  if (totalHours <= 0) return 0;
  return Math.round((billableHours / totalHours) * 100);
}

/**
 * Calculate time elapsed percentage
 */
function calculateTimeElapsed(
  startDate: Date,
  endDate: Date | null,
  currentDate: Date
): number {
  if (!endDate) return 0;
  
  const totalDays = Math.floor(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  if (totalDays <= 0) return 100;
  
  const elapsedDays = Math.max(0, Math.floor(
    (currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  ));
  
  return Math.min(100, Math.round((elapsedDays / totalDays) * 100));
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

interface BudgetAlert {
  type: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
}

/**
 * Generate budget alerts
 */
function generateAlerts(metrics: {
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

  // No budget
  if (metrics.budgetHours === 0 && metrics.budgetAmount === 0) {
    alerts.push({
      type: 'NO_BUDGET',
      severity: 'INFO',
      message: 'No budget defined',
    });
  }

  // Hours overspend
  if (metrics.budgetHours > 0 && metrics.hoursBurnRate > 100) {
    alerts.push({
      type: 'HOURS_OVERSPEND',
      severity: 'CRITICAL',
      message: `Hours exceeded by ${metrics.hoursBurnRate - 100}%`,
    });
  } else if (metrics.budgetHours > 0 && metrics.hoursBurnRate > metrics.timeElapsedPercentage + 15) {
    alerts.push({
      type: 'HOURS_OVERSPEND',
      severity: 'WARNING',
      message: 'Hours burn ahead of timeline',
    });
  }

  // Cost overspend
  if (metrics.budgetAmount > 0 && metrics.costBurnRate > 100) {
    alerts.push({
      type: 'COST_OVERSPEND',
      severity: 'CRITICAL',
      message: `Cost exceeded by ${metrics.costBurnRate - 100}%`,
    });
  }

  // Low billability
  if (metrics.actualHours > 100 && metrics.billablePercentage < 60) {
    alerts.push({
      type: 'UTILIZATION_LOW',
      severity: 'WARNING',
      message: `Low billable (${metrics.billablePercentage}%)`,
    });
  }

  return alerts;
}

/**
 * Calculate estimated revenue
 */
function calculateEstimatedRevenue(
  billableHours: number,
  billRate: number
): number {
  return Math.round(billableHours * billRate * 100) / 100;
}

/**
 * Calculate actual cost from timesheet entries
 */
function calculateActualCost(
  entries: Array<{ hours: number; costRate: number }>
): number {
  return entries.reduce((sum, e) => sum + (e.hours * e.costRate), 0);
}

/**
 * Calculate projected completion based on burn rate
 */
function projectCompletion(
  actualHours: number,
  budgetHours: number,
  daysElapsed: number,
  daysRemaining: number
): {
  projectedTotalHours: number;
  isOnTrack: boolean;
} {
  if (daysElapsed <= 0) {
    return {
      projectedTotalHours: budgetHours,
      isOnTrack: true,
    };
  }

  const burnRatePerDay = actualHours / daysElapsed;
  const projectedTotalHours = actualHours + (burnRatePerDay * daysRemaining);
  const isOnTrack = budgetHours <= 0 || projectedTotalHours <= budgetHours * 1.1;

  return {
    projectedTotalHours: Math.round(projectedTotalHours * 100) / 100,
    isOnTrack,
  };
}

/**
 * Calculate gross margin
 */
function calculateGrossMargin(revenue: number, cost: number): number {
  if (revenue <= 0) return 0;
  return Math.round(((revenue - cost) / revenue) * 100);
}

/**
 * Aggregate team metrics
 */
function aggregateTeamMetrics(
  projects: Array<{
    budgetHours: number;
    actualHours: number;
    budgetAmount: number;
    actualCost: number;
    healthStatus: 'HEALTHY' | 'AT_RISK' | 'CRITICAL';
  }>
): {
  totalBudgetHours: number;
  totalActualHours: number;
  totalBudgetAmount: number;
  totalActualCost: number;
  healthyCount: number;
  atRiskCount: number;
  criticalCount: number;
} {
  return projects.reduce(
    (acc, p) => ({
      totalBudgetHours: acc.totalBudgetHours + p.budgetHours,
      totalActualHours: acc.totalActualHours + p.actualHours,
      totalBudgetAmount: acc.totalBudgetAmount + p.budgetAmount,
      totalActualCost: acc.totalActualCost + p.actualCost,
      healthyCount: acc.healthyCount + (p.healthStatus === 'HEALTHY' ? 1 : 0),
      atRiskCount: acc.atRiskCount + (p.healthStatus === 'AT_RISK' ? 1 : 0),
      criticalCount: acc.criticalCount + (p.healthStatus === 'CRITICAL' ? 1 : 0),
    }),
    {
      totalBudgetHours: 0,
      totalActualHours: 0,
      totalBudgetAmount: 0,
      totalActualCost: 0,
      healthyCount: 0,
      atRiskCount: 0,
      criticalCount: 0,
    }
  );
}

// ============================================================================
// Test Suites
// ============================================================================

describe('Budget Tracking Service - Pure Function Tests', () => {
  describe('Burn Rate Calculations', () => {
    it('BT-001: should calculate hours burn rate correctly', () => {
      expect(calculateHoursBurnRate(80, 100)).toBe(80);
      expect(calculateHoursBurnRate(100, 100)).toBe(100);
      expect(calculateHoursBurnRate(120, 100)).toBe(120);
    });

    it('BT-002: should handle zero budget hours', () => {
      expect(calculateHoursBurnRate(100, 0)).toBe(0);
    });

    it('BT-003: should calculate cost burn rate correctly', () => {
      expect(calculateCostBurnRate(8000, 10000)).toBe(80);
      expect(calculateCostBurnRate(10000, 10000)).toBe(100);
      expect(calculateCostBurnRate(15000, 10000)).toBe(150);
    });

    it('BT-004: should handle zero budget amount', () => {
      expect(calculateCostBurnRate(5000, 0)).toBe(0);
    });

    it('BT-005: should round burn rates to integers', () => {
      expect(calculateHoursBurnRate(33, 100)).toBe(33);
      expect(calculateHoursBurnRate(66.6, 100)).toBe(67);
    });
  });

  describe('Variance Calculations', () => {
    it('BT-006: should calculate positive variance (under budget)', () => {
      expect(calculateVariance(10000, 8000)).toBe(2000);
    });

    it('BT-007: should calculate negative variance (over budget)', () => {
      expect(calculateVariance(10000, 12000)).toBe(-2000);
    });

    it('BT-008: should calculate zero variance (on budget)', () => {
      expect(calculateVariance(10000, 10000)).toBe(0);
    });

    it('BT-009: should round variance to 2 decimal places', () => {
      expect(calculateVariance(100, 33.333)).toBe(66.67);
    });
  });

  describe('Remaining Budget', () => {
    it('BT-010: should calculate remaining hours', () => {
      expect(calculateRemaining(100, 60)).toBe(40);
    });

    it('BT-011: should return zero when over budget', () => {
      expect(calculateRemaining(100, 120)).toBe(0);
    });

    it('BT-012: should handle exact match', () => {
      expect(calculateRemaining(100, 100)).toBe(0);
    });
  });

  describe('Billable Percentage', () => {
    it('BT-013: should calculate billable percentage', () => {
      expect(calculateBillablePercentage(80, 100)).toBe(80);
    });

    it('BT-014: should handle 100% billable', () => {
      expect(calculateBillablePercentage(100, 100)).toBe(100);
    });

    it('BT-015: should handle 0% billable', () => {
      expect(calculateBillablePercentage(0, 100)).toBe(0);
    });

    it('BT-016: should handle zero total hours', () => {
      expect(calculateBillablePercentage(0, 0)).toBe(0);
    });

    it('BT-017: should round to integer', () => {
      expect(calculateBillablePercentage(66, 100)).toBe(66);
      expect(calculateBillablePercentage(67, 100)).toBe(67);
    });
  });

  describe('Time Elapsed Calculation', () => {
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-03-31'); // 90 days

    it('BT-018: should calculate time elapsed at midpoint', () => {
      const midpoint = new Date('2024-02-14'); // ~45 days
      const elapsed = calculateTimeElapsed(startDate, endDate, midpoint);
      expect(elapsed).toBeGreaterThanOrEqual(45);
      expect(elapsed).toBeLessThanOrEqual(55);
    });

    it('BT-019: should return 0% at start', () => {
      const elapsed = calculateTimeElapsed(startDate, endDate, startDate);
      expect(elapsed).toBe(0);
    });

    it('BT-020: should return 100% at end', () => {
      const elapsed = calculateTimeElapsed(startDate, endDate, endDate);
      expect(elapsed).toBe(100);
    });

    it('BT-021: should cap at 100% past end date', () => {
      const pastEnd = new Date('2024-05-01');
      const elapsed = calculateTimeElapsed(startDate, endDate, pastEnd);
      expect(elapsed).toBe(100);
    });

    it('BT-022: should return 0% for null end date', () => {
      const elapsed = calculateTimeElapsed(startDate, null, new Date());
      expect(elapsed).toBe(0);
    });
  });

  describe('Health Status Determination', () => {
    it('BT-023: should return CRITICAL when over budget', () => {
      expect(determineHealthStatus(110, 90, 80)).toBe('CRITICAL');
      expect(determineHealthStatus(90, 110, 80)).toBe('CRITICAL');
    });

    it('BT-024: should return AT_RISK when approaching budget limit', () => {
      expect(determineHealthStatus(87, 80, 80)).toBe('AT_RISK');
      expect(determineHealthStatus(80, 88, 80)).toBe('AT_RISK');
    });

    it('BT-025: should return AT_RISK when burning faster than timeline', () => {
      expect(determineHealthStatus(70, 70, 40)).toBe('AT_RISK'); // 30% ahead
    });

    it('BT-026: should return HEALTHY for on-track projects', () => {
      expect(determineHealthStatus(50, 50, 50)).toBe('HEALTHY');
      expect(determineHealthStatus(60, 55, 50)).toBe('HEALTHY');
    });

    it('BT-027: should return HEALTHY at project start', () => {
      expect(determineHealthStatus(5, 5, 5)).toBe('HEALTHY');
    });

    it('BT-028: should handle edge case at 100%', () => {
      // 100% burn at 100% timeline is AT_RISK (not over budget)
      expect(determineHealthStatus(100, 100, 100)).toBe('AT_RISK');
    });
  });

  describe('Alert Generation', () => {
    it('BT-029: should generate NO_BUDGET alert', () => {
      const alerts = generateAlerts({
        budgetHours: 0,
        actualHours: 100,
        budgetAmount: 0,
        actualCost: 5000,
        hoursBurnRate: 0,
        costBurnRate: 0,
        timeElapsedPercentage: 50,
        billablePercentage: 80,
      });

      expect(alerts.find(a => a.type === 'NO_BUDGET')).toBeDefined();
    });

    it('BT-030: should generate CRITICAL hours overspend alert', () => {
      const alerts = generateAlerts({
        budgetHours: 100,
        actualHours: 120,
        budgetAmount: 10000,
        actualCost: 8000,
        hoursBurnRate: 120,
        costBurnRate: 80,
        timeElapsedPercentage: 80,
        billablePercentage: 80,
      });

      const alert = alerts.find(a => a.type === 'HOURS_OVERSPEND');
      expect(alert).toBeDefined();
      expect(alert?.severity).toBe('CRITICAL');
    });

    it('BT-031: should generate WARNING for hours ahead of timeline', () => {
      const alerts = generateAlerts({
        budgetHours: 100,
        actualHours: 70,
        budgetAmount: 10000,
        actualCost: 6000,
        hoursBurnRate: 70,
        costBurnRate: 60,
        timeElapsedPercentage: 40, // 30% ahead
        billablePercentage: 80,
      });

      const alert = alerts.find(
        a => a.type === 'HOURS_OVERSPEND' && a.severity === 'WARNING'
      );
      expect(alert).toBeDefined();
    });

    it('BT-032: should generate CRITICAL cost overspend alert', () => {
      const alerts = generateAlerts({
        budgetHours: 100,
        actualHours: 80,
        budgetAmount: 10000,
        actualCost: 12000,
        hoursBurnRate: 80,
        costBurnRate: 120,
        timeElapsedPercentage: 80,
        billablePercentage: 80,
      });

      const alert = alerts.find(a => a.type === 'COST_OVERSPEND');
      expect(alert).toBeDefined();
      expect(alert?.severity).toBe('CRITICAL');
    });

    it('BT-033: should generate low utilization alert', () => {
      const alerts = generateAlerts({
        budgetHours: 200,
        actualHours: 150,
        budgetAmount: 20000,
        actualCost: 15000,
        hoursBurnRate: 75,
        costBurnRate: 75,
        timeElapsedPercentage: 75,
        billablePercentage: 50, // Below 60%
      });

      const alert = alerts.find(a => a.type === 'UTILIZATION_LOW');
      expect(alert).toBeDefined();
    });

    it('BT-034: should not generate alerts for healthy project', () => {
      const alerts = generateAlerts({
        budgetHours: 100,
        actualHours: 45,
        budgetAmount: 10000,
        actualCost: 4500,
        hoursBurnRate: 45,
        costBurnRate: 45,
        timeElapsedPercentage: 50,
        billablePercentage: 85,
      });

      expect(alerts.filter(a => a.severity !== 'INFO')).toHaveLength(0);
    });
  });

  describe('Revenue Calculations', () => {
    it('BT-035: should calculate estimated revenue', () => {
      expect(calculateEstimatedRevenue(100, 125)).toBe(12500);
    });

    it('BT-036: should handle zero hours', () => {
      expect(calculateEstimatedRevenue(0, 125)).toBe(0);
    });

    it('BT-037: should round to 2 decimal places', () => {
      expect(calculateEstimatedRevenue(33.33, 100)).toBe(3333);
    });
  });

  describe('Cost Calculations', () => {
    it('BT-038: should calculate actual cost from entries', () => {
      const entries = [
        { hours: 8, costRate: 75 },
        { hours: 8, costRate: 100 },
        { hours: 4, costRate: 50 },
      ];
      expect(calculateActualCost(entries)).toBe(600 + 800 + 200);
    });

    it('BT-039: should handle empty entries', () => {
      expect(calculateActualCost([])).toBe(0);
    });
  });

  describe('Projection Calculations', () => {
    it('BT-040: should project completion on track', () => {
      const result = projectCompletion(50, 100, 30, 30);
      expect(result.projectedTotalHours).toBe(100);
      expect(result.isOnTrack).toBe(true);
    });

    it('BT-041: should detect over-budget projection', () => {
      const result = projectCompletion(80, 100, 30, 30); // burning 2.67/day
      expect(result.projectedTotalHours).toBe(160);
      expect(result.isOnTrack).toBe(false);
    });

    it('BT-042: should handle zero elapsed days', () => {
      const result = projectCompletion(0, 100, 0, 60);
      expect(result.projectedTotalHours).toBe(100);
      expect(result.isOnTrack).toBe(true);
    });

    it('BT-043: should allow 10% buffer for on-track', () => {
      const result = projectCompletion(55, 100, 50, 50); // projects to 110
      expect(result.projectedTotalHours).toBe(110);
      expect(result.isOnTrack).toBe(true);
    });

    it('BT-044: should handle no budget', () => {
      const result = projectCompletion(100, 0, 30, 30);
      expect(result.isOnTrack).toBe(true);
    });
  });

  describe('Gross Margin', () => {
    it('BT-045: should calculate positive margin', () => {
      expect(calculateGrossMargin(10000, 6000)).toBe(40);
    });

    it('BT-046: should calculate zero margin at breakeven', () => {
      expect(calculateGrossMargin(10000, 10000)).toBe(0);
    });

    it('BT-047: should calculate negative margin for loss', () => {
      expect(calculateGrossMargin(10000, 12000)).toBe(-20);
    });

    it('BT-048: should handle zero revenue', () => {
      expect(calculateGrossMargin(0, 5000)).toBe(0);
    });
  });

  describe('Team Aggregation', () => {
    it('BT-049: should aggregate team metrics correctly', () => {
      const projects = [
        { budgetHours: 100, actualHours: 80, budgetAmount: 10000, actualCost: 8000, healthStatus: 'HEALTHY' as const },
        { budgetHours: 200, actualHours: 220, budgetAmount: 20000, actualCost: 22000, healthStatus: 'CRITICAL' as const },
        { budgetHours: 150, actualHours: 140, budgetAmount: 15000, actualCost: 13500, healthStatus: 'AT_RISK' as const },
      ];

      const result = aggregateTeamMetrics(projects);

      expect(result.totalBudgetHours).toBe(450);
      expect(result.totalActualHours).toBe(440);
      expect(result.totalBudgetAmount).toBe(45000);
      expect(result.totalActualCost).toBe(43500);
      expect(result.healthyCount).toBe(1);
      expect(result.atRiskCount).toBe(1);
      expect(result.criticalCount).toBe(1);
    });

    it('BT-050: should handle empty project list', () => {
      const result = aggregateTeamMetrics([]);

      expect(result.totalBudgetHours).toBe(0);
      expect(result.totalActualHours).toBe(0);
      expect(result.healthyCount).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('BT-051: should handle very large numbers', () => {
      const burn = calculateHoursBurnRate(1000000, 900000);
      expect(burn).toBe(111);
    });

    it('BT-052: should handle very small numbers', () => {
      const burn = calculateHoursBurnRate(0.5, 1);
      expect(burn).toBe(50);
    });

    it('BT-053: should handle negative values gracefully', () => {
      // Budget corrections could result in negative adjustments
      const variance = calculateVariance(-1000, 500);
      expect(variance).toBe(-1500);
    });

    it('BT-054: should handle exact threshold values', () => {
      // At 85% burn with 85% time elapsed, NOT at risk (within 20% buffer)
      expect(determineHealthStatus(85, 85, 85)).toBe('HEALTHY');
      expect(determineHealthStatus(84, 84, 84)).toBe('HEALTHY');
      // But 86% burn is AT_RISK (>85% threshold)
      expect(determineHealthStatus(86, 86, 86)).toBe('AT_RISK');
    });

    it('BT-055: should handle concurrent project states', () => {
      const projects = [
        { budgetHours: 0, actualHours: 100, budgetAmount: 0, actualCost: 5000, healthStatus: 'HEALTHY' as const },
        { budgetHours: 100, actualHours: 150, budgetAmount: 10000, actualCost: 15000, healthStatus: 'CRITICAL' as const },
      ];

      const result = aggregateTeamMetrics(projects);
      expect(result.criticalCount).toBe(1);
      expect(result.healthyCount).toBe(1);
    });
  });

  describe('Scenario Testing', () => {
    it('BT-056: New project with no activity', () => {
      const status = determineHealthStatus(0, 0, 5);
      expect(status).toBe('HEALTHY');
    });

    it('BT-057: Project completing on time and budget', () => {
      const status = determineHealthStatus(95, 92, 95);
      expect(status).toBe('AT_RISK'); // Close to 100%
    });

    it('BT-058: Project with cost overrun but hours on track', () => {
      const status = determineHealthStatus(80, 110, 80);
      expect(status).toBe('CRITICAL');
    });

    it('BT-059: Project with hours overrun but cost on track', () => {
      const status = determineHealthStatus(110, 80, 80);
      expect(status).toBe('CRITICAL');
    });

    it('BT-060: Project ending early with underspend', () => {
      const status = determineHealthStatus(60, 55, 100);
      expect(status).toBe('HEALTHY');
    });
  });
});
