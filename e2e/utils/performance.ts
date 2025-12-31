/**
 * Performance Testing Utilities
 * 
 * Provides performance metrics collection, Web Vitals measurement,
 * and performance budget enforcement for E2E tests.
 * 
 * @module e2e/utils/performance
 */

import { Page, BrowserContext, TestInfo } from '@playwright/test';

// ============================================================================
// Types
// ============================================================================

export interface PerformanceMetrics {
  // Core Web Vitals
  lcp?: number;  // Largest Contentful Paint (ms)
  fid?: number;  // First Input Delay (ms)
  cls?: number;  // Cumulative Layout Shift
  fcp?: number;  // First Contentful Paint (ms)
  ttfb?: number; // Time to First Byte (ms)
  inp?: number;  // Interaction to Next Paint (ms)
  
  // Additional metrics
  domContentLoaded?: number;
  load?: number;
  domInteractive?: number;
  firstPaint?: number;
  
  // Custom metrics
  resourceCount?: number;
  jsHeapSize?: number;
  totalTransferSize?: number;
  
  // API metrics
  apiCalls?: number;
  slowestApiCall?: number;
  avgApiLatency?: number;
}

export interface PerformanceBudget {
  lcp?: number;
  fid?: number;
  cls?: number;
  fcp?: number;
  ttfb?: number;
  domContentLoaded?: number;
  load?: number;
  resourceCount?: number;
  totalTransferSize?: number;
}

export interface ApiCallMetrics {
  url: string;
  method: string;
  duration: number;
  status: number;
  size: number;
}

// ============================================================================
// Default Budgets
// ============================================================================

export const DEFAULT_BUDGET: PerformanceBudget = {
  lcp: 2500,           // 2.5s (Good)
  fid: 100,            // 100ms (Good)
  cls: 0.1,            // 0.1 (Good)
  fcp: 1800,           // 1.8s (Good)
  ttfb: 800,           // 800ms (Good)
  domContentLoaded: 3000, // 3s
  load: 5000,          // 5s
  resourceCount: 100,  // Max 100 resources
  totalTransferSize: 5 * 1024 * 1024, // 5MB
};

export const STRICT_BUDGET: PerformanceBudget = {
  lcp: 1500,           // 1.5s
  fid: 50,             // 50ms
  cls: 0.05,           // 0.05
  fcp: 1000,           // 1s
  ttfb: 400,           // 400ms
  domContentLoaded: 2000, // 2s
  load: 3000,          // 3s
  resourceCount: 50,   // Max 50 resources
  totalTransferSize: 2 * 1024 * 1024, // 2MB
};

// ============================================================================
// Performance Collector
// ============================================================================

export class PerformanceCollector {
  private page: Page;
  private apiCalls: ApiCallMetrics[] = [];
  
  constructor(page: Page) {
    this.page = page;
  }
  
  /**
   * Start collecting performance metrics
   */
  async start(): Promise<void> {
    // Track API calls
    this.page.on('request', (request) => {
      if (request.url().includes('/api/')) {
        (request as any).__startTime = Date.now();
      }
    });
    
    this.page.on('response', (response) => {
      const request = response.request();
      if (request.url().includes('/api/')) {
        const startTime = (request as any).__startTime || Date.now();
        const duration = Date.now() - startTime;
        
        this.apiCalls.push({
          url: request.url(),
          method: request.method(),
          duration,
          status: response.status(),
          size: 0, // Will be updated
        });
      }
    });
  }
  
  /**
   * Collect all performance metrics
   */
  async collect(): Promise<PerformanceMetrics> {
    // Wait for page to be stable
    await this.page.waitForLoadState('networkidle').catch(() => {});
    
    // Get performance timing
    const timing = await this.page.evaluate(() => {
      const perf = window.performance;
      const timing = perf.timing;
      const navStart = timing.navigationStart;
      
      return {
        domContentLoaded: timing.domContentLoadedEventEnd - navStart,
        load: timing.loadEventEnd - navStart,
        domInteractive: timing.domInteractive - navStart,
        ttfb: timing.responseStart - navStart,
      };
    }).catch(() => ({}));
    
    // Get paint timing
    const paintTiming = await this.page.evaluate(() => {
      const entries = performance.getEntriesByType('paint');
      const result: Record<string, number> = {};
      
      entries.forEach((entry) => {
        if (entry.name === 'first-paint') {
          result.firstPaint = entry.startTime;
        } else if (entry.name === 'first-contentful-paint') {
          result.fcp = entry.startTime;
        }
      });
      
      return result;
    }).catch(() => ({}));
    
    // Get LCP
    const lcp = await this.page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let lcpValue = 0;
        
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          lcpValue = lastEntry.startTime;
        });
        
        observer.observe({ type: 'largest-contentful-paint', buffered: true });
        
        // Resolve after short delay
        setTimeout(() => {
          observer.disconnect();
          resolve(lcpValue);
        }, 100);
      });
    }).catch(() => 0);
    
    // Get CLS
    const cls = await this.page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let clsValue = 0;
        
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }
        });
        
        observer.observe({ type: 'layout-shift', buffered: true });
        
        setTimeout(() => {
          observer.disconnect();
          resolve(clsValue);
        }, 100);
      });
    }).catch(() => 0);
    
    // Get resource count and sizes
    const resourceMetrics = await this.page.evaluate(() => {
      const resources = performance.getEntriesByType('resource');
      let totalSize = 0;
      
      resources.forEach((entry: any) => {
        totalSize += entry.transferSize || 0;
      });
      
      return {
        resourceCount: resources.length,
        totalTransferSize: totalSize,
      };
    }).catch(() => ({ resourceCount: 0, totalTransferSize: 0 }));
    
    // Get JS heap size
    const jsHeapSize = await this.page.evaluate(() => {
      const memory = (performance as any).memory;
      return memory ? memory.usedJSHeapSize : 0;
    }).catch(() => 0);
    
    // Calculate API metrics
    const apiMetrics = this.calculateApiMetrics();
    
    return {
      ...timing,
      ...paintTiming,
      lcp,
      cls,
      ...resourceMetrics,
      jsHeapSize,
      ...apiMetrics,
    };
  }
  
  /**
   * Calculate API call metrics
   */
  private calculateApiMetrics(): Partial<PerformanceMetrics> {
    if (this.apiCalls.length === 0) {
      return {};
    }
    
    const durations = this.apiCalls.map((c) => c.duration);
    const slowest = Math.max(...durations);
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    
    return {
      apiCalls: this.apiCalls.length,
      slowestApiCall: slowest,
      avgApiLatency: avg,
    };
  }
  
  /**
   * Get detailed API call report
   */
  getApiCallDetails(): ApiCallMetrics[] {
    return [...this.apiCalls].sort((a, b) => b.duration - a.duration);
  }
  
  /**
   * Reset collected metrics
   */
  reset(): void {
    this.apiCalls = [];
  }
}

// ============================================================================
// Budget Enforcement
// ============================================================================

export interface BudgetViolation {
  metric: string;
  actual: number;
  budget: number;
  difference: number;
  percentOver: number;
}

/**
 * Check metrics against performance budget
 */
export function checkBudget(
  metrics: PerformanceMetrics,
  budget: PerformanceBudget = DEFAULT_BUDGET
): BudgetViolation[] {
  const violations: BudgetViolation[] = [];
  
  const checks: Array<{ key: keyof PerformanceMetrics; budgetKey: keyof PerformanceBudget }> = [
    { key: 'lcp', budgetKey: 'lcp' },
    { key: 'fid', budgetKey: 'fid' },
    { key: 'cls', budgetKey: 'cls' },
    { key: 'fcp', budgetKey: 'fcp' },
    { key: 'ttfb', budgetKey: 'ttfb' },
    { key: 'domContentLoaded', budgetKey: 'domContentLoaded' },
    { key: 'load', budgetKey: 'load' },
    { key: 'resourceCount', budgetKey: 'resourceCount' },
    { key: 'totalTransferSize', budgetKey: 'totalTransferSize' },
  ];
  
  for (const check of checks) {
    const actual = metrics[check.key];
    const budgetValue = budget[check.budgetKey];
    
    if (actual !== undefined && budgetValue !== undefined && actual > budgetValue) {
      violations.push({
        metric: check.key,
        actual,
        budget: budgetValue,
        difference: actual - budgetValue,
        percentOver: ((actual - budgetValue) / budgetValue) * 100,
      });
    }
  }
  
  return violations;
}

/**
 * Format budget violations for reporting
 */
export function formatViolations(violations: BudgetViolation[]): string {
  if (violations.length === 0) {
    return 'All metrics within budget ✓';
  }
  
  const lines = ['Performance budget violations:'];
  
  for (const v of violations) {
    lines.push(
      `  ✗ ${v.metric}: ${formatMetric(v.metric, v.actual)} ` +
      `(budget: ${formatMetric(v.metric, v.budget)}, ` +
      `${v.percentOver.toFixed(1)}% over)`
    );
  }
  
  return lines.join('\n');
}

/**
 * Format metric value for display
 */
function formatMetric(name: string, value: number): string {
  if (name === 'cls') {
    return value.toFixed(3);
  }
  
  if (name === 'totalTransferSize' || name === 'jsHeapSize') {
    return `${(value / 1024 / 1024).toFixed(2)} MB`;
  }
  
  if (name.includes('Count')) {
    return value.toString();
  }
  
  return `${value.toFixed(0)}ms`;
}

// ============================================================================
// Performance Test Helpers
// ============================================================================

/**
 * Create performance test for a page
 */
export async function measurePagePerformance(
  page: Page,
  url: string,
  options: {
    budget?: PerformanceBudget;
    warmup?: boolean;
    iterations?: number;
  } = {}
): Promise<{
  metrics: PerformanceMetrics;
  violations: BudgetViolation[];
  passed: boolean;
}> {
  const { budget = DEFAULT_BUDGET, warmup = true, iterations = 1 } = options;
  
  // Warmup run
  if (warmup) {
    await page.goto(url);
    await page.waitForLoadState('networkidle');
  }
  
  // Collect metrics
  const collector = new PerformanceCollector(page);
  await collector.start();
  
  // Navigate fresh
  await page.goto(url, { waitUntil: 'load' });
  
  const metrics = await collector.collect();
  const violations = checkBudget(metrics, budget);
  
  return {
    metrics,
    violations,
    passed: violations.length === 0,
  };
}

/**
 * Run multiple iterations and average results
 */
export async function measureAveragePerformance(
  page: Page,
  url: string,
  iterations: number = 3
): Promise<PerformanceMetrics> {
  const allMetrics: PerformanceMetrics[] = [];
  
  for (let i = 0; i < iterations; i++) {
    const collector = new PerformanceCollector(page);
    await collector.start();
    
    await page.goto(url, { waitUntil: 'load' });
    const metrics = await collector.collect();
    allMetrics.push(metrics);
    
    // Short delay between iterations
    await page.waitForTimeout(500);
  }
  
  // Average all numeric metrics
  const averaged: PerformanceMetrics = {};
  const keys = Object.keys(allMetrics[0]) as Array<keyof PerformanceMetrics>;
  
  for (const key of keys) {
    const values = allMetrics
      .map((m) => m[key])
      .filter((v): v is number => typeof v === 'number');
    
    if (values.length > 0) {
      (averaged as any)[key] = values.reduce((a, b) => a + b, 0) / values.length;
    }
  }
  
  return averaged;
}

// ============================================================================
// Report Generation
// ============================================================================

interface PerformanceReport {
  url: string;
  timestamp: string;
  metrics: PerformanceMetrics;
  budget: PerformanceBudget;
  violations: BudgetViolation[];
  passed: boolean;
  apiCalls?: ApiCallMetrics[];
}

/**
 * Generate HTML performance report
 */
export function generatePerformanceReport(reports: PerformanceReport[]): string {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Performance Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; margin: -20px -20px 30px; }
    .header h1 { margin: 0; }
    .summary { display: flex; gap: 20px; margin-top: 20px; }
    .summary-card { background: rgba(255,255,255,0.2); padding: 15px 25px; border-radius: 8px; }
    .summary-card h3 { margin: 0; font-size: 32px; }
    .summary-card p { margin: 5px 0 0; opacity: 0.9; }
    .report-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(500px, 1fr)); gap: 20px; }
    .report-card { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .report-card.failed { border-top: 4px solid #ef4444; }
    .report-card.passed { border-top: 4px solid #22c55e; }
    .report-header { padding: 20px; border-bottom: 1px solid #e5e5e5; }
    .report-url { font-weight: 600; font-size: 14px; color: #666; word-break: break-all; }
    .report-status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-top: 10px; }
    .report-status.passed { background: #dcfce7; color: #166534; }
    .report-status.failed { background: #fee2e2; color: #991b1b; }
    .metrics-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: #e5e5e5; }
    .metric { background: white; padding: 15px; text-align: center; }
    .metric-value { font-size: 24px; font-weight: 700; }
    .metric-value.good { color: #22c55e; }
    .metric-value.bad { color: #ef4444; }
    .metric-label { font-size: 12px; color: #666; margin-top: 5px; }
    .violations { padding: 20px; background: #fef2f2; }
    .violation { padding: 8px 0; border-bottom: 1px solid #fecaca; font-size: 14px; }
    .violation:last-child { border-bottom: none; }
    .web-vitals { display: flex; gap: 20px; padding: 20px; justify-content: center; }
    .vital { text-align: center; }
    .vital-score { font-size: 48px; font-weight: 700; }
    .vital-label { font-size: 12px; color: #666; }
    .vital-score.good { color: #22c55e; }
    .vital-score.needs-improvement { color: #f59e0b; }
    .vital-score.poor { color: #ef4444; }
  </style>
</head>
<body>
  <div class="header">
    <h1>⚡ Performance Report</h1>
    <div class="summary">
      <div class="summary-card">
        <h3>${reports.filter((r) => r.passed).length}/${reports.length}</h3>
        <p>Pages Passing Budget</p>
      </div>
      <div class="summary-card">
        <h3>${Math.round(reports.reduce((sum, r) => sum + (r.metrics.lcp || 0), 0) / reports.length)}ms</h3>
        <p>Avg LCP</p>
      </div>
      <div class="summary-card">
        <h3>${(reports.reduce((sum, r) => sum + (r.metrics.cls || 0), 0) / reports.length).toFixed(3)}</h3>
        <p>Avg CLS</p>
      </div>
    </div>
  </div>

  <div class="report-grid">
    ${reports.map((report) => `
      <div class="report-card ${report.passed ? 'passed' : 'failed'}">
        <div class="report-header">
          <div class="report-url">${report.url}</div>
          <span class="report-status ${report.passed ? 'passed' : 'failed'}">
            ${report.passed ? '✓ PASSED' : '✗ FAILED'}
          </span>
        </div>
        
        <div class="web-vitals">
          <div class="vital">
            <div class="vital-score ${getVitalClass('lcp', report.metrics.lcp || 0)}">${Math.round(report.metrics.lcp || 0)}</div>
            <div class="vital-label">LCP (ms)</div>
          </div>
          <div class="vital">
            <div class="vital-score ${getVitalClass('fcp', report.metrics.fcp || 0)}">${Math.round(report.metrics.fcp || 0)}</div>
            <div class="vital-label">FCP (ms)</div>
          </div>
          <div class="vital">
            <div class="vital-score ${getVitalClass('cls', report.metrics.cls || 0)}">${(report.metrics.cls || 0).toFixed(3)}</div>
            <div class="vital-label">CLS</div>
          </div>
        </div>
        
        <div class="metrics-grid">
          <div class="metric">
            <div class="metric-value">${Math.round(report.metrics.ttfb || 0)}</div>
            <div class="metric-label">TTFB (ms)</div>
          </div>
          <div class="metric">
            <div class="metric-value">${Math.round(report.metrics.domContentLoaded || 0)}</div>
            <div class="metric-label">DOM Ready (ms)</div>
          </div>
          <div class="metric">
            <div class="metric-value">${Math.round(report.metrics.load || 0)}</div>
            <div class="metric-label">Load (ms)</div>
          </div>
          <div class="metric">
            <div class="metric-value">${report.metrics.resourceCount || 0}</div>
            <div class="metric-label">Resources</div>
          </div>
          <div class="metric">
            <div class="metric-value">${((report.metrics.totalTransferSize || 0) / 1024).toFixed(0)}</div>
            <div class="metric-label">Size (KB)</div>
          </div>
          <div class="metric">
            <div class="metric-value">${report.metrics.apiCalls || 0}</div>
            <div class="metric-label">API Calls</div>
          </div>
        </div>
        
        ${report.violations.length > 0 ? `
          <div class="violations">
            <strong>Budget Violations:</strong>
            ${report.violations.map((v) => `
              <div class="violation">
                ${v.metric}: ${formatMetric(v.metric, v.actual)} 
                (budget: ${formatMetric(v.metric, v.budget)}, ${v.percentOver.toFixed(1)}% over)
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `).join('')}
  </div>

  <script>
    function getVitalClass(name, value) {
      const thresholds = {
        lcp: [2500, 4000],
        fcp: [1800, 3000],
        cls: [0.1, 0.25],
        fid: [100, 300],
        ttfb: [800, 1800],
      };
      const t = thresholds[name];
      if (!t) return '';
      if (value <= t[0]) return 'good';
      if (value <= t[1]) return 'needs-improvement';
      return 'poor';
    }
  </script>
</body>
</html>
  `;
  
  return html;
}

function getVitalClass(name: string, value: number): string {
  const thresholds: Record<string, [number, number]> = {
    lcp: [2500, 4000],
    fcp: [1800, 3000],
    cls: [0.1, 0.25],
    fid: [100, 300],
    ttfb: [800, 1800],
  };
  
  const t = thresholds[name];
  if (!t) return '';
  if (value <= t[0]) return 'good';
  if (value <= t[1]) return 'needs-improvement';
  return 'poor';
}

// ============================================================================
// Lighthouse Integration (if available)
// ============================================================================

/**
 * Run Lighthouse audit via Chrome DevTools Protocol
 * Note: Requires Chrome/Chromium browser
 */
export async function runLighthouseAudit(
  context: BrowserContext,
  url: string
): Promise<any> {
  // This is a placeholder for Lighthouse integration
  // In practice, you'd use the Lighthouse library directly
  // or run it via CDP
  
  console.log(`Lighthouse audit for ${url} not implemented in this context`);
  return null;
}
