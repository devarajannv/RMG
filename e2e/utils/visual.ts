/**
 * Visual Regression Testing Utilities
 * 
 * Provides screenshot comparison, baseline management,
 * and visual diff reporting for E2E tests.
 * 
 * @module e2e/utils/visual
 */

import { Page, expect, TestInfo } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Types
// ============================================================================

export interface VisualTestOptions {
  /** Custom name for the screenshot */
  name?: string;
  /** Element selector to capture (full page if not specified) */
  selector?: string;
  /** Mask dynamic elements */
  mask?: string[];
  /** Maximum allowed pixel difference (default: 0.2%) */
  maxDiffPixelRatio?: number;
  /** Threshold for pixel matching (0-1, default: 0.2) */
  threshold?: number;
  /** Viewport size override */
  viewport?: { width: number; height: number };
  /** Wait for animations to complete */
  animations?: 'disabled' | 'allow';
  /** Custom CSS to inject before screenshot */
  css?: string;
  /** Clip region */
  clip?: { x: number; y: number; width: number; height: number };
  /** Scale factor */
  scale?: 'css' | 'device';
  /** Full page screenshot */
  fullPage?: boolean;
}

export interface VisualTestResult {
  passed: boolean;
  diffPixels: number;
  totalPixels: number;
  diffRatio: number;
  baselinePath: string;
  actualPath: string;
  diffPath?: string;
}

// ============================================================================
// Configuration
// ============================================================================

const BASELINE_DIR = path.join(process.cwd(), 'e2e', 'screenshots', 'baseline');
const ACTUAL_DIR = path.join(process.cwd(), 'e2e', 'screenshots', 'actual');
const DIFF_DIR = path.join(process.cwd(), 'e2e', 'screenshots', 'diff');

const DEFAULT_OPTIONS: VisualTestOptions = {
  maxDiffPixelRatio: 0.002, // 0.2%
  threshold: 0.2,
  animations: 'disabled',
  fullPage: false,
  scale: 'css',
};

// ============================================================================
// Directory Setup
// ============================================================================

/**
 * Ensures all screenshot directories exist
 */
export function ensureDirectories(): void {
  [BASELINE_DIR, ACTUAL_DIR, DIFF_DIR].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

// Initialize directories
ensureDirectories();

// ============================================================================
// Screenshot Utilities
// ============================================================================

/**
 * Generate screenshot filename based on test info
 */
function getScreenshotName(testInfo: TestInfo, customName?: string): string {
  const browserName = testInfo.project.name;
  const testTitle = testInfo.title.replace(/[^a-zA-Z0-9]/g, '-');
  const timestamp = Date.now();
  
  if (customName) {
    return `${browserName}-${customName}`;
  }
  
  return `${browserName}-${testTitle}`;
}

/**
 * Wait for page to be stable before taking screenshot
 */
async function waitForStable(page: Page, options: VisualTestOptions): Promise<void> {
  // Wait for network to be idle
  await page.waitForLoadState('networkidle').catch(() => {});
  
  // Wait for animations if disabled
  if (options.animations === 'disabled') {
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `,
    });
  }
  
  // Inject custom CSS
  if (options.css) {
    await page.addStyleTag({ content: options.css });
  }
  
  // Wait a bit for any final renders
  await page.waitForTimeout(100);
}

/**
 * Mask dynamic elements before screenshot
 */
async function maskElements(page: Page, selectors: string[]): Promise<void> {
  for (const selector of selectors) {
    await page.locator(selector).evaluateAll((elements) => {
      elements.forEach((el) => {
        (el as HTMLElement).style.visibility = 'hidden';
      });
    }).catch(() => {});
  }
}

// ============================================================================
// Visual Comparison
// ============================================================================

/**
 * Take a visual snapshot and compare with baseline
 * Uses Playwright's built-in snapshot comparison
 */
export async function visualSnapshot(
  page: Page,
  testInfo: TestInfo,
  options: Partial<VisualTestOptions> = {}
): Promise<void> {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const name = getScreenshotName(testInfo, mergedOptions.name);
  
  // Wait for stable state
  await waitForStable(page, mergedOptions);
  
  // Mask dynamic elements
  if (mergedOptions.mask?.length) {
    await maskElements(page, mergedOptions.mask);
  }
  
  // Set viewport if specified
  if (mergedOptions.viewport) {
    await page.setViewportSize(mergedOptions.viewport);
    await page.waitForTimeout(100);
  }
  
  // Take screenshot and compare
  if (mergedOptions.selector) {
    await expect(page.locator(mergedOptions.selector)).toHaveScreenshot(`${name}.png`, {
      maxDiffPixelRatio: mergedOptions.maxDiffPixelRatio,
      threshold: mergedOptions.threshold,
      animations: mergedOptions.animations,
      scale: mergedOptions.scale,
    });
  } else {
    await expect(page).toHaveScreenshot(`${name}.png`, {
      maxDiffPixelRatio: mergedOptions.maxDiffPixelRatio,
      threshold: mergedOptions.threshold,
      animations: mergedOptions.animations,
      fullPage: mergedOptions.fullPage,
      scale: mergedOptions.scale,
      clip: mergedOptions.clip,
    });
  }
}

/**
 * Take component screenshot
 */
export async function componentSnapshot(
  page: Page,
  testInfo: TestInfo,
  selector: string,
  options: Partial<VisualTestOptions> = {}
): Promise<void> {
  await visualSnapshot(page, testInfo, {
    ...options,
    selector,
    name: options.name || selector.replace(/[^a-zA-Z0-9]/g, '-'),
  });
}

// ============================================================================
// Responsive Testing
// ============================================================================

export const VIEWPORTS = {
  mobile: { width: 375, height: 667 },
  mobileLandscape: { width: 667, height: 375 },
  tablet: { width: 768, height: 1024 },
  tabletLandscape: { width: 1024, height: 768 },
  desktop: { width: 1280, height: 720 },
  desktopLarge: { width: 1920, height: 1080 },
  desktopUltrawide: { width: 2560, height: 1080 },
};

/**
 * Take responsive screenshots at multiple breakpoints
 */
export async function responsiveSnapshots(
  page: Page,
  testInfo: TestInfo,
  options: Partial<VisualTestOptions> = {}
): Promise<void> {
  const viewports = [
    { name: 'mobile', ...VIEWPORTS.mobile },
    { name: 'tablet', ...VIEWPORTS.tablet },
    { name: 'desktop', ...VIEWPORTS.desktop },
  ];
  
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.waitForTimeout(200);
    
    await visualSnapshot(page, testInfo, {
      ...options,
      name: `${options.name || 'page'}-${viewport.name}`,
    });
  }
}

// ============================================================================
// Theme Testing
// ============================================================================

/**
 * Take screenshots in both light and dark themes
 */
export async function themeSnapshots(
  page: Page,
  testInfo: TestInfo,
  options: Partial<VisualTestOptions> = {}
): Promise<void> {
  // Light theme
  await page.emulateMedia({ colorScheme: 'light' });
  await page.waitForTimeout(100);
  await visualSnapshot(page, testInfo, {
    ...options,
    name: `${options.name || 'page'}-light`,
  });
  
  // Dark theme
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.waitForTimeout(100);
  await visualSnapshot(page, testInfo, {
    ...options,
    name: `${options.name || 'page'}-dark`,
  });
}

// ============================================================================
// Interaction States
// ============================================================================

/**
 * Capture component in different states
 */
export async function stateSnapshots(
  page: Page,
  testInfo: TestInfo,
  selector: string,
  options: Partial<VisualTestOptions> = {}
): Promise<void> {
  const element = page.locator(selector).first();
  const baseName = options.name || selector.replace(/[^a-zA-Z0-9]/g, '-');
  
  // Default state
  await visualSnapshot(page, testInfo, {
    ...options,
    selector,
    name: `${baseName}-default`,
  });
  
  // Hover state
  await element.hover();
  await page.waitForTimeout(100);
  await visualSnapshot(page, testInfo, {
    ...options,
    selector,
    name: `${baseName}-hover`,
  });
  
  // Focus state
  await element.focus();
  await page.waitForTimeout(100);
  await visualSnapshot(page, testInfo, {
    ...options,
    selector,
    name: `${baseName}-focus`,
  });
}

// ============================================================================
// Common Masks
// ============================================================================

export const COMMON_MASKS = {
  // Dynamic content that changes
  timestamps: '[data-testid*="timestamp"], time, [class*="date"]',
  avatars: '[data-testid*="avatar"], [class*="avatar"]',
  loadingIndicators: '[class*="loading"], [class*="spinner"], [class*="skeleton"]',
  
  // Content that varies per test run
  userNames: '[data-testid*="user-name"]',
  counts: '[data-testid*="count"], [class*="badge"]',
  
  // Third-party content
  ads: '[data-testid*="ad"], [class*="advertisement"]',
  analytics: '[class*="analytics"]',
};

/**
 * Get common masks for standard pages
 */
export function getCommonMasks(): string[] {
  return [
    COMMON_MASKS.timestamps,
    COMMON_MASKS.loadingIndicators,
  ];
}

// ============================================================================
// Baseline Management
// ============================================================================

/**
 * Update baselines for a specific test
 * Run with: npx playwright test --update-snapshots
 */
export function updateBaseline(name: string): void {
  const actualPath = path.join(ACTUAL_DIR, `${name}.png`);
  const baselinePath = path.join(BASELINE_DIR, `${name}.png`);
  
  if (fs.existsSync(actualPath)) {
    fs.copyFileSync(actualPath, baselinePath);
    console.log(`Updated baseline: ${name}`);
  }
}

/**
 * List all baselines
 */
export function listBaselines(): string[] {
  if (!fs.existsSync(BASELINE_DIR)) {
    return [];
  }
  
  return fs.readdirSync(BASELINE_DIR).filter((f) => f.endsWith('.png'));
}

/**
 * Delete outdated baselines
 */
export function cleanBaselines(keepPatterns: RegExp[]): void {
  const baselines = listBaselines();
  
  for (const baseline of baselines) {
    const shouldKeep = keepPatterns.some((pattern) => pattern.test(baseline));
    if (!shouldKeep) {
      fs.unlinkSync(path.join(BASELINE_DIR, baseline));
      console.log(`Deleted outdated baseline: ${baseline}`);
    }
  }
}

// ============================================================================
// Report Generation
// ============================================================================

interface DiffReport {
  timestamp: string;
  totalTests: number;
  passed: number;
  failed: number;
  tests: Array<{
    name: string;
    status: 'passed' | 'failed';
    diffRatio?: number;
    paths?: {
      baseline: string;
      actual: string;
      diff: string;
    };
  }>;
}

/**
 * Generate HTML report for visual differences
 */
export function generateDiffReport(results: DiffReport): string {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Visual Regression Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
    .header { background: #1a1a1a; color: white; padding: 20px; margin: -20px -20px 20px; }
    .header h1 { margin: 0; }
    .stats { display: flex; gap: 20px; margin-top: 10px; }
    .stat { padding: 5px 10px; border-radius: 4px; font-size: 14px; }
    .stat.passed { background: #22c55e; }
    .stat.failed { background: #ef4444; }
    .test-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 20px; }
    .test-card { background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .test-card.failed { border: 2px solid #ef4444; }
    .test-header { padding: 15px; border-bottom: 1px solid #e5e5e5; display: flex; justify-content: space-between; align-items: center; }
    .test-title { font-weight: 600; }
    .test-status { padding: 4px 8px; border-radius: 4px; font-size: 12px; }
    .test-status.passed { background: #dcfce7; color: #166534; }
    .test-status.failed { background: #fee2e2; color: #991b1b; }
    .test-images { display: flex; gap: 10px; padding: 15px; overflow-x: auto; }
    .test-image { flex: 1; min-width: 200px; }
    .test-image img { width: 100%; height: auto; border-radius: 4px; border: 1px solid #e5e5e5; }
    .test-image-label { font-size: 12px; color: #666; margin-top: 5px; text-align: center; }
    .diff-ratio { font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Visual Regression Report</h1>
    <div class="stats">
      <span class="stat passed">${results.passed} Passed</span>
      <span class="stat failed">${results.failed} Failed</span>
    </div>
    <div style="color: #888; font-size: 12px; margin-top: 10px;">
      Generated: ${results.timestamp}
    </div>
  </div>
  
  <div class="test-grid">
    ${results.tests.map((test) => `
      <div class="test-card ${test.status}">
        <div class="test-header">
          <span class="test-title">${test.name}</span>
          <span class="test-status ${test.status}">
            ${test.status.toUpperCase()}
            ${test.diffRatio !== undefined ? `<span class="diff-ratio">(${(test.diffRatio * 100).toFixed(2)}% diff)</span>` : ''}
          </span>
        </div>
        ${test.paths ? `
        <div class="test-images">
          <div class="test-image">
            <img src="${test.paths.baseline}" alt="Baseline">
            <div class="test-image-label">Baseline</div>
          </div>
          <div class="test-image">
            <img src="${test.paths.actual}" alt="Actual">
            <div class="test-image-label">Actual</div>
          </div>
          ${test.status === 'failed' ? `
          <div class="test-image">
            <img src="${test.paths.diff}" alt="Diff">
            <div class="test-image-label">Difference</div>
          </div>
          ` : ''}
        </div>
        ` : ''}
      </div>
    `).join('')}
  </div>
</body>
</html>
  `;
  
  return html;
}
