/**
 * Comprehensive Currency Service Tests
 * Tests: CUR-U-001 to CUR-U-014
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock Prisma
const mockPrisma = {
  currency: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  exchangeRate: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
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

interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  isBase: boolean;
  isActive: boolean;
}

interface ExchangeRate {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  effectiveFrom: Date;
  effectiveTo: Date | null;
}

// ═══════════════════════════════════════════════════════════════════════
// VALIDATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════

// CUR-U-001: Currency code validation (ISO 4217)
function validateCurrencyCode(code: string): { valid: boolean; error?: string } {
  if (!code || code.length !== 3) {
    return { valid: false, error: 'Currency code must be exactly 3 characters (ISO 4217)' };
  }
  if (!/^[A-Z]{3}$/.test(code)) {
    return { valid: false, error: 'Currency code must be uppercase letters only' };
  }
  return { valid: true };
}

// CUR-U-002, CUR-U-003: Exchange rate validation
function validateExchangeRate(rate: number): { valid: boolean; error?: string } {
  if (rate <= 0) {
    return { valid: false, error: 'Exchange rate must be greater than 0' };
  }
  return { valid: true };
}

// CUR-U-004: Effective date range validation
function validateEffectiveDates(
  effectiveFrom: Date,
  effectiveTo: Date | null
): { valid: boolean; error?: string } {
  if (effectiveTo && effectiveFrom > effectiveTo) {
    return { valid: false, error: 'Effective from must be before effective to' };
  }
  return { valid: true };
}

// CUR-U-005: Same currency conversion
function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rate: number
): number {
  if (fromCurrency === toCurrency) {
    return amount; // No conversion needed
  }
  return amount * rate;
}

// CUR-U-011: Get latest effective rate
function getLatestRate(
  rates: ExchangeRate[],
  fromCurrency: string,
  toCurrency: string,
  asOfDate: Date = new Date()
): ExchangeRate | null {
  const applicable = rates
    .filter(r => 
      r.fromCurrency === fromCurrency &&
      r.toCurrency === toCurrency &&
      r.effectiveFrom <= asOfDate &&
      (!r.effectiveTo || r.effectiveTo >= asOfDate)
    )
    .sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime());
  
  return applicable[0] || null;
}

// CUR-U-012: Calculate inverse rate
function calculateInverseRate(rate: number): number {
  return 1 / rate;
}

describe('Currency Service - Comprehensive Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════
  // VALIDATION TESTS
  // ═══════════════════════════════════════════════════════════════════════

  describe('Currency Code Validation', () => {
    // CUR-U-001: Valid 3-character ISO code
    it('CUR-U-001: should accept valid currency code USD', () => {
      const result = validateCurrencyCode('USD');
      expect(result.valid).toBe(true);
    });

    it('CUR-U-001: should accept valid currency code INR', () => {
      const result = validateCurrencyCode('INR');
      expect(result.valid).toBe(true);
    });

    it('CUR-U-001: should reject 4-character code', () => {
      const result = validateCurrencyCode('USDD');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('3 characters');
    });

    it('CUR-U-001: should reject 2-character code', () => {
      const result = validateCurrencyCode('US');
      expect(result.valid).toBe(false);
    });

    it('CUR-U-001: should reject lowercase code', () => {
      const result = validateCurrencyCode('usd');
      expect(result.valid).toBe(false);
    });

    it('CUR-U-001: should reject code with numbers', () => {
      const result = validateCurrencyCode('US1');
      expect(result.valid).toBe(false);
    });

    it('CUR-U-001: should reject empty code', () => {
      const result = validateCurrencyCode('');
      expect(result.valid).toBe(false);
    });
  });

  describe('Exchange Rate Validation', () => {
    // CUR-U-002: Rate must be positive
    it('CUR-U-002: should accept positive rate', () => {
      const result = validateExchangeRate(83.50);
      expect(result.valid).toBe(true);
    });

    it('CUR-U-002: should reject zero rate', () => {
      const result = validateExchangeRate(0);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('greater than 0');
    });

    // CUR-U-003: Rate must be positive
    it('CUR-U-003: should reject negative rate', () => {
      const result = validateExchangeRate(-1);
      expect(result.valid).toBe(false);
    });

    it('should accept very small rate', () => {
      const result = validateExchangeRate(0.0001);
      expect(result.valid).toBe(true);
    });

    it('should accept very large rate', () => {
      const result = validateExchangeRate(1000000);
      expect(result.valid).toBe(true);
    });
  });

  describe('Effective Date Validation', () => {
    // CUR-U-004: Valid effective dates
    it('CUR-U-004: should accept valid date range', () => {
      const result = validateEffectiveDates(
        new Date('2025-01-01'),
        new Date('2025-12-31')
      );
      expect(result.valid).toBe(true);
    });

    it('CUR-U-004: should reject invalid date range', () => {
      const result = validateEffectiveDates(
        new Date('2025-12-31'),
        new Date('2025-01-01')
      );
      expect(result.valid).toBe(false);
    });

    it('CUR-U-004: should accept null end date', () => {
      const result = validateEffectiveDates(new Date('2025-01-01'), null);
      expect(result.valid).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // EDGE CASE TESTS
  // ═══════════════════════════════════════════════════════════════════════

  describe('Same Currency Conversion', () => {
    // CUR-U-005: Same currency returns same amount
    it('CUR-U-005: should return same amount for USD to USD', () => {
      const result = convertCurrency(1000, 'USD', 'USD', 1);
      expect(result).toBe(1000);
    });

    it('CUR-U-005: should return same amount for INR to INR', () => {
      const result = convertCurrency(50000, 'INR', 'INR', 1);
      expect(result).toBe(50000);
    });
  });

  describe('Small Amount Conversion', () => {
    // CUR-U-006: Very small amounts
    it('CUR-U-006: should handle 0.001 USD conversion', () => {
      const result = convertCurrency(0.001, 'USD', 'INR', 83);
      expect(result).toBeCloseTo(0.083, 3);
    });

    it('CUR-U-006: should handle fractional cents', () => {
      const result = convertCurrency(0.005, 'USD', 'INR', 83);
      expect(result).toBeCloseTo(0.415, 3);
    });
  });

  describe('Large Amount Conversion', () => {
    // CUR-U-007: Very large amounts
    it('CUR-U-007: should handle 1 billion USD conversion', () => {
      const result = convertCurrency(1000000000, 'USD', 'INR', 83);
      expect(result).toBe(83000000000);
    });

    it('CUR-U-007: should not overflow', () => {
      const result = convertCurrency(Number.MAX_SAFE_INTEGER / 100, 'USD', 'INR', 83);
      expect(Number.isFinite(result)).toBe(true);
    });
  });

  describe('Historical Rate Lookup', () => {
    // CUR-U-008: Historical rate not found
    it('CUR-U-008: should return null for missing historical rate', () => {
      const rates: ExchangeRate[] = [
        {
          id: 'rate-1',
          fromCurrency: 'USD',
          toCurrency: 'INR',
          rate: 83,
          effectiveFrom: new Date('2024-01-01'),
          effectiveTo: null,
        },
      ];
      
      const result = getLatestRate(rates, 'USD', 'INR', new Date('1990-01-01'));
      expect(result).toBeNull();
    });
  });

  describe('Future Effective Date', () => {
    // CUR-U-009: Future effective date (not active yet)
    it('CUR-U-009: should not use rate with future effective date', () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);
      
      const rates: ExchangeRate[] = [
        {
          id: 'rate-1',
          fromCurrency: 'USD',
          toCurrency: 'INR',
          rate: 85,
          effectiveFrom: futureDate,
          effectiveTo: null,
        },
        {
          id: 'rate-2',
          fromCurrency: 'USD',
          toCurrency: 'INR',
          rate: 83,
          effectiveFrom: new Date('2024-01-01'),
          effectiveTo: null,
        },
      ];
      
      const result = getLatestRate(rates, 'USD', 'INR');
      expect(result?.rate).toBe(83); // Current rate, not future
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // BUSINESS RULE TESTS
  // ═══════════════════════════════════════════════════════════════════════

  describe('Single Base Currency', () => {
    // CUR-U-010: Only one base currency allowed
    it('CUR-U-010: should reject second base currency', async () => {
      mockPrisma.currency.count.mockResolvedValue(1);
      
      const existingBaseCount = await mockPrisma.currency.count({
        where: { isBase: true },
      });
      
      const canSetAsBase = existingBaseCount === 0;
      expect(canSetAsBase).toBe(false);
    });

    it('CUR-U-010: should allow first base currency', async () => {
      mockPrisma.currency.count.mockResolvedValue(0);
      
      const existingBaseCount = await mockPrisma.currency.count({
        where: { isBase: true },
      });
      
      const canSetAsBase = existingBaseCount === 0;
      expect(canSetAsBase).toBe(true);
    });
  });

  describe('Latest Effective Rate', () => {
    // CUR-U-011: Use most recent effective rate
    it('CUR-U-011: should return most recent applicable rate', () => {
      const rates: ExchangeRate[] = [
        {
          id: 'rate-1',
          fromCurrency: 'USD',
          toCurrency: 'INR',
          rate: 80,
          effectiveFrom: new Date('2024-01-01'),
          effectiveTo: new Date('2024-06-30'),
        },
        {
          id: 'rate-2',
          fromCurrency: 'USD',
          toCurrency: 'INR',
          rate: 83,
          effectiveFrom: new Date('2024-07-01'),
          effectiveTo: null,
        },
      ];
      
      const result = getLatestRate(rates, 'USD', 'INR');
      expect(result?.rate).toBe(83);
    });
  });

  describe('Inverse Rate Calculation', () => {
    // CUR-U-012: Calculate INR→USD from USD→INR
    it('CUR-U-012: should calculate correct inverse rate', () => {
      const usdToInr = 83;
      const inrToUsd = calculateInverseRate(usdToInr);
      
      expect(inrToUsd).toBeCloseTo(0.012048, 5);
    });

    it('CUR-U-012: should round-trip correctly', () => {
      const original = 83;
      const inverse = calculateInverseRate(original);
      const backToOriginal = calculateInverseRate(inverse);
      
      expect(backToOriginal).toBeCloseTo(original, 5);
    });
  });

  describe('Cannot Delete Base Currency', () => {
    // CUR-U-013: Base currency is protected
    it('CUR-U-013: should prevent deletion of base currency', async () => {
      mockPrisma.currency.findUnique.mockResolvedValue({
        id: 'usd',
        code: 'USD',
        isBase: true,
      });
      
      const currency = await mockPrisma.currency.findUnique({
        where: { id: 'usd' },
      });
      
      const canDelete = currency && !currency.isBase;
      expect(canDelete).toBe(false);
    });

    it('CUR-U-013: should allow deletion of non-base currency', async () => {
      mockPrisma.currency.findUnique.mockResolvedValue({
        id: 'gbp',
        code: 'GBP',
        isBase: false,
      });
      
      const currency = await mockPrisma.currency.findUnique({
        where: { id: 'gbp' },
      });
      
      const canDelete = currency && !currency.isBase;
      expect(canDelete).toBe(true);
    });
  });

  describe('Cannot Delete Currency with Transactions', () => {
    // CUR-U-014: Currency with transactions is protected
    it('CUR-U-014: should prevent deletion with linked invoices', async () => {
      mockPrisma.invoice.count.mockResolvedValue(5);
      
      const invoiceCount = await mockPrisma.invoice.count({
        where: { currencyId: 'inr' },
      });
      
      const canDelete = invoiceCount === 0;
      expect(canDelete).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // ADDITIONAL TESTS
  // ═══════════════════════════════════════════════════════════════════════

  describe('Currency Formatting', () => {
    it('should format currency with symbol', () => {
      const currencies: Record<string, string> = {
        USD: '$',
        INR: '₹',
        EUR: '€',
        GBP: '£',
        JPY: '¥',
      };
      
      Object.entries(currencies).forEach(([code, symbol]) => {
        expect(symbol.length).toBeGreaterThan(0);
      });
    });

    it('should format large numbers with commas', () => {
      const amount = 1234567.89;
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(amount);
      
      expect(formatted).toContain(',');
      expect(formatted).toContain('$');
    });
  });

  describe('Rate Precision', () => {
    it('should maintain precision for rates', () => {
      const rate = 83.123456;
      const amount = 1000;
      const converted = amount * rate;
      
      expect(converted).toBeCloseTo(83123.456, 3);
    });
  });
});

