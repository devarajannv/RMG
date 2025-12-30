/**
 * Pure business logic for trigger processing
 * 
 * These functions have NO side effects, NO database calls, NO external dependencies.
 * They are extracted from trigger.service.ts specifically for testability.
 * 
 * This is how you write testable code:
 * - Pure functions that take inputs and return outputs
 * - All dependencies injected as parameters
 * - No hidden state
 */

import * as crypto from 'crypto';

// ============================================================================
// Types
// ============================================================================

export interface FilterCondition {
  $eq?: unknown;
  $ne?: unknown;
  $gt?: number;
  $gte?: number;
  $lt?: number;
  $lte?: number;
  $in?: unknown[];
  $nin?: unknown[];
  $exists?: boolean;
}

export type EventFilter = Record<string, unknown | FilterCondition>;

export interface SignatureValidationResult {
  valid: boolean;
  error?: string;
}

// ============================================================================
// JSONPath Value Extraction
// ============================================================================

/**
 * Get value from object by JSONPath-like path
 * 
 * Supported paths:
 * - $.field - root level field
 * - $.nested.field - nested field
 * - $[0] - array index
 * - $.array[0].field - array element field
 * - $ - entire object
 * 
 * SECURITY: Only accesses own properties, not prototype chain
 * 
 * @param obj - The object to extract from
 * @param path - JSONPath-like expression
 * @returns The extracted value, or undefined if not found
 */
export function getValueByPath(obj: Record<string, unknown>, path: string): unknown {
  if (obj === null || obj === undefined) {
    return undefined;
  }

  // Remove leading $. or $
  let cleanPath = path;
  if (cleanPath.startsWith('$.')) {
    cleanPath = cleanPath.slice(2);
  } else if (cleanPath.startsWith('$')) {
    cleanPath = cleanPath.slice(1);
  }

  // $ alone means return the entire object
  if (!cleanPath) {
    return obj;
  }

  // Split by dots and brackets, filter empty strings
  const parts = cleanPath.split(/\.|\[|\]/).filter(Boolean);
  
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== 'object') {
      return undefined;
    }
    
    // SECURITY: Only access own properties, block prototype chain access
    // This prevents attacks via __proto__, constructor, prototype, etc.
    if (!Object.prototype.hasOwnProperty.call(current, part)) {
      return undefined;
    }
    
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Set value in object by dot-notation path
 * Creates intermediate objects as needed
 * 
 * @param obj - The object to modify
 * @param path - Dot-notation path (e.g., "metadata.dealValue")
 * @param value - The value to set
 */
export function setValueByPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.');
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current)) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }

  current[parts[parts.length - 1]] = value;
}

// ============================================================================
// Field Mapping
// ============================================================================

/**
 * Map fields from source payload to target object using JSONPath expressions
 * 
 * @param payload - Source object to extract values from
 * @param mapping - Object mapping target field names to JSONPath expressions
 * @returns Object with mapped values
 */
export function mapFields(
  payload: Record<string, unknown>,
  mapping: Record<string, string>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [targetField, sourcePath] of Object.entries(mapping)) {
    const value = getValueByPath(payload, sourcePath);
    if (value !== undefined) {
      setValueByPath(result, targetField, value);
    }
  }

  return result;
}

// ============================================================================
// Field Mapping Validation
// ============================================================================

export interface FieldMappingValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate field mapping structure
 * 
 * @param mapping - Object mapping field names to JSONPath expressions
 * @returns Validation result with any errors
 */
export function validateFieldMapping(mapping: Record<string, string>): FieldMappingValidationResult {
  const errors: string[] = [];
  const requiredFields = ['title'];

  // Check required fields
  for (const field of requiredFields) {
    if (!mapping[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate each mapping
  for (const [field, path] of Object.entries(mapping)) {
    if (typeof path !== 'string') {
      errors.push(`Invalid mapping for field '${field}': must be a string`);
      continue;
    }

    if (!path.startsWith('$.') && !path.startsWith('$[') && path !== '$') {
      errors.push(`Invalid JSONPath for field '${field}': must start with $ (got: ${path})`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Event Filter Evaluation
// ============================================================================

/**
 * Evaluate event filter against payload
 * 
 * Supported operators:
 * - Simple equality: { "field": "value" }
 * - $eq: Equal
 * - $ne: Not equal
 * - $gt: Greater than (numbers only)
 * - $gte: Greater than or equal (numbers only)
 * - $lt: Less than (numbers only)
 * - $lte: Less than or equal (numbers only)
 * - $in: Value in array
 * - $nin: Value not in array
 * - $exists: Field exists (true) or doesn't exist (false)
 * 
 * @param payload - The event payload to check
 * @param filter - Filter conditions
 * @returns true if ALL conditions match, false otherwise
 */
export function evaluateEventFilter(
  payload: Record<string, unknown>,
  filter: EventFilter
): boolean {
  for (const [path, condition] of Object.entries(filter)) {
    const value = getValueByPath(payload, path);

    if (typeof condition === 'object' && condition !== null && !Array.isArray(condition)) {
      // Operator-based condition
      const ops = condition as FilterCondition;
      
      if ('$eq' in ops) {
        if (value !== ops.$eq) return false;
      }
      
      if ('$ne' in ops) {
        if (value === ops.$ne) return false;
      }
      
      if ('$gt' in ops) {
        if (typeof value !== 'number' || typeof ops.$gt !== 'number' || value <= ops.$gt) {
          return false;
        }
      }
      
      if ('$gte' in ops) {
        if (typeof value !== 'number' || typeof ops.$gte !== 'number' || value < ops.$gte) {
          return false;
        }
      }
      
      if ('$lt' in ops) {
        if (typeof value !== 'number' || typeof ops.$lt !== 'number' || value >= ops.$lt) {
          return false;
        }
      }
      
      if ('$lte' in ops) {
        if (typeof value !== 'number' || typeof ops.$lte !== 'number' || value > ops.$lte) {
          return false;
        }
      }
      
      if ('$in' in ops) {
        if (!Array.isArray(ops.$in) || !ops.$in.includes(value)) {
          return false;
        }
      }
      
      if ('$nin' in ops) {
        if (!Array.isArray(ops.$nin) || ops.$nin.includes(value)) {
          return false;
        }
      }
      
      if ('$exists' in ops) {
        const shouldExist = ops.$exists;
        const doesExist = value !== undefined;
        if (shouldExist && !doesExist) return false;
        if (!shouldExist && doesExist) return false;
      }
    } else {
      // Simple equality
      if (value !== condition) return false;
    }
  }

  return true;
}

// ============================================================================
// Webhook Signature Validation
// ============================================================================

/**
 * Validate webhook signature using HMAC
 * 
 * @param payload - Raw payload string (NOT JSON parsed)
 * @param signature - Signature from webhook provider
 * @param secretKey - Your secret key
 * @param algorithm - Algorithm (e.g., 'hmac-sha256', 'sha256')
 * @returns Validation result
 */
export function validateWebhookSignature(
  payload: string,
  signature: string,
  secretKey: string,
  algorithm: string
): SignatureValidationResult {
  if (!payload || !signature || !secretKey) {
    return { valid: false, error: 'Missing required parameters' };
  }

  try {
    // Normalize algorithm name (remove hmac- prefix for crypto module)
    const cryptoAlgo = algorithm.replace('hmac-', '');
    
    const expectedSignature = crypto
      .createHmac(cryptoAlgo, secretKey)
      .update(payload)
      .digest('hex');

    // Handle different signature formats:
    // - "sha256=abc123" (GitHub style)
    // - "v0=abc123" (Slack style)
    // - "abc123" (plain)
    let actualSignature = signature;
    if (signature.includes('=')) {
      actualSignature = signature.split('=').slice(1).join('='); // Handle multiple = in value
    }

    // Use timing-safe comparison to prevent timing attacks
    const expected = Buffer.from(expectedSignature.toLowerCase());
    const actual = Buffer.from(actualSignature.toLowerCase());

    if (expected.length !== actual.length) {
      return { valid: false, error: 'Signature length mismatch' };
    }

    const valid = crypto.timingSafeEqual(expected, actual);
    return { valid };
  } catch (error) {
    return { 
      valid: false, 
      error: error instanceof Error ? error.message : 'Signature validation failed' 
    };
  }
}

// ============================================================================
// Default Signature Headers
// ============================================================================

export type WebhookSource = 'HUBSPOT' | 'SALESFORCE' | 'STRIPE' | 'JIRA' | 'SLACK' | 'CUSTOM' | 'OTHER';

/**
 * Get default signature header for known webhook sources
 */
export function getDefaultSignatureHeader(source: WebhookSource): string {
  switch (source) {
    case 'HUBSPOT':
      return 'X-HubSpot-Signature-v3';
    case 'SALESFORCE':
      return 'X-Salesforce-Signature';
    case 'STRIPE':
      return 'Stripe-Signature';
    case 'JIRA':
      return 'X-Hub-Signature';
    case 'SLACK':
      return 'X-Slack-Signature';
    default:
      return 'X-Webhook-Signature';
  }
}

// ============================================================================
// Deduplication
// ============================================================================

/**
 * Generate deduplication key from payload
 * 
 * @param payload - Event payload
 * @param deduplicationPath - JSONPath to deduplication value
 * @returns Deduplication key string, or undefined if not found
 */
export function generateDeduplicationKey(
  payload: Record<string, unknown>,
  deduplicationPath: string
): string | undefined {
  const value = getValueByPath(payload, deduplicationPath);
  
  if (value === undefined || value === null) {
    return undefined;
  }

  // Convert to string for consistent comparison
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  
  return String(value);
}
