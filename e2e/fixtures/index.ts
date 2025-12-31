/**
 * E2E Test Fixtures
 * 
 * GOD-Level Fixtures providing:
 * - Authenticated test context
 * - API helpers with auth
 * - Page objects
 * - Test data generators
 * - Database utilities
 * 
 * @module e2e/fixtures
 */

import { test as base, expect, Page, APIRequestContext, BrowserContext } from '@playwright/test';
import { testConfig } from './playwright.config';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * User roles for testing different permission levels
 */
export type UserRole = 'admin' | 'manager' | 'user' | 'viewer';

/**
 * Authenticated user context
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  tenantId: string;
  accessToken: string;
}

/**
 * Test data factories
 */
export interface TestDataFactory {
  resource: (overrides?: Partial<ResourceData>) => ResourceData;
  project: (overrides?: Partial<ProjectData>) => ProjectData;
  contract: (overrides?: Partial<ContractData>) => ContractData;
  request: (overrides?: Partial<RequestData>) => RequestData;
  allocation: (overrides?: Partial<AllocationData>) => AllocationData;
}

interface ResourceData {
  firstName: string;
  lastName: string;
  email: string;
  employeeId: string;
  department: string;
  designation: string;
  employmentType: string;
  joiningDate: string;
  status: string;
}

interface ProjectData {
  code: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  status: string;
  budgetHours: number;
  budgetAmount: number;
}

interface ContractData {
  contractNumber: string;
  name: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  value: number;
  currency: string;
}

interface RequestData {
  type: string;
  priority: string;
  title: string;
  description: string;
  targetEntityType: string;
  data: Record<string, unknown>;
}

interface AllocationData {
  resourceId: string;
  projectId: string;
  startDate: string;
  endDate: string;
  allocationPercentage: number;
  role: string;
}

/**
 * API helper for making authenticated requests
 */
export interface ApiHelper {
  get: <T = unknown>(path: string) => Promise<T>;
  post: <T = unknown>(path: string, data?: unknown) => Promise<T>;
  put: <T = unknown>(path: string, data?: unknown) => Promise<T>;
  patch: <T = unknown>(path: string, data?: unknown) => Promise<T>;
  delete: <T = unknown>(path: string) => Promise<T>;
}

// ============================================================================
// Custom Test Fixtures
// ============================================================================

/**
 * Extended test fixtures with additional helpers
 */
export interface TestFixtures {
  /**
   * Currently authenticated user
   */
  authenticatedUser: AuthenticatedUser;
  
  /**
   * API helper with authentication
   */
  api: ApiHelper;
  
  /**
   * Test data factory functions
   */
  testData: TestDataFactory;
  
  /**
   * Login as a specific role
   */
  loginAs: (role: UserRole) => Promise<AuthenticatedUser>;
  
  /**
   * Page with common helpers
   */
  appPage: AppPage;
}

// ============================================================================
// App Page Helper
// ============================================================================

/**
 * App-specific page helpers
 */
export class AppPage {
  constructor(
    private page: Page,
    private context: BrowserContext,
  ) {}

  // Navigation helpers
  async goto(path: string) {
    await this.page.goto(path);
    await this.page.waitForLoadState('networkidle');
  }

  async gotoResources() {
    await this.goto('/resources');
    await this.page.waitForSelector('[data-testid="resources-page"]');
  }

  async gotoProjects() {
    await this.goto('/projects');
    await this.page.waitForSelector('[data-testid="projects-page"]');
  }

  async gotoContracts() {
    await this.goto('/contracts');
    await this.page.waitForSelector('[data-testid="contracts-page"]');
  }

  async gotoRequests() {
    await this.goto('/requests');
    await this.page.waitForSelector('[data-testid="requests-page"]');
  }

  async gotoDashboard() {
    await this.goto('/dashboard');
    await this.page.waitForSelector('[data-testid="dashboard-page"]');
  }

  async gotoSettings() {
    await this.goto('/settings');
    await this.page.waitForSelector('[data-testid="settings-page"]');
  }

  // UI helpers
  async clickButton(text: string) {
    await this.page.getByRole('button', { name: text }).click();
  }

  async fillInput(label: string, value: string) {
    await this.page.getByLabel(label).fill(value);
  }

  async selectOption(label: string, value: string) {
    await this.page.getByLabel(label).selectOption(value);
  }

  async checkCheckbox(label: string) {
    await this.page.getByLabel(label).check();
  }

  async uncheckCheckbox(label: string) {
    await this.page.getByLabel(label).uncheck();
  }

  // Wait helpers
  async waitForToast(text?: string) {
    if (text) {
      await this.page.waitForSelector(`text=${text}`);
    } else {
      await this.page.waitForSelector('[data-testid="toast"]');
    }
  }

  async waitForModal() {
    await this.page.waitForSelector('[role="dialog"]');
  }

  async closeModal() {
    await this.page.keyboard.press('Escape');
    await this.page.waitForSelector('[role="dialog"]', { state: 'hidden' });
  }

  // Table helpers
  async getTableRowCount() {
    return await this.page.locator('tbody tr').count();
  }

  async clickTableRow(index: number) {
    await this.page.locator('tbody tr').nth(index).click();
  }

  async searchInTable(searchText: string) {
    await this.page.getByPlaceholder(/search/i).fill(searchText);
    await this.page.waitForTimeout(500); // Debounce
  }

  // Dialog helpers
  async confirmDialog() {
    await this.page.getByRole('button', { name: /confirm|yes|ok|delete|submit/i }).click();
  }

  async cancelDialog() {
    await this.page.getByRole('button', { name: /cancel|no|close/i }).click();
  }

  // Navigation state
  async getCurrentPath() {
    return new URL(this.page.url()).pathname;
  }

  async expectPath(path: string) {
    await expect(this.page).toHaveURL(new RegExp(path));
  }

  // Screenshot helper
  async screenshot(name: string) {
    await this.page.screenshot({ path: `test-results/screenshots/${name}.png` });
  }
}

// ============================================================================
// Test Data Factory Implementation
// ============================================================================

function createTestDataFactory(): TestDataFactory {
  let counter = 0;
  
  const uniqueId = () => {
    counter++;
    return `${Date.now()}-${counter}`;
  };

  return {
    resource: (overrides = {}) => ({
      firstName: `Test`,
      lastName: `Resource${uniqueId()}`,
      email: `test.resource${uniqueId()}@rmgaas.test`,
      employeeId: `EMP${uniqueId()}`,
      department: 'Engineering',
      designation: 'Software Engineer',
      employmentType: 'FULL_TIME',
      joiningDate: new Date().toISOString().split('T')[0],
      status: 'ACTIVE',
      ...overrides,
    }),

    project: (overrides = {}) => ({
      code: `PRJ${uniqueId()}`,
      name: `Test Project ${uniqueId()}`,
      description: 'E2E test project',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'ACTIVE',
      budgetHours: 1000,
      budgetAmount: 500000,
      ...overrides,
    }),

    contract: (overrides = {}) => ({
      contractNumber: `CTR${uniqueId()}`,
      name: `Test Contract ${uniqueId()}`,
      type: 'TIME_AND_MATERIAL',
      status: 'DRAFT',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      value: 1000000,
      currency: 'INR',
      ...overrides,
    }),

    request: (overrides = {}) => ({
      type: 'RESOURCE_ONBOARDING',
      priority: 'MEDIUM',
      title: `Test Request ${uniqueId()}`,
      description: 'E2E test request',
      targetEntityType: 'Resource',
      data: {},
      ...overrides,
    }),

    allocation: (overrides = {}) => ({
      resourceId: '',
      projectId: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      allocationPercentage: 100,
      role: 'Developer',
      ...overrides,
    }),
  };
}

// ============================================================================
// API Helper Implementation
// ============================================================================

function createApiHelper(request: APIRequestContext, token: string): ApiHelper {
  const baseHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  const apiUrl = testConfig.apiURL;

  return {
    async get<T>(path: string): Promise<T> {
      const response = await request.get(`${apiUrl}${path}`, {
        headers: baseHeaders,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(`API GET ${path} failed: ${response.status} - ${JSON.stringify(data)}`);
      }
      return data as T;
    },

    async post<T>(path: string, body?: unknown): Promise<T> {
      const response = await request.post(`${apiUrl}${path}`, {
        headers: baseHeaders,
        data: body,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(`API POST ${path} failed: ${response.status} - ${JSON.stringify(data)}`);
      }
      return data as T;
    },

    async put<T>(path: string, body?: unknown): Promise<T> {
      const response = await request.put(`${apiUrl}${path}`, {
        headers: baseHeaders,
        data: body,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(`API PUT ${path} failed: ${response.status} - ${JSON.stringify(data)}`);
      }
      return data as T;
    },

    async patch<T>(path: string, body?: unknown): Promise<T> {
      const response = await request.patch(`${apiUrl}${path}`, {
        headers: baseHeaders,
        data: body,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(`API PATCH ${path} failed: ${response.status} - ${JSON.stringify(data)}`);
      }
      return data as T;
    },

    async delete<T>(path: string): Promise<T> {
      const response = await request.delete(`${apiUrl}${path}`, {
        headers: baseHeaders,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(`API DELETE ${path} failed: ${response.status} - ${JSON.stringify(data)}`);
      }
      return data as T;
    },
  };
}

// ============================================================================
// Extended Test with Fixtures
// ============================================================================

export const test = base.extend<TestFixtures>({
  // Test data factory
  testData: async ({}, use) => {
    await use(createTestDataFactory());
  },

  // Authenticated user from storage state
  authenticatedUser: async ({ page }, use) => {
    // This would come from the auth setup
    // For now, create a mock user
    const user: AuthenticatedUser = {
      id: 'test-user-id',
      email: testConfig.testUser.email,
      firstName: 'Test',
      lastName: 'User',
      role: 'manager',
      tenantId: 'test-tenant',
      accessToken: '', // Will be set during login
    };
    await use(user);
  },

  // API helper
  api: async ({ request, authenticatedUser }, use) => {
    const helper = createApiHelper(request, authenticatedUser.accessToken);
    await use(helper);
  },

  // Login as different role
  loginAs: async ({ page, context }, use) => {
    const loginFn = async (role: UserRole): Promise<AuthenticatedUser> => {
      // Get credentials based on role
      const credentials = role === 'admin' 
        ? testConfig.adminUser 
        : testConfig.testUser;

      // Perform login
      await page.goto('/login');
      await page.fill('[name="email"]', credentials.email);
      await page.fill('[name="password"]', credentials.password);
      await page.click('button[type="submit"]');
      
      // Wait for redirect
      await page.waitForURL(/\/(dashboard|home)/);
      
      // Extract user info from storage/cookies
      const cookies = await context.cookies();
      const authCookie = cookies.find(c => c.name === 'auth_token');
      
      return {
        id: 'logged-in-user',
        email: credentials.email,
        firstName: role === 'admin' ? 'Admin' : 'Test',
        lastName: 'User',
        role,
        tenantId: 'test-tenant',
        accessToken: authCookie?.value || '',
      };
    };
    
    await use(loginFn);
  },

  // App page helper
  appPage: async ({ page, context }, use) => {
    const appPage = new AppPage(page, context);
    await use(appPage);
  },
});

// Re-export expect for convenience
export { expect };

// ============================================================================
// Test Annotations
// ============================================================================

/**
 * Mark test as smoke test (runs on every commit)
 */
export const smokeTest = test.extend({});
smokeTest.use({ tag: '@smoke' });

/**
 * Mark test as regression test (runs nightly)
 */
export const regressionTest = test.extend({});
regressionTest.use({ tag: '@regression' });

/**
 * Mark test as visual test (screenshot comparison)
 */
export const visualTest = test.extend({});
visualTest.use({ tag: '@visual' });
