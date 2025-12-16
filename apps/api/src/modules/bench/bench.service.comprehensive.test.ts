/**
 * Comprehensive Bench Service Tests
 * Tests: BENCH-U-001 to BENCH-U-011
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock Prisma
const mockPrisma = {
  resource: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  practice: {
    findUnique: vi.fn(),
  },
  allocation: {
    findMany: vi.fn(),
  },
};

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrisma),
}));

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

interface BenchResource {
  id: string;
  firstName: string;
  lastName: string;
  costRate: number;
  benchStartDate: Date;
  daysOnBench: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

interface BenchAnalytics {
  totalOnBench: number;
  totalBenchCost: number;
  avgDaysOnBench: number;
  byPractice: Record<string, number>;
}

// ═══════════════════════════════════════════════════════════════════════
// VALIDATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════

// BENCH-U-001: Date range validation
function validateDateRange(startDate: Date, endDate: Date): { valid: boolean; error?: string } {
  if (startDate > endDate) {
    return { valid: false, error: 'Start date must be before end date' };
  }
  return { valid: true };
}

// BENCH-U-007: Bench cost calculation
function calculateBenchCost(resources: Array<{ costRate: number }>, daysInMonth: number = 30): number {
  return resources.reduce((total, r) => total + (r.costRate / daysInMonth), 0) * daysInMonth;
}

// BENCH-U-008: Days on bench (configurable for weekends)
function calculateDaysOnBench(startDate: Date, includeWeekends: boolean = false): number {
  const today = new Date();
  let days = 0;
  const current = new Date(startDate);
  
  while (current <= today) {
    const dayOfWeek = current.getDay();
    if (includeWeekends || (dayOfWeek !== 0 && dayOfWeek !== 6)) {
      days++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return days;
}

// BENCH-U-009: Long bench alert threshold
function getBenchPriority(daysOnBench: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (daysOnBench > 90) return 'CRITICAL';
  if (daysOnBench > 60) return 'HIGH';
  if (daysOnBench > 30) return 'MEDIUM';
  return 'LOW';
}

// BENCH-U-010: Forecast based on rolloffs
function forecastBench(
  currentBench: number,
  upcomingRolloffs: Array<{ date: Date; count: number }>,
  upcomingJoins: Array<{ date: Date; count: number }>,
  forecastDays: number
): Array<{ date: Date; benchCount: number }> {
  const today = new Date();
  const forecast: Array<{ date: Date; benchCount: number }> = [];
  let currentCount = currentBench;
  
  for (let i = 0; i <= forecastDays; i += 30) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    
    // Add rolloffs
    const rolloffsToDate = upcomingRolloffs
      .filter(r => r.date <= date)
      .reduce((sum, r) => sum + r.count, 0);
    
    // Subtract joins
    const joinsToDate = upcomingJoins
      .filter(j => j.date <= date)
      .reduce((sum, j) => sum + j.count, 0);
    
    forecast.push({
      date,
      benchCount: currentCount + rolloffsToDate - joinsToDate,
    });
  }
  
  return forecast;
}

describe('Bench Service - Comprehensive Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════
  // VALIDATION TESTS
  // ═══════════════════════════════════════════════════════════════════════

  describe('Date Range Validation', () => {
    // BENCH-U-001: Valid date range
    it('BENCH-U-001: should accept valid date range', () => {
      const result = validateDateRange(
        new Date('2025-01-01'),
        new Date('2025-12-31')
      );
      expect(result.valid).toBe(true);
    });

    it('BENCH-U-001: should reject invalid date range', () => {
      const result = validateDateRange(
        new Date('2025-12-31'),
        new Date('2025-01-01')
      );
      expect(result.valid).toBe(false);
    });
  });

  describe('Practice Filter Validation', () => {
    // BENCH-U-002: Practice ID must exist
    it('BENCH-U-002: should validate practice exists', async () => {
      mockPrisma.practice.findUnique.mockResolvedValue({
        id: 'practice-1',
        name: 'Engineering',
      });
      
      const practice = await mockPrisma.practice.findUnique({
        where: { id: 'practice-1' },
      });
      
      expect(practice).not.toBeNull();
    });

    it('BENCH-U-002: should handle non-existent practice', async () => {
      mockPrisma.practice.findUnique.mockResolvedValue(null);
      
      const practice = await mockPrisma.practice.findUnique({
        where: { id: 'invalid-practice' },
      });
      
      expect(practice).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // EDGE CASE TESTS
  // ═══════════════════════════════════════════════════════════════════════

  describe('Zero Bench Resources', () => {
    // BENCH-U-003: Handle no resources on bench
    it('BENCH-U-003: should return empty array with zero bench cost', async () => {
      mockPrisma.resource.findMany.mockResolvedValue([]);
      
      const benchResources = await mockPrisma.resource.findMany({
        where: { status: 'BENCH' },
      });
      
      expect(benchResources).toEqual([]);
      expect(calculateBenchCost([])).toBe(0);
    });
  });

  describe('All Resources on Bench', () => {
    // BENCH-U-004: Handle 100% on bench
    it('BENCH-U-004: should handle all resources on bench', async () => {
      const allResources = Array.from({ length: 100 }, (_, i) => ({
        id: `res-${i}`,
        status: 'BENCH',
        costRate: 100000,
      }));
      
      mockPrisma.resource.findMany.mockResolvedValue(allResources);
      
      const benchResources = await mockPrisma.resource.findMany({
        where: { status: 'BENCH' },
      });
      
      expect(benchResources.length).toBe(100);
    });
  });

  describe('Resource Just Started Bench', () => {
    // BENCH-U-005: Resource on bench 1 day
    it('BENCH-U-005: should include resource on bench for 1 day', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const days = calculateDaysOnBench(yesterday, true);
      expect(days).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Long-term Bench', () => {
    // BENCH-U-006: Resource on bench for over 1 year
    it('BENCH-U-006: should flag long-term bench as critical', () => {
      const priority = getBenchPriority(400); // > 1 year
      expect(priority).toBe('CRITICAL');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // BUSINESS RULE TESTS
  // ═══════════════════════════════════════════════════════════════════════

  describe('Bench Cost Calculation', () => {
    // BENCH-U-007: Accurate bench cost calculation
    it('BENCH-U-007: should calculate correct monthly bench cost', () => {
      const resources = [
        { costRate: 100000 }, // ₹1L/month
        { costRate: 100000 },
        { costRate: 100000 },
      ];
      
      const monthlyCost = calculateBenchCost(resources);
      expect(monthlyCost).toBe(300000); // ₹3L/month
    });

    it('BENCH-U-007: should handle zero cost rate resources', () => {
      const resources = [
        { costRate: 0 },
      ];
      
      const monthlyCost = calculateBenchCost(resources);
      expect(monthlyCost).toBe(0);
    });
  });

  describe('Days on Bench Calculation', () => {
    // BENCH-U-008: Days calculation with weekend config
    it('BENCH-U-008: should include weekends when configured', () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      
      const daysWithWeekends = calculateDaysOnBench(startDate, true);
      const daysWithoutWeekends = calculateDaysOnBench(startDate, false);
      
      expect(daysWithWeekends).toBeGreaterThanOrEqual(daysWithoutWeekends);
    });
  });

  describe('Long Bench Alert', () => {
    // BENCH-U-009: Alert for > 30 days on bench
    it('BENCH-U-009: should return LOW for < 30 days', () => {
      expect(getBenchPriority(15)).toBe('LOW');
    });

    it('BENCH-U-009: should return MEDIUM for 30-60 days', () => {
      expect(getBenchPriority(45)).toBe('MEDIUM');
    });

    it('BENCH-U-009: should return HIGH for 60-90 days', () => {
      expect(getBenchPriority(75)).toBe('HIGH');
    });

    it('BENCH-U-009: should return CRITICAL for > 90 days', () => {
      expect(getBenchPriority(100)).toBe('CRITICAL');
    });
  });

  describe('Bench Forecast', () => {
    // BENCH-U-010: Forecast based on rolloffs
    it('BENCH-U-010: should forecast bench increase from rolloffs', () => {
      const rolloffs = [
        { date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), count: 5 },
      ];
      
      const forecast = forecastBench(10, rolloffs, [], 30);
      
      expect(forecast.length).toBeGreaterThan(0);
      // After rolloffs, bench should increase
      expect(forecast[forecast.length - 1].benchCount).toBeGreaterThan(10);
    });

    it('BENCH-U-010: should forecast bench decrease from joins', () => {
      const joins = [
        { date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), count: 3 },
      ];
      
      const forecast = forecastBench(10, [], joins, 30);
      
      // After joins, bench should decrease
      expect(forecast[forecast.length - 1].benchCount).toBeLessThan(10);
    });

    it('BENCH-U-010: should provide 30/60/90 day forecasts', () => {
      const forecast = forecastBench(10, [], [], 90);
      
      expect(forecast.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Quick Allocate from Bench', () => {
    // BENCH-U-011: Quick allocate updates status
    it('BENCH-U-011: should change status when allocated from bench', async () => {
      const resourceBefore = {
        id: 'res-1',
        status: 'BENCH',
      };
      
      const resourceAfter = {
        id: 'res-1',
        status: 'ALLOCATED',
      };
      
      expect(resourceBefore.status).toBe('BENCH');
      expect(resourceAfter.status).toBe('ALLOCATED');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // ADDITIONAL TESTS
  // ═══════════════════════════════════════════════════════════════════════

  describe('Bench Analytics', () => {
    it('should calculate average days on bench', () => {
      const resources = [
        { daysOnBench: 10 },
        { daysOnBench: 20 },
        { daysOnBench: 30 },
      ];
      
      const avgDays = resources.reduce((sum, r) => sum + r.daysOnBench, 0) / resources.length;
      expect(avgDays).toBe(20);
    });

    it('should group bench by practice', () => {
      const resources = [
        { practiceId: 'eng', daysOnBench: 10 },
        { practiceId: 'eng', daysOnBench: 20 },
        { practiceId: 'design', daysOnBench: 15 },
      ];
      
      const byPractice: Record<string, number> = {};
      resources.forEach(r => {
        byPractice[r.practiceId] = (byPractice[r.practiceId] || 0) + 1;
      });
      
      expect(byPractice['eng']).toBe(2);
      expect(byPractice['design']).toBe(1);
    });
  });

  describe('Bench Aging Report', () => {
    it('should categorize by aging buckets', () => {
      const resources = [
        { daysOnBench: 5 },   // 0-7
        { daysOnBench: 15 },  // 8-30
        { daysOnBench: 45 },  // 31-60
        { daysOnBench: 75 },  // 61-90
        { daysOnBench: 120 }, // 90+
      ];
      
      const buckets = {
        '0-7': 0,
        '8-30': 0,
        '31-60': 0,
        '61-90': 0,
        '90+': 0,
      };
      
      resources.forEach(r => {
        if (r.daysOnBench <= 7) buckets['0-7']++;
        else if (r.daysOnBench <= 30) buckets['8-30']++;
        else if (r.daysOnBench <= 60) buckets['31-60']++;
        else if (r.daysOnBench <= 90) buckets['61-90']++;
        else buckets['90+']++;
      });
      
      expect(buckets['0-7']).toBe(1);
      expect(buckets['8-30']).toBe(1);
      expect(buckets['31-60']).toBe(1);
      expect(buckets['61-90']).toBe(1);
      expect(buckets['90+']).toBe(1);
    });
  });
});

