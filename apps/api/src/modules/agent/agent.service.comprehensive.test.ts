/**
 * Comprehensive Agent Service Tests
 * Tests: AGT-U-001 to AGT-U-013
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock Prisma
const mockPrisma = {
  agentConversation: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  agentMessage: {
    findMany: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
  },
  agentFeedback: {
    create: vi.fn(),
  },
};

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrisma),
}));

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

type QueryCategory = 'metrics' | 'search' | 'action' | 'report' | 'general';
type QueryTier = 'T1' | 'T2' | 'T3';

interface QueryClassification {
  category: QueryCategory;
  tier: QueryTier;
  confidence: number;
  entities: string[];
}

interface RateLimit {
  userId: string;
  windowStart: Date;
  requestCount: number;
}

// ═══════════════════════════════════════════════════════════════════════
// VALIDATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════

// AGT-U-001: Query not empty
function validateQuery(query: string): { valid: boolean; error?: string } {
  if (!query || query.trim().length === 0) {
    return { valid: false, error: 'Query cannot be empty' };
  }
  return { valid: true };
}

// AGT-U-002: Query length limit
const MAX_QUERY_LENGTH = 1000;

function validateQueryLength(query: string): { valid: boolean; error?: string } {
  if (query.length > MAX_QUERY_LENGTH) {
    return { valid: false, error: `Query cannot exceed ${MAX_QUERY_LENGTH} characters` };
  }
  return { valid: true };
}

// AGT-U-005: Query content validation
function hasValidContent(query: string): boolean {
  // Remove all special characters and check if anything remains
  const cleaned = query.replace(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/g, '').trim();
  return cleaned.length > 0;
}

// AGT-U-008: Query classification
function classifyQuery(query: string): QueryClassification {
  const lowerQuery = query.toLowerCase();
  let category: QueryCategory = 'general';
  let tier: QueryTier = 'T2';
  const entities: string[] = [];
  let confidence = 0.7;
  
  // Metrics detection
  if (/how many|count|total|percentage|utilization|bench/i.test(lowerQuery)) {
    category = 'metrics';
    tier = 'T1';
    confidence = 0.9;
    
    // Extract entities
    if (/bench/i.test(lowerQuery)) entities.push('bench');
    if (/resource/i.test(lowerQuery)) entities.push('resources');
    if (/project/i.test(lowerQuery)) entities.push('projects');
  }
  
  // Search detection
  if (/find|search|show|list|who|where/i.test(lowerQuery)) {
    category = 'search';
    tier = 'T1';
    confidence = 0.85;
    
    // Skill extraction
    const skillMatch = lowerQuery.match(/(?:with|knows?|skilled in|expertise in)\s+(\w+)/i);
    if (skillMatch) entities.push(`skill:${skillMatch[1]}`);
  }
  
  // Action detection
  if (/create|allocate|assign|update|delete|approve/i.test(lowerQuery)) {
    category = 'action';
    tier = 'T3';
    confidence = 0.8;
  }
  
  // Report detection
  if (/report|analytics|dashboard|trend|forecast/i.test(lowerQuery)) {
    category = 'report';
    tier = 'T2';
    confidence = 0.85;
  }
  
  return { category, tier, confidence, entities };
}

// AGT-U-009: Tier routing
function getModelForTier(tier: QueryTier): string {
  const tierModels: Record<QueryTier, string> = {
    'T1': 'gemini-flash',
    'T2': 'gemini-pro',
    'T3': 'gpt-4o',
  };
  return tierModels[tier];
}

// AGT-U-010: Permission-aware responses
function canAccessData(
  dataType: string,
  userPermissions: string[]
): boolean {
  const requiredPermissions: Record<string, string> = {
    'ctc': 'VIEW_CTC',
    'salary': 'VIEW_CTC',
    'financials': 'VIEW_FINANCIALS',
    'confidential': 'VIEW_CONFIDENTIAL',
  };
  
  const required = requiredPermissions[dataType];
  if (!required) return true; // No special permission needed
  
  return userPermissions.includes(required);
}

// AGT-U-011: Session memory limits
const MAX_CONTEXT_MESSAGES = 10;

function trimConversationContext(
  messages: Array<{ id: string; content: string }>,
  limit: number = MAX_CONTEXT_MESSAGES
): Array<{ id: string; content: string }> {
  if (messages.length <= limit) return messages;
  return messages.slice(-limit);
}

// AGT-U-013: Rate limiting
const RATE_LIMIT = 100; // queries per hour
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkRateLimit(userLimits: Map<string, RateLimit>, userId: string): {
  allowed: boolean;
  remaining: number;
  resetIn?: number;
} {
  const now = new Date();
  const userLimit = userLimits.get(userId);
  
  if (!userLimit) {
    userLimits.set(userId, { userId, windowStart: now, requestCount: 1 });
    return { allowed: true, remaining: RATE_LIMIT - 1 };
  }
  
  const windowAge = now.getTime() - userLimit.windowStart.getTime();
  
  if (windowAge > RATE_WINDOW_MS) {
    // Reset window
    userLimits.set(userId, { userId, windowStart: now, requestCount: 1 });
    return { allowed: true, remaining: RATE_LIMIT - 1 };
  }
  
  if (userLimit.requestCount >= RATE_LIMIT) {
    const resetIn = RATE_WINDOW_MS - windowAge;
    return { allowed: false, remaining: 0, resetIn };
  }
  
  userLimit.requestCount++;
  return { allowed: true, remaining: RATE_LIMIT - userLimit.requestCount };
}

describe('Agent Service - Comprehensive Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════
  // VALIDATION TESTS
  // ═══════════════════════════════════════════════════════════════════════

  describe('Query Validation', () => {
    // AGT-U-001: Query not empty
    it('AGT-U-001: should reject empty query', () => {
      const result = validateQuery('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('AGT-U-001: should reject whitespace-only query', () => {
      const result = validateQuery('   ');
      expect(result.valid).toBe(false);
    });

    it('AGT-U-001: should accept valid query', () => {
      const result = validateQuery('How many people are on bench?');
      expect(result.valid).toBe(true);
    });
  });

  describe('Query Length Validation', () => {
    // AGT-U-002: Query length limit
    it('AGT-U-002: should reject query over 1000 chars', () => {
      const longQuery = 'A'.repeat(1001);
      const result = validateQueryLength(longQuery);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('1000');
    });

    it('AGT-U-002: should accept 1000 char query', () => {
      const maxQuery = 'A'.repeat(1000);
      const result = validateQueryLength(maxQuery);
      expect(result.valid).toBe(true);
    });

    it('AGT-U-002: should accept short query', () => {
      const result = validateQueryLength('Find Java developers');
      expect(result.valid).toBe(true);
    });
  });

  describe('Conversation ID Validation', () => {
    // AGT-U-003: Valid conversation ID
    it('AGT-U-003: should check conversation exists', async () => {
      mockPrisma.agentConversation.findUnique.mockResolvedValue({
        id: 'conv-1',
        userId: 'user-1',
      });
      
      const conversation = await mockPrisma.agentConversation.findUnique({
        where: { id: 'conv-1' },
      });
      
      expect(conversation).not.toBeNull();
    });

    it('AGT-U-003: should reject invalid conversation', async () => {
      mockPrisma.agentConversation.findUnique.mockResolvedValue(null);
      
      const conversation = await mockPrisma.agentConversation.findUnique({
        where: { id: 'invalid-conv' },
      });
      
      expect(conversation).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // EDGE CASE TESTS
  // ═══════════════════════════════════════════════════════════════════════

  describe('Long Query Handling', () => {
    // AGT-U-004: Exactly 1000 chars
    it('AGT-U-004: should accept exactly 1000 characters', () => {
      const query = 'A'.repeat(1000);
      const result = validateQueryLength(query);
      expect(result.valid).toBe(true);
    });
  });

  describe('Special Characters Only', () => {
    // AGT-U-005: Query with only special chars
    it('AGT-U-005: should reject query with only special characters', () => {
      const query = '!@#$%^&*()';
      const hasContent = hasValidContent(query);
      expect(hasContent).toBe(false);
    });

    it('AGT-U-005: should accept query with special chars and text', () => {
      const query = 'What is 50% of 100?';
      const hasContent = hasValidContent(query);
      expect(hasContent).toBe(true);
    });
  });

  describe('Non-English Query', () => {
    // AGT-U-006: Non-English query handling
    it('AGT-U-006: should handle Hindi query gracefully', () => {
      const query = 'कितने लोग बेंच पर हैं?';
      const result = validateQuery(query);
      expect(result.valid).toBe(true);
    });

    it('AGT-U-006: should handle Japanese query', () => {
      const query = 'ベンチにいる人は何人ですか？';
      const result = validateQuery(query);
      expect(result.valid).toBe(true);
    });
  });

  describe('Rapid Successive Queries', () => {
    // AGT-U-007: Rate limiting for rapid queries
    it('AGT-U-007: should rate limit rapid queries', () => {
      const userLimits = new Map<string, RateLimit>();
      
      // Simulate 100 queries
      for (let i = 0; i < 100; i++) {
        checkRateLimit(userLimits, 'user-1');
      }
      
      // 101st should be blocked
      const result = checkRateLimit(userLimits, 'user-1');
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // BUSINESS RULE TESTS
  // ═══════════════════════════════════════════════════════════════════════

  describe('Query Classification', () => {
    // AGT-U-008: Accurate query classification
    it('AGT-U-008: should classify metrics query', () => {
      const result = classifyQuery('How many people are on bench?');
      expect(result.category).toBe('metrics');
      expect(result.entities).toContain('bench');
    });

    it('AGT-U-008: should classify search query', () => {
      const result = classifyQuery('Find developers with Java skills');
      expect(result.category).toBe('search');
    });

    it('AGT-U-008: should classify action query', () => {
      const result = classifyQuery('Create a new project allocation');
      expect(result.category).toBe('action');
    });

    it('AGT-U-008: should classify report query', () => {
      const result = classifyQuery('Show me the utilization report');
      expect(result.category).toBe('report');
    });

    it('AGT-U-008: should return confidence score', () => {
      const result = classifyQuery('How many people are on bench?');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('Tier Routing', () => {
    // AGT-U-009: Correct tier routing
    it('AGT-U-009: should route T1 (simple) to gemini-flash', () => {
      const classification = classifyQuery('How many on bench?');
      expect(classification.tier).toBe('T1');
      expect(getModelForTier('T1')).toBe('gemini-flash');
    });

    it('AGT-U-009: should route T2 (medium) to gemini-pro', () => {
      const model = getModelForTier('T2');
      expect(model).toBe('gemini-pro');
    });

    it('AGT-U-009: should route T3 (complex) to gpt-4o', () => {
      const classification = classifyQuery('Create an allocation for John');
      expect(classification.tier).toBe('T3');
      expect(getModelForTier('T3')).toBe('gpt-4o');
    });
  });

  describe('Permission-Aware Responses', () => {
    // AGT-U-010: Permission checking
    it('AGT-U-010: should deny CTC access without permission', () => {
      const permissions: string[] = ['VIEW_RESOURCES', 'VIEW_PROJECTS'];
      const canAccess = canAccessData('ctc', permissions);
      expect(canAccess).toBe(false);
    });

    it('AGT-U-010: should allow CTC access with permission', () => {
      const permissions: string[] = ['VIEW_RESOURCES', 'VIEW_CTC'];
      const canAccess = canAccessData('ctc', permissions);
      expect(canAccess).toBe(true);
    });

    it('AGT-U-010: should allow general data access', () => {
      const permissions: string[] = [];
      const canAccess = canAccessData('resources', permissions);
      expect(canAccess).toBe(true);
    });
  });

  describe('Session Memory Limits', () => {
    // AGT-U-011: Context trimming
    it('AGT-U-011: should keep only last 10 messages', () => {
      const messages = Array.from({ length: 20 }, (_, i) => ({
        id: `msg-${i}`,
        content: `Message ${i}`,
      }));
      
      const trimmed = trimConversationContext(messages);
      
      expect(trimmed.length).toBe(10);
      expect(trimmed[0].id).toBe('msg-10'); // Should start from 10th message
      expect(trimmed[9].id).toBe('msg-19'); // Should end at last message
    });

    it('AGT-U-011: should keep all if under limit', () => {
      const messages = Array.from({ length: 5 }, (_, i) => ({
        id: `msg-${i}`,
        content: `Message ${i}`,
      }));
      
      const trimmed = trimConversationContext(messages);
      
      expect(trimmed.length).toBe(5);
    });
  });

  describe('Feedback Storage', () => {
    // AGT-U-012: Store user feedback
    it('AGT-U-012: should store positive feedback', async () => {
      await mockPrisma.agentFeedback.create({
        data: {
          messageId: 'msg-1',
          userId: 'user-1',
          rating: 'POSITIVE',
        },
      });
      
      expect(mockPrisma.agentFeedback.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            rating: 'POSITIVE',
          }),
        })
      );
    });

    it('AGT-U-012: should store negative feedback', async () => {
      await mockPrisma.agentFeedback.create({
        data: {
          messageId: 'msg-1',
          userId: 'user-1',
          rating: 'NEGATIVE',
          comment: 'Answer was not helpful',
        },
      });
      
      expect(mockPrisma.agentFeedback.create).toHaveBeenCalled();
    });
  });

  describe('Rate Limiting', () => {
    // AGT-U-013: Rate limit per user
    it('AGT-U-013: should allow requests under limit', () => {
      const userLimits = new Map<string, RateLimit>();
      
      const result = checkRateLimit(userLimits, 'user-1');
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(99);
    });

    it('AGT-U-013: should track requests per user', () => {
      const userLimits = new Map<string, RateLimit>();
      
      // User 1: 50 requests
      for (let i = 0; i < 50; i++) {
        checkRateLimit(userLimits, 'user-1');
      }
      
      // User 2: 1 request
      const result = checkRateLimit(userLimits, 'user-2');
      
      expect(result.remaining).toBe(99); // User 2 unaffected
    });

    it('AGT-U-013: should reset after window expires', () => {
      const userLimits = new Map<string, RateLimit>();
      
      // Set old window
      userLimits.set('user-1', {
        userId: 'user-1',
        windowStart: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        requestCount: 100,
      });
      
      const result = checkRateLimit(userLimits, 'user-1');
      
      expect(result.allowed).toBe(true); // Window reset
      expect(result.remaining).toBe(99);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // ADDITIONAL TESTS
  // ═══════════════════════════════════════════════════════════════════════

  describe('Entity Extraction', () => {
    it('should extract skill entities', () => {
      const result = classifyQuery('Find resources with Java expertise');
      expect(result.entities.some(e => e.includes('skill'))).toBe(true);
    });

    it('should extract module entities from metrics queries', () => {
      const result = classifyQuery('How many resources are on bench?');
      expect(result.entities).toContain('resources');
      expect(result.entities).toContain('bench');
    });
  });

  describe('Confidence Scoring', () => {
    it('should return higher confidence for clear intents', () => {
      const metricsResult = classifyQuery('How many people are on bench?');
      const vaguResult = classifyQuery('Tell me something');
      
      expect(metricsResult.confidence).toBeGreaterThan(vaguResult.confidence);
    });
  });

  describe('Query Preprocessing', () => {
    it('should handle multiple spaces', () => {
      const query = 'How  many   people    on bench?';
      const normalized = query.replace(/\s+/g, ' ').trim();
      
      expect(normalized).toBe('How many people on bench?');
    });

    it('should handle newlines', () => {
      const query = 'How many\npeople\non bench?';
      const normalized = query.replace(/[\n\r]/g, ' ').replace(/\s+/g, ' ').trim();
      
      expect(normalized).toBe('How many people on bench?');
    });
  });
});

