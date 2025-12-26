/**
 * Dashboard Service - Comprehensive Tests
 * Tests all dashboard functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as dashboardService from './dashboard.service';

// Mock dependencies
vi.mock('../../lib/prisma', () => ({
  default: {
    resource: {
      groupBy: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
    },
    project: {
      groupBy: vi.fn(),
    },
    allocation: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    practice: {
      findMany: vi.fn(),
    },
  },
}));

import prisma from '../../lib/prisma';

describe('Dashboard Service - Comprehensive Tests', () => {
  const mockTenantId = 'tenant-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getDashboardMetrics', () => {
    const mockResourceStats = [
      { status: 'ACTIVE', employmentType: 'EMPLOYEE', _count: 45 },
      { status: 'ACTIVE', employmentType: 'CONTRACTOR', _count: 10 },
      { status: 'INACTIVE', employmentType: 'EMPLOYEE', _count: 5 },
      { status: 'NOTICE', employmentType: 'EMPLOYEE', _count: 2 },
    ];

    const mockProjectStats = [
      { status: 'ACTIVE', healthStatus: 'GREEN', _count: 10 },
      { status: 'ACTIVE', healthStatus: 'YELLOW', _count: 3 },
      { status: 'ACTIVE', healthStatus: 'RED', _count: 2 },
      { status: 'PIPELINE', healthStatus: null, _count: 5 },
    ];

    beforeEach(() => {
      vi.mocked(prisma.resource.groupBy).mockResolvedValue(mockResourceStats as never);
      vi.mocked(prisma.resource.count).mockResolvedValue(8);
      vi.mocked(prisma.project.groupBy).mockResolvedValue(mockProjectStats as never);
      vi.mocked(prisma.allocation.count)
        .mockResolvedValueOnce(100) // active
        .mockResolvedValueOnce(15) // pending
        .mockResolvedValueOnce(7); // rolloffs
    });

    it('DASH-001: should return complete dashboard metrics', async () => {
      const result = await dashboardService.getDashboardMetrics(mockTenantId);

      expect(result).toHaveProperty('resources');
      expect(result).toHaveProperty('utilization');
      expect(result).toHaveProperty('projects');
      expect(result).toHaveProperty('allocations');
      expect(result).toHaveProperty('financials');
    });

    it('DASH-002: should calculate total active resources', async () => {
      const result = await dashboardService.getDashboardMetrics(mockTenantId);

      expect(result.resources.total).toBe(55); // 45 + 10 = 55 active
      expect(result.resources.active).toBe(55);
    });

    it('DASH-003: should count contractors correctly', async () => {
      const result = await dashboardService.getDashboardMetrics(mockTenantId);

      expect(result.resources.contractors).toBe(10);
    });

    it('DASH-004: should count resources in notice period', async () => {
      const result = await dashboardService.getDashboardMetrics(mockTenantId);

      expect(result.resources.inNotice).toBe(2);
    });

    it('DASH-005: should get bench count', async () => {
      const result = await dashboardService.getDashboardMetrics(mockTenantId);

      expect(result.resources.onBench).toBe(8);
    });

    it('DASH-006: should calculate project counts', async () => {
      const result = await dashboardService.getDashboardMetrics(mockTenantId);

      expect(result.projects.active).toBe(15); // 10+3+2 active projects
      expect(result.projects.pipeline).toBe(5);
      expect(result.projects.atRisk).toBe(2); // RED health status
    });

    it('DASH-007: should get allocation metrics', async () => {
      const result = await dashboardService.getDashboardMetrics(mockTenantId);

      expect(result.allocations.active).toBe(100);
      expect(result.allocations.pending).toBe(15);
      expect(result.allocations.rolloffsNext30Days).toBe(7);
    });

    it('DASH-008: should calculate financial metrics', async () => {
      const result = await dashboardService.getDashboardMetrics(mockTenantId);

      expect(result.financials.benchCostMonthly).toBeGreaterThanOrEqual(0);
      expect(result.financials.potentialRevenueLoss).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getUtilizationTrend', () => {
    it('DASH-009: should return utilization trend data', async () => {
      vi.mocked(prisma.allocation.findMany).mockResolvedValue([
        {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          percentage: 100,
          isBillable: true,
        },
        {
          startDate: new Date('2024-06-01'),
          endDate: new Date('2024-12-31'),
          percentage: 50,
          isBillable: false,
        },
      ] as never);
      vi.mocked(prisma.resource.count).mockResolvedValue(50);

      const result = await dashboardService.getUtilizationTrend(mockTenantId, 12);

      expect(result).toBeInstanceOf(Array);
    });

    it('DASH-010: should calculate billable vs non-billable', async () => {
      vi.mocked(prisma.allocation.findMany).mockResolvedValue([
        { percentage: 100, isBillable: true, startDate: new Date(), endDate: new Date() },
      ] as never);
      vi.mocked(prisma.resource.count).mockResolvedValue(10);

      const result = await dashboardService.getUtilizationTrend(mockTenantId, 6);

      for (const dataPoint of result) {
        expect(dataPoint).toHaveProperty('billable');
        expect(dataPoint).toHaveProperty('nonBillable');
      }
    });
  });

  describe('getBenchAnalysis', () => {
    const mockBenchResources = [
      {
        id: 'r1',
        employeeId: 'EMP001',
        firstName: 'John',
        lastName: 'Doe',
        designation: 'Senior Developer',
        band: 'B4',
        benchSince: new Date('2024-06-01'),
        costPerHour: 1000,
        practice: { name: 'Engineering' },
        skills: [{ skill: { name: 'React' } }, { skill: { name: 'Node.js' } }],
        allocations: [{ project: { name: 'Project X' }, endDate: new Date('2024-05-31') }],
      },
    ];

    it('DASH-011: should return bench analysis', async () => {
      vi.mocked(prisma.resource.findMany).mockResolvedValue(mockBenchResources as never);

      const result = await dashboardService.getBenchAnalysis(mockTenantId);

      expect(result).toBeInstanceOf(Array);
    });
  });

  describe('getPracticeUtilization', () => {
    const mockPractices = [
      {
        id: 'p1',
        name: 'Engineering',
        targetUtilization: 80,
        resources: [
          { status: 'ACTIVE', benchSince: null },
          { status: 'ACTIVE', benchSince: null },
          { status: 'ACTIVE', benchSince: new Date() },
        ],
      },
      {
        id: 'p2',
        name: 'Design',
        targetUtilization: 75,
        resources: [{ status: 'ACTIVE', benchSince: null }],
      },
    ];

    it('DASH-012: should return practice utilization data', async () => {
      vi.mocked(prisma.practice.findMany).mockResolvedValue(mockPractices as never);

      const result = await dashboardService.getPracticeUtilization(mockTenantId);

      expect(result).toBeInstanceOf(Array);
    });
  });

  describe('getCapacityForecast', () => {
    const mockAllocations = [
      {
        id: 'a1',
        percentage: 100,
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'a2',
        percentage: 50,
        startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    ];

    it('DASH-013: should return capacity forecast', async () => {
      vi.mocked(prisma.allocation.findMany).mockResolvedValue(mockAllocations as never);
      vi.mocked(prisma.resource.count).mockResolvedValue(50);

      const result = await dashboardService.getCapacityForecast(mockTenantId, 4);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(4);
    });

    it('DASH-014: should include week labels', async () => {
      vi.mocked(prisma.allocation.findMany).mockResolvedValue([]);
      vi.mocked(prisma.resource.count).mockResolvedValue(50);

      const result = await dashboardService.getCapacityForecast(mockTenantId, 4);

      for (const week of result) {
        expect(week).toHaveProperty('week');
        expect(week).toHaveProperty('startDate');
        expect(week).toHaveProperty('endDate');
      }
    });
  });
});
