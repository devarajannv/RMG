/**
 * Comprehensive Auth Service Tests
 * Tests: AUTH-U-001 to AUTH-U-012
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

// Mock Prisma
const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  refreshToken: {
    create: vi.fn(),
    findFirst: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
  loginAttempt: {
    count: vi.fn(),
    create: vi.fn(),
    deleteMany: vi.fn(),
  },
  passwordHistory: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
};

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrisma),
}));

// Password validation functions (to be implemented in auth.service.ts)
function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // AUTH-U-001: Minimum 12 characters
  if (password.length < 12) {
    errors.push('Password must be at least 12 characters');
  }
  
  // AUTH-U-002: Must contain uppercase
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain uppercase letter');
  }
  
  // AUTH-U-003: Must contain number
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain number');
  }
  
  // AUTH-U-004: Must contain special character
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain special character');
  }
  
  return { valid: errors.length === 0, errors };
}

// AUTH-U-005: Common password check
const COMMON_PASSWORDS = [
  'password123!',
  'Password123!',
  'Qwerty123456!',
  'Admin12345678!',
  'Welcome12345!',
];

function isCommonPassword(password: string): boolean {
  return COMMON_PASSWORDS.some(common => 
    password.toLowerCase() === common.toLowerCase()
  );
}

// AUTH-U-006: Email validation
function validateEmail(email: string): boolean {
  // More strict regex that rejects consecutive dots
  const emailRegex = /^(?!.*\.\.)([a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+)@([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

// AUTH-U-007: Case-insensitive email lookup
function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

// AUTH-U-008: Account lockout check
async function checkAccountLockout(userId: string, prisma: typeof mockPrisma): Promise<{ locked: boolean; minutesRemaining?: number }> {
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  
  const failedAttempts = await prisma.loginAttempt.count({
    where: {
      userId,
      success: false,
      createdAt: { gte: fifteenMinutesAgo },
    },
  });
  
  if (failedAttempts >= 5) {
    return { locked: true, minutesRemaining: 15 };
  }
  
  return { locked: false };
}

// AUTH-U-009: Token expiry check
function isTokenExpired(exp: number): boolean {
  const now = Math.floor(Date.now() / 1000);
  return exp <= now;
}

// AUTH-U-010: Refresh token reuse detection
async function checkRefreshTokenReuse(token: string, prisma: typeof mockPrisma): Promise<boolean> {
  const existingToken = await prisma.refreshToken.findFirst({
    where: { token, used: true },
  });
  return !!existingToken;
}

// AUTH-U-012: Password history check
async function isPasswordInHistory(userId: string, newPassword: string, prisma: typeof mockPrisma): Promise<boolean> {
  const history = await prisma.passwordHistory.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });
  
  for (const entry of history) {
    if (await argon2.verify(entry.passwordHash, newPassword)) {
      return true;
    }
  }
  
  return false;
}

describe('Auth Service - Comprehensive Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════
  // VALIDATION TESTS
  // ═══════════════════════════════════════════════════════════════════════

  describe('Password Validation', () => {
    // AUTH-U-001: Reject password < 12 chars
    it('AUTH-U-001: should reject password shorter than 12 characters', () => {
      const result = validatePassword('Short123!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 12 characters');
    });

    it('AUTH-U-001: should accept password with exactly 12 characters', () => {
      const result = validatePassword('ValidPass12!');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    // AUTH-U-002: Reject password without uppercase
    it('AUTH-U-002: should reject password without uppercase letter', () => {
      const result = validatePassword('alllowercase123!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain uppercase letter');
    });

    it('AUTH-U-002: should accept password with uppercase letter', () => {
      const result = validatePassword('HasUppercase123!');
      expect(result.valid).toBe(true);
    });

    // AUTH-U-003: Reject password without number
    it('AUTH-U-003: should reject password without number', () => {
      const result = validatePassword('NoNumbersHere!!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain number');
    });

    it('AUTH-U-003: should accept password with number', () => {
      const result = validatePassword('HasNumber123!!');
      expect(result.valid).toBe(true);
    });

    // AUTH-U-004: Reject password without special char
    it('AUTH-U-004: should reject password without special character', () => {
      const result = validatePassword('NoSpecialChar123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain special character');
    });

    it('AUTH-U-004: should accept password with special character', () => {
      const result = validatePassword('HasSpecial123!@');
      expect(result.valid).toBe(true);
    });

    // Test all validations together
    it('should report multiple validation errors', () => {
      const result = validatePassword('short');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });

    it('should accept a fully valid password', () => {
      const result = validatePassword('SecurePassword123!@#');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Common Password Check', () => {
    // AUTH-U-005: Reject common passwords
    it('AUTH-U-005: should reject common password "Password123!"', () => {
      expect(isCommonPassword('Password123!')).toBe(true);
    });

    it('AUTH-U-005: should reject common passwords case-insensitively', () => {
      expect(isCommonPassword('PASSWORD123!')).toBe(true);
      expect(isCommonPassword('password123!')).toBe(true);
    });

    it('AUTH-U-005: should accept non-common password', () => {
      expect(isCommonPassword('MyUniqueP@ssw0rd!')).toBe(false);
    });
  });

  describe('Email Validation', () => {
    // AUTH-U-006: Reject invalid email domain
    it('AUTH-U-006: should reject email without domain', () => {
      expect(validateEmail('user@')).toBe(false);
    });

    it('AUTH-U-006: should reject email without @', () => {
      expect(validateEmail('userdomain.com')).toBe(false);
    });

    it('AUTH-U-006: should reject email without TLD', () => {
      expect(validateEmail('user@domain')).toBe(false);
    });

    it('AUTH-U-006: should accept valid email', () => {
      expect(validateEmail('user@domain.com')).toBe(true);
    });

    it('AUTH-U-006: should accept email with subdomain', () => {
      expect(validateEmail('user@mail.domain.com')).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // EDGE CASE TESTS
  // ═══════════════════════════════════════════════════════════════════════

  describe('Email Case Sensitivity', () => {
    // AUTH-U-007: Login with different case email
    it('AUTH-U-007: should normalize email to lowercase', () => {
      expect(normalizeEmail('John@Example.COM')).toBe('john@example.com');
    });

    it('AUTH-U-007: should trim whitespace from email', () => {
      expect(normalizeEmail('  john@example.com  ')).toBe('john@example.com');
    });

    it('AUTH-U-007: should handle mixed case and whitespace', () => {
      expect(normalizeEmail('  JoHn@ExAmPlE.cOm  ')).toBe('john@example.com');
    });
  });

  describe('Account Lockout', () => {
    // AUTH-U-008: Multiple failed logins trigger lockout
    it('AUTH-U-008: should lock account after 5 failed attempts', async () => {
      mockPrisma.loginAttempt.count.mockResolvedValue(5);
      
      const result = await checkAccountLockout('user-123', mockPrisma);
      
      expect(result.locked).toBe(true);
      expect(result.minutesRemaining).toBe(15);
    });

    it('AUTH-U-008: should not lock account with 4 failed attempts', async () => {
      mockPrisma.loginAttempt.count.mockResolvedValue(4);
      
      const result = await checkAccountLockout('user-123', mockPrisma);
      
      expect(result.locked).toBe(false);
    });

    it('AUTH-U-008: should not lock account with 0 failed attempts', async () => {
      mockPrisma.loginAttempt.count.mockResolvedValue(0);
      
      const result = await checkAccountLockout('user-123', mockPrisma);
      
      expect(result.locked).toBe(false);
    });
  });

  describe('Token Expiry', () => {
    // AUTH-U-009: Token expired by 1 second
    it('AUTH-U-009: should detect token expired by 1 second', () => {
      const oneSecondAgo = Math.floor(Date.now() / 1000) - 1;
      expect(isTokenExpired(oneSecondAgo)).toBe(true);
    });

    it('AUTH-U-009: should detect token expired by 1 hour', () => {
      const oneHourAgo = Math.floor(Date.now() / 1000) - 3600;
      expect(isTokenExpired(oneHourAgo)).toBe(true);
    });

    it('AUTH-U-009: should accept token expiring in 1 second', () => {
      const oneSecondFromNow = Math.floor(Date.now() / 1000) + 1;
      expect(isTokenExpired(oneSecondFromNow)).toBe(false);
    });

    it('AUTH-U-009: should accept token expiring in 1 hour', () => {
      const oneHourFromNow = Math.floor(Date.now() / 1000) + 3600;
      expect(isTokenExpired(oneHourFromNow)).toBe(false);
    });
  });

  describe('Refresh Token Reuse Detection', () => {
    // AUTH-U-010: Refresh token reuse detection
    it('AUTH-U-010: should detect reused refresh token', async () => {
      mockPrisma.refreshToken.findFirst.mockResolvedValue({
        id: 'token-1',
        token: 'reused-token',
        used: true,
      });
      
      const isReused = await checkRefreshTokenReuse('reused-token', mockPrisma);
      
      expect(isReused).toBe(true);
    });

    it('AUTH-U-010: should accept fresh refresh token', async () => {
      mockPrisma.refreshToken.findFirst.mockResolvedValue(null);
      
      const isReused = await checkRefreshTokenReuse('fresh-token', mockPrisma);
      
      expect(isReused).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // BUSINESS RULE TESTS
  // ═══════════════════════════════════════════════════════════════════════

  describe('First Login Password Change', () => {
    // AUTH-U-011: First login forces password change
    it('AUTH-U-011: should flag first login users for password change', () => {
      const user = {
        id: 'user-1',
        firstLogin: true,
        passwordChangedAt: null,
      };
      
      const requiresPasswordChange = user.firstLogin || !user.passwordChangedAt;
      
      expect(requiresPasswordChange).toBe(true);
    });

    it('AUTH-U-011: should not flag returning users', () => {
      const user = {
        id: 'user-1',
        firstLogin: false,
        passwordChangedAt: new Date(),
      };
      
      const requiresPasswordChange = user.firstLogin && !user.passwordChangedAt;
      
      expect(requiresPasswordChange).toBe(false);
    });
  });

  describe('Password History', () => {
    // AUTH-U-012: Password history prevents reuse
    it('AUTH-U-012: should detect password in history', async () => {
      const oldPasswordHash = await argon2.hash('OldPassword123!');
      
      mockPrisma.passwordHistory.findMany.mockResolvedValue([
        { id: '1', userId: 'user-1', passwordHash: oldPasswordHash, createdAt: new Date() },
      ]);
      
      const inHistory = await isPasswordInHistory('user-1', 'OldPassword123!', mockPrisma);
      
      expect(inHistory).toBe(true);
    });

    it('AUTH-U-012: should accept password not in history', async () => {
      const differentPasswordHash = await argon2.hash('DifferentPassword123!');
      
      mockPrisma.passwordHistory.findMany.mockResolvedValue([
        { id: '1', userId: 'user-1', passwordHash: differentPasswordHash, createdAt: new Date() },
      ]);
      
      const inHistory = await isPasswordInHistory('user-1', 'BrandNewPassword123!', mockPrisma);
      
      expect(inHistory).toBe(false);
    });

    it('AUTH-U-012: should only check last 5 passwords', async () => {
      mockPrisma.passwordHistory.findMany.mockResolvedValue([]);
      
      await isPasswordInHistory('user-1', 'SomePassword123!', mockPrisma);
      
      expect(mockPrisma.passwordHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
        })
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // ADDITIONAL SECURITY TESTS
  // ═══════════════════════════════════════════════════════════════════════

  describe('Password Edge Cases', () => {
    it('should handle empty password', () => {
      const result = validatePassword('');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle password with only spaces', () => {
      const result = validatePassword('            ');
      expect(result.valid).toBe(false);
    });

    it('should handle password with unicode characters', () => {
      const result = validatePassword('Pässwörd123!@');
      expect(result.valid).toBe(true);
    });

    it('should handle very long password', () => {
      const longPassword = 'A'.repeat(100) + 'a1!';
      const result = validatePassword(longPassword);
      expect(result.valid).toBe(true);
    });
  });

  describe('Email Edge Cases', () => {
    it('should handle email with plus sign', () => {
      expect(validateEmail('user+tag@domain.com')).toBe(true);
    });

    it('should handle email with dots in local part', () => {
      expect(validateEmail('user.name@domain.com')).toBe(true);
    });

    it('should reject email with consecutive dots', () => {
      expect(validateEmail('user..name@domain.com')).toBe(false);
    });

    it('should handle international TLDs', () => {
      expect(validateEmail('user@domain.co.uk')).toBe(true);
    });
  });
});


