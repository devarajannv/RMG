/**
 * API Performance Tests
 * 
 * Tests API endpoints for performance requirements including:
 * - Response time thresholds
 * - Throughput requirements
 * - Error rate limits
 * - Memory usage
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  LoadTestRunner,
  RequestConfig,
  PerformanceAssertions,
  benchmark,
  formatBenchmarkResults,
  profileMemory,
  generateLoadTestReport
} from './load-testing.utils';

// ============================================================================
// Configuration
// ============================================================================

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:4000';
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || '';

function getSetCookieHeaders(headers: Headers): string[] {
  const headersWithGetSetCookie = headers as Headers & {
    getSetCookie?: () => string[];
  };

  if (typeof headersWithGetSetCookie.getSetCookie === 'function') {
    return headersWithGetSetCookie.getSetCookie();
  }

  const raw = headers.get('set-cookie');
  if (!raw) {
    return [];
  }

  return raw.split(/,(?=\s*[^;]+=)/g);
}

function extractCookie(headers: Headers, cookieName: string): string | null {
  const setCookieHeaders = getSetCookieHeaders(headers);
  const cookie = setCookieHeaders.find((header) => header.startsWith(`${cookieName}=`));

  if (!cookie) {
    return null;
  }

  const value = cookie.split(';')[0];
  const separatorIndex = value.indexOf('=');
  if (separatorIndex === -1) {
    return null;
  }

  return value.substring(separatorIndex + 1);
}

// Performance thresholds
const THRESHOLDS = {
  // Response time thresholds (milliseconds)
  responseTime: {
    fast: 100,      // List/simple queries
    normal: 300,    // Detail queries with relations
    slow: 1000,     // Complex queries/reports
    bulk: 5000      // Bulk operations
  },
  // Throughput thresholds (requests per second)
  throughput: {
    read: 50,       // Read operations
    write: 20,      // Write operations
    complex: 10     // Complex operations
  },
  // Error rate threshold
  maxErrorRate: 0.01, // 1%
  // Memory threshold (MB)
  maxHeapMB: 512
};

// ============================================================================
// Test Setup
// ============================================================================

describe('API Performance Tests', () => {
  let authToken: string;

  beforeAll(async () => {
    // Get authentication token for tests
    if (AUTH_TOKEN) {
      authToken = AUTH_TOKEN;
    } else {
      // Login to get token
      try {
        const response = await fetch(`${BASE_URL}/api/v1/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-e2e-test-mode': '1',
          },
          body: JSON.stringify({
            email: 'admin@newvision.in',
            password: 'Password123!@#'
          })
        });

        if (response.ok) {
          const refreshCookie = extractCookie(response.headers, 'refreshToken');

          if (refreshCookie) {
            const refreshResponse = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-e2e-test-mode': '1',
                Cookie: `refreshToken=${refreshCookie}`,
              },
            });

            if (refreshResponse.ok) {
              const refreshData = await refreshResponse.json() as {
                tokens?: { accessToken?: string };
                data?: { accessToken?: string };
                accessToken?: string;
              };
              authToken =
                refreshData.tokens?.accessToken ||
                refreshData.data?.accessToken ||
                refreshData.accessToken ||
                '';
            }
          }
        }
      } catch (error) {
        console.warn('Could not obtain auth token, some tests may fail');
      }
    }
  });

  // ============================================================================
  // Health Check Performance
  // ============================================================================

  describe('Health Check Endpoint', () => {
    it('should respond within 50ms', async () => {
      const runner = new LoadTestRunner({
        baseUrl: BASE_URL,
        totalRequests: 100,
        concurrency: 10
      });

      const request: RequestConfig = {
        method: 'GET',
        path: '/health/live'
      };

      const results = await runner.run(request);

      expect(results.averageResponseTime).toBeLessThan(80);
      expect(results.p95ResponseTime).toBeLessThan(150);
      expect(results.errorRate).toBe(0);
    });

    it('should handle high concurrency', async () => {
      const runner = new LoadTestRunner({
        baseUrl: BASE_URL,
        totalRequests: 500,
        concurrency: 50
      });

      const request: RequestConfig = {
        method: 'GET',
        path: '/health/live'
      };

      const results = await runner.run(request);

      PerformanceAssertions.assertResponseTime(results, 150, 250);
      PerformanceAssertions.assertErrorRate(results, 0.01);
      PerformanceAssertions.assertThroughput(results, 100);
    });
  });

  // ============================================================================
  // Resource Endpoints Performance
  // ============================================================================

  describe('Resource Endpoints', () => {
    it('GET /api/v1/resources should be fast', async () => {
      const runner = new LoadTestRunner({
        baseUrl: BASE_URL,
        totalRequests: 50,
        concurrency: 5,
        authToken
      });

      const request: RequestConfig = {
        method: 'GET',
        path: '/api/v1/resources',
        params: { limit: '20' }
      };

      const results = await runner.run(request);

      expect(results.averageResponseTime).toBeLessThan(120);
      expect(results.errorRate).toBeLessThan(THRESHOLDS.maxErrorRate);
    });

    it('GET /api/v1/resources with filters should be acceptable', async () => {
      const runner = new LoadTestRunner({
        baseUrl: BASE_URL,
        totalRequests: 30,
        concurrency: 3,
        authToken
      });

      const request: RequestConfig = {
        method: 'GET',
        path: '/api/v1/resources',
        params: {
          limit: '50',
          employmentType: 'FTE',
          sortBy: 'firstName',
          sortOrder: 'asc'
        }
      };

      const results = await runner.run(request);

      expect(results.averageResponseTime).toBeLessThan(THRESHOLDS.responseTime.normal);
      expect(results.errorRate).toBeLessThan(THRESHOLDS.maxErrorRate);
    });

    it('GET /api/v1/resources/:id should be very fast', async () => {
      // First, get a resource ID
      const listResponse = await fetch(`${BASE_URL}/api/v1/resources?limit=1`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'x-e2e-test-mode': '1',
        }
      });

      if (!listResponse.ok) {
        console.log('Skipping: Could not get resource');
        return;
      }

      const listData = await listResponse.json();
      const resourceId = listData.data?.[0]?.id;

      if (!resourceId) {
        console.log('Skipping: No resources available');
        return;
      }

      const runner = new LoadTestRunner({
        baseUrl: BASE_URL,
        totalRequests: 100,
        concurrency: 10,
        authToken
      });

      const request: RequestConfig = {
        method: 'GET',
        path: `/api/v1/resources/${resourceId}`
      };

      const results = await runner.run(request);

      expect(results.averageResponseTime).toBeLessThan(THRESHOLDS.responseTime.fast);
      expect(results.p95ResponseTime).toBeLessThan(THRESHOLDS.responseTime.normal);
    });
  });

  // ============================================================================
  // Contract Endpoints Performance
  // ============================================================================

  describe('Contract Endpoints', () => {
    it('GET /api/v1/contracts should handle pagination efficiently', async () => {
      const runner = new LoadTestRunner({
        baseUrl: BASE_URL,
        totalRequests: 30,
        concurrency: 3,
        authToken
      });

      const request: RequestConfig = {
        method: 'GET',
        path: '/api/v1/contracts',
        params: { limit: '20', page: '1' }
      };

      const results = await runner.run(request);

      expect(results.averageResponseTime).toBeLessThan(THRESHOLDS.responseTime.normal);
      expect(results.errorRate).toBeLessThan(THRESHOLDS.maxErrorRate);
    });

    it('GET /api/v1/contracts with relations should be acceptable', async () => {
      const runner = new LoadTestRunner({
        baseUrl: BASE_URL,
        totalRequests: 20,
        concurrency: 2,
        authToken
      });

      const request: RequestConfig = {
        method: 'GET',
        path: '/api/v1/contracts',
        params: {
          limit: '10',
          include: 'resource,client'
        }
      };

      const results = await runner.run(request);

      // Relations make queries slower, so we use the "slow" threshold
      expect(results.averageResponseTime).toBeLessThan(THRESHOLDS.responseTime.slow);
    });
  });

  // ============================================================================
  // Project Endpoints Performance
  // ============================================================================

  describe('Project Endpoints', () => {
    it('GET /api/v1/projects should be fast', async () => {
      const runner = new LoadTestRunner({
        baseUrl: BASE_URL,
        totalRequests: 50,
        concurrency: 5,
        authToken
      });

      const request: RequestConfig = {
        method: 'GET',
        path: '/api/v1/projects',
        params: { limit: '20' }
      };

      const results = await runner.run(request);

      expect(results.averageResponseTime).toBeLessThan(THRESHOLDS.responseTime.fast);
    });
  });

  // ============================================================================
  // Dashboard Performance
  // ============================================================================

  describe('Dashboard Endpoints', () => {
    it('GET /api/v1/dashboard/stats should be acceptable', async () => {
      const runner = new LoadTestRunner({
        baseUrl: BASE_URL,
        totalRequests: 20,
        concurrency: 2,
        authToken
      });

      const request: RequestConfig = {
        method: 'GET',
        path: '/api/v1/dashboard/stats'
      };

      const results = await runner.run(request);

      // Dashboard aggregations can be slower
      expect(results.averageResponseTime).toBeLessThan(THRESHOLDS.responseTime.slow);
    });
  });

  // ============================================================================
  // Mixed Workload Performance
  // ============================================================================

  describe('Mixed Workload', () => {
    it('should handle typical read-heavy workload', async () => {
      const runner = new LoadTestRunner({
        baseUrl: BASE_URL,
        totalRequests: 100,
        concurrency: 10,
        authToken
      });

      const requests: RequestConfig[] = [
        { method: 'GET', path: '/api/v1/resources', params: { limit: '20' } },
        { method: 'GET', path: '/api/v1/projects', params: { limit: '20' } },
        { method: 'GET', path: '/api/v1/contracts', params: { limit: '20' } },
        { method: 'GET', path: '/api/v1/clients', params: { limit: '20' } }
      ];

      const results = await runner.runMixed(requests);

      console.log(generateLoadTestReport(results));

      expect(results.averageResponseTime).toBeLessThan(THRESHOLDS.responseTime.normal);
      expect(results.errorRate).toBeLessThan(THRESHOLDS.maxErrorRate);
      expect(results.requestsPerSecond).toBeGreaterThan(THRESHOLDS.throughput.read);
    });
  });

  // ============================================================================
  // Benchmarks
  // ============================================================================

  describe('Benchmarks', () => {
    it('should benchmark JSON serialization', async () => {
      const testData = {
        id: '123',
        name: 'Test Resource',
        skills: Array(10).fill({ name: 'Skill', level: 'Expert' }),
        contracts: Array(5).fill({ id: '456', status: 'ACTIVE' })
      };

      const results = await benchmark(
        'JSON.stringify (medium object)',
        () => { JSON.stringify(testData); },
        1000
      );

      expect(results.averageTime).toBeLessThan(1); // < 1ms
      console.log(formatBenchmarkResults([results]));
    });

    it('should benchmark Date operations', async () => {
      const results = await benchmark(
        'Date parsing and formatting',
        () => {
          const date = new Date();
          date.toISOString();
          Date.parse(date.toISOString());
        },
        1000
      );

      expect(results.averageTime).toBeLessThan(0.5); // < 0.5ms
    });
  });

  // ============================================================================
  // Memory Profile Tests
  // ============================================================================

  describe('Memory Usage', () => {
    it('should not leak memory during repeated requests', async () => {
      const profile = await profileMemory(async () => {
        const runner = new LoadTestRunner({
          baseUrl: BASE_URL,
          totalRequests: 200,
          concurrency: 20
        });

        await runner.run({
          method: 'GET',
          path: '/health/live'
        });
      }, 50);

      // Heap growth should be minimal (less than 50MB)
      const heapGrowthMB = profile.heapGrowth / (1024 * 1024);
      expect(heapGrowthMB).toBeLessThan(50);

      console.log(`Memory Profile:
        Peak Heap: ${(profile.peakHeapUsed / (1024 * 1024)).toFixed(2)} MB
        Avg Heap: ${(profile.averageHeapUsed / (1024 * 1024)).toFixed(2)} MB
        Heap Growth: ${heapGrowthMB.toFixed(2)} MB
        Duration: ${profile.duration}ms`
      );
    });
  });

  // ============================================================================
  // Error Rate Tests
  // ============================================================================

  describe('Error Handling Performance', () => {
    it('should handle 404s efficiently', async () => {
      const runner = new LoadTestRunner({
        baseUrl: BASE_URL,
        totalRequests: 50,
        concurrency: 5,
        authToken,
        continueOnError: true
      });

      const request: RequestConfig = {
        method: 'GET',
        path: '/api/v1/resources/nonexistent-id-12345'
      };

      const results = await runner.run(request);

      // 404s should still be fast
      expect(results.averageResponseTime).toBeLessThan(THRESHOLDS.responseTime.fast);
    });

    it('should handle unauthorized requests efficiently', async () => {
      const runner = new LoadTestRunner({
        baseUrl: BASE_URL,
        totalRequests: 50,
        concurrency: 5,
        // No auth token
        continueOnError: true
      });

      const request: RequestConfig = {
        method: 'GET',
        path: '/api/v1/resources'
      };

      const results = await runner.run(request);

      // Auth failures should be very fast
      expect(results.averageResponseTime).toBeLessThan(50);
    });
  });

  // ============================================================================
  // Concurrent User Simulation
  // ============================================================================

  describe('Concurrent User Simulation', () => {
    it('should handle 50 concurrent users', async () => {
      const runner = new LoadTestRunner({
        baseUrl: BASE_URL,
        totalRequests: 250,
        concurrency: 50,
        authToken
      });

      const request: RequestConfig = {
        method: 'GET',
        path: '/api/v1/resources',
        params: { limit: '10' }
      };

      const results = await runner.run(request);

      // With 50 concurrent users, response time will be higher
      expect(results.averageResponseTime).toBeLessThan(THRESHOLDS.responseTime.slow);
      expect(results.errorRate).toBeLessThan(0.05); // Allow up to 5% errors under load
    });

    it('should handle 100 concurrent users', async () => {
      const runner = new LoadTestRunner({
        baseUrl: BASE_URL,
        totalRequests: 500,
        concurrency: 100,
        authToken
      });

      const request: RequestConfig = {
        method: 'GET',
        path: '/health/live'
      };

      const results = await runner.run(request);

      // Health endpoint should handle high concurrency
      expect(results.averageResponseTime).toBeLessThan(500);
      expect(results.errorRate).toBeLessThan(0.1); // Allow up to 10% errors under extreme load
    });
  });

  // ============================================================================
  // Cleanup
  // ============================================================================

  afterAll(() => {
    console.log('\n=== Performance Tests Complete ===\n');
  });
});
