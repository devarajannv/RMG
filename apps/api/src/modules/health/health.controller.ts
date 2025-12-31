/**
 * Health Check Controller
 * Provides Kubernetes-compatible health endpoints for liveness, readiness, and metrics
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { redis } from '../../lib/redis';
import { logger } from '../../lib/logger';
import { collectMetrics, getMetricsText } from './metrics';

const router = Router();

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
}

interface ReadinessStatus extends HealthStatus {
  checks: {
    database: ComponentCheck;
    redis: ComponentCheck;
    memory: ComponentCheck;
    disk?: ComponentCheck;
  };
}

interface ComponentCheck {
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  message?: string;
  details?: Record<string, unknown>;
}

// Track startup time
const startTime = Date.now();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Basic health check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 */
router.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: Math.floor((Date.now() - startTime) / 1000),
  });
});

/**
 * @swagger
 * /health/live:
 *   get:
 *     summary: Kubernetes liveness probe
 *     description: Returns 200 if the service is alive. Used by K8s to determine if the container should be restarted.
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is alive
 *       503:
 *         description: Service is not alive
 */
router.get('/live', (_req: Request, res: Response) => {
  // Liveness check - just verify the process is running
  // Don't check dependencies here, that's for readiness
  const status: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
    version: process.env.npm_package_version || '1.0.0',
  };

  res.json(status);
});

/**
 * @swagger
 * /health/ready:
 *   get:
 *     summary: Kubernetes readiness probe
 *     description: Returns 200 if the service is ready to accept traffic. Checks all dependencies.
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is ready
 *       503:
 *         description: Service is not ready
 */
router.get('/ready', async (_req: Request, res: Response) => {
  const checks: ReadinessStatus['checks'] = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    memory: checkMemory(),
  };

  // Determine overall status
  const allUp = Object.values(checks).every((c) => c.status === 'up');
  const anyDown = Object.values(checks).some((c) => c.status === 'down');

  let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
  if (allUp) {
    overallStatus = 'healthy';
  } else if (anyDown) {
    overallStatus = 'unhealthy';
  } else {
    overallStatus = 'degraded';
  }

  const status: ReadinessStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
    version: process.env.npm_package_version || '1.0.0',
    checks,
  };

  const httpStatus = overallStatus === 'unhealthy' ? 503 : 200;
  res.status(httpStatus).json(status);
});

/**
 * @swagger
 * /health/metrics:
 *   get:
 *     summary: Prometheus metrics endpoint
 *     description: Returns metrics in Prometheus format for monitoring
 *     tags: [Health]
 *     produces:
 *       - text/plain
 *     responses:
 *       200:
 *         description: Prometheus metrics
 */
router.get('/metrics', async (_req: Request, res: Response) => {
  try {
    // Collect current metrics
    await collectMetrics();
    
    // Return in Prometheus format
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(await getMetricsText());
  } catch (error) {
    logger.error('Error collecting metrics', { error });
    res.status(500).send('# Error collecting metrics\n');
  }
});

/**
 * @swagger
 * /health/info:
 *   get:
 *     summary: Detailed service information
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service information
 */
router.get('/info', (_req: Request, res: Response) => {
  const memoryUsage = process.memoryUsage();
  
  res.json({
    service: 'rmgaas-api',
    version: process.env.npm_package_version || '1.0.0',
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    pid: process.pid,
    memory: {
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024),
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
    },
    hostname: process.env.HOSTNAME || 'unknown',
    podName: process.env.POD_NAME || 'unknown',
    podNamespace: process.env.POD_NAMESPACE || 'unknown',
  });
});

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<ComponentCheck> {
  const start = Date.now();
  
  try {
    await prisma.$queryRaw`SELECT 1`;
    const responseTime = Date.now() - start;
    
    return {
      status: responseTime > 1000 ? 'degraded' : 'up',
      responseTime,
      message: responseTime > 1000 ? 'Slow response' : 'Connected',
    };
  } catch (error) {
    logger.error('Database health check failed', { error });
    return {
      status: 'down',
      responseTime: Date.now() - start,
      message: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}

/**
 * Check Redis connectivity
 */
async function checkRedis(): Promise<ComponentCheck> {
  const start = Date.now();
  
  try {
    if (!redis) {
      return {
        status: 'down',
        message: 'Redis client not initialized',
      };
    }
    
    await redis.ping();
    const responseTime = Date.now() - start;
    
    // Get memory info if available
    let details: Record<string, unknown> | undefined;
    try {
      const info = await redis.info('memory');
      const usedMemory = info.match(/used_memory_human:(\S+)/)?.[1];
      if (usedMemory) {
        details = { usedMemory };
      }
    } catch {
      // Ignore info errors
    }
    
    return {
      status: responseTime > 500 ? 'degraded' : 'up',
      responseTime,
      message: responseTime > 500 ? 'Slow response' : 'Connected',
      details,
    };
  } catch (error) {
    logger.error('Redis health check failed', { error });
    return {
      status: 'down',
      responseTime: Date.now() - start,
      message: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}

/**
 * Check memory usage
 */
function checkMemory(): ComponentCheck {
  const memoryUsage = process.memoryUsage();
  const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
  const heapTotalMB = memoryUsage.heapTotal / 1024 / 1024;
  const heapPercent = (heapUsedMB / heapTotalMB) * 100;
  
  let status: 'up' | 'degraded' | 'down' = 'up';
  let message = 'Memory usage normal';
  
  if (heapPercent > 90) {
    status = 'down';
    message = 'Critical memory usage';
  } else if (heapPercent > 75) {
    status = 'degraded';
    message = 'High memory usage';
  }
  
  return {
    status,
    message,
    details: {
      heapUsedMB: Math.round(heapUsedMB),
      heapTotalMB: Math.round(heapTotalMB),
      heapPercent: Math.round(heapPercent),
      rssMB: Math.round(memoryUsage.rss / 1024 / 1024),
    },
  };
}

export const healthRoutes = router;
