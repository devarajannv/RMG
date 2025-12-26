/**
 * Analytics Service - Comprehensive Tests
 * Tests all analytics and reporting functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as analyticsService from './analytics.service';

// Mock dependencies
vi.mock('../../lib/prisma', () => ({
  default: {
    resource: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    project: {
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
    allocation: {
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
    client: {
      count: vi.fn(),
    },
    practice: {
      findMany: vi.fn(),
    },
    location: {
      findMany: vi.fn(),
    },
  },
}));

import prisma from '../../lib/prisma';

describe('Analytics Service - Comprehensive Tests', () => {
  const mockTenantId = 'tenant-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getExecutiveMetrics', () => {
    const mockResources = [
      {
        id: 'r1',
        status: 'ACTIVE',
        capacity: 100,
        benchSince: null,
        allocations: [{ percentage: 80, isBillable: true }],
      },
      {
        id: 'r2',
        status: 'ACTIVE',
        capacity: 100,
        benchSince: new Date(),
        allocations: [],
      },
      {
        id: 'r3',
        status: 'INACTIVE',
        capacity: 100,
        benchSince: null,
        allocations: [],
      },
    ];

    const mockProjectStats = [
      { status: 'ACTIVE', healthStatus: 'GREEN', _count: 5 },
      { status: 'ACTIVE', healthStatus: 'YELLOW', _count: 2 },
      { status: 'ACTIVE', healthStatus: 'RED', _count: 1 },
      { status: 'PIPELINE', healthStatus: null, _count: 3 },
    ];

    it('ANLYT-001: should return executive metrics', async () => {
      vi.mocked(prisma.resource.findMany).mockResolvedValue(mockResources as never);
      vi.mocked(prisma.project.groupBy).mockResolvedValue(mockProjectStats as never);
      vi.mocked(prisma.client.count).mockResolvedValue(10);

      const result = await analyticsService.getExecutiveMetrics(mockTenantId);

      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('trends');
      expect(result).toHaveProperty('highlights');
    });

    it('ANLYT-002: should calculate resource counts correctly', async () => {
      vi.mocked(prisma.resource.findMany).mockResolvedValue(mockResources as never);
      vi.mocked(prisma.project.groupBy).mockResolvedValue(mockProjectStats as never);
      vi.mocked(prisma.client.count).mockResolvedValue(10);

      const result = await analyticsService.getExecutiveMetrics(mockTenantId);

      expect(result.summary.totalResources).toBe(3);
      expect(result.summary.activeResources).toBe(2);
      expect(result.summary.benchCount).toBe(1);
    });

    it('ANLYT-003: should calculate utilization rate', async () => {
      vi.mocked(prisma.resource.findMany).mockResolvedValue(mockResources as never);
      vi.mocked(prisma.project.groupBy).mockResolvedValue(mockProjectStats as never);
      vi.mocked(prisma.client.count).mockResolvedValue(10);

      const result = await analyticsService.getExecutiveMetrics(mockTenantId);

      expect(result.summary.utilizationRate).toBeGreaterThanOrEqual(0);
      expect(result.summary.utilizationRate).toBeLessThanOrEqual(100);
    });

    it('ANLYT-004: should count projects by health status', async () => {
      vi.mocked(prisma.resource.findMany).mockResolvedValue([]);
      vi.mocked(prisma.project.groupBy).mockResolvedValue(mockProjectStats as never);
      vi.mocked(prisma.client.count).mockResolvedValue(5);

      const result = await analyticsService.getExecutiveMetrics(mockTenantId);

      expect(result.summary.healthyProjects).toBeDefined();
      expect(result.summary.atRiskProjects).toBeDefined();
    });

    it('ANLYT-005: should return utilization trends', async () => {
      vi.mocked(prisma.resource.findMany).mockResolvedValue([]);
      vi.mocked(prisma.project.groupBy).mockResolvedValue([]);
      vi.mocked(prisma.client.count).mockResolvedValue(0);

      const result = await analyticsService.getExecutiveMetrics(mockTenantId);

      expect(result.trends).toHaveProperty('utilizationTrend');
      expect(result.trends).toHaveProperty('benchTrend');
    });
  });

  describe('getPracticeMetrics', () => {
    const mockPractices = [
      {
        id: 'p1',
        name: 'Engineering',
        code: 'ENG',
        targetUtilization: 80,
        resources: [
          { status: 'ACTIVE', benchSince: null },
          { status: 'ACTIVE', benchSince: new Date() },
        ],
      },
      {
        id: 'p2',
        name: 'Design',
        code: 'DES',
        targetUtilization: 75,
        resources: [{ status: 'ACTIVE', benchSince: null }],
      },
    ];

    it('ANLYT-006: should return practice metrics', async () => {
      vi.mocked(prisma.practice.findMany).mockResolvedValue(mockPractices as never);

      const result = await analyticsService.getPracticeMetrics(mockTenantId);

      expect(result).toHaveProperty('practices');
      expect(result).toHaveProperty('summary');
    });

    it('ANLYT-007: should calculate practice head count', async () => {
      vi.mocked(prisma.practice.findMany).mockResolvedValue(mockPractices as never);

      const result = await analyticsService.getPracticeMetrics(mockTenantId);

      expect(result.practices[0].headCount).toBe(2);
      expect(result.practices[1].headCount).toBe(1);
    });

    it('ANLYT-008: should calculate bench count per practice', async () => {
      vi.mocked(prisma.practice.findMany).mockResolvedValue(mockPractices as never);

      const result = await analyticsService.getPracticeMetrics(mockTenantId);

      expect(result.practices[0].benchCount).toBe(1);
      expect(result.practices[1].benchCount).toBe(0);
    });

    it('ANLYT-009: should return summary statistics', async () => {
      vi.mocked(prisma.practice.findMany).mockResolvedValue(mockPractices as never);

      const result = await analyticsService.getPracticeMetrics(mockTenantId);

      expect(result.summary).toHaveProperty('totalPractices');
      expect(result.summary).toHaveProperty('aboveTarget');
      expect(result.summary).toHaveProperty('belowTarget');
    });

    it('ANLYT-010: should handle empty practices', async () => {
      vi.mocked(prisma.practice.findMany).mockResolvedValue([]);

      const result = await analyticsService.getPracticeMetrics(mockTenantId);

      expect(result.practices).toEqual([]);
      expect(result.summary.totalPractices).toBe(0);
    });
  });

  describe('getFinancialMetrics', () => {
    const mockBenchResources = [
      { benchSince: new Date('2024-01-01'), costPerHour: 1000 },
      { benchSince: new Date('2024-06-01'), costPerHour: 1200 },
    ];

    it('ANLYT-011: should calculate monthly bench cost', async () => {
      vi.mocked(prisma.resource.findMany).mockResolvedValue(mockBenchResources as never);
      vi.mocked(prisma.allocation.groupBy).mockResolvedValue([]);
      vi.mocked(prisma.practice.findMany).mockResolvedValue([]);

      const result = await analyticsService.getFinancialMetrics(mockTenantId);

      expect(result.summary.monthlyBenchCost).toBeGreaterThan(0);
    });

    it('ANLYT-012: should calculate projected quarterly cost', async () => {
      vi.mocked(prisma.resource.findMany).mockResolvedValue(mockBenchResources as never);
      vi.mocked(prisma.allocation.groupBy).mockResolvedValue([]);
      vi.mocked(prisma.practice.findMany).mockResolvedValue([]);

      const result = await analyticsService.getFinancialMetrics(mockTenantId);

      expect(result.summary.projectedQuarterlyBenchCost).toBe(
        result.summary.monthlyBenchCost * 3
      );
    });

    it('ANLYT-013: should return cost breakdown by practice', async () => {
      vi.mocked(prisma.resource.findMany).mockResolvedValue([]);
      vi.mocked(prisma.allocation.groupBy).mockResolvedValue([]);
      vi.mocked(prisma.practice.findMany).mockResolvedValue([
        { name: 'Engineering', code: 'ENG' },
      ] as never);

      const result = await analyticsService.getFinancialMetrics(mockTenantId);

      expect(result.costBreakdown).toHaveProperty('byPractice');
    });

    it('ANLYT-014: should return projections', async () => {
      vi.mocked(prisma.resource.findMany).mockResolvedValue([]);
      vi.mocked(prisma.allocation.groupBy).mockResolvedValue([]);
      vi.mocked(prisma.practice.findMany).mockResolvedValue([]);

      const result = await analyticsService.getFinancialMetrics(mockTenantId);

      expect(result.projections).toHaveProperty('next30Days');
      expect(result.projections).toHaveProperty('next60Days');
      expect(result.projections).toHaveProperty('next90Days');
    });
  });

  describe('getProjectHealthMetrics', () => {
    const mockProjects = [
      {
        id: 'proj1',
        name: 'Project Alpha',
        code: 'ALPHA',
        status: 'ACTIVE',
        healthStatus: 'GREEN',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2025-01-01'),
        client: { name: 'Client A' },
        allocations: [{ percentage: 100 }, { percentage: 50 }],
      },
      {
        id: 'proj2',
        name: 'Project Beta',
        code: 'BETA',
        status: 'ACTIVE',
        healthStatus: 'RED',
        startDate: new Date('2024-06-01'),
        endDate: null,
        client: null,
        allocations: [],
      },
    ];

    it('ANLYT-015: should return project health metrics', async () => {
      vi.mocked(prisma.project.findMany).mockResolvedValue(mockProjects as never);

      const result = await analyticsService.getProjectHealthMetrics(mockTenantId);

      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('projects');
      expect(result).toHaveProperty('byStatus');
    });

    it('ANLYT-016: should count projects by status', async () => {
      vi.mocked(prisma.project.findMany).mockResolvedValue(mockProjects as never);

      const result = await analyticsService.getProjectHealthMetrics(mockTenantId);

      expect(result.summary.active).toBeGreaterThan(0);
    });

    it('ANLYT-017: should identify at-risk projects', async () => {
      vi.mocked(prisma.project.findMany).mockResolvedValue(mockProjects as never);

      const result = await analyticsService.getProjectHealthMetrics(mockTenantId);

      expect(result.summary.atRisk).toBeGreaterThanOrEqual(1);
    });

    it('ANLYT-018: should calculate staffing status', async () => {
      vi.mocked(prisma.project.findMany).mockResolvedValue(mockProjects as never);

      const result = await analyticsService.getProjectHealthMetrics(mockTenantId);

      for (const project of result.projects) {
        expect(['understaffed', 'optimal', 'overstaffed']).toContain(project.staffingStatus);
      }
    });
  });

  describe('getLocationMetrics', () => {
    const mockLocations = [
      {
        id: 'loc1',
        name: 'San Francisco',
        code: 'SFO',
        type: 'OFFICE',
        isOnshore: true,
        resources: [
          { status: 'ACTIVE', benchSince: null },
          { status: 'ACTIVE', benchSince: new Date() },
        ],
      },
      {
        id: 'loc2',
        name: 'Bangalore',
        code: 'BLR',
        type: 'OFFICE',
        isOnshore: false,
        resources: [{ status: 'ACTIVE', benchSince: null }],
      },
    ];

    it('ANLYT-019: should return location metrics', async () => {
      vi.mocked(prisma.location.findMany).mockResolvedValue(mockLocations as never);

      const result = await analyticsService.getLocationMetrics(mockTenantId);

      expect(result).toHaveProperty('locations');
      expect(result).toHaveProperty('summary');
    });

    it('ANLYT-020: should calculate onshore/offshore counts', async () => {
      vi.mocked(prisma.location.findMany).mockResolvedValue(mockLocations as never);

      const result = await analyticsService.getLocationMetrics(mockTenantId);

      expect(result.summary.onshoreCount).toBe(2);
      expect(result.summary.offshoreCount).toBe(1);
    });

    it('ANLYT-021: should calculate per-location metrics', async () => {
      vi.mocked(prisma.location.findMany).mockResolvedValue(mockLocations as never);

      const result = await analyticsService.getLocationMetrics(mockTenantId);

      expect(result.locations[0].headCount).toBe(2);
      expect(result.locations[0].benchCount).toBe(1);
    });

    it('ANLYT-022: should handle empty locations', async () => {
      vi.mocked(prisma.location.findMany).mockResolvedValue([]);

      const result = await analyticsService.getLocationMetrics(mockTenantId);

      expect(result.locations).toEqual([]);
      expect(result.summary.onshoreCount).toBe(0);
    });
  });
});
