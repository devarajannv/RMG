/**
 * Playwright E2E Test Configuration
 * 
 * GOD-Level Configuration:
 * - Multi-browser support (Chromium, Firefox, WebKit)
 * - Parallel execution with worker isolation
 * - Automatic retries for flaky tests
 * - Screenshot and video on failure
 * - HTML reporter with trace viewer
 * - Test database isolation
 * 
 * @module e2e/playwright.config
 */

import { defineConfig, devices } from '@playwright/test';

/**
 * Environment-specific configuration
 */
const isCI = !!process.env.CI;
const baseURL = process.env.E2E_BASE_URL || 'http://localhost:5173';
const apiURL = process.env.E2E_API_URL || 'http://localhost:4000/api/v1';

export default defineConfig({
  // ==========================================================================
  // Test Directory & Pattern Configuration
  // ==========================================================================
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  
  // ==========================================================================
  // Execution Settings
  // ==========================================================================
  
  // Run tests in parallel - each file in its own worker
  fullyParallel: true,
  
  // Fail the build on CI if test.only is accidentally left in code
  forbidOnly: isCI,
  
  // Retry failed tests - more retries in CI for stability
  retries: isCI ? 2 : 0,
  
  // Workers - reduce parallelism in CI for resource constraints
  workers: isCI ? 2 : undefined,
  
  // Global timeout for each test
  timeout: 30_000,
  
  // Timeout for expect assertions
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      maxDiffPixels: 100,
      threshold: 0.2,
    },
  },

  // ==========================================================================
  // Reporter Configuration
  // ==========================================================================
  reporter: [
    // Console output
    ['list', { printSteps: true }],
    
    // HTML report with trace viewer
    ['html', { 
      outputFolder: 'playwright-report',
      open: isCI ? 'never' : 'on-failure',
    }],
    
    // JUnit for CI integration
    ...(isCI ? [['junit', { outputFile: 'test-results/junit.xml' }] as const] : []),
    
    // JSON for programmatic access
    ['json', { outputFile: 'test-results/results.json' }],
  ],

  // ==========================================================================
  // Shared Settings for All Projects
  // ==========================================================================
  use: {
    // Base URL for navigation
    baseURL,
    
    // API request context
    extraHTTPHeaders: {
      'Accept': 'application/json',
    },
    
    // Collect trace on first retry
    trace: 'on-first-retry',
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
    
    // Video recording on failure
    video: 'on-first-retry',
    
    // Viewport size
    viewport: { width: 1280, height: 720 },
    
    // Geolocation (India - for locale testing)
    locale: 'en-IN',
    timezoneId: 'Asia/Kolkata',
    
    // Action timeout
    actionTimeout: 10_000,
    
    // Navigation timeout
    navigationTimeout: 15_000,
  },

  // ==========================================================================
  // Project Configuration (Browser Matrix)
  // ==========================================================================
  projects: [
    // --------------------------------------------------------------------
    // Setup Project - Run First
    // --------------------------------------------------------------------
    {
      name: 'setup',
      testMatch: /global\.setup\.ts/,
      teardown: 'teardown',
    },
    
    {
      name: 'teardown',
      testMatch: /global\.teardown\.ts/,
    },

    // --------------------------------------------------------------------
    // Desktop Browsers
    // --------------------------------------------------------------------
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: '.auth/user.json',
      },
      dependencies: ['setup'],
    },

    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        storageState: '.auth/user.json',
      },
      dependencies: ['setup'],
    },

    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        storageState: '.auth/user.json',
      },
      dependencies: ['setup'],
    },

    // --------------------------------------------------------------------
    // Mobile Browsers
    // --------------------------------------------------------------------
    {
      name: 'mobile-chrome',
      use: { 
        ...devices['Pixel 5'],
        storageState: '.auth/user.json',
      },
      dependencies: ['setup'],
    },

    {
      name: 'mobile-safari',
      use: { 
        ...devices['iPhone 13'],
        storageState: '.auth/user.json',
      },
      dependencies: ['setup'],
    },

    // --------------------------------------------------------------------
    // Logged Out Tests (No Auth State)
    // --------------------------------------------------------------------
    {
      name: 'logged-out',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: { cookies: [], origins: [] },
      },
      testMatch: /(auth|login-screen|dashboard-screen|requests-screen)\.spec\.ts/,
    },
  ],

  // ==========================================================================
  // Web Server Configuration
  // ==========================================================================
  webServer: [
    // API Server
    {
      command: 'npm run dev:api',
      url: apiURL.replace('/api/v1', '/health'),
      reuseExistingServer: !isCI,
      timeout: 60_000,
      cwd: '..',
    },
    // Frontend Server
    {
      command: 'npm run dev:frontend',
      url: baseURL,
      reuseExistingServer: !isCI,
      timeout: 60_000,
      cwd: '..',
    },
  ],

  // ==========================================================================
  // Output Directories
  // ==========================================================================
  outputDir: 'test-results',
  snapshotDir: 'snapshots',
  
  // ==========================================================================
  // Global Setup/Teardown
  // ==========================================================================
  globalSetup: require.resolve('./global.setup.ts'),
  globalTeardown: require.resolve('./global.teardown.ts'),
});

/**
 * Custom Configuration Types
 */
export interface TestConfig {
  baseURL: string;
  apiURL: string;
  testUser: {
    email: string;
    password: string;
  };
  adminUser: {
    email: string;
    password: string;
  };
}

export const testConfig: TestConfig = {
  baseURL,
  apiURL,
  testUser: {
    email: process.env.E2E_TEST_USER_EMAIL || 'test@rmgaas.com',
    password: process.env.E2E_TEST_USER_PASSWORD || 'Test123!@#',
  },
  adminUser: {
    email: process.env.E2E_ADMIN_EMAIL || 'admin@rmgaas.com',
    password: process.env.E2E_ADMIN_PASSWORD || 'Admin123!@#',
  },
};
