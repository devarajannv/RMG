/**
 * Prisma Query Optimization Middleware
 * 
 * Provides:
 * - N+1 query detection
 * - Query performance logging
 * - Slow query alerts
 * - Query count tracking per request
 * - Query optimization suggestions
 * 
 * @module lib/query-optimizer
 */

import { Prisma, PrismaClient } from '@prisma/client';
import { config } from '../config/env';
import { logger } from './logger';

// ============================================================================
// Types
// ============================================================================

interface QueryMetrics {
  model: string;
  action: string;
  duration: number;
  query: string;
  args?: any;
  timestamp: number;
}

interface RequestQueryStats {
  queries: QueryMetrics[];
  totalDuration: number;
  startTime: number;
  requestId?: string;
}

interface N1Warning {
  model: string;
  action: string;
  count: number;
  pattern: string;
}

// ============================================================================
// Configuration
// ============================================================================

const SLOW_QUERY_THRESHOLD = 100; // ms
const N1_THRESHOLD = 5; // Same query repeated this many times = N+1
const MAX_QUERIES_PER_REQUEST = 50;

// ============================================================================
// Query Store (per-request tracking)
// ============================================================================

// Using AsyncLocalStorage for request-scoped storage
import { AsyncLocalStorage } from 'async_hooks';

const queryStorage = new AsyncLocalStorage<RequestQueryStats>();

/**
 * Get current request's query stats
 */
export function getQueryStats(): RequestQueryStats | undefined {
  return queryStorage.getStore();
}

/**
 * Run a callback with query tracking enabled
 */
export async function withQueryTracking<T>(
  requestId: string,
  callback: () => Promise<T>
): Promise<T> {
  const stats: RequestQueryStats = {
    queries: [],
    totalDuration: 0,
    startTime: Date.now(),
    requestId,
  };
  
  return queryStorage.run(stats, callback);
}

// ============================================================================
// Query Logging Middleware
// ============================================================================

/**
 * Create Prisma query event handler for logging
 */
export function createQueryLogger(): Prisma.QueryEvent {
  return {
    timestamp: new Date(),
    query: '',
    params: '',
    duration: 0,
    target: '',
  } as unknown as Prisma.QueryEvent;
}

/**
 * Log a query event
 */
export function logQueryEvent(e: Prisma.QueryEvent): void {
  const stats = getQueryStats();
  
  const metrics: QueryMetrics = {
    model: extractModelFromQuery(e.query),
    action: extractActionFromQuery(e.query),
    duration: e.duration,
    query: e.query,
    timestamp: Date.now(),
  };
  
  // Add to request stats if tracking
  if (stats) {
    stats.queries.push(metrics);
    stats.totalDuration += e.duration;
  }
  
  // Log slow queries
  if (e.duration > SLOW_QUERY_THRESHOLD) {
    logger.warn({
      type: 'slow_query',
      duration: e.duration,
      query: e.query.substring(0, 500), // Truncate long queries
      requestId: stats?.requestId,
    }, `Slow query detected: ${e.duration}ms`);
  }
  
  // Debug logging
  if (config.isDev) {
    logger.debug({
      type: 'query',
      duration: e.duration,
      query: e.query.substring(0, 200),
    });
  }
}

// ============================================================================
// N+1 Detection
// ============================================================================

/**
 * Detect N+1 query patterns in collected queries
 */
export function detectN1Patterns(stats: RequestQueryStats): N1Warning[] {
  const warnings: N1Warning[] = [];
  const queryPatterns = new Map<string, { count: number; model: string; action: string }>();
  
  for (const query of stats.queries) {
    // Create a pattern by removing specific IDs
    const pattern = normalizeQueryPattern(query.query);
    
    const existing = queryPatterns.get(pattern);
    if (existing) {
      existing.count++;
    } else {
      queryPatterns.set(pattern, {
        count: 1,
        model: query.model,
        action: query.action,
      });
    }
  }
  
  // Find patterns that exceed threshold
  for (const [pattern, data] of queryPatterns) {
    if (data.count >= N1_THRESHOLD) {
      warnings.push({
        model: data.model,
        action: data.action,
        count: data.count,
        pattern: pattern.substring(0, 200),
      });
    }
  }
  
  return warnings;
}

/**
 * Normalize a query to detect patterns
 */
function normalizeQueryPattern(query: string): string {
  return query
    // Remove UUIDs
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '?')
    // Remove numeric IDs
    .replace(/\b\d+\b/g, '?')
    // Remove string literals
    .replace(/'[^']*'/g, '?')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract model name from query
 */
function extractModelFromQuery(query: string): string {
  const match = query.match(/(?:FROM|INTO|UPDATE)\s+"?(\w+)"?/i);
  return match ? match[1] : 'unknown';
}

/**
 * Extract action from query
 */
function extractActionFromQuery(query: string): string {
  if (query.startsWith('SELECT')) return 'findMany';
  if (query.startsWith('INSERT')) return 'create';
  if (query.startsWith('UPDATE')) return 'update';
  if (query.startsWith('DELETE')) return 'delete';
  return 'unknown';
}

// ============================================================================
// Query Optimization Suggestions
// ============================================================================

interface OptimizationSuggestion {
  type: 'n1' | 'slow' | 'count' | 'select';
  message: string;
  severity: 'warning' | 'error';
  fix?: string;
}

/**
 * Generate optimization suggestions based on query stats
 */
export function getOptimizationSuggestions(stats: RequestQueryStats): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = [];
  
  // Check for N+1
  const n1Warnings = detectN1Patterns(stats);
  for (const warning of n1Warnings) {
    suggestions.push({
      type: 'n1',
      severity: 'error',
      message: `N+1 query detected: ${warning.model}.${warning.action} called ${warning.count} times`,
      fix: `Use include or select to fetch related data in a single query. Example: findMany({ include: { ${warning.model.toLowerCase()}: true } })`,
    });
  }
  
  // Check total query count
  if (stats.queries.length > MAX_QUERIES_PER_REQUEST) {
    suggestions.push({
      type: 'count',
      severity: 'warning',
      message: `High query count: ${stats.queries.length} queries in this request`,
      fix: 'Consider using aggregated queries or caching frequently accessed data',
    });
  }
  
  // Check for slow queries
  const slowQueries = stats.queries.filter(q => q.duration > SLOW_QUERY_THRESHOLD);
  for (const slow of slowQueries) {
    suggestions.push({
      type: 'slow',
      severity: 'warning',
      message: `Slow query (${slow.duration}ms): ${slow.model}.${slow.action}`,
      fix: 'Consider adding indexes, limiting results with take/skip, or using select to fetch only needed fields',
    });
  }
  
  // Check for potential over-fetching
  const selectAllQueries = stats.queries.filter(q => 
    q.query.includes('SELECT *') || !q.query.includes('SELECT')
  );
  if (selectAllQueries.length > 0) {
    suggestions.push({
      type: 'select',
      severity: 'warning',
      message: `${selectAllQueries.length} queries fetch all fields`,
      fix: 'Use select to fetch only the fields you need',
    });
  }
  
  return suggestions;
}

// ============================================================================
// Express Middleware
// ============================================================================

import { Request, Response, NextFunction } from 'express';

/**
 * Express middleware for query tracking
 */
export function queryTrackingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = req.headers['x-request-id'] as string || `req-${Date.now()}`;
  
  withQueryTracking(requestId, async () => {
    // Hook into response finish
    res.on('finish', () => {
      const stats = getQueryStats();
      if (stats) {
        reportQueryStats(stats, req.method, req.path);
      }
    });
    
    next();
  });
}

/**
 * Report query stats at end of request
 */
function reportQueryStats(stats: RequestQueryStats, method: string, path: string): void {
  const duration = Date.now() - stats.startTime;
  const queryCount = stats.queries.length;
  const queryTime = stats.totalDuration;
  
  // Get suggestions
  const suggestions = getOptimizationSuggestions(stats);
  
  // Log summary
  if (config.isDev || suggestions.length > 0) {
    logger.info({
      type: 'request_query_summary',
      requestId: stats.requestId,
      method,
      path,
      totalDuration: duration,
      queryCount,
      queryTime,
      nonQueryTime: duration - queryTime,
      suggestions: suggestions.length,
    }, `Query stats: ${queryCount} queries, ${queryTime}ms query time`);
    
    // Log suggestions
    for (const suggestion of suggestions) {
      const logFn = suggestion.severity === 'error' ? logger.error : logger.warn;
      logFn.call(logger, {
        type: 'query_optimization',
        suggestionType: suggestion.type,
        requestId: stats.requestId,
        message: suggestion.message,
        fix: suggestion.fix,
      });
    }
  }
}

// ============================================================================
// Prisma Extensions for Optimization
// ============================================================================

/**
 * Create optimized Prisma client with query tracking
 */
export function createOptimizedPrismaClient(): PrismaClient {
  const prisma = new PrismaClient({
    log: [
      { level: 'query', emit: 'event' },
      { level: 'info', emit: 'event' },
      { level: 'warn', emit: 'event' },
      { level: 'error', emit: 'event' },
    ],
  });
  
  // Log query events
  prisma.$on('query', logQueryEvent as any);
  
  return prisma;
}

// ============================================================================
// Predefined Optimal Includes
// ============================================================================

/**
 * Optimal includes for common queries
 * Prevents N+1 by including related data upfront
 */
export const OPTIMAL_INCLUDES = {
  // Resource with common relations
  resource: {
    resourceSkills: {
      include: {
        skill: true,
      },
    },
    allocations: {
      where: {
        endDate: { gte: new Date() },
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    },
    team: {
      select: {
        id: true,
        name: true,
      },
    },
  },
  
  // Project with team
  project: {
    client: {
      select: {
        id: true,
        name: true,
        code: true,
      },
    },
    allocations: {
      include: {
        resource: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    },
    projectManager: {
      select: {
        id: true,
        name: true,
        email: true,
      },
    },
  },
  
  // Contract with documents
  contract: {
    client: {
      select: {
        id: true,
        name: true,
      },
    },
    documents: {
      orderBy: {
        createdAt: 'desc' as const,
      },
      take: 10,
    },
    milestones: {
      orderBy: {
        dueDate: 'asc' as const,
      },
    },
    createdBy: {
      select: {
        id: true,
        name: true,
      },
    },
  },
  
  // Request with workflow
  request: {
    requestType: true,
    requester: {
      select: {
        id: true,
        name: true,
        email: true,
      },
    },
    currentAssignee: {
      select: {
        id: true,
        name: true,
        email: true,
      },
    },
    workflowInstance: {
      include: {
        workflow: true,
        steps: {
          orderBy: {
            stepNumber: 'asc' as const,
          },
          include: {
            assignee: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    },
  },
  
  // User with permissions
  user: {
    role: {
      include: {
        permissions: true,
      },
    },
    team: true,
  },
};

/**
 * Optimal selects for list views (minimal data)
 */
export const OPTIMAL_SELECTS = {
  // Resource list view
  resourceList: {
    id: true,
    name: true,
    email: true,
    employeeCode: true,
    status: true,
    designation: true,
    department: true,
    location: true,
    createdAt: true,
  },
  
  // Project list view
  projectList: {
    id: true,
    name: true,
    code: true,
    status: true,
    startDate: true,
    endDate: true,
    client: {
      select: {
        id: true,
        name: true,
      },
    },
  },
  
  // Contract list view
  contractList: {
    id: true,
    title: true,
    contractNumber: true,
    status: true,
    startDate: true,
    endDate: true,
    totalValue: true,
    client: {
      select: {
        id: true,
        name: true,
      },
    },
  },
  
  // Request list view
  requestList: {
    id: true,
    title: true,
    status: true,
    priority: true,
    createdAt: true,
    requestType: {
      select: {
        id: true,
        name: true,
      },
    },
    requester: {
      select: {
        id: true,
        name: true,
      },
    },
  },
};

// ============================================================================
// Query Helpers
// ============================================================================

/**
 * Build pagination options
 */
export function buildPagination(page?: number, limit?: number): { skip?: number; take?: number } {
  const take = Math.min(limit || 20, 100); // Max 100 per page
  const skip = page && page > 1 ? (page - 1) * take : undefined;
  
  return { skip, take };
}

/**
 * Build sorting options
 */
export function buildOrderBy(
  sortBy?: string,
  sortOrder?: 'asc' | 'desc',
  defaultSort: string = 'createdAt',
  defaultOrder: 'asc' | 'desc' = 'desc'
): Record<string, 'asc' | 'desc'> {
  return {
    [sortBy || defaultSort]: sortOrder || defaultOrder,
  };
}

/**
 * Safe batch processing for large datasets
 */
export async function batchProcess<T, R>(
  items: T[],
  batchSize: number,
  processor: (batch: T[]) => Promise<R[]>
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await processor(batch);
    results.push(...batchResults);
  }
  
  return results;
}

export default {
  withQueryTracking,
  getQueryStats,
  detectN1Patterns,
  getOptimizationSuggestions,
  queryTrackingMiddleware,
  createOptimizedPrismaClient,
  OPTIMAL_INCLUDES,
  OPTIMAL_SELECTS,
  buildPagination,
  buildOrderBy,
  batchProcess,
};
