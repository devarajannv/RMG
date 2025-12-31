/**
 * Cache Service
 * 
 * Provides a comprehensive caching layer with:
 * - Automatic cache key generation
 * - Cache invalidation strategies
 * - TTL management
 * - Cache statistics
 * - Decorator for easy method caching
 * 
 * @module lib/cache
 */

import { getRedis } from './redis';
import { logger } from './logger';

// ============================================================================
// Types
// ============================================================================

export interface CacheOptions {
  /** Time to live in seconds */
  ttl?: number;
  /** Cache key prefix */
  prefix?: string;
  /** Tags for invalidation */
  tags?: string[];
  /** Compression threshold (bytes) */
  compressionThreshold?: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  hitRate: number;
}

export interface CacheEntry<T> {
  data: T;
  createdAt: number;
  ttl: number;
  tags?: string[];
}

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_TTL = 300; // 5 minutes
const CACHE_PREFIX = 'cache:';
const TAG_PREFIX = 'tag:';
const STATS_KEY = 'cache:stats';

// TTL configurations by entity type
export const CACHE_TTL = {
  // Short-lived (frequently changing)
  dashboardStats: 60,        // 1 minute
  pendingRequests: 60,       // 1 minute
  notifications: 30,         // 30 seconds
  
  // Medium-lived
  resourceList: 300,         // 5 minutes
  projectList: 300,          // 5 minutes
  contractList: 300,         // 5 minutes
  requestList: 120,          // 2 minutes
  
  // Long-lived (rarely changing)
  clientList: 600,           // 10 minutes
  skillList: 3600,           // 1 hour
  roleList: 3600,            // 1 hour
  workflowTemplates: 1800,   // 30 minutes
  
  // Static data
  currencyRates: 86400,      // 24 hours
  systemConfig: 86400,       // 24 hours
  
  // User-specific
  userPermissions: 300,      // 5 minutes
  userSession: 1800,         // 30 minutes
};

// ============================================================================
// Cache Service Class
// ============================================================================

class CacheService {
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    hitRate: 0,
  };

  // --------------------------------------------------------------------------
  // Core Operations
  // --------------------------------------------------------------------------

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const redis = getRedis();
      const fullKey = this.getFullKey(key);
      
      const data = await redis.get(fullKey);
      
      if (data) {
        this.stats.hits++;
        this.updateHitRate();
        
        const entry = JSON.parse(data) as CacheEntry<T>;
        return entry.data;
      }
      
      this.stats.misses++;
      this.updateHitRate();
      return null;
    } catch (error) {
      logger.error('Cache get error', { key, error });
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    try {
      const redis = getRedis();
      const fullKey = this.getFullKey(key);
      const ttl = options.ttl || DEFAULT_TTL;
      
      const entry: CacheEntry<T> = {
        data: value,
        createdAt: Date.now(),
        ttl,
        tags: options.tags,
      };
      
      await redis.setex(fullKey, ttl, JSON.stringify(entry));
      
      // Store tag associations
      if (options.tags?.length) {
        await this.addToTags(fullKey, options.tags, ttl);
      }
      
      this.stats.sets++;
    } catch (error) {
      logger.error('Cache set error', { key, error });
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<void> {
    try {
      const redis = getRedis();
      const fullKey = this.getFullKey(key);
      
      await redis.del(fullKey);
      this.stats.deletes++;
    } catch (error) {
      logger.error('Cache delete error', { key, error });
    }
  }

  /**
   * Get or set - returns cached value or computes and caches it
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = await this.get<T>(key);
    
    if (cached !== null) {
      return cached;
    }
    
    const value = await factory();
    await this.set(key, value, options);
    
    return value;
  }

  // --------------------------------------------------------------------------
  // Tag-based Invalidation
  // --------------------------------------------------------------------------

  /**
   * Add cache key to tags for grouped invalidation
   */
  private async addToTags(key: string, tags: string[], ttl: number): Promise<void> {
    const redis = getRedis();
    
    for (const tag of tags) {
      const tagKey = `${TAG_PREFIX}${tag}`;
      await redis.sadd(tagKey, key);
      await redis.expire(tagKey, ttl + 60); // Slightly longer TTL for tag set
    }
  }

  /**
   * Invalidate all cache entries with given tag
   */
  async invalidateByTag(tag: string): Promise<number> {
    try {
      const redis = getRedis();
      const tagKey = `${TAG_PREFIX}${tag}`;
      
      const keys = await redis.smembers(tagKey);
      
      if (keys.length > 0) {
        await redis.del(...keys);
        await redis.del(tagKey);
        
        logger.info(`Invalidated ${keys.length} cache entries for tag: ${tag}`);
        this.stats.deletes += keys.length;
      }
      
      return keys.length;
    } catch (error) {
      logger.error('Cache tag invalidation error', { tag, error });
      return 0;
    }
  }

  /**
   * Invalidate all cache entries with given tags
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    let total = 0;
    
    for (const tag of tags) {
      total += await this.invalidateByTag(tag);
    }
    
    return total;
  }

  // --------------------------------------------------------------------------
  // Pattern Invalidation
  // --------------------------------------------------------------------------

  /**
   * Invalidate all cache entries matching pattern
   */
  async invalidateByPattern(pattern: string): Promise<number> {
    try {
      const redis = getRedis();
      const fullPattern = `${CACHE_PREFIX}${pattern}`;
      
      const keys = await redis.keys(fullPattern);
      
      if (keys.length > 0) {
        await redis.del(...keys);
        logger.info(`Invalidated ${keys.length} cache entries for pattern: ${pattern}`);
        this.stats.deletes += keys.length;
      }
      
      return keys.length;
    } catch (error) {
      logger.error('Cache pattern invalidation error', { pattern, error });
      return 0;
    }
  }

  // --------------------------------------------------------------------------
  // Entity-specific Invalidation
  // --------------------------------------------------------------------------

  /**
   * Invalidate cache for a resource
   */
  async invalidateResource(resourceId: string): Promise<void> {
    await Promise.all([
      this.delete(`resource:${resourceId}`),
      this.invalidateByTag('resource-list'),
      this.invalidateByTag(`resource:${resourceId}`),
      this.invalidateByTag('dashboard-stats'),
    ]);
  }

  /**
   * Invalidate cache for a project
   */
  async invalidateProject(projectId: string): Promise<void> {
    await Promise.all([
      this.delete(`project:${projectId}`),
      this.invalidateByTag('project-list'),
      this.invalidateByTag(`project:${projectId}`),
      this.invalidateByTag('dashboard-stats'),
    ]);
  }

  /**
   * Invalidate cache for a contract
   */
  async invalidateContract(contractId: string): Promise<void> {
    await Promise.all([
      this.delete(`contract:${contractId}`),
      this.invalidateByTag('contract-list'),
      this.invalidateByTag(`contract:${contractId}`),
    ]);
  }

  /**
   * Invalidate cache for a request
   */
  async invalidateRequest(requestId: string): Promise<void> {
    await Promise.all([
      this.delete(`request:${requestId}`),
      this.invalidateByTag('request-list'),
      this.invalidateByTag(`request:${requestId}`),
      this.invalidateByTag('pending-requests'),
      this.invalidateByTag('dashboard-stats'),
    ]);
  }

  /**
   * Invalidate cache for a user
   */
  async invalidateUser(userId: string): Promise<void> {
    await Promise.all([
      this.delete(`user:${userId}`),
      this.invalidateByTag(`user:${userId}`),
      this.delete(`user-permissions:${userId}`),
    ]);
  }

  /**
   * Invalidate all list caches (after bulk operations)
   */
  async invalidateAllLists(): Promise<void> {
    await Promise.all([
      this.invalidateByTag('resource-list'),
      this.invalidateByTag('project-list'),
      this.invalidateByTag('contract-list'),
      this.invalidateByTag('request-list'),
      this.invalidateByTag('dashboard-stats'),
    ]);
  }

  // --------------------------------------------------------------------------
  // Utilities
  // --------------------------------------------------------------------------

  /**
   * Generate full cache key with prefix
   */
  private getFullKey(key: string): string {
    return `${CACHE_PREFIX}${key}`;
  }

  /**
   * Update hit rate calculation
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      hitRate: 0,
    };
  }

  /**
   * Clear all cache entries
   */
  async flush(): Promise<void> {
    try {
      const redis = getRedis();
      const keys = await redis.keys(`${CACHE_PREFIX}*`);
      
      if (keys.length > 0) {
        await redis.del(...keys);
        logger.info(`Flushed ${keys.length} cache entries`);
      }
      
      this.resetStats();
    } catch (error) {
      logger.error('Cache flush error', { error });
    }
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const cache = new CacheService();

// ============================================================================
// Cache Key Generators
// ============================================================================

export const cacheKeys = {
  // Entity keys
  resource: (id: string) => `resource:${id}`,
  resourceList: (params: Record<string, any>) => `resources:${hashParams(params)}`,
  
  project: (id: string) => `project:${id}`,
  projectList: (params: Record<string, any>) => `projects:${hashParams(params)}`,
  
  contract: (id: string) => `contract:${id}`,
  contractList: (params: Record<string, any>) => `contracts:${hashParams(params)}`,
  
  request: (id: string) => `request:${id}`,
  requestList: (params: Record<string, any>) => `requests:${hashParams(params)}`,
  
  client: (id: string) => `client:${id}`,
  clientList: () => 'clients:all',
  
  // User-specific keys
  userPermissions: (userId: string) => `user-permissions:${userId}`,
  userSession: (userId: string, sessionId: string) => `user-session:${userId}:${sessionId}`,
  
  // Dashboard keys
  dashboardStats: (userId?: string) => userId ? `dashboard:${userId}` : 'dashboard:global',
  pendingRequests: (userId: string) => `pending-requests:${userId}`,
  
  // Static data keys
  skillList: () => 'skills:all',
  roleList: () => 'roles:all',
  workflowTemplates: () => 'workflow-templates:all',
  currencyRates: () => 'currency-rates:all',
};

/**
 * Create simple hash of parameters for cache key
 */
function hashParams(params: Record<string, any>): string {
  const sorted = Object.keys(params)
    .sort()
    .filter(k => params[k] !== undefined)
    .map(k => `${k}=${params[k]}`)
    .join('&');
  
  // Simple hash
  let hash = 0;
  for (let i = 0; i < sorted.length; i++) {
    const char = sorted.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return Math.abs(hash).toString(36);
}

// ============================================================================
// Cache Decorator (for class methods)
// ============================================================================

/**
 * Decorator to cache method results
 * 
 * Usage:
 * @Cached('resource', { ttl: 300, tags: ['resource-list'] })
 * async getResources(params: any) { ... }
 */
export function Cached(
  keyPrefix: string,
  options: CacheOptions = {}
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const argsHash = hashParams(args[0] || {});
      const cacheKey = `${keyPrefix}:${propertyKey}:${argsHash}`;
      
      // Try cache first
      const cached = await cache.get(cacheKey);
      if (cached !== null) {
        return cached;
      }
      
      // Call original method
      const result = await originalMethod.apply(this, args);
      
      // Cache result
      await cache.set(cacheKey, result, options);
      
      return result;
    };

    return descriptor;
  };
}

// ============================================================================
// Express Middleware for Caching Responses
// ============================================================================

import { Request, Response, NextFunction } from 'express';

interface ResponseCacheOptions extends CacheOptions {
  /** Generate cache key from request */
  keyGenerator?: (req: Request) => string;
  /** Skip caching for certain requests */
  skip?: (req: Request) => boolean;
}

/**
 * Express middleware for caching GET responses
 */
export function cacheResponse(options: ResponseCacheOptions = {}) {
  const {
    ttl = DEFAULT_TTL,
    prefix = 'response',
    tags = [],
    keyGenerator = defaultKeyGenerator,
    skip = () => false,
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }
    
    // Check skip condition
    if (skip(req)) {
      return next();
    }
    
    const cacheKey = `${prefix}:${keyGenerator(req)}`;
    
    // Try cache first
    const cached = await cache.get<{ body: any; headers: Record<string, string> }>(cacheKey);
    
    if (cached) {
      // Set cached headers
      Object.entries(cached.headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
      res.setHeader('X-Cache', 'HIT');
      
      return res.json(cached.body);
    }
    
    // Capture response
    const originalJson = res.json.bind(res);
    
    res.json = (body: any) => {
      // Cache the response
      cache.set(cacheKey, {
        body,
        headers: {
          'Content-Type': 'application/json',
        },
      }, { ttl, tags }).catch(() => {});
      
      res.setHeader('X-Cache', 'MISS');
      return originalJson(body);
    };
    
    next();
  };
}

/**
 * Default key generator for response caching
 */
function defaultKeyGenerator(req: Request): string {
  const url = req.originalUrl || req.url;
  return url.replace(/[^a-zA-Z0-9]/g, '_');
}

export default cache;
