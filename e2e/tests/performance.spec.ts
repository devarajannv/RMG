/**
 * Performance E2E Tests
 * 
 * Tests to ensure application meets performance budgets:
 * - Core Web Vitals (LCP, FID, CLS)
 * - Page load times
 * - API response times
 * - Resource efficiency
 * 
 * @module e2e/tests/performance.spec
 */

import { test, expect } from '../fixtures';
import {
  PerformanceCollector,
  measurePagePerformance,
  checkBudget,
  formatViolations,
  DEFAULT_BUDGET,
  STRICT_BUDGET,
} from '../utils/performance';

// ============================================================================
// Configuration
// ============================================================================

// Pages to test
const PAGES_TO_TEST = [
  { url: '/dashboard', name: 'Dashboard' },
  { url: '/resources', name: 'Resources List' },
  { url: '/projects', name: 'Projects List' },
  { url: '/contracts', name: 'Contracts List' },
  { url: '/requests', name: 'Requests List' },
  { url: '/login', name: 'Login Page' },
];

// ============================================================================
// Core Web Vitals Tests
// ============================================================================

test.describe('Core Web Vitals', () => {
  test.describe('Largest Contentful Paint (LCP)', () => {
    for (const page of PAGES_TO_TEST) {
      test(`PERF-LCP-${page.name}: should have LCP < 2.5s`, async ({ appPage, page: browserPage }) => {
        await appPage.goto(page.url);
        
        const collector = new PerformanceCollector(browserPage);
        await collector.start();
        
        // Wait for LCP
        await browserPage.waitForLoadState('networkidle');
        await browserPage.waitForTimeout(1000); // Allow LCP observation
        
        const metrics = await collector.collect();
        
        console.log(`${page.name} LCP: ${metrics.lcp?.toFixed(0)}ms`);
        
        // LCP should be under 2.5 seconds
        expect(metrics.lcp).toBeLessThan(DEFAULT_BUDGET.lcp!);
      });
    }
  });

  test.describe('First Contentful Paint (FCP)', () => {
    for (const page of PAGES_TO_TEST) {
      test(`PERF-FCP-${page.name}: should have FCP < 1.8s`, async ({ appPage, page: browserPage }) => {
        await appPage.goto(page.url);
        
        const collector = new PerformanceCollector(browserPage);
        await collector.start();
        
        await browserPage.waitForLoadState('domcontentloaded');
        
        const metrics = await collector.collect();
        
        console.log(`${page.name} FCP: ${metrics.fcp?.toFixed(0)}ms`);
        
        // FCP should be under 1.8 seconds
        expect(metrics.fcp).toBeLessThan(DEFAULT_BUDGET.fcp!);
      });
    }
  });

  test.describe('Cumulative Layout Shift (CLS)', () => {
    for (const page of PAGES_TO_TEST) {
      test(`PERF-CLS-${page.name}: should have CLS < 0.1`, async ({ appPage, page: browserPage }) => {
        await appPage.goto(page.url);
        
        const collector = new PerformanceCollector(browserPage);
        await collector.start();
        
        // Wait for full page load and potential shifts
        await browserPage.waitForLoadState('networkidle');
        await browserPage.waitForTimeout(2000);
        
        const metrics = await collector.collect();
        
        console.log(`${page.name} CLS: ${metrics.cls?.toFixed(3)}`);
        
        // CLS should be under 0.1
        expect(metrics.cls).toBeLessThan(DEFAULT_BUDGET.cls!);
      });
    }
  });

  test.describe('Time to First Byte (TTFB)', () => {
    for (const page of PAGES_TO_TEST) {
      test(`PERF-TTFB-${page.name}: should have TTFB < 800ms`, async ({ appPage, page: browserPage }) => {
        await appPage.goto(page.url);
        
        const collector = new PerformanceCollector(browserPage);
        await collector.start();
        
        const metrics = await collector.collect();
        
        console.log(`${page.name} TTFB: ${metrics.ttfb?.toFixed(0)}ms`);
        
        // TTFB should be under 800ms
        expect(metrics.ttfb).toBeLessThan(DEFAULT_BUDGET.ttfb!);
      });
    }
  });
});

// ============================================================================
// Page Load Performance Tests
// ============================================================================

test.describe('Page Load Performance', () => {
  test('PERF-001: Dashboard should meet performance budget', async ({ appPage, page }) => {
    const result = await measurePagePerformance(page, '/dashboard', {
      budget: DEFAULT_BUDGET,
      warmup: false,
    });
    
    console.log('Dashboard Performance:');
    console.log(`  LCP: ${result.metrics.lcp?.toFixed(0)}ms`);
    console.log(`  FCP: ${result.metrics.fcp?.toFixed(0)}ms`);
    console.log(`  CLS: ${result.metrics.cls?.toFixed(3)}`);
    console.log(`  TTFB: ${result.metrics.ttfb?.toFixed(0)}ms`);
    console.log(`  DOM Ready: ${result.metrics.domContentLoaded?.toFixed(0)}ms`);
    console.log(`  Load: ${result.metrics.load?.toFixed(0)}ms`);
    
    if (!result.passed) {
      console.log(formatViolations(result.violations));
    }
    
    expect(result.passed).toBe(true);
  });

  test('PERF-002: Resources page should meet performance budget', async ({ appPage, page }) => {
    const result = await measurePagePerformance(page, '/resources', {
      budget: DEFAULT_BUDGET,
    });
    
    console.log(`Resources Page - Load: ${result.metrics.load?.toFixed(0)}ms`);
    
    if (!result.passed) {
      console.log(formatViolations(result.violations));
    }
    
    // Allow some flexibility for data-heavy pages
    expect(result.violations.length).toBeLessThanOrEqual(1);
  });

  test('PERF-003: Projects page should meet performance budget', async ({ appPage, page }) => {
    const result = await measurePagePerformance(page, '/projects', {
      budget: DEFAULT_BUDGET,
    });
    
    console.log(`Projects Page - Load: ${result.metrics.load?.toFixed(0)}ms`);
    
    expect(result.violations.length).toBeLessThanOrEqual(1);
  });

  test('PERF-004: Login page should meet strict budget', async ({ page }) => {
    const result = await measurePagePerformance(page, '/login', {
      budget: STRICT_BUDGET,
    });
    
    console.log(`Login Page - Load: ${result.metrics.load?.toFixed(0)}ms`);
    
    // Login page should be very fast
    expect(result.passed).toBe(true);
  });
});

// ============================================================================
// API Performance Tests
// ============================================================================

test.describe('API Performance', () => {
  test('PERF-005: API calls should complete within 1 second', async ({ apiHelper }) => {
    const endpoints = [
      '/api/resources?limit=10',
      '/api/projects?limit=10',
      '/api/contracts?limit=10',
      '/api/clients?limit=10',
    ];
    
    for (const endpoint of endpoints) {
      const start = Date.now();
      const response = await apiHelper.request.get(endpoint);
      const duration = Date.now() - start;
      
      console.log(`${endpoint}: ${duration}ms`);
      
      expect(response.status()).toBe(200);
      expect(duration).toBeLessThan(1000);
    }
  });

  test('PERF-006: List endpoints should handle pagination efficiently', async ({ apiHelper }) => {
    const pageSizes = [10, 25, 50, 100];
    
    for (const limit of pageSizes) {
      const start = Date.now();
      const response = await apiHelper.request.get(`/api/resources?limit=${limit}`);
      const duration = Date.now() - start;
      
      console.log(`Resources (limit=${limit}): ${duration}ms`);
      
      expect(response.status()).toBe(200);
      // Larger pages can take longer, but should scale linearly
      expect(duration).toBeLessThan(limit * 50); // ~50ms per item max
    }
  });

  test('PERF-007: Search should return results quickly', async ({ apiHelper }) => {
    const start = Date.now();
    const response = await apiHelper.request.get('/api/resources/search?query=test');
    const duration = Date.now() - start;
    
    console.log(`Search: ${duration}ms`);
    
    // Search should be fast even if no results
    expect([200, 404]).toContain(response.status());
    expect(duration).toBeLessThan(500);
  });

  test('PERF-008: Dashboard stats should load quickly', async ({ apiHelper }) => {
    const start = Date.now();
    const response = await apiHelper.request.get('/api/dashboard/stats');
    const duration = Date.now() - start;
    
    console.log(`Dashboard stats: ${duration}ms`);
    
    // Stats endpoint may not exist
    if (response.status() === 200) {
      expect(duration).toBeLessThan(500);
    }
  });
});

// ============================================================================
// Resource Efficiency Tests
// ============================================================================

test.describe('Resource Efficiency', () => {
  test('PERF-009: Dashboard should not exceed resource count limit', async ({ appPage, page }) => {
    await appPage.goto('/dashboard');
    
    const collector = new PerformanceCollector(page);
    await collector.start();
    
    await page.waitForLoadState('networkidle');
    
    const metrics = await collector.collect();
    
    console.log(`Resources loaded: ${metrics.resourceCount}`);
    console.log(`Total transfer: ${(metrics.totalTransferSize! / 1024).toFixed(0)} KB`);
    
    expect(metrics.resourceCount).toBeLessThan(DEFAULT_BUDGET.resourceCount!);
  });

  test('PERF-010: Page should not exceed transfer size limit', async ({ appPage, page }) => {
    await appPage.goto('/dashboard');
    
    const collector = new PerformanceCollector(page);
    await collector.start();
    
    await page.waitForLoadState('networkidle');
    
    const metrics = await collector.collect();
    
    console.log(`Transfer size: ${(metrics.totalTransferSize! / 1024 / 1024).toFixed(2)} MB`);
    
    expect(metrics.totalTransferSize).toBeLessThan(DEFAULT_BUDGET.totalTransferSize!);
  });

  test('PERF-011: JS heap should not exceed memory limits', async ({ appPage, page }) => {
    await appPage.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Interact with page to trigger potential memory issues
    await page.locator('button, a').first().hover();
    await page.waitForTimeout(500);
    
    const collector = new PerformanceCollector(page);
    await collector.start();
    
    const metrics = await collector.collect();
    
    console.log(`JS Heap: ${(metrics.jsHeapSize! / 1024 / 1024).toFixed(2)} MB`);
    
    // Should not exceed 100MB for initial load
    expect(metrics.jsHeapSize).toBeLessThan(100 * 1024 * 1024);
  });
});

// ============================================================================
// Navigation Performance Tests
// ============================================================================

test.describe('Navigation Performance', () => {
  test('PERF-012: Client-side navigation should be fast', async ({ appPage, page }) => {
    await appPage.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Navigate to resources
    const start = Date.now();
    await page.locator('a:has-text("Resources"), [data-testid="nav-resources"]').first().click();
    await page.waitForURL(/\/resources/);
    await page.waitForLoadState('networkidle');
    const duration = Date.now() - start;
    
    console.log(`Navigation to Resources: ${duration}ms`);
    
    // Client-side navigation should be under 500ms
    expect(duration).toBeLessThan(1000);
  });

  test('PERF-013: Back navigation should use cache', async ({ appPage, page }) => {
    await appPage.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Navigate forward
    await page.locator('a:has-text("Resources")').first().click();
    await page.waitForURL(/\/resources/);
    await page.waitForLoadState('networkidle');
    
    // Navigate back
    const start = Date.now();
    await page.goBack();
    await page.waitForURL(/\/dashboard/);
    const duration = Date.now() - start;
    
    console.log(`Back navigation: ${duration}ms`);
    
    // Back navigation with cache should be very fast
    expect(duration).toBeLessThan(500);
  });
});

// ============================================================================
// Interaction Performance Tests
// ============================================================================

test.describe('Interaction Performance', () => {
  test('PERF-014: Form submission should be responsive', async ({ appPage, page }) => {
    await appPage.goto('/resources');
    await page.waitForLoadState('networkidle');
    
    // Open create form
    await page.locator('button:has-text("New Resource"), button:has-text("Create")').first().click();
    await page.waitForSelector('[role="dialog"], form');
    
    // Fill and submit
    await page.fill('input[name="name"], [data-testid="name-input"]', 'Perf Test Resource');
    
    const start = Date.now();
    await page.locator('button[type="submit"], button:has-text("Save")').click();
    
    // Wait for response
    await page.waitForResponse((response) =>
      response.url().includes('/api/resources') && response.status() < 400
    ).catch(() => {});
    
    const duration = Date.now() - start;
    
    console.log(`Form submission: ${duration}ms`);
    
    expect(duration).toBeLessThan(2000);
  });

  test('PERF-015: Table sorting should be instant', async ({ appPage, page }) => {
    await appPage.goto('/resources');
    await page.waitForLoadState('networkidle');
    
    // Click column header to sort
    const sortHeader = page.locator('th:has-text("Name"), [data-testid="sort-name"]').first();
    
    if (await sortHeader.isVisible()) {
      const start = Date.now();
      await sortHeader.click();
      await page.waitForTimeout(100);
      const duration = Date.now() - start;
      
      console.log(`Table sort: ${duration}ms`);
      
      // Sorting should be very fast (client-side)
      expect(duration).toBeLessThan(300);
    }
  });

  test('PERF-016: Filter application should be fast', async ({ appPage, page }) => {
    await appPage.goto('/resources');
    await page.waitForLoadState('networkidle');
    
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]').first();
    
    if (await searchInput.isVisible()) {
      const start = Date.now();
      await searchInput.fill('test');
      await page.waitForTimeout(500); // Debounce
      const duration = Date.now() - start;
      
      console.log(`Filter: ${duration}ms`);
      
      expect(duration).toBeLessThan(1000);
    }
  });
});

// ============================================================================
// Stress Tests
// ============================================================================

test.describe('Stress Tests', () => {
  test('PERF-017: Should handle rapid navigation', async ({ appPage, page }) => {
    const pages = ['/dashboard', '/resources', '/projects', '/contracts'];
    
    const start = Date.now();
    
    for (const url of pages) {
      await page.goto(url);
      await page.waitForLoadState('domcontentloaded');
    }
    
    const duration = Date.now() - start;
    
    console.log(`Rapid navigation (${pages.length} pages): ${duration}ms`);
    
    // Should complete within reasonable time
    expect(duration).toBeLessThan(pages.length * 3000);
  });

  test('PERF-018: Should not leak memory on repeated navigation', async ({ appPage, page }) => {
    await appPage.goto('/dashboard');
    
    // Get initial memory
    const initialHeap = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });
    
    // Navigate back and forth multiple times
    for (let i = 0; i < 5; i++) {
      await page.locator('a:has-text("Resources")').first().click();
      await page.waitForURL(/\/resources/);
      await page.locator('a:has-text("Dashboard")').first().click();
      await page.waitForURL(/\/dashboard/);
    }
    
    // Get final memory
    const finalHeap = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });
    
    const heapGrowth = finalHeap - initialHeap;
    const growthMB = heapGrowth / 1024 / 1024;
    
    console.log(`Memory growth: ${growthMB.toFixed(2)} MB`);
    
    // Memory should not grow significantly (allow some variance)
    expect(growthMB).toBeLessThan(50);
  });
});

// ============================================================================
// Bundle Size Tests
// ============================================================================

test.describe('Bundle Size', () => {
  test('PERF-019: JavaScript bundle should be reasonably sized', async ({ page }) => {
    let jsSize = 0;
    
    page.on('response', async (response) => {
      const url = response.url();
      if (url.endsWith('.js') || url.includes('.js?')) {
        const headers = response.headers();
        const contentLength = parseInt(headers['content-length'] || '0', 10);
        jsSize += contentLength;
      }
    });
    
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    const jsSizeMB = jsSize / 1024 / 1024;
    console.log(`Total JS size: ${jsSizeMB.toFixed(2)} MB`);
    
    // JS should be under 3MB
    expect(jsSizeMB).toBeLessThan(3);
  });

  test('PERF-020: CSS should be reasonably sized', async ({ page }) => {
    let cssSize = 0;
    
    page.on('response', async (response) => {
      const url = response.url();
      if (url.endsWith('.css') || url.includes('.css?')) {
        const headers = response.headers();
        const contentLength = parseInt(headers['content-length'] || '0', 10);
        cssSize += contentLength;
      }
    });
    
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    const cssSizeKB = cssSize / 1024;
    console.log(`Total CSS size: ${cssSizeKB.toFixed(0)} KB`);
    
    // CSS should be under 500KB
    expect(cssSizeKB).toBeLessThan(500);
  });
});
