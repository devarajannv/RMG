/**
 * Load Testing Utilities
 * 
 * Provides tools for performance and load testing of API endpoints.
 * Measures response times, throughput, and system behavior under load.
 */

import { performance } from 'perf_hooks';

// ============================================================================
// Types
// ============================================================================

export interface LoadTestConfig {
  /** Total number of requests to make */
  totalRequests: number;
  /** Number of concurrent requests */
  concurrency: number;
  /** Base URL for requests */
  baseUrl: string;
  /** Authentication token */
  authToken?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Delay between request batches in milliseconds */
  batchDelay?: number;
  /** Whether to continue on errors */
  continueOnError?: boolean;
}

export interface RequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
  params?: Record<string, string>;
}

export interface RequestMetrics {
  requestId: number;
  duration: number;
  status: number;
  success: boolean;
  error?: string;
  timestamp: number;
  path: string;
  method: string;
}

export interface LoadTestResults {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalDuration: number;
  requestsPerSecond: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p50ResponseTime: number;
  p90ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  errorRate: number;
  errors: Record<string, number>;
  metrics: RequestMetrics[];
}

export interface StressTestConfig extends LoadTestConfig {
  /** Starting concurrency level */
  startConcurrency: number;
  /** Concurrency increment per step */
  concurrencyStep: number;
  /** Maximum concurrency to test */
  maxConcurrency: number;
  /** Duration at each concurrency level in seconds */
  stepDuration: number;
}

export interface StressTestResults {
  steps: Array<{
    concurrency: number;
    results: LoadTestResults;
  }>;
  breakingPoint?: number;
  optimalConcurrency?: number;
}

// ============================================================================
// Load Test Runner
// ============================================================================

export class LoadTestRunner {
  private config: LoadTestConfig;
  private metrics: RequestMetrics[] = [];
  private requestCounter = 0;

  constructor(config: LoadTestConfig) {
    this.config = {
      timeout: 30000,
      batchDelay: 0,
      continueOnError: true,
      ...config
    };
  }

  /**
   * Execute a single request and measure its performance
   */
  private async executeRequest(request: RequestConfig): Promise<RequestMetrics> {
    const requestId = ++this.requestCounter;
    const startTime = performance.now();
    const timestamp = Date.now();

    try {
      const url = new URL(request.path, this.config.baseUrl);
      
      if (request.params) {
        Object.entries(request.params).forEach(([key, value]) => {
          url.searchParams.append(key, value);
        });
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...request.headers
      };

      if (process.env.NODE_ENV === 'test' || process.env.VITEST === 'true') {
        headers['x-e2e-test-mode'] = '1';
      }

      if (this.config.authToken) {
        headers['Authorization'] = `Bearer ${this.config.authToken}`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(url.toString(), {
        method: request.method,
        headers,
        body: request.body ? JSON.stringify(request.body) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const duration = performance.now() - startTime;
      const success = response.status >= 200 && response.status < 300;

      return {
        requestId,
        duration,
        status: response.status,
        success,
        timestamp,
        path: request.path,
        method: request.method
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return {
        requestId,
        duration,
        status: 0,
        success: false,
        error: errorMessage,
        timestamp,
        path: request.path,
        method: request.method
      };
    }
  }

  /**
   * Execute multiple requests concurrently
   */
  private async executeBatch(requests: RequestConfig[]): Promise<RequestMetrics[]> {
    const promises = requests.map(req => this.executeRequest(req));
    return Promise.all(promises);
  }

  /**
   * Run load test with given requests
   */
  async run(request: RequestConfig): Promise<LoadTestResults> {
    this.metrics = [];
    this.requestCounter = 0;

    const startTime = performance.now();
    const batches = Math.ceil(this.config.totalRequests / this.config.concurrency);

    for (let i = 0; i < batches; i++) {
      const batchSize = Math.min(
        this.config.concurrency,
        this.config.totalRequests - (i * this.config.concurrency)
      );

      const requests = Array(batchSize).fill(request);
      const batchMetrics = await this.executeBatch(requests);
      this.metrics.push(...batchMetrics);

      if (this.config.batchDelay && i < batches - 1) {
        await new Promise(resolve => setTimeout(resolve, this.config.batchDelay));
      }
    }

    const totalDuration = performance.now() - startTime;
    return this.calculateResults(totalDuration);
  }

  /**
   * Run load test with multiple different requests
   */
  async runMixed(requests: RequestConfig[]): Promise<LoadTestResults> {
    this.metrics = [];
    this.requestCounter = 0;

    const startTime = performance.now();
    const requestsPerType = Math.ceil(this.config.totalRequests / requests.length);

    // Interleave requests of different types
    const allRequests: RequestConfig[] = [];
    for (let i = 0; i < requestsPerType; i++) {
      for (const request of requests) {
        if (allRequests.length < this.config.totalRequests) {
          allRequests.push(request);
        }
      }
    }

    const batches = Math.ceil(allRequests.length / this.config.concurrency);

    for (let i = 0; i < batches; i++) {
      const start = i * this.config.concurrency;
      const end = Math.min(start + this.config.concurrency, allRequests.length);
      const batchRequests = allRequests.slice(start, end);

      const batchMetrics = await this.executeBatch(batchRequests);
      this.metrics.push(...batchMetrics);

      if (this.config.batchDelay && i < batches - 1) {
        await new Promise(resolve => setTimeout(resolve, this.config.batchDelay));
      }
    }

    const totalDuration = performance.now() - startTime;
    return this.calculateResults(totalDuration);
  }

  /**
   * Calculate test results from metrics
   */
  private calculateResults(totalDuration: number): LoadTestResults {
    const successfulRequests = this.metrics.filter(m => m.success).length;
    const failedRequests = this.metrics.length - successfulRequests;
    const responseTimes = this.metrics.map(m => m.duration).sort((a, b) => a - b);

    const errors: Record<string, number> = {};
    this.metrics
      .filter(m => !m.success)
      .forEach(m => {
        const errorKey = m.error || `HTTP ${m.status}`;
        errors[errorKey] = (errors[errorKey] || 0) + 1;
      });

    return {
      totalRequests: this.metrics.length,
      successfulRequests,
      failedRequests,
      totalDuration,
      requestsPerSecond: (this.metrics.length / totalDuration) * 1000,
      averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      minResponseTime: responseTimes[0] || 0,
      maxResponseTime: responseTimes[responseTimes.length - 1] || 0,
      p50ResponseTime: this.percentile(responseTimes, 50),
      p90ResponseTime: this.percentile(responseTimes, 90),
      p95ResponseTime: this.percentile(responseTimes, 95),
      p99ResponseTime: this.percentile(responseTimes, 99),
      errorRate: failedRequests / this.metrics.length,
      errors,
      metrics: this.metrics
    };
  }

  /**
   * Calculate percentile from sorted array
   */
  private percentile(sortedArr: number[], p: number): number {
    if (sortedArr.length === 0) return 0;
    const index = Math.ceil((p / 100) * sortedArr.length) - 1;
    return sortedArr[Math.max(0, index)];
  }
}

// ============================================================================
// Stress Test Runner
// ============================================================================

export class StressTestRunner {
  private config: StressTestConfig;

  constructor(config: StressTestConfig) {
    this.config = config;
  }

  /**
   * Run stress test with increasing concurrency
   */
  async run(request: RequestConfig): Promise<StressTestResults> {
    const steps: StressTestResults['steps'] = [];
    let breakingPoint: number | undefined;
    let optimalConcurrency: number | undefined;
    let bestRps = 0;

    for (
      let concurrency = this.config.startConcurrency;
      concurrency <= this.config.maxConcurrency;
      concurrency += this.config.concurrencyStep
    ) {
      console.log(`Testing concurrency level: ${concurrency}`);

      const loadRunner = new LoadTestRunner({
        ...this.config,
        concurrency,
        totalRequests: concurrency * Math.ceil(this.config.stepDuration)
      });

      const results = await loadRunner.run(request);
      steps.push({ concurrency, results });

      // Check for breaking point (error rate > 5%)
      if (results.errorRate > 0.05 && !breakingPoint) {
        breakingPoint = concurrency;
      }

      // Track optimal concurrency (best throughput with < 1% errors)
      if (results.errorRate < 0.01 && results.requestsPerSecond > bestRps) {
        bestRps = results.requestsPerSecond;
        optimalConcurrency = concurrency;
      }

      // Stop if error rate is too high
      if (results.errorRate > 0.2) {
        console.log(`Stopping stress test: error rate ${(results.errorRate * 100).toFixed(1)}%`);
        break;
      }

      // Brief cooldown between steps
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return {
      steps,
      breakingPoint,
      optimalConcurrency
    };
  }
}

// ============================================================================
// Benchmark Utilities
// ============================================================================

export interface BenchmarkResult {
  name: string;
  iterations: number;
  totalTime: number;
  averageTime: number;
  opsPerSecond: number;
  minTime: number;
  maxTime: number;
  standardDeviation: number;
}

/**
 * Run a benchmark on a function
 */
export async function benchmark(
  name: string,
  fn: () => Promise<void> | void,
  iterations: number = 100
): Promise<BenchmarkResult> {
  const times: number[] = [];

  // Warmup
  for (let i = 0; i < Math.min(10, iterations); i++) {
    await fn();
  }

  // Actual benchmark
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn();
    const end = performance.now();
    times.push(end - start);
  }

  const totalTime = times.reduce((a, b) => a + b, 0);
  const averageTime = totalTime / iterations;
  const sortedTimes = [...times].sort((a, b) => a - b);

  // Calculate standard deviation
  const squaredDiffs = times.map(t => Math.pow(t - averageTime, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / iterations;
  const standardDeviation = Math.sqrt(avgSquaredDiff);

  return {
    name,
    iterations,
    totalTime,
    averageTime,
    opsPerSecond: 1000 / averageTime,
    minTime: sortedTimes[0],
    maxTime: sortedTimes[sortedTimes.length - 1],
    standardDeviation
  };
}

/**
 * Format benchmark results for display
 */
export function formatBenchmarkResults(results: BenchmarkResult[]): string {
  const lines = [
    '╔══════════════════════════════════════════════════════════════════════╗',
    '║                        BENCHMARK RESULTS                             ║',
    '╠══════════════════════════════════════════════════════════════════════╣'
  ];

  for (const result of results) {
    lines.push(`║ ${result.name.padEnd(68)} ║`);
    lines.push(`║   Iterations: ${result.iterations.toString().padEnd(54)} ║`);
    lines.push(`║   Average: ${result.averageTime.toFixed(2)}ms  |  Ops/sec: ${result.opsPerSecond.toFixed(2).padEnd(30)} ║`);
    lines.push(`║   Min: ${result.minTime.toFixed(2)}ms  |  Max: ${result.maxTime.toFixed(2)}ms  |  StdDev: ${result.standardDeviation.toFixed(2)}ms${' '.repeat(20)} ║`);
    lines.push('╠══════════════════════════════════════════════════════════════════════╣');
  }

  lines.pop(); // Remove last separator
  lines.push('╚══════════════════════════════════════════════════════════════════════╝');

  return lines.join('\n');
}

// ============================================================================
// Memory Profiling
// ============================================================================

export interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
  rss: number;
}

export interface MemoryProfile {
  snapshots: MemorySnapshot[];
  peakHeapUsed: number;
  averageHeapUsed: number;
  heapGrowth: number;
  duration: number;
}

/**
 * Profile memory usage during function execution
 */
export async function profileMemory(
  fn: () => Promise<void>,
  intervalMs: number = 100
): Promise<MemoryProfile> {
  const snapshots: MemorySnapshot[] = [];
  let running = true;

  const captureSnapshot = () => {
    const mem = process.memoryUsage();
    snapshots.push({
      timestamp: Date.now(),
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
      external: mem.external,
      arrayBuffers: mem.arrayBuffers,
      rss: mem.rss
    });
  };

  // Start memory capture
  const interval = setInterval(() => {
    if (running) captureSnapshot();
  }, intervalMs);

  captureSnapshot(); // Initial snapshot
  const startTime = Date.now();

  try {
    await fn();
  } finally {
    running = false;
    clearInterval(interval);
    captureSnapshot(); // Final snapshot
  }

  const duration = Date.now() - startTime;
  const heapUsages = snapshots.map(s => s.heapUsed);

  return {
    snapshots,
    peakHeapUsed: Math.max(...heapUsages),
    averageHeapUsed: heapUsages.reduce((a, b) => a + b, 0) / heapUsages.length,
    heapGrowth: heapUsages[heapUsages.length - 1] - heapUsages[0],
    duration
  };
}

// ============================================================================
// Performance Assertions
// ============================================================================

export class PerformanceAssertions {
  /**
   * Assert that response time is under threshold
   */
  static assertResponseTime(
    results: LoadTestResults,
    maxAverageMs: number,
    maxP95Ms?: number
  ): void {
    if (results.averageResponseTime > maxAverageMs) {
      throw new Error(
        `Average response time ${results.averageResponseTime.toFixed(2)}ms exceeds threshold ${maxAverageMs}ms`
      );
    }

    if (maxP95Ms && results.p95ResponseTime > maxP95Ms) {
      throw new Error(
        `P95 response time ${results.p95ResponseTime.toFixed(2)}ms exceeds threshold ${maxP95Ms}ms`
      );
    }
  }

  /**
   * Assert that error rate is under threshold
   */
  static assertErrorRate(results: LoadTestResults, maxErrorRate: number): void {
    if (results.errorRate > maxErrorRate) {
      throw new Error(
        `Error rate ${(results.errorRate * 100).toFixed(2)}% exceeds threshold ${(maxErrorRate * 100).toFixed(2)}%`
      );
    }
  }

  /**
   * Assert that throughput meets minimum
   */
  static assertThroughput(results: LoadTestResults, minRps: number): void {
    if (results.requestsPerSecond < minRps) {
      throw new Error(
        `Throughput ${results.requestsPerSecond.toFixed(2)} req/s below minimum ${minRps} req/s`
      );
    }
  }

  /**
   * Assert memory usage is under threshold
   */
  static assertMemoryUsage(profile: MemoryProfile, maxHeapMB: number): void {
    const peakHeapMB = profile.peakHeapUsed / (1024 * 1024);
    if (peakHeapMB > maxHeapMB) {
      throw new Error(
        `Peak heap usage ${peakHeapMB.toFixed(2)}MB exceeds threshold ${maxHeapMB}MB`
      );
    }
  }
}

// ============================================================================
// Report Generation
// ============================================================================

export function generateLoadTestReport(results: LoadTestResults): string {
  return `
# Load Test Report

## Summary
- **Total Requests:** ${results.totalRequests}
- **Successful:** ${results.successfulRequests} (${((results.successfulRequests / results.totalRequests) * 100).toFixed(1)}%)
- **Failed:** ${results.failedRequests} (${(results.errorRate * 100).toFixed(1)}%)
- **Duration:** ${(results.totalDuration / 1000).toFixed(2)}s

## Performance Metrics
| Metric | Value |
|--------|-------|
| Requests/sec | ${results.requestsPerSecond.toFixed(2)} |
| Avg Response | ${results.averageResponseTime.toFixed(2)}ms |
| Min Response | ${results.minResponseTime.toFixed(2)}ms |
| Max Response | ${results.maxResponseTime.toFixed(2)}ms |
| P50 Response | ${results.p50ResponseTime.toFixed(2)}ms |
| P90 Response | ${results.p90ResponseTime.toFixed(2)}ms |
| P95 Response | ${results.p95ResponseTime.toFixed(2)}ms |
| P99 Response | ${results.p99ResponseTime.toFixed(2)}ms |

## Errors
${Object.keys(results.errors).length === 0 
  ? 'No errors recorded.'
  : Object.entries(results.errors).map(([error, count]) => `- ${error}: ${count}`).join('\n')}
`;
}

export function generateStressTestReport(results: StressTestResults): string {
  let report = `
# Stress Test Report

## Summary
- **Breaking Point:** ${results.breakingPoint ? `${results.breakingPoint} concurrent users` : 'Not reached'}
- **Optimal Concurrency:** ${results.optimalConcurrency ? `${results.optimalConcurrency} concurrent users` : 'Not determined'}

## Results by Concurrency Level

| Concurrency | Requests/sec | Avg Response | P95 Response | Error Rate |
|-------------|--------------|--------------|--------------|------------|
`;

  for (const step of results.steps) {
    report += `| ${step.concurrency} | ${step.results.requestsPerSecond.toFixed(2)} | ${step.results.averageResponseTime.toFixed(2)}ms | ${step.results.p95ResponseTime.toFixed(2)}ms | ${(step.results.errorRate * 100).toFixed(1)}% |\n`;
  }

  return report;
}
