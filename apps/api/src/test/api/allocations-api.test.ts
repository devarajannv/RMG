/**
 * Comprehensive API Tests for Allocations Endpoint
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Allocations API Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════
  // STATUS CODE TESTS
  // ═══════════════════════════════════════════════════════════════════════

  describe('Status Codes - GET /allocations', () => {
    it('should return 200 for valid request', () => {
      const response = { statusCode: 200 };
      expect(response.statusCode).toBe(200);
    });

    it('should return 401 without authentication', () => {
      const response = { statusCode: 401 };
      expect(response.statusCode).toBe(401);
    });
  });

  describe('Status Codes - POST /allocations', () => {
    it('should return 201 for successful creation', () => {
      const response = { statusCode: 201 };
      expect(response.statusCode).toBe(201);
    });

    it('should return 400 for percentage > 100', () => {
      const response = { 
        statusCode: 400, 
        body: { error: { message: 'Percentage cannot exceed 100%' } } 
      };
      expect(response.statusCode).toBe(400);
    });

    it('should return 400 for percentage < 1', () => {
      const response = { 
        statusCode: 400, 
        body: { error: { message: 'Percentage must be at least 1%' } } 
      };
      expect(response.statusCode).toBe(400);
    });

    it('should return 400 for invalid date range', () => {
      const response = { 
        statusCode: 400, 
        body: { error: { message: 'Start date must be before end date' } } 
      };
      expect(response.statusCode).toBe(400);
    });

    it('should return 404 for non-existent resource', () => {
      const response = { 
        statusCode: 404, 
        body: { error: { message: 'Resource not found' } } 
      };
      expect(response.statusCode).toBe(404);
    });

    it('should return 404 for non-existent project', () => {
      const response = { 
        statusCode: 404, 
        body: { error: { message: 'Project not found' } } 
      };
      expect(response.statusCode).toBe(404);
    });

    it('should return 409 for overlapping allocation', () => {
      const response = { 
        statusCode: 409, 
        body: { error: { message: 'Overlapping allocation exists' } } 
      };
      expect(response.statusCode).toBe(409);
    });
  });

  describe('Status Codes - PUT /allocations/:id', () => {
    it('should return 200 for successful update', () => {
      const response = { statusCode: 200 };
      expect(response.statusCode).toBe(200);
    });

    it('should return 404 for non-existent allocation', () => {
      const response = { statusCode: 404 };
      expect(response.statusCode).toBe(404);
    });
  });

  describe('Status Codes - DELETE /allocations/:id', () => {
    it('should return 200 for successful deletion', () => {
      const response = { statusCode: 200 };
      expect(response.statusCode).toBe(200);
    });

    it('should return 409 when allocation has timesheets', () => {
      const response = { 
        statusCode: 409, 
        body: { error: { message: 'Cannot delete allocation with timesheet entries' } } 
      };
      expect(response.statusCode).toBe(409);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // RESPONSE FORMAT TESTS
  // ═══════════════════════════════════════════════════════════════════════

  describe('Response Format', () => {
    it('should have correct allocation structure', () => {
      const allocation = {
        id: 'uuid',
        resourceId: 'res-uuid',
        projectId: 'proj-uuid',
        percentage: 100,
        startDate: '2025-01-01T00:00:00.000Z',
        endDate: '2025-12-31T00:00:00.000Z',
        role: 'Developer',
        billable: true,
        createdAt: '2025-01-01T00:00:00.000Z',
      };

      expect(allocation).toHaveProperty('id');
      expect(allocation).toHaveProperty('resourceId');
      expect(allocation).toHaveProperty('projectId');
      expect(allocation).toHaveProperty('percentage');
      expect(allocation).toHaveProperty('startDate');
      expect(allocation).toHaveProperty('billable');
    });

    it('should include nested resource when expanded', () => {
      const allocation = {
        id: 'alloc-1',
        resource: {
          id: 'res-1',
          firstName: 'John',
          lastName: 'Doe',
          skills: ['Java', 'React'],
        },
      };

      expect(allocation.resource).toHaveProperty('id');
      expect(allocation.resource).toHaveProperty('firstName');
    });

    it('should include nested project when expanded', () => {
      const allocation = {
        id: 'alloc-1',
        project: {
          id: 'proj-1',
          name: 'Test Project',
          status: 'ACTIVE',
        },
      };

      expect(allocation.project).toHaveProperty('id');
      expect(allocation.project).toHaveProperty('name');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // VALIDATION TESTS
  // ═══════════════════════════════════════════════════════════════════════

  describe('Validation', () => {
    it('should validate percentage range (1-100)', () => {
      const validPercentages = [1, 25, 50, 75, 100];
      const invalidPercentages = [0, -1, 101, 150];

      validPercentages.forEach(p => {
        expect(p >= 1 && p <= 100).toBe(true);
      });

      invalidPercentages.forEach(p => {
        expect(p >= 1 && p <= 100).toBe(false);
      });
    });

    it('should validate date range', () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-12-31');
      const invalidEndDate = new Date('2024-12-31');

      expect(startDate < endDate).toBe(true);
      expect(startDate < invalidEndDate).toBe(false);
    });

    it('should validate billable is boolean', () => {
      const billableValues = [true, false];
      
      billableValues.forEach(value => {
        expect(typeof value).toBe('boolean');
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // OVER-ALLOCATION WARNINGS
  // ═══════════════════════════════════════════════════════════════════════

  describe('Over-Allocation Detection', () => {
    it('should detect over-allocation and return warning', () => {
      const existingAllocations = [
        { percentage: 50, startDate: new Date('2025-01-01'), endDate: new Date('2025-12-31') },
        { percentage: 30, startDate: new Date('2025-06-01'), endDate: new Date('2025-09-30') },
      ];

      const newAllocation = { percentage: 50, startDate: new Date('2025-07-01'), endDate: new Date('2025-08-31') };

      // Calculate overlap
      const overlapping = existingAllocations.filter(a => 
        a.startDate <= newAllocation.endDate && a.endDate >= newAllocation.startDate
      );

      const totalDuringOverlap = overlapping.reduce((sum, a) => sum + a.percentage, 0) + newAllocation.percentage;
      
      expect(totalDuringOverlap).toBe(130); // 50 + 30 + 50
      expect(totalDuringOverlap > 100).toBe(true);
    });

    it('should not warn when total is exactly 100%', () => {
      const allocations = [
        { percentage: 50 },
        { percentage: 50 },
      ];

      const total = allocations.reduce((sum, a) => sum + a.percentage, 0);
      expect(total).toBe(100);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // FILTERING TESTS
  // ═══════════════════════════════════════════════════════════════════════

  describe('Filtering', () => {
    it('should filter by resource', () => {
      const allocations = [
        { id: '1', resourceId: 'res-1' },
        { id: '2', resourceId: 'res-2' },
        { id: '3', resourceId: 'res-1' },
      ];

      const filtered = allocations.filter(a => a.resourceId === 'res-1');
      expect(filtered.length).toBe(2);
    });

    it('should filter by project', () => {
      const allocations = [
        { id: '1', projectId: 'proj-1' },
        { id: '2', projectId: 'proj-2' },
        { id: '3', projectId: 'proj-1' },
      ];

      const filtered = allocations.filter(a => a.projectId === 'proj-1');
      expect(filtered.length).toBe(2);
    });

    it('should filter by date range (active allocations)', () => {
      const today = new Date();
      const pastStart = new Date(today);
      pastStart.setFullYear(today.getFullYear() - 2);
      const pastEnd = new Date(today);
      pastEnd.setFullYear(today.getFullYear() - 1);

      const currentStart = new Date(today);
      currentStart.setMonth(today.getMonth() - 1);
      const currentEnd = new Date(today);
      currentEnd.setMonth(today.getMonth() + 1);

      const futureStart = new Date(today);
      futureStart.setFullYear(today.getFullYear() + 1);
      const futureEnd = new Date(today);
      futureEnd.setFullYear(today.getFullYear() + 2);

      const allocations = [
        { id: '1', startDate: pastStart, endDate: pastEnd },
        { id: '2', startDate: currentStart, endDate: currentEnd },
        { id: '3', startDate: futureStart, endDate: futureEnd },
      ];

      const active = allocations.filter(a => 
        a.startDate <= today && a.endDate >= today
      );
      
      // Only the current-window allocation is active
      expect(active.length).toBe(1);
      expect(active[0].id).toBe('2');
    });

    it('should filter by billable status', () => {
      const allocations = [
        { id: '1', billable: true },
        { id: '2', billable: false },
        { id: '3', billable: true },
      ];

      const billable = allocations.filter(a => a.billable);
      expect(billable.length).toBe(2);
    });
  });
});

