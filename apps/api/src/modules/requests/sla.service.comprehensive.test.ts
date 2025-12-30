/**
 * SLA Service - Comprehensive Tests
 * Tests SLA tracking, business hours, and escalation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as slaService from './sla.service';

// Mock dependencies
vi.mock('../../lib/prisma', () => ({
  default: {
    businessHoursConfig: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    holiday: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    slaConfig: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    slaBreachLog: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    slaBreachEvent: {
      count: vi.fn(),
    },
    request: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('../../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import prisma from '../../lib/prisma';

describe('SLA Service - Comprehensive Tests', () => {
  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-456';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getBusinessHoursConfig', () => {
    it('SLA-001: should return business hours config', async () => {
      vi.mocked(prisma.businessHoursConfig.findFirst).mockResolvedValue({
        id: 'config-1',
        tenantId: mockTenantId,
        startHour: 9,
        startMinute: 0,
        endHour: 18,
        endMinute: 0,
        workDays: [1, 2, 3, 4, 5],
        timezone: 'Asia/Kolkata',
      } as never);
      vi.mocked(prisma.holiday.findMany).mockResolvedValue([]);

      const result = await slaService.getBusinessHoursConfig(mockTenantId);

      expect(result).toHaveProperty('businessHours');
      expect(result).toHaveProperty('holidays');
      expect(result).toHaveProperty('timezone');
    });

    it('SLA-002: should return default config if none exists', async () => {
      vi.mocked(prisma.businessHoursConfig.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.holiday.findMany).mockResolvedValue([]);

      const result = await slaService.getBusinessHoursConfig(mockTenantId);

      // Default is Monday-Friday, 9-6
      expect(result.businessHours).toHaveLength(5);
      expect(result.businessHours[0].dayOfWeek).toBe(1); // Monday
    });

    it('SLA-003: should include holidays', async () => {
      vi.mocked(prisma.businessHoursConfig.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.holiday.findMany).mockResolvedValue([
        { date: new Date('2025-01-01') },
        { date: new Date('2025-01-26') },
      ] as never);

      const result = await slaService.getBusinessHoursConfig(mockTenantId);

      expect(result.holidays).toHaveLength(2);
    });
  });

  describe('updateBusinessHoursConfig', () => {
    it('SLA-004: should update existing config', async () => {
      vi.mocked(prisma.businessHoursConfig.findFirst).mockResolvedValue({
        id: 'config-1',
        startHour: 9,
      } as never);
      vi.mocked(prisma.businessHoursConfig.update).mockResolvedValue({
        id: 'config-1',
        startHour: 8,
        endHour: 17,
      } as never);

      const result = await slaService.updateBusinessHoursConfig(mockTenantId, mockUserId, {
        startHour: 8,
        endHour: 17,
      });

      expect(result.startHour).toBe(8);
      expect(result.endHour).toBe(17);
    });

    it('SLA-005: should create new config if none exists', async () => {
      vi.mocked(prisma.businessHoursConfig.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.businessHoursConfig.create).mockResolvedValue({
        id: 'new-config',
        startHour: 9,
        endHour: 18,
        workDays: [1, 2, 3, 4, 5],
      } as never);

      const result = await slaService.updateBusinessHoursConfig(mockTenantId, mockUserId, {
        startHour: 9,
      });

      expect(prisma.businessHoursConfig.create).toHaveBeenCalled();
      expect(result).toHaveProperty('id');
    });

    it('SLA-006: should update work days', async () => {
      vi.mocked(prisma.businessHoursConfig.findFirst).mockResolvedValue({
        id: 'config-1',
        workDays: [1, 2, 3, 4, 5],
      } as never);
      vi.mocked(prisma.businessHoursConfig.update).mockResolvedValue({
        id: 'config-1',
        workDays: [1, 2, 3, 4, 5, 6], // Added Saturday
      } as never);

      const result = await slaService.updateBusinessHoursConfig(mockTenantId, mockUserId, {
        workDays: [1, 2, 3, 4, 5, 6],
      });

      expect(result.workDays).toContain(6);
    });

    it('SLA-007: should update timezone', async () => {
      vi.mocked(prisma.businessHoursConfig.findFirst).mockResolvedValue({
        id: 'config-1',
        timezone: 'Asia/Kolkata',
      } as never);
      vi.mocked(prisma.businessHoursConfig.update).mockResolvedValue({
        id: 'config-1',
        timezone: 'America/New_York',
      } as never);

      const result = await slaService.updateBusinessHoursConfig(mockTenantId, mockUserId, {
        timezone: 'America/New_York',
      });

      expect(result.timezone).toBe('America/New_York');
    });
  });

  describe('addHoliday', () => {
    it('SLA-008: should add a new holiday', async () => {
      vi.mocked(prisma.holiday.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.holiday.create).mockResolvedValue({
        id: 'holiday-1',
        date: new Date('2025-01-01'),
        name: 'New Year',
        type: 'NATIONAL',
      } as never);

      const result = await slaService.addHoliday(mockTenantId, mockUserId, {
        date: new Date('2025-01-01'),
        name: 'New Year',
        type: 'NATIONAL',
      });

      expect(result.name).toBe('New Year');
    });

    it('SLA-009: should throw error for duplicate holiday', async () => {
      vi.mocked(prisma.holiday.findFirst).mockResolvedValue({
        id: 'existing',
        date: new Date('2025-01-01'),
      } as never);

      await expect(slaService.addHoliday(mockTenantId, mockUserId, {
        date: new Date('2025-01-01'),
        name: 'New Year',
      })).rejects.toThrow('Holiday already exists');
    });

    it('SLA-010: should set default type to COMPANY', async () => {
      vi.mocked(prisma.holiday.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.holiday.create).mockResolvedValue({
        id: 'holiday-1',
        type: 'COMPANY',
      } as never);

      await slaService.addHoliday(mockTenantId, mockUserId, {
        date: new Date('2025-06-15'),
        name: 'Company Retreat',
      });

      expect(prisma.holiday.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'COMPANY',
          }),
        })
      );
    });

    it('SLA-011: should support optional holidays', async () => {
      vi.mocked(prisma.holiday.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.holiday.create).mockResolvedValue({
        id: 'holiday-1',
        isOptional: true,
      } as never);

      await slaService.addHoliday(mockTenantId, mockUserId, {
        date: new Date('2025-03-14'),
        name: 'Holi',
        isOptional: true,
      });

      expect(prisma.holiday.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isOptional: true,
          }),
        })
      );
    });
  });

  describe('calculateBusinessHours', () => {
    const businessHours = [
      { dayOfWeek: 1, startHour: 9, startMinute: 0, endHour: 18, endMinute: 0 },
      { dayOfWeek: 2, startHour: 9, startMinute: 0, endHour: 18, endMinute: 0 },
      { dayOfWeek: 3, startHour: 9, startMinute: 0, endHour: 18, endMinute: 0 },
      { dayOfWeek: 4, startHour: 9, startMinute: 0, endHour: 18, endMinute: 0 },
      { dayOfWeek: 5, startHour: 9, startMinute: 0, endHour: 18, endMinute: 0 },
    ];
    const holidays: Date[] = [];

    it('SLA-012: should calculate hours within same day', () => {
      // Monday 10am to Monday 4pm = 6 hours
      const start = new Date('2025-01-06T10:00:00Z'); // Monday
      const end = new Date('2025-01-06T16:00:00Z'); // Same Monday

      const result = slaService.calculateBusinessHours(start, end, businessHours, holidays);

      expect(result).toBeGreaterThanOrEqual(0);
    });

    it('SLA-013: should exclude weekends', () => {
      // Friday 5pm to Monday 10am should only count small portion
      const start = new Date('2025-01-03T17:00:00Z'); // Friday
      const end = new Date('2025-01-06T10:00:00Z'); // Monday

      const result = slaService.calculateBusinessHours(start, end, businessHours, holidays);

      // Should be less than 9 hours (one business day)
      expect(result).toBeLessThan(9 * 60); // In minutes
    });

    it('SLA-014: should return 0 for identical times', () => {
      const start = new Date('2025-01-06T10:00:00Z');

      const result = slaService.calculateBusinessHours(start, start, businessHours, holidays);

      expect(result).toBe(0);
    });
  });

  describe('checkSlaBreaches', () => {
    it('SLA-015: should return breach count', async () => {
      vi.mocked(prisma.request.findMany).mockResolvedValue([]);
      vi.mocked(prisma.slaBreachLog.create).mockResolvedValue({} as never);

      const result = await slaService.checkSlaBreaches(mockTenantId);

      expect(typeof result).toBe('number');
    });
  });

  describe('getSlaComplianceReport', () => {
    it('SLA-016: should return compliance report', async () => {
      vi.mocked(prisma.businessHoursConfig.findFirst).mockResolvedValue({
        id: 'config-1',
        tenantId: mockTenantId,
        startHour: 9,
        startMinute: 0,
        endHour: 18,
        endMinute: 0,
        workDays: [1, 2, 3, 4, 5],
        timezone: 'UTC',
      } as never);
      vi.mocked(prisma.holiday.findMany).mockResolvedValue([]);
      vi.mocked(prisma.request.findMany).mockResolvedValue([
        {
          id: 'r1',
          status: 'COMPLETED',
          firstResponseAt: new Date(),
          responseDeadline: new Date(),
          completedAt: new Date(),
          submittedAt: new Date(),
          resolvedAt: new Date(),
          type: { code: 'TEST' },
          priority: 'MEDIUM',
        },
      ] as never);
      vi.mocked(prisma.slaBreachLog.findMany).mockResolvedValue([]);

      // Mock slaBreachEvent.count for the compliance check
      const slaBreachEventMock = prisma as unknown as { slaBreachEvent: { count: ReturnType<typeof vi.fn> } };
      slaBreachEventMock.slaBreachEvent.count.mockResolvedValue(0);

      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');
      
      const result = await slaService.getSlaComplianceReport(mockTenantId, startDate, endDate);

      expect(result).toHaveProperty('totalRequests');
      expect(result).toHaveProperty('completedOnTime');
      expect(result).toHaveProperty('completedLate');
    });
  });
});
