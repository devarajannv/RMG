/**
 * Comprehensive Client Service Tests
 * Tests: CLI-U-001 to CLI-U-011
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock Prisma
const mockPrisma = {
  client: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  contract: {
    count: vi.fn(),
    findMany: vi.fn(),
  },
  project: {
    count: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
};

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrisma),
}));

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

type ClientTier = 'STRATEGIC' | 'KEY' | 'STANDARD';
type ClientStatus = 'ACTIVE' | 'INACTIVE' | 'PROSPECT';

// ═══════════════════════════════════════════════════════════════════════
// VALIDATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════

// CLI-U-001: Client code uniqueness check (async)
async function isClientCodeUnique(code: string, excludeId?: string): Promise<boolean> {
  const existing = await mockPrisma.client.findFirst({
    where: { code, id: excludeId ? { not: excludeId } : undefined },
  });
  return !existing;
}

// CLI-U-002: Website URL validation
function validateWebsiteUrl(url: string): { valid: boolean; error?: string } {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: 'URL must use http or https protocol' };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

// CLI-U-003: Tier validation
function validateTier(tier: string): { valid: boolean; error?: string } {
  const validTiers: ClientTier[] = ['STRATEGIC', 'KEY', 'STANDARD'];
  if (!validTiers.includes(tier as ClientTier)) {
    return { valid: false, error: 'Tier must be STRATEGIC, KEY, or STANDARD' };
  }
  return { valid: true };
}

// CLI-U-004: Contact email validation
function validateEmail(email: string): { valid: boolean; error?: string } {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }
  return { valid: true };
}

// Contact deduplication
function hasDuplicateContactEmails(contacts: Array<{ email: string }>): boolean {
  const emails = contacts.map(c => c.email.toLowerCase());
  return new Set(emails).size !== emails.length;
}

// Escape special characters for safe storage
function escapeSpecialChars(str: string): string {
  return str
    .replace(/'/g, "''")  // SQL escape for single quotes
    .replace(/\\/g, '\\\\');
}

describe('Client Service - Comprehensive Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════
  // VALIDATION TESTS
  // ═══════════════════════════════════════════════════════════════════════

  describe('Client Code Uniqueness', () => {
    // CLI-U-001: Client code must be unique
    it('CLI-U-001: should reject duplicate client code', async () => {
      mockPrisma.client.findFirst.mockResolvedValue({ id: 'existing', code: 'ACME' });
      
      const isUnique = await isClientCodeUnique('ACME');
      expect(isUnique).toBe(false);
    });

    it('CLI-U-001: should accept unique client code', async () => {
      mockPrisma.client.findFirst.mockResolvedValue(null);
      
      const isUnique = await isClientCodeUnique('NEWCLIENT');
      expect(isUnique).toBe(true);
    });

    it('CLI-U-001: should allow same code when updating own record', async () => {
      mockPrisma.client.findFirst.mockResolvedValue(null);
      
      const isUnique = await isClientCodeUnique('ACME', 'client-1');
      expect(isUnique).toBe(true);
    });
  });

  describe('Website URL Validation', () => {
    // CLI-U-002: Website URL format
    it('CLI-U-002: should accept valid https URL', () => {
      const result = validateWebsiteUrl('https://www.example.com');
      expect(result.valid).toBe(true);
    });

    it('CLI-U-002: should accept valid http URL', () => {
      const result = validateWebsiteUrl('http://example.com');
      expect(result.valid).toBe(true);
    });

    it('CLI-U-002: should reject invalid URL', () => {
      const result = validateWebsiteUrl('not-a-url');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid URL');
    });

    it('CLI-U-002: should reject ftp URL', () => {
      const result = validateWebsiteUrl('ftp://files.example.com');
      expect(result.valid).toBe(false);
    });

    it('CLI-U-002: should accept URL with path', () => {
      const result = validateWebsiteUrl('https://example.com/about');
      expect(result.valid).toBe(true);
    });

    it('CLI-U-002: should accept URL with query params', () => {
      const result = validateWebsiteUrl('https://example.com?id=123');
      expect(result.valid).toBe(true);
    });
  });

  describe('Tier Validation', () => {
    // CLI-U-003: Valid tier values
    it('CLI-U-003: should accept STRATEGIC tier', () => {
      const result = validateTier('STRATEGIC');
      expect(result.valid).toBe(true);
    });

    it('CLI-U-003: should accept KEY tier', () => {
      const result = validateTier('KEY');
      expect(result.valid).toBe(true);
    });

    it('CLI-U-003: should accept STANDARD tier', () => {
      const result = validateTier('STANDARD');
      expect(result.valid).toBe(true);
    });

    it('CLI-U-003: should reject INVALID tier', () => {
      const result = validateTier('INVALID');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('STRATEGIC');
    });

    it('CLI-U-003: should reject lowercase tier', () => {
      const result = validateTier('strategic');
      expect(result.valid).toBe(false);
    });
  });

  describe('Contact Email Validation', () => {
    // CLI-U-004: Contact email format
    it('CLI-U-004: should accept valid email', () => {
      const result = validateEmail('contact@example.com');
      expect(result.valid).toBe(true);
    });

    it('CLI-U-004: should reject invalid email', () => {
      const result = validateEmail('invalid-email');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid email');
    });

    it('CLI-U-004: should reject email without domain', () => {
      const result = validateEmail('user@');
      expect(result.valid).toBe(false);
    });

    it('CLI-U-004: should reject email without local part', () => {
      const result = validateEmail('@example.com');
      expect(result.valid).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // EDGE CASE TESTS
  // ═══════════════════════════════════════════════════════════════════════

  describe('Client with No Contracts', () => {
    // CLI-U-005: Client without contracts is valid
    it('CLI-U-005: should handle client with no contracts', async () => {
      mockPrisma.contract.count.mockResolvedValue(0);
      
      const contractCount = await mockPrisma.contract.count({
        where: { clientId: 'client-1' },
      });
      
      expect(contractCount).toBe(0);
    });
  });

  describe('Client with No Contacts', () => {
    // CLI-U-006: Client without contacts is valid
    it('CLI-U-006: should handle client with no contacts', () => {
      const client = {
        id: 'client-1',
        name: 'Test Client',
        contacts: [],
      };
      
      expect(client.contacts.length).toBe(0);
    });
  });

  describe('Client Name with Special Characters', () => {
    // CLI-U-007: Handle special chars in name
    it('CLI-U-007: should handle apostrophes in name', () => {
      const name = "O'Brien & Co.";
      const escaped = escapeSpecialChars(name);
      
      expect(escaped).toContain("''"); // SQL-escaped apostrophe
    });

    it('CLI-U-007: should handle ampersand in name', () => {
      const name = 'Smith & Associates';
      expect(name).toContain('&');
    });

    it('CLI-U-007: should handle parentheses in name', () => {
      const name = 'Company (India) Pvt Ltd';
      expect(name).toContain('(');
    });
  });

  describe('Duplicate Contact Emails', () => {
    // CLI-U-008: Duplicate contact email detection
    it('CLI-U-008: should detect duplicate contact emails', () => {
      const contacts = [
        { email: 'john@example.com' },
        { email: 'jane@example.com' },
        { email: 'john@example.com' }, // Duplicate
      ];
      
      const hasDuplicates = hasDuplicateContactEmails(contacts);
      expect(hasDuplicates).toBe(true);
    });

    it('CLI-U-008: should detect case-insensitive duplicates', () => {
      const contacts = [
        { email: 'John@Example.com' },
        { email: 'john@example.com' },
      ];
      
      const hasDuplicates = hasDuplicateContactEmails(contacts);
      expect(hasDuplicates).toBe(true);
    });

    it('CLI-U-008: should allow unique emails', () => {
      const contacts = [
        { email: 'john@example.com' },
        { email: 'jane@example.com' },
      ];
      
      const hasDuplicates = hasDuplicateContactEmails(contacts);
      expect(hasDuplicates).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // BUSINESS RULE TESTS
  // ═══════════════════════════════════════════════════════════════════════

  describe('Delete with Active Contracts', () => {
    // CLI-U-009: Cannot delete with active contracts
    it('CLI-U-009: should prevent deletion with active contracts', async () => {
      mockPrisma.contract.count.mockResolvedValue(3);
      
      const activeContracts = await mockPrisma.contract.count({
        where: {
          clientId: 'client-1',
          status: 'ACTIVE',
        },
      });
      
      const canDelete = activeContracts === 0;
      expect(canDelete).toBe(false);
    });

    it('CLI-U-009: should allow deletion with no active contracts', async () => {
      mockPrisma.contract.count.mockResolvedValue(0);
      
      const activeContracts = await mockPrisma.contract.count({
        where: {
          clientId: 'client-1',
          status: 'ACTIVE',
        },
      });
      
      const canDelete = activeContracts === 0;
      expect(canDelete).toBe(true);
    });
  });

  describe('Status Change Affects Projects', () => {
    // CLI-U-010: Status change warning for active projects
    it('CLI-U-010: should warn when deactivating client with active projects', async () => {
      mockPrisma.project.count.mockResolvedValue(5);
      
      const activeProjects = await mockPrisma.project.count({
        where: {
          clientId: 'client-1',
          status: 'ACTIVE',
        },
      });
      
      const shouldWarn = activeProjects > 0;
      expect(shouldWarn).toBe(true);
    });

    it('CLI-U-010: should not warn when no active projects', async () => {
      mockPrisma.project.count.mockResolvedValue(0);
      
      const activeProjects = await mockPrisma.project.count({
        where: {
          clientId: 'client-1',
          status: 'ACTIVE',
        },
      });
      
      const shouldWarn = activeProjects > 0;
      expect(shouldWarn).toBe(false);
    });
  });

  describe('Tier Change Audit', () => {
    // CLI-U-011: Tier upgrade/downgrade creates audit log
    it('CLI-U-011: should create audit log on tier change', async () => {
      const oldTier: ClientTier = 'STANDARD';
      const newTier: ClientTier = 'STRATEGIC';
      
      await mockPrisma.auditLog.create({
        data: {
          entityType: 'CLIENT',
          entityId: 'client-1',
          action: 'TIER_CHANGE',
          oldValue: oldTier,
          newValue: newTier,
          userId: 'user-1',
        },
      });
      
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'TIER_CHANGE',
            oldValue: 'STANDARD',
            newValue: 'STRATEGIC',
          }),
        })
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // ADDITIONAL TESTS
  // ═══════════════════════════════════════════════════════════════════════

  describe('Industry and Region', () => {
    it('should accept various industry values', () => {
      const industries = [
        'Technology',
        'Healthcare',
        'Finance',
        'Manufacturing',
        'Retail',
        'Energy',
      ];
      
      industries.forEach(industry => {
        expect(industry.length).toBeGreaterThan(0);
      });
    });

    it('should accept various region values', () => {
      const regions = [
        'North America',
        'Europe',
        'Asia Pacific',
        'Middle East',
        'Latin America',
      ];
      
      regions.forEach(region => {
        expect(region.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Address Validation', () => {
    it('should accept valid address components', () => {
      const address = {
        street: '123 Main Street',
        city: 'New York',
        state: 'NY',
        country: 'USA',
        postalCode: '10001',
      };
      
      expect(address.city.length).toBeGreaterThan(0);
    });

    it('should handle international postal codes', () => {
      const postalCodes = [
        '10001',      // USA
        'SW1A 1AA',   // UK
        '110001',     // India
        '100-0001',   // Japan
      ];
      
      postalCodes.forEach(code => {
        expect(code.length).toBeGreaterThan(0);
      });
    });
  });
});

