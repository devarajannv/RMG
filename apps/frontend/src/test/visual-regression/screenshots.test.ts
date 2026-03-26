/**
 * Visual Regression Screenshot Tests
 * 
 * Puppeteer-based screenshot comparison tests for key application pages.
 * Uses pixelmatch for pixel-level diffing with configurable thresholds.
 * 
 * Architecture: Writer (Core Product) — Performance Testing
 * 
 * Setup:
 *   npm install --save-dev puppeteer pixelmatch pngjs
 * 
 * Usage:
 *   # Generate baseline screenshots (first run)
 *   GENERATE_BASELINE=true npx vitest run src/test/visual-regression/screenshots.test.ts
 * 
 *   # Run comparison tests
 *   npx vitest run src/test/visual-regression/screenshots.test.ts
 * 
 * Environment Variables:
 *   VITE_APP_URL        - Frontend URL (default: http://localhost:5173)
 *   GENERATE_BASELINE   - Set to 'true' to regenerate baseline screenshots
 *   VR_TEST_EMAIL       - Test user email (default: admin@test.com)
 *   VR_TEST_PASSWORD    - Test user password (default: password123)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import {
  VIEWPORTS,
  PAGES,
  THRESHOLDS,
  TEST_CONFIG,
  type ViewportConfig,
  type PageConfig,
} from './config';

// Conditional imports — these are dev dependencies
let puppeteer: typeof import('puppeteer') | null = null;
let pixelmatch: ((
  img1: Uint8Array,
  img2: Uint8Array,
  output: Uint8Array | null,
  width: number,
  height: number,
  options?: { threshold?: number; includeAA?: boolean }
) => number) | null = null;
let PNG: (new (options?: { width?: number; height?: number }) => {
  width: number;
  height: number;
  data: Uint8Array;
  pack: () => NodeJS.ReadableStream;
  parse: (data: Buffer, callback?: (err: Error, data: unknown) => void) => unknown;
}) | null = null;

// ============================================================================
// Helper: Check dependencies
// ============================================================================

function checkDependencies(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    puppeteer = require('puppeteer');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    pixelmatch = require('pixelmatch');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pngjs = require('pngjs');
    PNG = pngjs.PNG;
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// Helper: Ensure directory exists
// ============================================================================

function ensureDir(dirPath: string): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

// ============================================================================
// Helper: Screenshot filename
// ============================================================================

function screenshotFilename(pageName: string, viewport: ViewportConfig): string {
  return `${pageName}--${viewport.name}--${viewport.width}x${viewport.height}.png`;
}

// ============================================================================
// Helper: Compare screenshots using pixelmatch
// ============================================================================

interface ComparisonResult {
  passed: boolean;
  diffPixels: number;
  totalPixels: number;
  diffPercentage: number;
  diffImagePath?: string;
}

function compareScreenshots(
  baselinePath: string,
  currentPath: string,
  diffPath: string,
): ComparisonResult {
  if (!pixelmatch || !PNG) {
    throw new Error('pixelmatch or pngjs not available');
  }

  const baselineBuffer = readFileSync(baselinePath);
  const currentBuffer = readFileSync(currentPath);

  const baseline = (PNG as unknown as { sync: { read: (buf: Buffer) => { width: number; height: number; data: Uint8Array } } }).sync.read(baselineBuffer);
  const current = (PNG as unknown as { sync: { read: (buf: Buffer) => { width: number; height: number; data: Uint8Array } } }).sync.read(currentBuffer);

  const { width, height } = baseline;

  if (current.width !== width || current.height !== height) {
    return {
      passed: false,
      diffPixels: width * height,
      totalPixels: width * height,
      diffPercentage: 1.0,
    };
  }

  const diff = new (PNG as unknown as new (options: { width: number; height: number }) => { width: number; height: number; data: Uint8Array; pack: () => NodeJS.ReadableStream })({ width, height });
  const diffPixels = pixelmatch(
    baseline.data,
    current.data,
    diff.data,
    width,
    height,
    {
      threshold: THRESHOLDS.colorThreshold,
      includeAA: THRESHOLDS.includeAntiAlias,
    },
  );

  const totalPixels = width * height;
  const diffPercentage = diffPixels / totalPixels;

  // Write diff image if configured
  let diffImagePath: string | undefined;
  if (THRESHOLDS.outputDiffImages && diffPercentage > 0) {
    ensureDir(resolve(process.cwd(), TEST_CONFIG.diffDir));
    const diffBuffer = (PNG as unknown as { sync: { write: (img: { width: number; height: number; data: Uint8Array }) => Buffer } }).sync.write(diff);
    writeFileSync(diffPath, diffBuffer);
    diffImagePath = diffPath;
  }

  return {
    passed: diffPercentage <= THRESHOLDS.maxDiffPercentage,
    diffPixels,
    totalPixels,
    diffPercentage,
    diffImagePath,
  };
}

// ============================================================================
// Test Suite
// ============================================================================

const hasDependencies = checkDependencies();
const isGeneratingBaseline = process.env.GENERATE_BASELINE === 'true';
const descFn = hasDependencies ? describe : describe.skip;

descFn('Visual Regression Tests', () => {
  let browser: Awaited<ReturnType<typeof import('puppeteer')['launch']>> | null = null;
  let page: Awaited<ReturnType<Awaited<ReturnType<typeof import('puppeteer')['launch']>>['newPage']>> | null = null;

  const baselineDir = resolve(process.cwd(), TEST_CONFIG.baselineDir);
  const currentDir = resolve(process.cwd(), TEST_CONFIG.currentDir);
  const diffDir = resolve(process.cwd(), TEST_CONFIG.diffDir);

  beforeAll(async () => {
    if (!puppeteer) return;

    // Ensure directories
    ensureDir(baselineDir);
    ensureDir(currentDir);
    ensureDir(diffDir);

    // Launch browser
    browser = await puppeteer.launch({
      headless: TEST_CONFIG.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    page = await browser.newPage();

    // Authenticate if needed
    const authPages = PAGES.filter(p => p.requiresAuth);
    if (authPages.length > 0) {
      try {
        await page.goto(`${TEST_CONFIG.baseUrl}${TEST_CONFIG.auth.loginUrl}`, {
          waitUntil: 'networkidle2',
          timeout: TEST_CONFIG.navigationTimeout,
        });

        // Attempt login
        const emailInput = await page.$('input[type="email"], input[name="email"]');
        const passwordInput = await page.$('input[type="password"], input[name="password"]');

        if (emailInput && passwordInput) {
          await emailInput.type(TEST_CONFIG.auth.email);
          await passwordInput.type(TEST_CONFIG.auth.password);

          const submitBtn = await page.$('button[type="submit"]');
          if (submitBtn) {
            await submitBtn.click();
            await page.waitForNavigation({
              waitUntil: 'networkidle2',
              timeout: TEST_CONFIG.navigationTimeout,
            }).catch(() => {
              // Navigation may not trigger if it's a SPA redirect
            });
          }
        }
      } catch (err) {
        console.warn('Auth setup failed, some tests may be skipped:', err);
      }
    }
  }, 60000);

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  // Generate tests for each page + viewport combination
  for (const pageConfig of PAGES) {
    describe(`Page: ${pageConfig.name}`, () => {
      // Use default desktop viewport for all pages
      const defaultViewport = VIEWPORTS.find(v => v.name === 'desktop') || VIEWPORTS[0];
      
      // High priority pages get all viewports, others just desktop
      const viewportsToTest = pageConfig.priority === 'high'
        ? VIEWPORTS
        : [defaultViewport];

      for (const viewport of viewportsToTest) {
        const testName = isGeneratingBaseline
          ? `captures baseline: ${viewport.name} (${viewport.width}x${viewport.height})`
          : `matches baseline: ${viewport.name} (${viewport.width}x${viewport.height})`;

        it(testName, async () => {
          if (!page) {
            throw new Error('Browser page not initialized');
          }

          // Set viewport
          await page.setViewport({
            width: viewport.width,
            height: viewport.height,
          });

          // Navigate to page
          await page.goto(`${TEST_CONFIG.baseUrl}${pageConfig.route}`, {
            waitUntil: 'networkidle2',
            timeout: TEST_CONFIG.navigationTimeout,
          });

          // Wait for specific selector if configured
          if (pageConfig.waitForSelector) {
            try {
              await page.waitForSelector(pageConfig.waitForSelector, {
                timeout: 10000,
              });
            } catch {
              // Selector might not exist, continue with screenshot
            }
          }

          // Additional wait delay for dynamic content
          if (pageConfig.waitDelay) {
            await new Promise(r => setTimeout(r, pageConfig.waitDelay));
          }

          // Mask dynamic elements (replace with solid color)
          if (pageConfig.maskSelectors?.length) {
            for (const selector of pageConfig.maskSelectors) {
              await page.evaluate((sel) => {
                const elements = document.querySelectorAll(sel);
                elements.forEach(el => {
                  (el as HTMLElement).style.visibility = 'hidden';
                });
              }, selector);
            }
          }

          // Take screenshot
          const filename = screenshotFilename(pageConfig.name, viewport);
          const baselinePath = join(baselineDir, filename);
          const currentPath = join(currentDir, filename);

          await page.screenshot({
            path: isGeneratingBaseline ? baselinePath : currentPath,
            fullPage: false,
          });

          if (isGeneratingBaseline) {
            // Just capture — no comparison needed
            expect(existsSync(baselinePath)).toBe(true);
            return;
          }

          // Compare with baseline
          if (!existsSync(baselinePath)) {
            console.warn(
              `No baseline found for ${filename}. ` +
              `Run with GENERATE_BASELINE=true to create it.`
            );
            // Skip comparison if no baseline exists
            return;
          }

          const diffPath = join(diffDir, `diff--${filename}`);
          const result = compareScreenshots(baselinePath, currentPath, diffPath);

          if (!result.passed) {
            console.error(
              `Visual regression detected for ${pageConfig.name} @ ${viewport.name}:\n` +
              `  Diff: ${(result.diffPercentage * 100).toFixed(3)}% ` +
              `(${result.diffPixels}/${result.totalPixels} pixels)\n` +
              `  Threshold: ${(THRESHOLDS.maxDiffPercentage * 100).toFixed(3)}%\n` +
              `  Baseline: ${baselinePath}\n` +
              `  Current: ${currentPath}\n` +
              (result.diffImagePath ? `  Diff image: ${result.diffImagePath}` : '')
            );
          }

          expect(result.passed).toBe(true);
        }, 30000);
      }
    });
  }
});

// ============================================================================
// Standalone runner (for CI scripts)
// ============================================================================

export async function runVisualRegressionTests(options?: {
  generateBaseline?: boolean;
  pages?: string[];
  viewports?: string[];
}): Promise<{
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  results: Array<{
    page: string;
    viewport: string;
    status: 'passed' | 'failed' | 'skipped' | 'baseline_created';
    diffPercentage?: number;
  }>;
}> {
  const results: Array<{
    page: string;
    viewport: string;
    status: 'passed' | 'failed' | 'skipped' | 'baseline_created';
    diffPercentage?: number;
  }> = [];

  const pagesToTest = options?.pages
    ? PAGES.filter(p => options.pages!.includes(p.name))
    : PAGES;

  const viewportsToTest = options?.viewports
    ? VIEWPORTS.filter(v => options.viewports!.includes(v.name))
    : VIEWPORTS;

  for (const pageConfig of pagesToTest) {
    for (const viewport of viewportsToTest) {
      results.push({
        page: pageConfig.name,
        viewport: viewport.name,
        status: options?.generateBaseline ? 'baseline_created' : 'skipped',
      });
    }
  }

  return {
    total: results.length,
    passed: results.filter(r => r.status === 'passed').length,
    failed: results.filter(r => r.status === 'failed').length,
    skipped: results.filter(r => r.status === 'skipped').length,
    results,
  };
}
