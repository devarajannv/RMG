/**
 * Prometheus Metrics Collection
 * Provides application metrics in Prometheus format
 */

import { prisma } from '../../lib/prisma';
import { getRedis } from '../../lib/redis';
import { logger } from '../../lib/logger';

// Track startup time for uptime metric
const startTime = Date.now();

// Request metrics storage (in-memory, would use prom-client in production)
const requestMetrics = {
  totalRequests: 0,
  requestsByMethod: new Map<string, number>(),
  requestsByStatus: new Map<number, number>(),
  requestDurations: [] as number[],
  activeConnections: 0,
};

// Circuit breaker for external calls
const circuitBreakers = new Map<string, {
  failures: number;
  lastFailure: number;
  state: 'closed' | 'open' | 'half-open';
}>();

/**
 * Record an HTTP request
 */
export function recordRequest(method: string, statusCode: number, durationMs: number): void {
  requestMetrics.totalRequests++;
  
  // Track by method
  const methodCount = requestMetrics.requestsByMethod.get(method) || 0;
  requestMetrics.requestsByMethod.set(method, methodCount + 1);
  
  // Track by status code
  const statusCount = requestMetrics.requestsByStatus.get(statusCode) || 0;
  requestMetrics.requestsByStatus.set(statusCode, statusCount + 1);
  
  // Track duration (keep last 1000 for percentile calculation)
  requestMetrics.requestDurations.push(durationMs);
  if (requestMetrics.requestDurations.length > 1000) {
    requestMetrics.requestDurations.shift();
  }
}

/**
 * Track active connections
 */
export function incrementConnections(): void {
  requestMetrics.activeConnections++;
}

export function decrementConnections(): void {
  requestMetrics.activeConnections = Math.max(0, requestMetrics.activeConnections - 1);
}

/**
 * Record circuit breaker state
 */
export function recordCircuitBreaker(service: string, success: boolean): void {
  let breaker = circuitBreakers.get(service);
  if (!breaker) {
    breaker = { failures: 0, lastFailure: 0, state: 'closed' };
    circuitBreakers.set(service, breaker);
  }
  
  if (success) {
    breaker.failures = 0;
    breaker.state = 'closed';
  } else {
    breaker.failures++;
    breaker.lastFailure = Date.now();
    if (breaker.failures >= 5) {
      breaker.state = 'open';
    }
  }
}

/**
 * Calculate percentile from array of values
 */
function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)] || 0;
}

/**
 * Collect metrics from various sources
 */
export async function collectMetrics(): Promise<void> {
  // Metrics are collected passively via recordRequest calls
  // This function can be extended to collect additional metrics
  logger.debug('Collecting metrics');
}

/**
 * Get metrics in Prometheus text format
 */
export async function getMetricsText(): Promise<string> {
  const lines: string[] = [];
  const memoryUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  // Helper to add metric
  const addMetric = (name: string, value: number, help: string, type: string = 'gauge', labels: Record<string, string> = {}) => {
    lines.push(`# HELP ${name} ${help}`);
    lines.push(`# TYPE ${name} ${type}`);
    
    const labelStr = Object.entries(labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    
    if (labelStr) {
      lines.push(`${name}{${labelStr}} ${value}`);
    } else {
      lines.push(`${name} ${value}`);
    }
  };
  
  // Process metrics
  addMetric('process_uptime_seconds', Math.floor((Date.now() - startTime) / 1000), 'Process uptime in seconds');
  addMetric('process_heap_bytes', memoryUsage.heapUsed, 'Process heap usage in bytes');
  addMetric('process_heap_total_bytes', memoryUsage.heapTotal, 'Process heap total in bytes');
  addMetric('process_rss_bytes', memoryUsage.rss, 'Process resident set size in bytes');
  addMetric('process_external_bytes', memoryUsage.external, 'Process external memory usage in bytes');
  addMetric('process_cpu_user_microseconds', cpuUsage.user, 'Process CPU user time in microseconds', 'counter');
  addMetric('process_cpu_system_microseconds', cpuUsage.system, 'Process CPU system time in microseconds', 'counter');
  
  // HTTP request metrics
  addMetric('http_requests_total', requestMetrics.totalRequests, 'Total HTTP requests', 'counter');
  addMetric('http_active_connections', requestMetrics.activeConnections, 'Active HTTP connections');
  
  // Requests by method
  lines.push('# HELP http_requests_by_method_total HTTP requests by method');
  lines.push('# TYPE http_requests_by_method_total counter');
  for (const [method, count] of requestMetrics.requestsByMethod) {
    lines.push(`http_requests_by_method_total{method="${method}"} ${count}`);
  }
  
  // Requests by status code
  lines.push('# HELP http_requests_by_status_total HTTP requests by status code');
  lines.push('# TYPE http_requests_by_status_total counter');
  for (const [status, count] of requestMetrics.requestsByStatus) {
    lines.push(`http_requests_by_status_total{status="${status}"} ${count}`);
  }
  
  // Request duration percentiles
  if (requestMetrics.requestDurations.length > 0) {
    lines.push('# HELP http_request_duration_ms HTTP request duration in milliseconds');
    lines.push('# TYPE http_request_duration_ms summary');
    lines.push(`http_request_duration_ms{quantile="0.5"} ${percentile(requestMetrics.requestDurations, 50)}`);
    lines.push(`http_request_duration_ms{quantile="0.9"} ${percentile(requestMetrics.requestDurations, 90)}`);
    lines.push(`http_request_duration_ms{quantile="0.95"} ${percentile(requestMetrics.requestDurations, 95)}`);
    lines.push(`http_request_duration_ms{quantile="0.99"} ${percentile(requestMetrics.requestDurations, 99)}`);
    lines.push(`http_request_duration_ms_count ${requestMetrics.requestDurations.length}`);
    lines.push(`http_request_duration_ms_sum ${requestMetrics.requestDurations.reduce((a, b) => a + b, 0)}`);
  }
  
  // Database metrics
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatency = Date.now() - dbStart;
    addMetric('database_connection_up', 1, 'Database connection status');
    addMetric('database_query_latency_ms', dbLatency, 'Database query latency in milliseconds');
  } catch {
    addMetric('database_connection_up', 0, 'Database connection status');
  }
  
  // Redis metrics
  try {
    const redis = getRedis();
    if (redis) {
      const redisStart = Date.now();
      await redis.ping();
      const redisLatency = Date.now() - redisStart;
      addMetric('redis_connection_up', 1, 'Redis connection status');
      addMetric('redis_ping_latency_ms', redisLatency, 'Redis ping latency in milliseconds');
      
      // Try to get Redis info
      try {
        const info = await redis.info('clients');
        const connectedClients = parseInt(info.match(/connected_clients:(\d+)/)?.[1] || '0');
        addMetric('redis_connected_clients', connectedClients, 'Redis connected clients');
      } catch {
        // Ignore info errors
      }
    } else {
      addMetric('redis_connection_up', 0, 'Redis connection status');
    }
  } catch {
    addMetric('redis_connection_up', 0, 'Redis connection status');
  }
  
  // Circuit breaker metrics
  lines.push('# HELP circuit_breaker_state Circuit breaker state (0=closed, 1=half-open, 2=open)');
  lines.push('# TYPE circuit_breaker_state gauge');
  for (const [service, breaker] of circuitBreakers) {
    const stateValue = breaker.state === 'closed' ? 0 : breaker.state === 'half-open' ? 1 : 2;
    lines.push(`circuit_breaker_state{service="${service}"} ${stateValue}`);
  }
  
  // Node.js event loop lag (approximate)
  const lagStart = Date.now();
  await new Promise(resolve => setImmediate(resolve));
  const eventLoopLag = Date.now() - lagStart;
  addMetric('nodejs_eventloop_lag_ms', eventLoopLag, 'Node.js event loop lag in milliseconds');
  
  // Garbage collection info (if available)
  if (global.gc) {
    addMetric('nodejs_gc_enabled', 1, 'Node.js garbage collection enabled');
  }
  
  return lines.join('\n') + '\n';
}

/**
 * Reset metrics (for testing)
 */
export function resetMetrics(): void {
  requestMetrics.totalRequests = 0;
  requestMetrics.requestsByMethod.clear();
  requestMetrics.requestsByStatus.clear();
  requestMetrics.requestDurations = [];
  requestMetrics.activeConnections = 0;
  circuitBreakers.clear();
}
