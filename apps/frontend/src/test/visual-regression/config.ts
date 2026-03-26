/**
 * Visual Regression Testing Configuration
 * 
 * Defines viewports, page routes, and comparison thresholds
 * for Puppeteer-based screenshot comparisons.
 * 
 * Architecture: Writer (Core Product) — Performance Testing
 */

// ============================================================================
// Viewport Configurations
// ============================================================================

export interface ViewportConfig {
  name: string;
  width: number;
  height: number;
}

export const VIEWPORTS: ViewportConfig[] = [
  { name: 'mobile', width: 375, height: 812 },      // iPhone X
  { name: 'tablet', width: 768, height: 1024 },      // iPad
  { name: 'desktop', width: 1440, height: 900 },     // Standard desktop
  { name: 'wide', width: 1920, height: 1080 },       // Full HD
];

// ============================================================================
// Page Definitions
// ============================================================================

export interface PageConfig {
  name: string;
  route: string;
  priority: 'high' | 'medium' | 'low';
  /** Whether the page requires authentication */
  requiresAuth: boolean;
  /** Optional wait selector — wait for this element before capturing */
  waitForSelector?: string;
  /** Optional delay in ms after page load */
  waitDelay?: number;
  /** Selectors to mask (hide) during comparison (e.g., timestamps, avatars) */
  maskSelectors?: string[];
}

export const PAGES: PageConfig[] = [
  {
    name: 'login',
    route: '/login',
    priority: 'high',
    requiresAuth: false,
    waitForSelector: 'button[type="submit"]',
  },
  {
    name: 'dashboard',
    route: '/dashboard',
    priority: 'high',
    requiresAuth: true,
    waitForSelector: '[data-testid="dashboard-content"], .recharts-wrapper, main',
    waitDelay: 1000,
    maskSelectors: ['.recharts-wrapper', '[data-testid="timestamp"]'],
  },
  {
    name: 'resources',
    route: '/resources',
    priority: 'high',
    requiresAuth: true,
    waitForSelector: 'table, [data-testid="resource-list"], main',
    waitDelay: 500,
  },
  {
    name: 'requests',
    route: '/requests',
    priority: 'high',
    requiresAuth: true,
    waitForSelector: 'table, [data-testid="request-list"], main',
    waitDelay: 500,
  },
  {
    name: 'workflow-builder',
    route: '/workflows',
    priority: 'medium',
    requiresAuth: true,
    waitForSelector: '[data-testid="workflow-list"], main',
    waitDelay: 500,
  },
  {
    name: 'settings',
    route: '/settings',
    priority: 'medium',
    requiresAuth: true,
    waitForSelector: '[data-testid="settings-content"], main',
    waitDelay: 500,
  },
  {
    name: 'smart-search',
    route: '/smart-search',
    priority: 'medium',
    requiresAuth: true,
    waitForSelector: 'input[type="search"], input[placeholder*="earch"], main',
    waitDelay: 500,
  },
  {
    name: 'data-management',
    route: '/data-management',
    priority: 'low',
    requiresAuth: true,
    waitForSelector: '[data-testid="export-import"], main',
    waitDelay: 500,
  },
  {
    name: 'contracts',
    route: '/contracts',
    priority: 'low',
    requiresAuth: true,
    waitForSelector: 'table, main',
    waitDelay: 500,
  },
  {
    name: 'timesheets',
    route: '/timesheets',
    priority: 'low',
    requiresAuth: true,
    waitForSelector: 'table, main',
    waitDelay: 500,
  },
];

// ============================================================================
// Comparison Thresholds
// ============================================================================

export interface ThresholdConfig {
  /** Maximum pixel difference ratio (0.0 - 1.0). e.g., 0.001 = 0.1% */
  maxDiffPercentage: number;
  /** Pixel-level color distance threshold (0-255) for pixelmatch */
  colorThreshold: number;
  /** Whether to include anti-aliased pixels in comparison */
  includeAntiAlias: boolean;
  /** Output diff images for failed comparisons */
  outputDiffImages: boolean;
}

export const THRESHOLDS: ThresholdConfig = {
  maxDiffPercentage: 0.01,   // 1% tolerance for dynamic content
  colorThreshold: 0.1,       // Color sensitivity (pixelmatch default)
  includeAntiAlias: false,   // Exclude anti-aliased pixels (common false positives)
  outputDiffImages: true,    // Generate diff images for review
};

// ============================================================================
// Test Configuration
// ============================================================================

export interface TestConfig {
  /** Base URL of the running frontend app */
  baseUrl: string;
  /** Directory for baseline screenshots */
  baselineDir: string;
  /** Directory for current test screenshots */
  currentDir: string;
  /** Directory for diff images */
  diffDir: string;
  /** Default timeout for page navigation (ms) */
  navigationTimeout: number;
  /** Whether to run in headless mode */
  headless: boolean;
  /** Test credentials for authenticated pages */
  auth: {
    email: string;
    password: string;
    loginUrl: string;
  };
}

export const TEST_CONFIG: TestConfig = {
  baseUrl: process.env.VITE_APP_URL || 'http://localhost:5173',
  baselineDir: 'src/test/visual-regression/baseline',
  currentDir: 'src/test/visual-regression/current',
  diffDir: 'src/test/visual-regression/diffs',
  navigationTimeout: 30000,
  headless: true,
  auth: {
    email: process.env.VR_TEST_EMAIL || 'admin@test.com',
    password: process.env.VR_TEST_PASSWORD || 'password123',
    loginUrl: '/login',
  },
};

// ============================================================================
// Web Vitals Budgets (Cross-reference)
// ============================================================================

export const WEB_VITALS_BUDGETS = {
  LCP: 2500,    // Largest Contentful Paint: < 2.5s
  FID: 100,     // First Input Delay: < 100ms
  CLS: 0.1,     // Cumulative Layout Shift: < 0.1
  TTFB: 200,    // Time to First Byte: < 200ms
  FCP: 1800,    // First Contentful Paint: < 1.8s
  INP: 200,     // Interaction to Next Paint: < 200ms
} as const;
