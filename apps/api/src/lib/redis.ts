import Redis from 'ioredis';
import { config } from '../config/env';
import { logger } from './logger';

// Redis client singleton
let redisClient: Redis | null = null;

/**
 * Get Redis client instance
 */
export function getRedis(): Redis {
  if (!redisClient) {
    redisClient = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      retryStrategy(times) {
        if (times > 3) {
          logger.error('Redis connection failed after 3 retries');
          return null; // Stop retrying
        }
        return Math.min(times * 200, 2000);
      },
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected');
    });

    redisClient.on('error', (err) => {
      logger.error('Redis error', { error: err.message });
    });

    redisClient.on('close', () => {
      logger.warn('Redis connection closed');
    });
  }

  return redisClient;
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

// Session/Token storage helpers
const SESSION_PREFIX = 'session:';
const REFRESH_TOKEN_PREFIX = 'refresh:';
const BLACKLIST_PREFIX = 'blacklist:';

/**
 * Store refresh token family
 */
export async function storeRefreshTokenFamily(
  userId: string,
  tokenFamily: string,
  ttlSeconds: number
): Promise<void> {
  const redis = getRedis();
  const key = `${REFRESH_TOKEN_PREFIX}${userId}:${tokenFamily}`;
  await redis.setex(key, ttlSeconds, Date.now().toString());
}

/**
 * Check if refresh token family is valid
 */
export async function isRefreshTokenFamilyValid(
  userId: string,
  tokenFamily: string
): Promise<boolean> {
  const redis = getRedis();
  const key = `${REFRESH_TOKEN_PREFIX}${userId}:${tokenFamily}`;
  const exists = await redis.exists(key);
  return exists === 1;
}

/**
 * Invalidate refresh token family (logout or security event)
 */
export async function invalidateRefreshTokenFamily(
  userId: string,
  tokenFamily: string
): Promise<void> {
  const redis = getRedis();
  const key = `${REFRESH_TOKEN_PREFIX}${userId}:${tokenFamily}`;
  await redis.del(key);
}

/**
 * Invalidate all refresh tokens for a user (logout all devices)
 */
export async function invalidateAllUserTokens(userId: string): Promise<void> {
  const redis = getRedis();
  const pattern = `${REFRESH_TOKEN_PREFIX}${userId}:*`;
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}

/**
 * H-04: Count active sessions (refresh token families) for a user
 */
export async function countUserSessions(userId: string): Promise<number> {
  const redis = getRedis();
  const pattern = `${REFRESH_TOKEN_PREFIX}${userId}:*`;
  const keys = await redis.keys(pattern);
  return keys.length;
}

/**
 * H-04: Enforce concurrent session limit by evicting oldest sessions
 * Returns the number of sessions evicted
 */
export async function enforceSessionLimit(userId: string, maxSessions: number): Promise<number> {
  const redis = getRedis();
  const pattern = `${REFRESH_TOKEN_PREFIX}${userId}:*`;
  const keys = await redis.keys(pattern);

  if (keys.length <= maxSessions) return 0;

  // Get all session timestamps to find oldest
  const pipeline = redis.pipeline();
  for (const key of keys) {
    pipeline.get(key);
  }
  const results = await pipeline.exec();

  // Build timestamp-key pairs and sort by creation time (oldest first)
  const sessions = keys.map((key, i) => ({
    key,
    timestamp: parseInt((results?.[i]?.[1] as string) || '0', 10),
  })).sort((a, b) => a.timestamp - b.timestamp);

  // Evict oldest sessions beyond the limit
  const toEvict = sessions.slice(0, sessions.length - maxSessions);
  if (toEvict.length > 0) {
    await redis.del(...toEvict.map((s) => s.key));
  }
  return toEvict.length;
}

/**
 * Add token to blacklist (for immediate invalidation)
 */
export async function blacklistToken(
  token: string,
  ttlSeconds: number
): Promise<void> {
  const redis = getRedis();
  const key = `${BLACKLIST_PREFIX}${token}`;
  await redis.setex(key, ttlSeconds, '1');
}

/**
 * Check if token is blacklisted
 */
export async function isTokenBlacklisted(token: string): Promise<boolean> {
  const redis = getRedis();
  const key = `${BLACKLIST_PREFIX}${token}`;
  const exists = await redis.exists(key);
  return exists === 1;
}

/**
 * Store user session data
 */
export async function storeSession(
  sessionId: string,
  data: Record<string, unknown>,
  ttlSeconds: number
): Promise<void> {
  const redis = getRedis();
  const key = `${SESSION_PREFIX}${sessionId}`;
  await redis.setex(key, ttlSeconds, JSON.stringify(data));
}

/**
 * Get user session data
 */
export async function getSession(
  sessionId: string
): Promise<Record<string, unknown> | null> {
  const redis = getRedis();
  const key = `${SESSION_PREFIX}${sessionId}`;
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
}

/**
 * Delete user session
 */
export async function deleteSession(sessionId: string): Promise<void> {
  const redis = getRedis();
  const key = `${SESSION_PREFIX}${sessionId}`;
  await redis.del(key);
}

/**
 * Rate limiting helper - increment counter
 */
export async function incrementRateLimit(
  key: string,
  windowSeconds: number
): Promise<number> {
  const redis = getRedis();
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, windowSeconds);
  }
  return count;
}

