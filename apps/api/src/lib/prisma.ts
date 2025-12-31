import { PrismaClient, Prisma } from '@prisma/client';
import { config } from '../config/env';
import { logger } from './logger';

// ============================================================================
// Query Performance Tracking
// ============================================================================

interface QueryMetrics {
  model: string;
  action: string;
  duration: number;
  timestamp: number;
}

const SLOW_QUERY_THRESHOLD = 100; // ms

// ============================================================================
// Prisma Client Setup
// ============================================================================

// Prevent multiple Prisma instances in development (hot reload)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log: config.isDev
      ? [
          { level: 'query', emit: 'event' },
          { level: 'info', emit: 'stdout' },
          { level: 'warn', emit: 'stdout' },
          { level: 'error', emit: 'stdout' },
        ]
      : [
          { level: 'error', emit: 'stdout' },
        ],
    errorFormat: config.isDev ? 'pretty' : 'minimal',
  });

  // Query event logging in development
  if (config.isDev) {
    client.$on('query', (e: Prisma.QueryEvent) => {
      const duration = e.duration;
      
      // Log slow queries
      if (duration > SLOW_QUERY_THRESHOLD) {
        logger.warn({
          type: 'slow_query',
          duration,
          query: e.query.substring(0, 500),
          params: e.params.substring(0, 200),
        }, `Slow query detected: ${duration}ms`);
      }
      
      // Debug logging for all queries
      logger.debug({
        type: 'query',
        duration,
        query: e.query.substring(0, 200),
      });
    });
  }

  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (!config.isProd) {
  globalForPrisma.prisma = prisma;
}

// ============================================================================
// Query Optimization Helpers
// ============================================================================

/**
 * Optimal includes for common queries to prevent N+1
 */
export const INCLUDES = {
  resource: {
    resourceSkills: {
      include: { skill: true },
    },
    allocations: {
      where: { endDate: { gte: new Date() } },
      include: {
        project: {
          select: { id: true, name: true, code: true },
        },
      },
    },
    team: {
      select: { id: true, name: true },
    },
  },
  
  project: {
    client: {
      select: { id: true, name: true, code: true },
    },
    allocations: {
      include: {
        resource: {
          select: { id: true, name: true, email: true },
        },
      },
    },
    projectManager: {
      select: { id: true, name: true, email: true },
    },
  },
  
  contract: {
    client: {
      select: { id: true, name: true },
    },
    documents: {
      orderBy: { createdAt: 'desc' as const },
      take: 10,
    },
    milestones: {
      orderBy: { dueDate: 'asc' as const },
    },
    createdBy: {
      select: { id: true, name: true },
    },
  },
  
  request: {
    requestType: true,
    requester: {
      select: { id: true, name: true, email: true },
    },
    currentAssignee: {
      select: { id: true, name: true, email: true },
    },
    workflowInstance: {
      include: {
        workflow: true,
        steps: {
          orderBy: { stepNumber: 'asc' as const },
          include: {
            assignee: {
              select: { id: true, name: true },
            },
          },
        },
      },
    },
  },
  
  user: {
    role: {
      include: { permissions: true },
    },
    team: true,
  },
};

/**
 * Optimal selects for list views (minimal data)
 */
export const SELECTS = {
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
  
  projectList: {
    id: true,
    name: true,
    code: true,
    status: true,
    startDate: true,
    endDate: true,
    client: {
      select: { id: true, name: true },
    },
  },
  
  contractList: {
    id: true,
    title: true,
    contractNumber: true,
    status: true,
    startDate: true,
    endDate: true,
    totalValue: true,
    client: {
      select: { id: true, name: true },
    },
  },
  
  requestList: {
    id: true,
    title: true,
    status: true,
    priority: true,
    createdAt: true,
    requestType: {
      select: { id: true, name: true },
    },
    requester: {
      select: { id: true, name: true },
    },
  },
};

/**
 * Build pagination options
 */
export function buildPagination(page?: number, limit?: number): { skip?: number; take: number } {
  const take = Math.min(limit || 20, 100); // Max 100 per page
  const skip = page && page > 1 ? (page - 1) * take : undefined;
  
  return { skip, take };
}

/**
 * Build ordering options
 */
export function buildOrderBy<T extends string>(
  sortBy?: T,
  sortOrder?: 'asc' | 'desc',
  defaultSort: T = 'createdAt' as T,
  defaultOrder: 'asc' | 'desc' = 'desc'
): Record<string, 'asc' | 'desc'> {
  return {
    [sortBy || defaultSort]: sortOrder || defaultOrder,
  };
}

/**
 * Batch process large datasets
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

// ============================================================================
// Graceful Shutdown
// ============================================================================

process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;

