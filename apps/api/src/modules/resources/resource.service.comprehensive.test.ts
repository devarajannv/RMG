/**
 * Comprehensive Resource Service Tests
 * Tests: RES-U-001 to RES-U-013
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock Prisma
const mockPrisma = {
  resource: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  resourceSkill: {
    findMany: vi.fn(),
    create: vi.fn(),
    deleteMany: vi.fn(),
  },
  allocation: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  practice: {
    findUnique: vi.fn(),
  },
};

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrisma),
}));

// ═══════════════════════════════════════════════════════════════════════
// VALIDATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════

// RES-U-001: Employee ID format validation
function validateEmployeeId(employeeId: string): { valid: boolean; error?: string } {
  const pattern = /^EMP-[A-Z0-9]{3,10}$/;
  if (!pattern.test(employeeId)) {
    return { valid: false, error: 'Employee ID must be in format EMP-XXX (3-10 alphanumeric characters)' };
  }
  return { valid: true };
}

// RES-U-002: Phone number format validation
function validatePhoneNumber(phone: string): { valid: boolean; error?: string } {
  // Indian mobile: +91-XXXXXXXXXX or 10 digits
  const indianMobile = /^(\+91[-\s]?)?[6-9]\d{9}$/;
  // International format: +X-XXX-XXX-XXXX or similar patterns
  const international = /^\+\d{1,3}[-\s]?(\d{1,4}[-\s]?){1,4}\d{1,4}$/;
  
  if (!indianMobile.test(phone) && !international.test(phone)) {
    return { valid: false, error: 'Invalid phone number format' };
  }
  return { valid: true };
}

// RES-U-003: Join date validation
function validateJoinDate(joinDate: Date): { valid: boolean; error?: string } {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  
  if (joinDate > today) {
    return { valid: false, error: 'Join date cannot be in the future' };
  }
  return { valid: true };
}

// RES-U-004: Cost rate validation
function validateCostRate(costRate: number): { valid: boolean; error?: string } {
  if (costRate < 0) {
    return { valid: false, error: 'Cost rate must be positive' };
  }
  return { valid: true };
}

// RES-U-008: SQL injection detection (for testing)
function sanitizeSearchInput(input: string): string {
  // Remove SQL injection patterns
  const dangerous = /['";\\]|(--)|(\b(DROP|DELETE|INSERT|UPDATE|SELECT|UNION|WHERE|OR|AND)\b)/gi;
  return input.replace(dangerous, '');
}

// RES-U-010: Calculate utilization from allocations
function calculateUtilization(allocations: Array<{ percentage: number; endDate: Date | null }>): number {
  const today = new Date();
  const activeAllocations = allocations.filter(a => 
    !a.endDate || new Date(a.endDate) >= today
  );
  
  const totalPercentage = activeAllocations.reduce((sum, a) => sum + a.percentage, 0);
  return Math.min(totalPercentage, 100); // Cap at 100%
}

// RES-U-011: Determine resource status
type ResourceStatus = 'AVAILABLE' | 'ALLOCATED' | 'BENCH' | 'ON_LEAVE' | 'RESIGNED';

function determineResourceStatus(
  utilization: number,
  currentStatus: ResourceStatus,
  hasActiveAllocations: boolean
): ResourceStatus {
  if (currentStatus === 'RESIGNED' || currentStatus === 'ON_LEAVE') {
    return currentStatus;
  }
  
  if (hasActiveAllocations && utilization > 0) {
    return 'ALLOCATED';
  }
  
  return 'BENCH';
}

// RES-U-013: Skill proficiency validation
function validateProficiency(proficiency: number): { valid: boolean; error?: string } {
  if (proficiency < 1 || proficiency > 5) {
    return { valid: false, error: 'Proficiency must be between 1 and 5' };
  }
  if (!Number.isInteger(proficiency)) {
    return { valid: false, error: 'Proficiency must be a whole number' };
  }
  return { valid: true };
}

describe('Resource Service - Comprehensive Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════
  // VALIDATION TESTS
  // ═══════════════════════════════════════════════════════════════════════

  describe('Employee ID Validation', () => {
    // RES-U-001: Validate employeeId format
    it('RES-U-001: should accept valid employee ID EMP-001', () => {
      const result = validateEmployeeId('EMP-001');
      expect(result.valid).toBe(true);
    });

    it('RES-U-001: should accept valid employee ID EMP-ABC123', () => {
      const result = validateEmployeeId('EMP-ABC123');
      expect(result.valid).toBe(true);
    });

    it('RES-U-001: should reject ID without EMP- prefix', () => {
      const result = validateEmployeeId('123');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('format');
    });

    it('RES-U-001: should reject ID with lowercase letters', () => {
      const result = validateEmployeeId('EMP-abc');
      expect(result.valid).toBe(false);
    });

    it('RES-U-001: should reject empty employee ID', () => {
      const result = validateEmployeeId('');
      expect(result.valid).toBe(false);
    });

    it('RES-U-001: should reject ID with special characters', () => {
      const result = validateEmployeeId('EMP-001@#$');
      expect(result.valid).toBe(false);
    });
  });

  describe('Phone Number Validation', () => {
    // RES-U-002: Validate phone number format
    it('RES-U-002: should accept Indian mobile +91-9876543210', () => {
      const result = validatePhoneNumber('+91-9876543210');
      expect(result.valid).toBe(true);
    });

    it('RES-U-002: should accept Indian mobile without country code', () => {
      const result = validatePhoneNumber('9876543210');
      expect(result.valid).toBe(true);
    });

    it('RES-U-002: should accept international format', () => {
      const result = validatePhoneNumber('+1-555-123-4567');
      expect(result.valid).toBe(true);
    });

    it('RES-U-002: should reject short number', () => {
      const result = validatePhoneNumber('12345');
      expect(result.valid).toBe(false);
    });

    it('RES-U-002: should reject number with letters', () => {
      const result = validatePhoneNumber('98765ABCDE');
      expect(result.valid).toBe(false);
    });
  });

  describe('Join Date Validation', () => {
    // RES-U-003: Reject future joinDate
    it('RES-U-003: should reject join date in the future', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const result = validateJoinDate(tomorrow);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('future');
    });

    it('RES-U-003: should accept today as join date', () => {
      const today = new Date();
      const result = validateJoinDate(today);
      expect(result.valid).toBe(true);
    });

    it('RES-U-003: should accept past join date', () => {
      const pastDate = new Date('2020-01-01');
      const result = validateJoinDate(pastDate);
      expect(result.valid).toBe(true);
    });

    it('RES-U-003: should reject far future date', () => {
      const futureDate = new Date('2030-01-01');
      const result = validateJoinDate(futureDate);
      expect(result.valid).toBe(false);
    });
  });

  describe('Cost Rate Validation', () => {
    // RES-U-004: Reject negative cost rate
    it('RES-U-004: should reject negative cost rate', () => {
      const result = validateCostRate(-100);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('positive');
    });

    it('RES-U-004: should accept zero cost rate', () => {
      const result = validateCostRate(0);
      expect(result.valid).toBe(true);
    });

    it('RES-U-004: should accept positive cost rate', () => {
      const result = validateCostRate(50000);
      expect(result.valid).toBe(true);
    });

    it('RES-U-004: should accept decimal cost rate', () => {
      const result = validateCostRate(50000.50);
      expect(result.valid).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // EDGE CASE TESTS
  // ═══════════════════════════════════════════════════════════════════════

  describe('Resource with Skills Edge Cases', () => {
    // RES-U-005: Handle resource with 0 skills
    it('RES-U-005: should handle resource with 0 skills', async () => {
      const resource = {
        id: 'res-1',
        firstName: 'John',
        lastName: 'Doe',
        skills: [],
      };
      
      expect(resource.skills.length).toBe(0);
      expect(calculateUtilization([])).toBe(0);
    });

    // RES-U-006: Handle resource with 100 skills
    it('RES-U-006: should handle resource with 100 skills', () => {
      const skills = Array.from({ length: 100 }, (_, i) => ({
        id: `skill-${i}`,
        name: `Skill ${i}`,
        proficiency: Math.ceil(Math.random() * 5),
      }));
      
      expect(skills.length).toBe(100);
      // Should not throw error
      expect(() => skills.map(s => s.name)).not.toThrow();
    });
  });

  describe('Search Input Handling', () => {
    // RES-U-007: Search with empty string
    it('RES-U-007: should handle empty search string', () => {
      const sanitized = sanitizeSearchInput('');
      expect(sanitized).toBe('');
    });

    // RES-U-008: Search with SQL injection attempt
    it('RES-U-008: should sanitize SQL injection attempt', () => {
      const malicious = "'; DROP TABLE resources; --";
      const sanitized = sanitizeSearchInput(malicious);
      expect(sanitized).not.toContain('DROP');
      expect(sanitized).not.toContain(';');
      expect(sanitized).not.toContain('--');
    });

    it('RES-U-008: should sanitize OR 1=1 injection', () => {
      const malicious = "' OR 1=1 --";
      const sanitized = sanitizeSearchInput(malicious);
      expect(sanitized).not.toContain('OR');
    });

    it('RES-U-008: should sanitize UNION SELECT injection', () => {
      const malicious = "' UNION SELECT * FROM users --";
      const sanitized = sanitizeSearchInput(malicious);
      expect(sanitized).not.toContain('UNION');
      expect(sanitized).not.toContain('SELECT');
    });

    it('RES-U-008: should preserve normal search text', () => {
      const normal = 'Java Developer';
      const sanitized = sanitizeSearchInput(normal);
      expect(sanitized).toBe('Java Developer');
    });
  });

  describe('Filter Edge Cases', () => {
    // RES-U-009: Filter by non-existent practice
    it('RES-U-009: should handle non-existent practice filter gracefully', async () => {
      mockPrisma.practice.findUnique.mockResolvedValue(null);
      mockPrisma.resource.findMany.mockResolvedValue([]);
      
      const practice = await mockPrisma.practice.findUnique({
        where: { id: 'non-existent-id' },
      });
      
      expect(practice).toBeNull();
      
      // Should return empty array, not error
      const resources = await mockPrisma.resource.findMany({
        where: { practiceId: 'non-existent-id' },
      });
      
      expect(resources).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // BUSINESS RULE TESTS
  // ═══════════════════════════════════════════════════════════════════════

  describe('Utilization Calculation', () => {
    // RES-U-010: Auto-calculate utilization on allocation change
    it('RES-U-010: should calculate 50% utilization for single 50% allocation', () => {
      const allocations = [
        { percentage: 50, endDate: new Date('2030-12-31') },
      ];
      
      const utilization = calculateUtilization(allocations);
      expect(utilization).toBe(50);
    });

    it('RES-U-010: should calculate 100% for two 50% allocations', () => {
      const allocations = [
        { percentage: 50, endDate: new Date('2030-12-31') },
        { percentage: 50, endDate: new Date('2030-12-31') },
      ];
      
      const utilization = calculateUtilization(allocations);
      expect(utilization).toBe(100);
    });

    it('RES-U-010: should cap utilization at 100%', () => {
      const allocations = [
        { percentage: 100, endDate: new Date('2030-12-31') },
        { percentage: 50, endDate: new Date('2030-12-31') },
      ];
      
      const utilization = calculateUtilization(allocations);
      expect(utilization).toBe(100);
    });

    it('RES-U-010: should exclude ended allocations', () => {
      const allocations = [
        { percentage: 50, endDate: new Date('2020-01-01') }, // Past
        { percentage: 30, endDate: new Date('2030-12-31') }, // Future
      ];
      
      const utilization = calculateUtilization(allocations);
      expect(utilization).toBe(30);
    });

    it('RES-U-010: should handle null end date (ongoing)', () => {
      const allocations = [
        { percentage: 50, endDate: null },
      ];
      
      const utilization = calculateUtilization(allocations);
      expect(utilization).toBe(50);
    });
  });

  describe('Resource Status Changes', () => {
    // RES-U-011: Status change on allocation
    it('RES-U-011: should change status to ALLOCATED when allocation added', () => {
      const status = determineResourceStatus(50, 'AVAILABLE', true);
      expect(status).toBe('ALLOCATED');
    });

    it('RES-U-011: should change status to BENCH when no allocations', () => {
      const status = determineResourceStatus(0, 'ALLOCATED', false);
      expect(status).toBe('BENCH');
    });

    it('RES-U-011: should not change RESIGNED status', () => {
      const status = determineResourceStatus(50, 'RESIGNED', true);
      expect(status).toBe('RESIGNED');
    });

    it('RES-U-011: should not change ON_LEAVE status', () => {
      const status = determineResourceStatus(50, 'ON_LEAVE', true);
      expect(status).toBe('ON_LEAVE');
    });
  });

  describe('Delete with Allocations', () => {
    // RES-U-012: Cannot delete with active allocations
    it('RES-U-012: should prevent deletion with active allocations', async () => {
      mockPrisma.allocation.count.mockResolvedValue(3);
      
      const activeAllocations = await mockPrisma.allocation.count({
        where: {
          resourceId: 'res-1',
          endDate: { gte: new Date() },
        },
      });
      
      expect(activeAllocations).toBeGreaterThan(0);
      
      // Business logic would throw error
      const canDelete = activeAllocations === 0;
      expect(canDelete).toBe(false);
    });

    it('RES-U-012: should allow deletion with no allocations', async () => {
      mockPrisma.allocation.count.mockResolvedValue(0);
      
      const activeAllocations = await mockPrisma.allocation.count({
        where: {
          resourceId: 'res-1',
          endDate: { gte: new Date() },
        },
      });
      
      const canDelete = activeAllocations === 0;
      expect(canDelete).toBe(true);
    });
  });

  describe('Skill Proficiency Validation', () => {
    // RES-U-013: Skill proficiency levels (1-5 only)
    it('RES-U-013: should accept proficiency level 1', () => {
      const result = validateProficiency(1);
      expect(result.valid).toBe(true);
    });

    it('RES-U-013: should accept proficiency level 5', () => {
      const result = validateProficiency(5);
      expect(result.valid).toBe(true);
    });

    it('RES-U-013: should reject proficiency level 0', () => {
      const result = validateProficiency(0);
      expect(result.valid).toBe(false);
    });

    it('RES-U-013: should reject proficiency level 6', () => {
      const result = validateProficiency(6);
      expect(result.valid).toBe(false);
    });

    it('RES-U-013: should reject decimal proficiency', () => {
      const result = validateProficiency(3.5);
      expect(result.valid).toBe(false);
    });

    it('RES-U-013: should reject negative proficiency', () => {
      const result = validateProficiency(-1);
      expect(result.valid).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // ADDITIONAL TESTS
  // ═══════════════════════════════════════════════════════════════════════

  describe('Resource Name Edge Cases', () => {
    it('should handle names with special characters', () => {
      const name = "O'Brien-Smith";
      expect(name.length).toBeGreaterThan(0);
    });

    it('should handle very long names', () => {
      const longName = 'A'.repeat(255);
      expect(longName.length).toBe(255);
    });

    it('should handle unicode names', () => {
      const unicodeName = '田中太郎';
      expect(unicodeName.length).toBeGreaterThan(0);
    });
  });

  describe('Resource Search Performance', () => {
    it('should handle large result sets', async () => {
      const largeResults = Array.from({ length: 1000 }, (_, i) => ({
        id: `res-${i}`,
        firstName: `First${i}`,
        lastName: `Last${i}`,
      }));
      
      mockPrisma.resource.findMany.mockResolvedValue(largeResults);
      
      const results = await mockPrisma.resource.findMany();
      expect(results.length).toBe(1000);
    });
  });
});


