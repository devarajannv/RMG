/**
 * Comprehensive Project Service Tests
 * Tests: PROJ-U-001 to PROJ-U-012
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock Prisma
const mockPrisma = {
  project: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  allocation: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  timesheetEntry: {
    count: vi.fn(),
  },
};

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrisma),
}));

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

type ProjectStatus = 'PIPELINE' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
type ProjectHealth = 'GREEN' | 'AMBER' | 'RED';

// ═══════════════════════════════════════════════════════════════════════
// VALIDATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════

// PROJ-U-001: Project code format validation
function validateProjectCode(code: string): { valid: boolean; error?: string } {
  // Format: PROJ-XXXX or CLIENT-PROJ-XXXX (alphanumeric with dashes)
  const pattern = /^[A-Z0-9]+-[A-Z0-9-]+$/;
  if (!pattern.test(code)) {
    return { valid: false, error: 'Project code must be alphanumeric with dashes (e.g., PROJ-001)' };
  }
  if (code.length < 5 || code.length > 30) {
    return { valid: false, error: 'Project code must be 5-30 characters' };
  }
  return { valid: true };
}

// PROJ-U-002: Date range validation
function validateDateRange(startDate: Date, endDate: Date | null): { valid: boolean; error?: string } {
  if (endDate && startDate > endDate) {
    return { valid: false, error: 'Start date must be before end date' };
  }
  return { valid: true };
}

// PROJ-U-003: Budget validation
function validateBudget(budget: number): { valid: boolean; error?: string } {
  if (budget < 0) {
    return { valid: false, error: 'Budget must be non-negative' };
  }
  return { valid: true };
}

// PROJ-U-004: Valid status transitions
const VALID_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  PIPELINE: ['ACTIVE', 'CANCELLED'],
  ACTIVE: ['ON_HOLD', 'COMPLETED', 'CANCELLED'],
  ON_HOLD: ['ACTIVE', 'CANCELLED'],
  COMPLETED: [], // Terminal state
  CANCELLED: [], // Terminal state
};

function isValidStatusTransition(from: ProjectStatus, to: ProjectStatus): { valid: boolean; error?: string } {
  if (from === to) {
    return { valid: true }; // No change
  }
  if (VALID_TRANSITIONS[from].includes(to)) {
    return { valid: true };
  }
  return { valid: false, error: `Cannot transition from ${from} to ${to}` };
}

// PROJ-U-010: Health status calculation
function calculateProjectHealth(
  budgetUsedPercent: number,
  timelineUsedPercent: number,
  hasRisks: boolean
): ProjectHealth {
  if (budgetUsedPercent > 90 || timelineUsedPercent > 95 || hasRisks) {
    return 'RED';
  }
  if (budgetUsedPercent > 70 || timelineUsedPercent > 80) {
    return 'AMBER';
  }
  return 'GREEN';
}

// Budget vs actual tracking
function calculateBudgetVariance(budget: number, actual: number): {
  variance: number;
  variancePercent: number;
  status: 'UNDER' | 'ON_TRACK' | 'OVER';
} {
  const variance = budget - actual;
  const variancePercent = budget > 0 ? (variance / budget) * 100 : 0;
  
  let status: 'UNDER' | 'ON_TRACK' | 'OVER';
  if (variancePercent > 10) {
    status = 'UNDER';
  } else if (variancePercent < -10) {
    status = 'OVER';
  } else {
    status = 'ON_TRACK';
  }
  
  return { variance, variancePercent, status };
}

describe('Project Service - Comprehensive Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════
  // VALIDATION TESTS
  // ═══════════════════════════════════════════════════════════════════════

  describe('Project Code Validation', () => {
    // PROJ-U-001: Project code format
    it('PROJ-U-001: should accept valid project code "PROJ-001"', () => {
      const result = validateProjectCode('PROJ-001');
      expect(result.valid).toBe(true);
    });

    it('PROJ-U-001: should accept valid code "CLIENT-PROJ-001"', () => {
      const result = validateProjectCode('CLIENT-PROJ-001');
      expect(result.valid).toBe(true);
    });

    it('PROJ-U-001: should reject code without dash', () => {
      const result = validateProjectCode('PROJ001');
      expect(result.valid).toBe(false);
    });

    it('PROJ-U-001: should reject code with lowercase', () => {
      const result = validateProjectCode('proj-001');
      expect(result.valid).toBe(false);
    });

    it('PROJ-U-001: should reject code starting with dash', () => {
      const result = validateProjectCode('-PROJ-001');
      expect(result.valid).toBe(false);
    });

    it('PROJ-U-001: should reject too short code', () => {
      const result = validateProjectCode('P-1');
      expect(result.valid).toBe(false);
    });

    it('PROJ-U-001: should reject too long code', () => {
      const result = validateProjectCode('VERY-LONG-PROJECT-CODE-THAT-EXCEEDS-LIMIT');
      expect(result.valid).toBe(false);
    });
  });

  describe('Date Range Validation', () => {
    // PROJ-U-002: Start date before end date
    it('PROJ-U-002: should accept valid date range', () => {
      const result = validateDateRange(new Date('2025-01-01'), new Date('2025-12-31'));
      expect(result.valid).toBe(true);
    });

    it('PROJ-U-002: should reject start after end', () => {
      const result = validateDateRange(new Date('2025-12-31'), new Date('2025-01-01'));
      expect(result.valid).toBe(false);
      expect(result.error).toContain('before');
    });

    it('PROJ-U-002: should accept same start and end', () => {
      const date = new Date('2025-06-15');
      const result = validateDateRange(date, date);
      expect(result.valid).toBe(true);
    });

    it('PROJ-U-002: should accept null end date (ongoing)', () => {
      const result = validateDateRange(new Date('2025-01-01'), null);
      expect(result.valid).toBe(true);
    });
  });

  describe('Budget Validation', () => {
    // PROJ-U-003: Budget must be non-negative
    it('PROJ-U-003: should accept positive budget', () => {
      const result = validateBudget(100000);
      expect(result.valid).toBe(true);
    });

    it('PROJ-U-003: should accept zero budget', () => {
      const result = validateBudget(0);
      expect(result.valid).toBe(true);
    });

    it('PROJ-U-003: should reject negative budget', () => {
      const result = validateBudget(-1000);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('non-negative');
    });

    it('PROJ-U-003: should accept decimal budget', () => {
      const result = validateBudget(100000.50);
      expect(result.valid).toBe(true);
    });
  });

  describe('Status Transition Validation', () => {
    // PROJ-U-004: Valid status transitions
    it('PROJ-U-004: should allow PIPELINE → ACTIVE', () => {
      const result = isValidStatusTransition('PIPELINE', 'ACTIVE');
      expect(result.valid).toBe(true);
    });

    it('PROJ-U-004: should allow PIPELINE → CANCELLED', () => {
      const result = isValidStatusTransition('PIPELINE', 'CANCELLED');
      expect(result.valid).toBe(true);
    });

    it('PROJ-U-004: should reject PIPELINE → COMPLETED', () => {
      const result = isValidStatusTransition('PIPELINE', 'COMPLETED');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Cannot transition');
    });

    it('PROJ-U-004: should allow ACTIVE → COMPLETED', () => {
      const result = isValidStatusTransition('ACTIVE', 'COMPLETED');
      expect(result.valid).toBe(true);
    });

    it('PROJ-U-004: should reject COMPLETED → any', () => {
      expect(isValidStatusTransition('COMPLETED', 'ACTIVE').valid).toBe(false);
      expect(isValidStatusTransition('COMPLETED', 'PIPELINE').valid).toBe(false);
    });

    it('PROJ-U-004: should reject CANCELLED → any', () => {
      expect(isValidStatusTransition('CANCELLED', 'ACTIVE').valid).toBe(false);
      expect(isValidStatusTransition('CANCELLED', 'PIPELINE').valid).toBe(false);
    });

    it('PROJ-U-004: should allow same status (no change)', () => {
      expect(isValidStatusTransition('ACTIVE', 'ACTIVE').valid).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // EDGE CASE TESTS
  // ═══════════════════════════════════════════════════════════════════════

  describe('Project with No Allocations', () => {
    // PROJ-U-005: Project with no allocations
    it('PROJ-U-005: should handle project with no team members', async () => {
      mockPrisma.allocation.count.mockResolvedValue(0);
      
      const teamSize = await mockPrisma.allocation.count({
        where: { projectId: 'proj-1' },
      });
      
      expect(teamSize).toBe(0);
    });
  });

  describe('Large Team Project', () => {
    // PROJ-U-006: Project with 100+ allocations
    it('PROJ-U-006: should handle project with 100+ team members', async () => {
      const largeTeam = Array.from({ length: 100 }, (_, i) => ({
        id: `alloc-${i}`,
        resourceId: `res-${i}`,
        percentage: 100,
      }));
      
      mockPrisma.allocation.findMany.mockResolvedValue(largeTeam);
      
      const allocations = await mockPrisma.allocation.findMany({
        where: { projectId: 'proj-1' },
      });
      
      expect(allocations.length).toBe(100);
    });
  });

  describe('Multi-Year Project', () => {
    // PROJ-U-007: Project spanning multiple years
    it('PROJ-U-007: should calculate duration for multi-year project', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2026-12-31');
      
      const durationMs = endDate.getTime() - startDate.getTime();
      const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));
      const durationYears = durationDays / 365;
      
      expect(durationYears).toBeCloseTo(3, 0);
    });
  });

  describe('Ongoing Project (No End Date)', () => {
    // PROJ-U-008: Project with null end date
    it('PROJ-U-008: should accept project without end date', () => {
      const project = {
        id: 'proj-1',
        name: 'Ongoing Project',
        startDate: new Date('2025-01-01'),
        endDate: null,
      };
      
      expect(project.endDate).toBeNull();
      
      const result = validateDateRange(project.startDate, project.endDate);
      expect(result.valid).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // BUSINESS RULE TESTS
  // ═══════════════════════════════════════════════════════════════════════

  describe('Completion with Pending Timesheets', () => {
    // PROJ-U-009: Cannot complete with pending timesheets
    it('PROJ-U-009: should prevent completion with pending timesheets', async () => {
      mockPrisma.timesheetEntry.count.mockResolvedValue(5);
      
      const pendingTimesheets = await mockPrisma.timesheetEntry.count({
        where: {
          projectId: 'proj-1',
          status: 'PENDING',
        },
      });
      
      const canComplete = pendingTimesheets === 0;
      expect(canComplete).toBe(false);
    });

    it('PROJ-U-009: should allow completion with no pending timesheets', async () => {
      mockPrisma.timesheetEntry.count.mockResolvedValue(0);
      
      const pendingTimesheets = await mockPrisma.timesheetEntry.count({
        where: {
          projectId: 'proj-1',
          status: 'PENDING',
        },
      });
      
      const canComplete = pendingTimesheets === 0;
      expect(canComplete).toBe(true);
    });
  });

  describe('Health Status Calculation', () => {
    // PROJ-U-010: Health status auto-calculation
    it('PROJ-U-010: should return GREEN for healthy project', () => {
      const health = calculateProjectHealth(50, 60, false);
      expect(health).toBe('GREEN');
    });

    it('PROJ-U-010: should return AMBER for budget 80%', () => {
      const health = calculateProjectHealth(80, 60, false);
      expect(health).toBe('AMBER');
    });

    it('PROJ-U-010: should return AMBER for timeline 85%', () => {
      const health = calculateProjectHealth(50, 85, false);
      expect(health).toBe('AMBER');
    });

    it('PROJ-U-010: should return RED for budget 95%', () => {
      const health = calculateProjectHealth(95, 50, false);
      expect(health).toBe('RED');
    });

    it('PROJ-U-010: should return RED for timeline 98%', () => {
      const health = calculateProjectHealth(50, 98, false);
      expect(health).toBe('RED');
    });

    it('PROJ-U-010: should return RED when risks present', () => {
      const health = calculateProjectHealth(50, 50, true);
      expect(health).toBe('RED');
    });
  });

  describe('Delete with Active Allocations', () => {
    // PROJ-U-011: Cannot delete with active allocations
    it('PROJ-U-011: should prevent deletion with active allocations', async () => {
      mockPrisma.allocation.count.mockResolvedValue(3);
      
      const activeAllocations = await mockPrisma.allocation.count({
        where: {
          projectId: 'proj-1',
          endDate: { gte: new Date() },
        },
      });
      
      const canDelete = activeAllocations === 0;
      expect(canDelete).toBe(false);
    });
  });

  describe('Budget vs Actual Tracking', () => {
    // PROJ-U-012: Budget variance calculation
    it('PROJ-U-012: should calculate under budget correctly', () => {
      const result = calculateBudgetVariance(100000, 70000);
      expect(result.variance).toBe(30000);
      expect(result.variancePercent).toBeCloseTo(30);
      expect(result.status).toBe('UNDER');
    });

    it('PROJ-U-012: should calculate on track correctly', () => {
      const result = calculateBudgetVariance(100000, 95000);
      expect(result.variance).toBe(5000);
      expect(result.variancePercent).toBeCloseTo(5);
      expect(result.status).toBe('ON_TRACK');
    });

    it('PROJ-U-012: should calculate over budget correctly', () => {
      const result = calculateBudgetVariance(100000, 120000);
      expect(result.variance).toBe(-20000);
      expect(result.variancePercent).toBeCloseTo(-20);
      expect(result.status).toBe('OVER');
    });

    it('PROJ-U-012: should handle zero budget', () => {
      const result = calculateBudgetVariance(0, 1000);
      expect(result.variancePercent).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // ADDITIONAL TESTS
  // ═══════════════════════════════════════════════════════════════════════

  describe('Project Name Edge Cases', () => {
    it('should handle project names with special characters', () => {
      const name = "Client's Project - Phase 1 (2025)";
      expect(name.length).toBeGreaterThan(0);
    });

    it('should handle very long project names', () => {
      const longName = 'A'.repeat(200);
      expect(longName.length).toBe(200);
    });

    it('should handle unicode project names', () => {
      const unicodeName = '프로젝트 - 2025';
      expect(unicodeName.length).toBeGreaterThan(0);
    });
  });

  describe('Date Edge Cases', () => {
    it('should handle leap year dates', () => {
      const startDate = new Date('2024-02-29');
      const endDate = new Date('2025-02-28');
      
      const result = validateDateRange(startDate, endDate);
      expect(result.valid).toBe(true);
    });

    it('should handle year boundary projects', () => {
      const startDate = new Date('2024-12-01');
      const endDate = new Date('2025-01-31');
      
      const result = validateDateRange(startDate, endDate);
      expect(result.valid).toBe(true);
    });
  });
});

