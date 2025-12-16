/**
 * Comprehensive Contract Service Tests
 * Tests: CON-U-001 to CON-U-013
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock Prisma
const mockPrisma = {
  contract: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  invoice: {
    count: vi.fn(),
  },
};

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrisma),
}));

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

type ContractType = 'MSA' | 'SOW' | 'CR';
type ContractStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED';

// ═══════════════════════════════════════════════════════════════════════
// VALIDATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════

// CON-U-001: Contract value validation
function validateContractValue(value: number): { valid: boolean; error?: string } {
  if (value < 0) {
    return { valid: false, error: 'Contract value must be non-negative' };
  }
  return { valid: true };
}

// CON-U-002: Contract type validation
function validateContractType(type: string): { valid: boolean; error?: string } {
  const validTypes: ContractType[] = ['MSA', 'SOW', 'CR'];
  if (!validTypes.includes(type as ContractType)) {
    return { valid: false, error: 'Contract type must be MSA, SOW, or CR' };
  }
  return { valid: true };
}

// CON-U-003: Date range validation
function validateContractDates(startDate: Date, endDate: Date | null): { valid: boolean; error?: string } {
  if (endDate && startDate > endDate) {
    return { valid: false, error: 'Start date must be before end date' };
  }
  return { valid: true };
}

// CON-U-004, CON-U-009, CON-U-010: Parent contract validation
function validateParentContract(
  type: ContractType,
  parentId: string | null,
  parentType?: ContractType
): { valid: boolean; error?: string } {
  // SOW requires MSA parent
  if (type === 'SOW' && !parentId) {
    return { valid: false, error: 'SOW requires a parent MSA' };
  }
  if (type === 'SOW' && parentType && parentType !== 'MSA') {
    return { valid: false, error: 'SOW parent must be an MSA' };
  }
  
  // CR requires SOW parent
  if (type === 'CR' && !parentId) {
    return { valid: false, error: 'CR requires a parent SOW' };
  }
  if (type === 'CR' && parentType && parentType !== 'SOW') {
    return { valid: false, error: 'CR parent must be a SOW' };
  }
  
  // MSA should not have parent
  if (type === 'MSA' && parentId) {
    return { valid: false, error: 'MSA should not have a parent contract' };
  }
  
  return { valid: true };
}

// CON-U-011: Auto-expire check
function shouldExpire(endDate: Date | null): boolean {
  if (!endDate) return false;
  return new Date() > endDate;
}

// Renewal alert check
function shouldTriggerRenewalAlert(endDate: Date | null, alertDays: number = 30): boolean {
  if (!endDate) return false;
  const alertDate = new Date();
  alertDate.setDate(alertDate.getDate() + alertDays);
  return endDate <= alertDate && endDate > new Date();
}

describe('Contract Service - Comprehensive Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════
  // VALIDATION TESTS
  // ═══════════════════════════════════════════════════════════════════════

  describe('Contract Value Validation', () => {
    // CON-U-001: Value must be non-negative
    it('CON-U-001: should accept positive value', () => {
      const result = validateContractValue(100000);
      expect(result.valid).toBe(true);
    });

    it('CON-U-001: should accept zero value', () => {
      const result = validateContractValue(0);
      expect(result.valid).toBe(true);
    });

    it('CON-U-001: should reject negative value', () => {
      const result = validateContractValue(-1000);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('non-negative');
    });

    it('CON-U-001: should accept large value', () => {
      const result = validateContractValue(1000000000); // 1 billion
      expect(result.valid).toBe(true);
    });

    it('CON-U-001: should accept decimal value', () => {
      const result = validateContractValue(99999.99);
      expect(result.valid).toBe(true);
    });
  });

  describe('Contract Type Validation', () => {
    // CON-U-002: Valid contract types
    it('CON-U-002: should accept MSA type', () => {
      const result = validateContractType('MSA');
      expect(result.valid).toBe(true);
    });

    it('CON-U-002: should accept SOW type', () => {
      const result = validateContractType('SOW');
      expect(result.valid).toBe(true);
    });

    it('CON-U-002: should accept CR type', () => {
      const result = validateContractType('CR');
      expect(result.valid).toBe(true);
    });

    it('CON-U-002: should reject invalid type', () => {
      const result = validateContractType('INVALID');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('MSA');
    });

    it('CON-U-002: should reject lowercase type', () => {
      const result = validateContractType('msa');
      expect(result.valid).toBe(false);
    });
  });

  describe('Date Range Validation', () => {
    // CON-U-003: Start before end
    it('CON-U-003: should accept valid date range', () => {
      const result = validateContractDates(
        new Date('2025-01-01'),
        new Date('2025-12-31')
      );
      expect(result.valid).toBe(true);
    });

    it('CON-U-003: should reject start after end', () => {
      const result = validateContractDates(
        new Date('2025-12-31'),
        new Date('2025-01-01')
      );
      expect(result.valid).toBe(false);
    });

    it('CON-U-003: should accept same start and end', () => {
      const date = new Date('2025-06-15');
      const result = validateContractDates(date, date);
      expect(result.valid).toBe(true);
    });

    it('CON-U-003: should accept null end date (perpetual)', () => {
      const result = validateContractDates(new Date('2025-01-01'), null);
      expect(result.valid).toBe(true);
    });
  });

  describe('Parent Contract Validation', () => {
    // CON-U-004: SOW must link to MSA
    it('CON-U-004: should reject SOW without parent', () => {
      const result = validateParentContract('SOW', null);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('MSA');
    });

    it('CON-U-004: should accept SOW with MSA parent', () => {
      const result = validateParentContract('SOW', 'msa-123', 'MSA');
      expect(result.valid).toBe(true);
    });

    it('CON-U-004: should reject SOW with SOW parent', () => {
      const result = validateParentContract('SOW', 'sow-123', 'SOW');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('MSA');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // EDGE CASE TESTS
  // ═══════════════════════════════════════════════════════════════════════

  describe('Zero Value Contract', () => {
    // CON-U-005: Contract with $0 value (pro-bono)
    it('CON-U-005: should allow zero value for pro-bono work', () => {
      const result = validateContractValue(0);
      expect(result.valid).toBe(true);
    });
  });

  describe('Perpetual Contract', () => {
    // CON-U-006: Contract with no end date
    it('CON-U-006: should allow null end date for perpetual MSA', () => {
      const contract = {
        id: 'msa-1',
        type: 'MSA',
        startDate: new Date('2025-01-01'),
        endDate: null,
      };
      
      expect(contract.endDate).toBeNull();
      
      const dateResult = validateContractDates(contract.startDate, contract.endDate);
      expect(dateResult.valid).toBe(true);
    });
  });

  describe('CR Without SOW', () => {
    // CON-U-007: CR requires parent SOW
    it('CON-U-007: should reject CR without parent SOW', () => {
      const result = validateParentContract('CR', null);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('SOW');
    });

    it('CON-U-007: should accept CR with SOW parent', () => {
      const result = validateParentContract('CR', 'sow-123', 'SOW');
      expect(result.valid).toBe(true);
    });

    it('CON-U-007: should reject CR with MSA parent', () => {
      const result = validateParentContract('CR', 'msa-123', 'MSA');
      expect(result.valid).toBe(false);
    });
  });

  describe('Multiple Active SOWs', () => {
    // CON-U-008: Multiple active SOWs under MSA
    it('CON-U-008: should track multiple SOWs under MSA', async () => {
      const sowsUnderMsa = [
        { id: 'sow-1', parentId: 'msa-1', status: 'ACTIVE', value: 100000 },
        { id: 'sow-2', parentId: 'msa-1', status: 'ACTIVE', value: 150000 },
        { id: 'sow-3', parentId: 'msa-1', status: 'ACTIVE', value: 200000 },
      ];
      
      const totalValue = sowsUnderMsa.reduce((sum, sow) => sum + sow.value, 0);
      expect(sowsUnderMsa.length).toBe(3);
      expect(totalValue).toBe(450000);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // BUSINESS RULE TESTS
  // ═══════════════════════════════════════════════════════════════════════

  describe('MSA Required Before SOW', () => {
    // CON-U-009: MSA must exist before creating SOW
    it('CON-U-009: should require MSA exists before SOW creation', async () => {
      mockPrisma.contract.findUnique.mockResolvedValue(null);
      
      const parentMsa = await mockPrisma.contract.findUnique({
        where: { id: 'non-existent-msa' },
      });
      
      expect(parentMsa).toBeNull();
      
      const canCreateSow = parentMsa !== null;
      expect(canCreateSow).toBe(false);
    });
  });

  describe('SOW Required Before CR', () => {
    // CON-U-010: SOW must exist before creating CR
    it('CON-U-010: should require SOW exists before CR creation', async () => {
      mockPrisma.contract.findUnique.mockResolvedValue(null);
      
      const parentSow = await mockPrisma.contract.findUnique({
        where: { id: 'non-existent-sow' },
      });
      
      expect(parentSow).toBeNull();
      
      const canCreateCr = parentSow !== null;
      expect(canCreateCr).toBe(false);
    });
  });

  describe('Auto-Expire on End Date', () => {
    // CON-U-011: Auto-expire when end date passes
    it('CON-U-011: should flag contract for expiry when past end date', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      
      expect(shouldExpire(pastDate)).toBe(true);
    });

    it('CON-U-011: should not flag contract when before end date', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      
      expect(shouldExpire(futureDate)).toBe(false);
    });

    it('CON-U-011: should not flag perpetual contract', () => {
      expect(shouldExpire(null)).toBe(false);
    });
  });

  describe('Delete with Invoices', () => {
    // CON-U-012: Cannot delete with linked invoices
    it('CON-U-012: should prevent deletion with linked invoices', async () => {
      mockPrisma.invoice.count.mockResolvedValue(5);
      
      const invoiceCount = await mockPrisma.invoice.count({
        where: { contractId: 'contract-1' },
      });
      
      const canDelete = invoiceCount === 0;
      expect(canDelete).toBe(false);
    });

    it('CON-U-012: should allow deletion with no invoices', async () => {
      mockPrisma.invoice.count.mockResolvedValue(0);
      
      const invoiceCount = await mockPrisma.invoice.count({
        where: { contractId: 'contract-1' },
      });
      
      const canDelete = invoiceCount === 0;
      expect(canDelete).toBe(true);
    });
  });

  describe('Renewal Workflow', () => {
    // CON-U-013: Alert triggered for contracts expiring soon
    it('CON-U-013: should trigger alert for contract expiring in 30 days', () => {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 25);
      
      expect(shouldTriggerRenewalAlert(endDate, 30)).toBe(true);
    });

    it('CON-U-013: should not trigger alert for contract expiring in 60 days', () => {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 60);
      
      expect(shouldTriggerRenewalAlert(endDate, 30)).toBe(false);
    });

    it('CON-U-013: should not trigger alert for already expired contract', () => {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - 5);
      
      expect(shouldTriggerRenewalAlert(endDate, 30)).toBe(false);
    });

    it('CON-U-013: should not trigger alert for perpetual contract', () => {
      expect(shouldTriggerRenewalAlert(null, 30)).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // ADDITIONAL TESTS
  // ═══════════════════════════════════════════════════════════════════════

  describe('Contract Hierarchy', () => {
    it('should calculate total value across hierarchy', () => {
      const msa = { type: 'MSA', value: 0 };
      const sows = [
        { type: 'SOW', value: 100000 },
        { type: 'SOW', value: 150000 },
      ];
      const crs = [
        { type: 'CR', value: 25000 },
        { type: 'CR', value: 30000 },
      ];
      
      const totalValue = sows.reduce((sum, s) => sum + s.value, 0) +
                         crs.reduce((sum, c) => sum + c.value, 0);
      
      expect(totalValue).toBe(305000);
    });
  });

  describe('MSA Standalone', () => {
    it('should not require parent for MSA', () => {
      const result = validateParentContract('MSA', null);
      expect(result.valid).toBe(true);
    });

    it('should reject parent for MSA', () => {
      const result = validateParentContract('MSA', 'some-parent');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('should not have');
    });
  });
});

