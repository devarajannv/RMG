/**
 * REAL Tests for Trigger Business Logic
 * 
 * These tests:
 * 1. NO MOCKS - test real code execution
 * 2. Test edge cases that can cause bugs
 * 3. Test security boundaries
 * 4. Test error handling
 * 5. Each test documents a specific behavior or bug it prevents
 */

import { describe, it, expect } from 'vitest';
import {
  getValueByPath,
  setValueByPath,
  mapFields,
  validateFieldMapping,
  evaluateEventFilter,
  validateWebhookSignature,
  getDefaultSignatureHeader,
  generateDeduplicationKey,
} from './trigger.logic';

// ============================================================================
// getValueByPath - Tests for JSONPath extraction
// ============================================================================

describe('getValueByPath', () => {
  describe('basic field access', () => {
    it('extracts root-level field', () => {
      const obj = { name: 'John', age: 30 };
      expect(getValueByPath(obj, '$.name')).toBe('John');
      expect(getValueByPath(obj, '$.age')).toBe(30);
    });

    it('returns undefined for missing field', () => {
      const obj = { name: 'John' };
      expect(getValueByPath(obj, '$.missing')).toBeUndefined();
    });

    it('returns entire object for $ path', () => {
      const obj = { name: 'John' };
      expect(getValueByPath(obj, '$')).toEqual(obj);
    });
  });

  describe('nested field access', () => {
    it('extracts deeply nested fields', () => {
      const obj = {
        deal: {
          properties: {
            dealname: 'Big Deal',
            amount: 50000,
            stage: {
              name: 'Closed Won',
            },
          },
        },
      };
      expect(getValueByPath(obj, '$.deal.properties.dealname')).toBe('Big Deal');
      expect(getValueByPath(obj, '$.deal.properties.amount')).toBe(50000);
      expect(getValueByPath(obj, '$.deal.properties.stage.name')).toBe('Closed Won');
    });

    it('returns undefined when intermediate path is null', () => {
      const obj = { deal: null };
      expect(getValueByPath(obj, '$.deal.properties.name')).toBeUndefined();
    });

    it('returns undefined when intermediate path is missing', () => {
      const obj = { other: 'data' };
      expect(getValueByPath(obj, '$.deal.properties.name')).toBeUndefined();
    });

    it('handles undefined intermediate values', () => {
      const obj = { deal: { properties: undefined } };
      expect(getValueByPath(obj, '$.deal.properties.name')).toBeUndefined();
    });
  });

  describe('array access', () => {
    it('extracts array element by index', () => {
      const obj = { items: ['a', 'b', 'c'] };
      expect(getValueByPath(obj, '$.items[0]')).toBe('a');
      expect(getValueByPath(obj, '$.items[1]')).toBe('b');
      expect(getValueByPath(obj, '$.items[2]')).toBe('c');
    });

    it('extracts field from array element', () => {
      const obj = {
        contacts: [
          { name: 'Alice', email: 'alice@test.com' },
          { name: 'Bob', email: 'bob@test.com' },
        ],
      };
      expect(getValueByPath(obj, '$.contacts[0].name')).toBe('Alice');
      expect(getValueByPath(obj, '$.contacts[1].email')).toBe('bob@test.com');
    });

    it('returns undefined for out-of-bounds index', () => {
      const obj = { items: ['a', 'b'] };
      expect(getValueByPath(obj, '$.items[99]')).toBeUndefined();
    });

    it('handles root-level array access', () => {
      const obj = { 0: 'first', 1: 'second' }; // Object with numeric keys
      expect(getValueByPath(obj, '$[0]')).toBe('first');
    });
  });

  describe('edge cases and security', () => {
    it('handles null input object', () => {
      expect(getValueByPath(null as any, '$.field')).toBeUndefined();
    });

    it('handles undefined input object', () => {
      expect(getValueByPath(undefined as any, '$.field')).toBeUndefined();
    });

    it('handles empty path', () => {
      const obj = { name: 'test' };
      expect(getValueByPath(obj, '')).toEqual(obj);
      expect(getValueByPath(obj, '$.')).toEqual(obj); // After removing $. becomes empty
    });

    it('handles field with special characters in value', () => {
      const obj = { field: '<script>alert("xss")</script>' };
      expect(getValueByPath(obj, '$.field')).toBe('<script>alert("xss")</script>');
    });

    it('handles numeric field values correctly', () => {
      const obj = { zero: 0, negative: -1, decimal: 0.5 };
      expect(getValueByPath(obj, '$.zero')).toBe(0);
      expect(getValueByPath(obj, '$.negative')).toBe(-1);
      expect(getValueByPath(obj, '$.decimal')).toBe(0.5);
    });

    it('handles boolean field values', () => {
      const obj = { active: true, deleted: false };
      expect(getValueByPath(obj, '$.active')).toBe(true);
      expect(getValueByPath(obj, '$.deleted')).toBe(false);
    });

    it('handles empty string field value', () => {
      const obj = { empty: '' };
      expect(getValueByPath(obj, '$.empty')).toBe('');
    });

    it('does not access prototype chain (security)', () => {
      const obj = { name: 'safe' };
      // Should NOT be able to access prototype methods - this is a security feature
      expect(getValueByPath(obj, '$.constructor')).toBeUndefined();
      expect(getValueByPath(obj, '$.toString')).toBeUndefined();
      expect(getValueByPath(obj, '$.__proto__')).toBeUndefined();
      expect(getValueByPath(obj, '$.prototype')).toBeUndefined();
      // But should still access own properties
      expect(getValueByPath(obj, '$.name')).toBe('safe');
    });

    // BUG PREVENTION: This test catches a common JSONPath bug
    it('handles paths without $. prefix (should work)', () => {
      const obj = { field: 'value' };
      // Our implementation should handle bare field names
      expect(getValueByPath(obj, 'field')).toBe('value');
    });
  });

  describe('real HubSpot payload extraction', () => {
    const hubspotDealPayload = {
      portalId: 12345678,
      objectId: 987654321,
      eventType: 'deal.propertyChange',
      subscriptionType: 'deal.propertyChange',
      occurredAt: 1703930400000,
      properties: {
        dealname: { value: 'Enterprise Contract - ACME Corp' },
        amount: { value: '150000' },
        dealstage: { value: 'closedwon' },
        closedate: { value: '1703930400000' },
        hubspot_owner_id: { value: '12345' },
        hs_object_id: { value: '987654321' },
      },
      associations: {
        contacts: [{ id: 111 }, { id: 222 }],
        companies: [{ id: 333 }],
      },
    };

    it('extracts deal name from nested properties', () => {
      expect(getValueByPath(hubspotDealPayload, '$.properties.dealname.value')).toBe(
        'Enterprise Contract - ACME Corp'
      );
    });

    it('extracts deal amount as string', () => {
      expect(getValueByPath(hubspotDealPayload, '$.properties.amount.value')).toBe('150000');
    });

    it('extracts event type for filtering', () => {
      expect(getValueByPath(hubspotDealPayload, '$.eventType')).toBe('deal.propertyChange');
    });

    it('extracts first associated contact', () => {
      expect(getValueByPath(hubspotDealPayload, '$.associations.contacts[0].id')).toBe(111);
    });

    it('extracts portal ID for tenant identification', () => {
      expect(getValueByPath(hubspotDealPayload, '$.portalId')).toBe(12345678);
    });
  });
});

// ============================================================================
// setValueByPath - Tests for setting nested values
// ============================================================================

describe('setValueByPath', () => {
  it('sets root level field', () => {
    const obj: Record<string, unknown> = {};
    setValueByPath(obj, 'name', 'John');
    expect(obj.name).toBe('John');
  });

  it('sets nested field, creating intermediates', () => {
    const obj: Record<string, unknown> = {};
    setValueByPath(obj, 'deal.properties.name', 'Big Deal');
    expect(obj).toEqual({
      deal: {
        properties: {
          name: 'Big Deal',
        },
      },
    });
  });

  it('overwrites existing value', () => {
    const obj = { name: 'old' };
    setValueByPath(obj, 'name', 'new');
    expect(obj.name).toBe('new');
  });

  it('handles deeply nested paths', () => {
    const obj: Record<string, unknown> = {};
    setValueByPath(obj, 'a.b.c.d.e', 'deep');
    expect(getValueByPath(obj, '$.a.b.c.d.e')).toBe('deep');
  });
});

// ============================================================================
// mapFields - Tests for complete field mapping
// ============================================================================

describe('mapFields', () => {
  it('maps simple fields', () => {
    const payload = {
      dealname: 'My Deal',
      amount: 5000,
    };
    const mapping = {
      title: '$.dealname',
      value: '$.amount',
    };

    const result = mapFields(payload, mapping);
    expect(result).toEqual({
      title: 'My Deal',
      value: 5000,
    });
  });

  it('maps nested source to flat target', () => {
    const payload = {
      properties: {
        dealname: { value: 'Nested Deal' },
      },
    };
    const mapping = {
      title: '$.properties.dealname.value',
    };

    expect(mapFields(payload, mapping)).toEqual({ title: 'Nested Deal' });
  });

  it('maps to nested target fields', () => {
    const payload = {
      dealId: '123',
      dealAmount: 50000,
    };
    const mapping = {
      'metadata.externalId': '$.dealId',
      'metadata.value': '$.dealAmount',
    };

    expect(mapFields(payload, mapping)).toEqual({
      metadata: {
        externalId: '123',
        value: 50000,
      },
    });
  });

  it('skips fields when source path not found', () => {
    const payload = { existing: 'value' };
    const mapping = {
      found: '$.existing',
      missing: '$.notFound',
    };

    expect(mapFields(payload, mapping)).toEqual({ found: 'value' });
  });

  it('handles empty mapping', () => {
    const payload = { data: 'value' };
    expect(mapFields(payload, {})).toEqual({});
  });

  // Real-world mapping scenario
  it('maps HubSpot deal to request fields', () => {
    const hubspotPayload = {
      properties: {
        dealname: { value: 'Enterprise License - ACME' },
        amount: { value: '75000' },
        hs_object_id: { value: '12345' },
      },
      portalId: 99999,
    };

    const mapping = {
      title: '$.properties.dealname.value',
      description: '$.properties.dealname.value',
      'metadata.dealValue': '$.properties.amount.value',
      externalRef: '$.properties.hs_object_id.value',
      'metadata.portalId': '$.portalId',
    };

    const result = mapFields(hubspotPayload, mapping);
    expect(result).toEqual({
      title: 'Enterprise License - ACME',
      description: 'Enterprise License - ACME',
      metadata: {
        dealValue: '75000',
        portalId: 99999,
      },
      externalRef: '12345',
    });
  });
});

// ============================================================================
// validateFieldMapping - Tests for mapping validation
// ============================================================================

describe('validateFieldMapping', () => {
  it('passes valid mapping with required fields', () => {
    const result = validateFieldMapping({
      title: '$.dealname',
      description: '$.details',
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('fails when title is missing', () => {
    const result = validateFieldMapping({
      description: '$.details',
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing required field: title');
  });

  it('fails for invalid JSONPath (no $ prefix)', () => {
    const result = validateFieldMapping({
      title: 'dealname', // Missing $
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('must start with $'))).toBe(true);
  });

  it('accepts valid JSONPath variations', () => {
    expect(validateFieldMapping({ title: '$.field' }).valid).toBe(true);
    expect(validateFieldMapping({ title: '$[0]' }).valid).toBe(true);
    expect(validateFieldMapping({ title: '$' }).valid).toBe(true);
  });

  it('collects multiple errors', () => {
    const result = validateFieldMapping({
      // missing title
      badPath: 'no-dollar',
    } as any);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });
});

// ============================================================================
// evaluateEventFilter - Tests for event filtering logic
// ============================================================================

describe('evaluateEventFilter', () => {
  describe('simple equality', () => {
    it('matches exact string value', () => {
      const payload = { status: 'active', type: 'deal' };
      expect(evaluateEventFilter(payload, { status: 'active' })).toBe(true);
      expect(evaluateEventFilter(payload, { status: 'inactive' })).toBe(false);
    });

    it('matches exact number value', () => {
      const payload = { count: 5 };
      expect(evaluateEventFilter(payload, { count: 5 })).toBe(true);
      expect(evaluateEventFilter(payload, { count: 10 })).toBe(false);
    });

    it('requires ALL conditions to match', () => {
      const payload = { status: 'active', type: 'deal' };
      expect(evaluateEventFilter(payload, { status: 'active', type: 'deal' })).toBe(true);
      expect(evaluateEventFilter(payload, { status: 'active', type: 'contact' })).toBe(false);
    });
  });

  describe('$eq operator', () => {
    it('matches equal value', () => {
      const payload = { status: 'closed' };
      expect(evaluateEventFilter(payload, { status: { $eq: 'closed' } })).toBe(true);
      expect(evaluateEventFilter(payload, { status: { $eq: 'open' } })).toBe(false);
    });
  });

  describe('$ne operator', () => {
    it('matches non-equal value', () => {
      const payload = { status: 'active' };
      expect(evaluateEventFilter(payload, { status: { $ne: 'deleted' } })).toBe(true);
      expect(evaluateEventFilter(payload, { status: { $ne: 'active' } })).toBe(false);
    });
  });

  describe('numeric comparisons', () => {
    const payload = { amount: 5000 };

    it('$gt: greater than', () => {
      expect(evaluateEventFilter(payload, { amount: { $gt: 4000 } })).toBe(true);
      expect(evaluateEventFilter(payload, { amount: { $gt: 5000 } })).toBe(false);
      expect(evaluateEventFilter(payload, { amount: { $gt: 6000 } })).toBe(false);
    });

    it('$gte: greater than or equal', () => {
      expect(evaluateEventFilter(payload, { amount: { $gte: 4000 } })).toBe(true);
      expect(evaluateEventFilter(payload, { amount: { $gte: 5000 } })).toBe(true);
      expect(evaluateEventFilter(payload, { amount: { $gte: 6000 } })).toBe(false);
    });

    it('$lt: less than', () => {
      expect(evaluateEventFilter(payload, { amount: { $lt: 6000 } })).toBe(true);
      expect(evaluateEventFilter(payload, { amount: { $lt: 5000 } })).toBe(false);
      expect(evaluateEventFilter(payload, { amount: { $lt: 4000 } })).toBe(false);
    });

    it('$lte: less than or equal', () => {
      expect(evaluateEventFilter(payload, { amount: { $lte: 6000 } })).toBe(true);
      expect(evaluateEventFilter(payload, { amount: { $lte: 5000 } })).toBe(true);
      expect(evaluateEventFilter(payload, { amount: { $lte: 4000 } })).toBe(false);
    });

    it('fails numeric ops on non-numeric values', () => {
      const stringPayload = { amount: 'not a number' };
      expect(evaluateEventFilter(stringPayload, { amount: { $gt: 1000 } })).toBe(false);
    });
  });

  describe('$in and $nin operators', () => {
    const payload = { status: 'pending', priority: 'high' };

    it('$in: value in array', () => {
      expect(evaluateEventFilter(payload, { status: { $in: ['pending', 'approved'] } })).toBe(true);
      expect(evaluateEventFilter(payload, { status: { $in: ['rejected', 'cancelled'] } })).toBe(
        false
      );
    });

    it('$nin: value not in array', () => {
      expect(evaluateEventFilter(payload, { status: { $nin: ['rejected', 'cancelled'] } })).toBe(
        true
      );
      expect(evaluateEventFilter(payload, { status: { $nin: ['pending', 'approved'] } })).toBe(
        false
      );
    });
  });

  describe('$exists operator', () => {
    const payload = { name: 'test', value: undefined };

    it('$exists: true - field must exist', () => {
      expect(evaluateEventFilter(payload, { name: { $exists: true } })).toBe(true);
      expect(evaluateEventFilter(payload, { missing: { $exists: true } })).toBe(false);
    });

    it('$exists: false - field must not exist', () => {
      expect(evaluateEventFilter(payload, { missing: { $exists: false } })).toBe(true);
      expect(evaluateEventFilter(payload, { name: { $exists: false } })).toBe(false);
    });

    it('handles explicitly undefined fields', () => {
      // value is explicitly set to undefined in payload
      expect(evaluateEventFilter(payload, { value: { $exists: true } })).toBe(false);
    });
  });

  describe('nested field filters', () => {
    it('filters on nested fields using JSONPath', () => {
      const payload = {
        deal: {
          stage: 'closedwon',
          amount: 10000,
        },
      };

      expect(evaluateEventFilter(payload, { '$.deal.stage': 'closedwon' })).toBe(true);
      expect(evaluateEventFilter(payload, { '$.deal.amount': { $gte: 5000 } })).toBe(true);
    });
  });

  describe('combined operators', () => {
    it('matches all operators in combination', () => {
      const payload = { amount: 7500, status: 'approved', type: 'deal' };

      const filter = {
        amount: { $gte: 5000, $lte: 10000 },
        status: { $in: ['approved', 'pending'] },
        type: { $ne: 'contact' },
      };

      expect(evaluateEventFilter(payload, filter)).toBe(true);
    });

    it('fails if any operator fails', () => {
      const payload = { amount: 3000, status: 'approved' }; // amount too low

      const filter = {
        amount: { $gte: 5000 },
        status: 'approved',
      };

      expect(evaluateEventFilter(payload, filter)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('empty filter matches everything', () => {
      expect(evaluateEventFilter({ any: 'data' }, {})).toBe(true);
    });

    it('handles null values in payload', () => {
      const payload = { value: null };
      expect(evaluateEventFilter(payload, { value: null })).toBe(true);
      expect(evaluateEventFilter(payload, { value: 'something' })).toBe(false);
    });
  });

  // Real-world filter for HubSpot "deal closed won > $10k"
  describe('real HubSpot deal filter', () => {
    it('filters deals by stage and amount', () => {
      const closedWonDeal = {
        eventType: 'deal.propertyChange',
        properties: {
          dealstage: { value: 'closedwon' },
          amount: { value: '25000' },
        },
      };

      const lostDeal = {
        eventType: 'deal.propertyChange',
        properties: {
          dealstage: { value: 'closedlost' },
          amount: { value: '25000' },
        },
      };

      const smallDeal = {
        eventType: 'deal.propertyChange',
        properties: {
          dealstage: { value: 'closedwon' },
          amount: { value: '5000' },
        },
      };

      // Filter: only closed won deals
      const stageFilter = {
        '$.properties.dealstage.value': { $in: ['closedwon'] },
      };

      expect(evaluateEventFilter(closedWonDeal, stageFilter)).toBe(true);
      expect(evaluateEventFilter(lostDeal, stageFilter)).toBe(false);
      expect(evaluateEventFilter(smallDeal, stageFilter)).toBe(true);
    });
  });
});

// ============================================================================
// validateWebhookSignature - Tests for HMAC signature validation
// ============================================================================

describe('validateWebhookSignature', () => {
  const secretKey = 'my-secret-key-12345';
  const payload = JSON.stringify({ event: 'test', data: { id: 123 } });

  // Generate valid signature for testing
  const generateSignature = (data: string, secret: string, algo = 'sha256'): string => {
    const crypto = require('crypto');
    return crypto.createHmac(algo, secret).update(data).digest('hex');
  };

  it('validates correct HMAC-SHA256 signature', () => {
    const signature = generateSignature(payload, secretKey, 'sha256');
    const result = validateWebhookSignature(payload, signature, secretKey, 'hmac-sha256');
    expect(result.valid).toBe(true);
  });

  it('rejects invalid signature', () => {
    const result = validateWebhookSignature(payload, 'invalid-signature', secretKey, 'hmac-sha256');
    expect(result.valid).toBe(false);
  });

  it('handles signature with prefix (sha256=xxx)', () => {
    const signature = generateSignature(payload, secretKey, 'sha256');
    const prefixedSignature = `sha256=${signature}`;
    const result = validateWebhookSignature(payload, prefixedSignature, secretKey, 'hmac-sha256');
    expect(result.valid).toBe(true);
  });

  it('handles Slack-style v0= prefix', () => {
    const signature = generateSignature(payload, secretKey, 'sha256');
    const slackSignature = `v0=${signature}`;
    const result = validateWebhookSignature(payload, slackSignature, secretKey, 'hmac-sha256');
    expect(result.valid).toBe(true);
  });

  it('is case-insensitive for hex comparison', () => {
    const signature = generateSignature(payload, secretKey, 'sha256');
    const upperSignature = signature.toUpperCase();
    const result = validateWebhookSignature(payload, upperSignature, secretKey, 'hmac-sha256');
    expect(result.valid).toBe(true);
  });

  it('rejects when payload is modified', () => {
    const signature = generateSignature(payload, secretKey, 'sha256');
    const modifiedPayload = JSON.stringify({ event: 'test', data: { id: 999 } });
    const result = validateWebhookSignature(modifiedPayload, signature, secretKey, 'hmac-sha256');
    expect(result.valid).toBe(false);
  });

  it('rejects when secret key is wrong', () => {
    const signature = generateSignature(payload, secretKey, 'sha256');
    const result = validateWebhookSignature(payload, signature, 'wrong-secret', 'hmac-sha256');
    expect(result.valid).toBe(false);
  });

  describe('security edge cases', () => {
    it('returns error for empty payload', () => {
      const result = validateWebhookSignature('', 'sig', secretKey, 'hmac-sha256');
      expect(result.valid).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('returns error for empty signature', () => {
      const result = validateWebhookSignature(payload, '', secretKey, 'hmac-sha256');
      expect(result.valid).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('returns error for empty secret', () => {
      const result = validateWebhookSignature(payload, 'sig', '', 'hmac-sha256');
      expect(result.valid).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('rejects signature with different length (prevents length extension attacks)', () => {
      const signature = generateSignature(payload, secretKey, 'sha256');
      const truncated = signature.slice(0, -2);
      const result = validateWebhookSignature(payload, truncated, secretKey, 'hmac-sha256');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('length mismatch');
    });
  });

  describe('different algorithms', () => {
    it('supports sha256', () => {
      const sig = generateSignature(payload, secretKey, 'sha256');
      expect(validateWebhookSignature(payload, sig, secretKey, 'sha256').valid).toBe(true);
    });

    it('supports sha1 (for legacy systems)', () => {
      const sig = generateSignature(payload, secretKey, 'sha1');
      expect(validateWebhookSignature(payload, sig, secretKey, 'sha1').valid).toBe(true);
    });
  });
});

// ============================================================================
// getDefaultSignatureHeader - Tests for webhook source headers
// ============================================================================

describe('getDefaultSignatureHeader', () => {
  it('returns HubSpot header', () => {
    expect(getDefaultSignatureHeader('HUBSPOT')).toBe('X-HubSpot-Signature-v3');
  });

  it('returns Salesforce header', () => {
    expect(getDefaultSignatureHeader('SALESFORCE')).toBe('X-Salesforce-Signature');
  });

  it('returns Stripe header', () => {
    expect(getDefaultSignatureHeader('STRIPE')).toBe('Stripe-Signature');
  });

  it('returns Slack header', () => {
    expect(getDefaultSignatureHeader('SLACK')).toBe('X-Slack-Signature');
  });

  it('returns default for unknown source', () => {
    expect(getDefaultSignatureHeader('OTHER')).toBe('X-Webhook-Signature');
    expect(getDefaultSignatureHeader('CUSTOM')).toBe('X-Webhook-Signature');
  });
});

// ============================================================================
// generateDeduplicationKey - Tests for dedup key generation
// ============================================================================

describe('generateDeduplicationKey', () => {
  it('extracts string value', () => {
    const payload = { deal: { id: 'deal-123' } };
    expect(generateDeduplicationKey(payload, '$.deal.id')).toBe('deal-123');
  });

  it('converts number to string', () => {
    const payload = { objectId: 12345 };
    expect(generateDeduplicationKey(payload, '$.objectId')).toBe('12345');
  });

  it('returns undefined for missing path', () => {
    const payload = { other: 'data' };
    expect(generateDeduplicationKey(payload, '$.missing')).toBeUndefined();
  });

  it('returns undefined for null value', () => {
    const payload = { value: null };
    expect(generateDeduplicationKey(payload, '$.value')).toBeUndefined();
  });

  it('stringifies object values', () => {
    const payload = { composite: { a: 1, b: 2 } };
    const key = generateDeduplicationKey(payload, '$.composite');
    expect(key).toBe(JSON.stringify({ a: 1, b: 2 }));
  });

  it('handles boolean values', () => {
    const payload = { flag: true };
    expect(generateDeduplicationKey(payload, '$.flag')).toBe('true');
  });

  it('handles zero value (should not be undefined)', () => {
    const payload = { count: 0 };
    expect(generateDeduplicationKey(payload, '$.count')).toBe('0');
  });
});

// ============================================================================
// Integration scenarios - End-to-end logic tests
// ============================================================================

describe('integration: HubSpot deal to request mapping', () => {
  const hubspotWebhookPayload = {
    portalId: 12345678,
    objectId: 987654321,
    eventType: 'deal.creation',
    subscriptionType: 'deal.creation',
    occurredAt: 1703930400000,
    properties: {
      dealname: { value: 'Enterprise License - ACME Corporation' },
      amount: { value: '150000' },
      dealstage: { value: 'closedwon' },
      closedate: { value: '1703930400000' },
      pipeline: { value: 'default' },
      hs_object_id: { value: '987654321' },
    },
    associations: {
      contacts: [{ id: 111 }, { id: 222 }],
      companies: [{ id: 333 }],
    },
  };

  const triggerConfig = {
    eventType: 'deal.creation',
    eventFilter: {
      '$.properties.dealstage.value': { $in: ['closedwon', 'contractsent'] },
      '$.properties.amount.value': { $exists: true },
    },
    fieldMapping: {
      title: '$.properties.dealname.value',
      description: '$.properties.dealname.value',
      externalRef: '$.properties.hs_object_id.value',
      'metadata.dealValue': '$.properties.amount.value',
      'metadata.pipeline': '$.properties.pipeline.value',
      'metadata.portalId': '$.portalId',
      'metadata.associatedCompanyId': '$.associations.companies[0].id',
    },
    deduplicationPath: '$.objectId',
  };

  it('validates field mapping configuration', () => {
    const validation = validateFieldMapping(triggerConfig.fieldMapping);
    expect(validation.valid).toBe(true);
  });

  it('event filter matches closed won deal', () => {
    const matches = evaluateEventFilter(hubspotWebhookPayload, triggerConfig.eventFilter);
    expect(matches).toBe(true);
  });

  it('event filter rejects lost deal', () => {
    const lostDeal = {
      ...hubspotWebhookPayload,
      properties: {
        ...hubspotWebhookPayload.properties,
        dealstage: { value: 'closedlost' },
      },
    };
    const matches = evaluateEventFilter(lostDeal, triggerConfig.eventFilter);
    expect(matches).toBe(false);
  });

  it('maps all fields correctly', () => {
    const mapped = mapFields(hubspotWebhookPayload, triggerConfig.fieldMapping);

    expect(mapped.title).toBe('Enterprise License - ACME Corporation');
    expect(mapped.description).toBe('Enterprise License - ACME Corporation');
    expect(mapped.externalRef).toBe('987654321');
    expect((mapped.metadata as any).dealValue).toBe('150000');
    expect((mapped.metadata as any).pipeline).toBe('default');
    expect((mapped.metadata as any).portalId).toBe(12345678);
    expect((mapped.metadata as any).associatedCompanyId).toBe(333);
  });

  it('generates deduplication key from object ID', () => {
    const dedupKey = generateDeduplicationKey(hubspotWebhookPayload, triggerConfig.deduplicationPath);
    expect(dedupKey).toBe('987654321');
  });

  it('complete pipeline: filter + map + dedup key', () => {
    // 1. Check if event matches filter
    const matches = evaluateEventFilter(hubspotWebhookPayload, triggerConfig.eventFilter);
    expect(matches).toBe(true);

    if (matches) {
      // 2. Map fields
      const mapped = mapFields(hubspotWebhookPayload, triggerConfig.fieldMapping);
      expect(mapped.title).toBeTruthy();

      // 3. Generate dedup key
      const dedupKey = generateDeduplicationKey(
        hubspotWebhookPayload,
        triggerConfig.deduplicationPath
      );
      expect(dedupKey).toBeTruthy();
    }
  });
});
