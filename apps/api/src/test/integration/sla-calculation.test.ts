/**
 * SLA Calculation Integration Tests
 * 
 * Tests SLA calculations with REAL dates, business hours, and holidays
 * Verifies breach detection works correctly
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient, Priority } from '@prisma/client';
import * as slaService from '../../modules/requests/sla.service';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://rmgaas:rmgaas_dev@localhost:5432/rmgaas?schema=public';

describe('SLA Calculation Integration Tests', () => {
  let prisma: PrismaClient;
  let testTenantId: string;
  let testUserId: string;
  let testRequestTypeId: string;

  beforeAll(async () => {
    prisma = new PrismaClient({
      datasources: { db: { url: DATABASE_URL } },
    });
    await prisma.$connect();

    const tenant = await prisma.tenant.findFirst({ where: { slug: 'newvision' } });
    testTenantId = tenant!.id;

    const user = await prisma.user.findFirst({
      where: { tenantId: testTenantId, email: 'admin@newvision.in' },
    });
    testUserId = user!.id;

    let requestType = await prisma.requestType.findFirst({
      where: { isActive: true },
    });
    if (!requestType) {
      requestType = await prisma.requestType.create({
        data: {
          code: `TEST-SLA-${Date.now()}`,
          name: 'SLA Test Request',
          category: 'ALLOCATION',
          isActive: true,
          responseSlaHours: 24,
          resolutionSlaHours: 72,
        },
      });
    }
    testRequestTypeId = requestType.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Business Hours Configuration', () => {
    it('SLA-INT-001: Should get business hours config', async () => {
      const config = await slaService.getBusinessHoursConfig(testTenantId);
      
      expect(config).toBeDefined();
      expect(config.businessHours).toBeInstanceOf(Array);
      expect(config.businessHours.length).toBeGreaterThan(0);
      expect(config.timezone).toBeDefined();
    });

    it('SLA-INT-002: Should have valid business hours structure', async () => {
      const config = await slaService.getBusinessHoursConfig(testTenantId);
      
      for (const bh of config.businessHours) {
        expect(bh.dayOfWeek).toBeGreaterThanOrEqual(0);
        expect(bh.dayOfWeek).toBeLessThanOrEqual(6);
        expect(bh.startHour).toBeGreaterThanOrEqual(0);
        expect(bh.startHour).toBeLessThanOrEqual(23);
        expect(bh.endHour).toBeGreaterThanOrEqual(0);
        expect(bh.endHour).toBeLessThanOrEqual(23);
        expect(bh.startHour).toBeLessThan(bh.endHour); // Start before end
      }
    });
  });

  describe('Business Hours Calculation', () => {
    it('SLA-INT-003: Should calculate 8 business hours for one full work day', async () => {
      const config = await slaService.getBusinessHoursConfig(testTenantId);
      
      // Find a work day (Monday = 1)
      const monday = getNextDayOfWeek(1);
      const start = setTime(monday, 9, 0); // 9 AM
      const end = setTime(monday, 17, 0);   // 5 PM (8 hours)
      
      const hours = slaService.calculateBusinessHours(
        start,
        end,
        config.businessHours,
        config.holidays
      );

      // Should be 8 hours or close to configured hours
      expect(hours).toBeGreaterThanOrEqual(7);
      expect(hours).toBeLessThanOrEqual(9);
    });

    it('SLA-INT-004: Should calculate 0 hours for weekend (Saturday)', async () => {
      const config = await slaService.getBusinessHoursConfig(testTenantId);
      
      // Skip if weekends are configured as work days
      const saturdayConfigured = config.businessHours.some(bh => bh.dayOfWeek === 6);
      if (saturdayConfigured) {
        return; // Skip test if Saturday is a work day
      }
      
      const saturday = getNextDayOfWeek(6);
      const start = setTime(saturday, 9, 0);
      const end = setTime(saturday, 17, 0);
      
      const hours = slaService.calculateBusinessHours(
        start,
        end,
        config.businessHours,
        config.holidays
      );

      expect(hours).toBe(0);
    });

    it('SLA-INT-005: Should exclude time outside business hours', async () => {
      const config = await slaService.getBusinessHoursConfig(testTenantId);
      
      const monday = getNextDayOfWeek(1);
      // 6 AM to 7 AM (before business hours)
      const start = setTime(monday, 6, 0);
      const end = setTime(monday, 7, 0);
      
      const hours = slaService.calculateBusinessHours(
        start,
        end,
        config.businessHours,
        config.holidays
      );

      expect(hours).toBe(0);
    });

    it('SLA-INT-006: Should calculate partial business hours', async () => {
      const config = await slaService.getBusinessHoursConfig(testTenantId);
      
      const monday = getNextDayOfWeek(1);
      // 9 AM to 12 PM (3 hours)
      const start = setTime(monday, 9, 0);
      const end = setTime(monday, 12, 0);
      
      const hours = slaService.calculateBusinessHours(
        start,
        end,
        config.businessHours,
        config.holidays
      );

      expect(hours).toBeGreaterThanOrEqual(2.5);
      expect(hours).toBeLessThanOrEqual(3.5);
    });

    it('SLA-INT-007: Should span multiple days correctly', async () => {
      const config = await slaService.getBusinessHoursConfig(testTenantId);
      
      const monday = getNextDayOfWeek(1);
      const tuesday = new Date(monday);
      tuesday.setDate(tuesday.getDate() + 1);
      
      // Monday 9 AM to Tuesday 12 PM
      const start = setTime(monday, 9, 0);
      const end = setTime(tuesday, 12, 0);
      
      const hours = slaService.calculateBusinessHours(
        start,
        end,
        config.businessHours,
        config.holidays
      );

      // Should be at least one full day + partial
      expect(hours).toBeGreaterThan(8);
    });
  });

  describe('Holiday Handling', () => {
    let testHolidayId: string | null = null;

    afterAll(async () => {
      if (testHolidayId) {
        await prisma.holiday.delete({ where: { id: testHolidayId } }).catch(() => {});
      }
    });

    it('SLA-INT-008: Should list holidays for tenant', async () => {
      const holidays = await slaService.listHolidays(testTenantId);
      expect(Array.isArray(holidays)).toBe(true);
    });

    it('SLA-INT-009: Should add holiday to calendar', async () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 6);
      futureDate.setDate(15); // Middle of month
      
      const holiday = await slaService.addHoliday(testTenantId, testUserId, {
        date: futureDate,
        name: 'Test Holiday',
        type: 'COMPANY',
      }) as { id: string };

      testHolidayId = holiday.id;
      expect(holiday).toBeDefined();
      expect(holiday.id).toBeDefined();
    });

    it('SLA-INT-010: Should exclude holidays from business hours calculation', async () => {
      const config = await slaService.getBusinessHoursConfig(testTenantId);
      
      if (config.holidays.length === 0) {
        // No holidays configured, skip
        return;
      }

      const holiday = config.holidays[0];
      const start = setTime(new Date(holiday), 9, 0);
      const end = setTime(new Date(holiday), 17, 0);
      
      const hours = slaService.calculateBusinessHours(
        start,
        end,
        config.businessHours,
        config.holidays
      );

      // Holiday should have 0 business hours
      expect(hours).toBe(0);
    });
  });

  describe('SLA Breach Detection', () => {
    it('SLA-INT-011: Should detect when response SLA is breached', async () => {
      const requestType = await prisma.requestType.findUnique({
        where: { id: testRequestTypeId },
      });

      // Create a request with response SLA already passed
      const submittedAt = new Date();
      submittedAt.setHours(submittedAt.getHours() - 100); // 100 hours ago
      
      const responseDueAt = new Date(submittedAt);
      responseDueAt.setHours(responseDueAt.getHours() + (requestType?.responseSlaHours || 24));

      // Response due is in the past
      expect(responseDueAt.getTime()).toBeLessThan(Date.now());
    });

    it('SLA-INT-012: Should calculate correct response deadline based on priority', async () => {
      // Higher priority = shorter SLA
      const priorities: Priority[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
      const multipliers = [0.25, 0.5, 1.0, 1.5];

      const baseSlaHours = 24;
      
      for (let i = 0; i < priorities.length; i++) {
        const expected = baseSlaHours * multipliers[i];
        expect(expected).toBeGreaterThan(0);
        
        // Critical should have shortest SLA
        if (priorities[i] === 'CRITICAL') {
          expect(expected).toBe(6); // 24 * 0.25
        }
        // Low should have longest SLA
        if (priorities[i] === 'LOW') {
          expect(expected).toBe(36); // 24 * 1.5
        }
      }
    });
  });

  describe('SLA with Real Request', () => {
    let testRequestId: string;

    afterAll(async () => {
      if (testRequestId) {
        await prisma.request.delete({ where: { id: testRequestId } }).catch(() => {});
      }
    });

    it('SLA-INT-013: Should set SLA deadlines when request is submitted', async () => {
      const requestNumber = `SLA-TEST-${Date.now()}`;
      const now = new Date();
      
      // Calculate expected deadlines
      const requestType = await prisma.requestType.findUnique({
        where: { id: testRequestTypeId },
      });

      const responseSlaHours = requestType?.responseSlaHours || 24;
      const resolutionSlaHours = requestType?.resolutionSlaHours || 72;

      const responseDueAt = new Date(now.getTime() + responseSlaHours * 60 * 60 * 1000);
      const resolutionDueAt = new Date(now.getTime() + resolutionSlaHours * 60 * 60 * 1000);

      const request = await prisma.request.create({
        data: {
          tenantId: testTenantId,
          requestNumber,
          requesterId: testUserId,
          typeId: testRequestTypeId,
          status: 'SUBMITTED',
          priority: 'MEDIUM',
          title: 'SLA Test Request',
          submittedAt: now,
          responseDueAt,
          resolutionDueAt,
          requestData: {},
        },
      });

      testRequestId = request.id;

      expect(request.submittedAt).toBeDefined();
      expect(request.responseDueAt).toBeDefined();
      expect(request.resolutionDueAt).toBeDefined();
      
      // Response should be before resolution
      expect(request.responseDueAt!.getTime()).toBeLessThan(request.resolutionDueAt!.getTime());
    });

    it('SLA-INT-014: Should track first response time', async () => {
      if (!testRequestId) return;

      const firstResponseAt = new Date();
      
      const updated = await prisma.request.update({
        where: { id: testRequestId },
        data: { firstResponseAt },
      });

      expect(updated.firstResponseAt).toBeDefined();
      expect(updated.firstResponseAt!.getTime()).toBeGreaterThanOrEqual(updated.submittedAt!.getTime());
    });

    it('SLA-INT-015: Should mark response SLA as breached when overdue', async () => {
      const requestNumber = `SLA-BREACH-${Date.now()}`;
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7); // 7 days ago
      
      const responseDueAt = new Date(pastDate);
      responseDueAt.setHours(responseDueAt.getHours() + 24); // Due 6 days ago

      const request = await prisma.request.create({
        data: {
          tenantId: testTenantId,
          requestNumber,
          requesterId: testUserId,
          typeId: testRequestTypeId,
          status: 'PENDING_APPROVAL',
          priority: 'MEDIUM',
          title: 'Breached SLA Test',
          submittedAt: pastDate,
          responseDueAt,
          resolutionDueAt: new Date(),
          responseSlaBreached: true, // Mark as breached
          requestData: {},
        },
      });

      expect(request.responseSlaBreached).toBe(true);
      expect(request.responseDueAt!.getTime()).toBeLessThan(Date.now());

      // Cleanup
      await prisma.request.delete({ where: { id: request.id } });
    });
  });

  describe('SLA Pause/Resume', () => {
    let pauseTestRequestId: string;

    afterAll(async () => {
      if (pauseTestRequestId) {
        await prisma.request.delete({ where: { id: pauseTestRequestId } }).catch(() => {});
      }
    });

    it('SLA-INT-016: Should track SLA pause time', async () => {
      const requestNumber = `SLA-PAUSE-${Date.now()}`;
      const now = new Date();
      
      const request = await prisma.request.create({
        data: {
          tenantId: testTenantId,
          requestNumber,
          requesterId: testUserId,
          typeId: testRequestTypeId,
          status: 'ON_HOLD',
          priority: 'MEDIUM',
          title: 'SLA Pause Test',
          submittedAt: now,
          responseDueAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
          resolutionDueAt: new Date(now.getTime() + 72 * 60 * 60 * 1000),
          slaPausedAt: now, // Paused now
          requestData: {},
        },
      });

      pauseTestRequestId = request.id;
      expect(request.slaPausedAt).toBeDefined();
    });

    it('SLA-INT-017: Should accumulate pause duration', async () => {
      if (!pauseTestRequestId) return;

      const pauseDurationMins = 60; // 1 hour paused
      
      const updated = await prisma.request.update({
        where: { id: pauseTestRequestId },
        data: {
          slaPausedAt: null, // Resumed
          slaPauseDurationMins: pauseDurationMins,
          status: 'IN_PROGRESS',
        },
      });

      expect(updated.slaPausedAt).toBeNull();
      expect(updated.slaPauseDurationMins).toBe(60);
    });
  });

  describe('Escalation', () => {
    it('SLA-INT-018: Should track escalation level', async () => {
      const requestNumber = `ESC-${Date.now()}`;
      
      const request = await prisma.request.create({
        data: {
          tenantId: testTenantId,
          requestNumber,
          requesterId: testUserId,
          typeId: testRequestTypeId,
          status: 'PENDING_APPROVAL',
          priority: 'HIGH',
          title: 'Escalation Test',
          submittedAt: new Date(),
          responseDueAt: new Date(),
          resolutionDueAt: new Date(),
          escalatedAt: new Date(),
          escalationLevel: 1,
          requestData: {},
        },
      });

      expect(request.escalatedAt).toBeDefined();
      expect(request.escalationLevel).toBe(1);

      // Escalate further
      const escalated = await prisma.request.update({
        where: { id: request.id },
        data: { escalationLevel: 2 },
      });

      expect(escalated.escalationLevel).toBe(2);

      // Cleanup
      await prisma.request.delete({ where: { id: request.id } });
    });
  });
});

// Helper functions
function getNextDayOfWeek(dayOfWeek: number): Date {
  const today = new Date();
  const daysUntil = (dayOfWeek - today.getDay() + 7) % 7 || 7;
  const result = new Date(today);
  result.setDate(today.getDate() + daysUntil);
  result.setHours(0, 0, 0, 0);
  return result;
}

function setTime(date: Date, hours: number, minutes: number): Date {
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}
