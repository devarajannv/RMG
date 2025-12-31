/**
 * E2E Test Helpers
 * Shared utilities for all E2E tests
 */

export const API_URL = process.env.API_URL || 'http://localhost:4000';

export interface ApiResponse<T = unknown> {
  status: number;
  data: T;
  headers: Headers;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  tokens: AuthTokens;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Make an API request
 */
export async function apiRequest<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
  token?: string
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data: T;
  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    data = await response.json();
  } else {
    data = (await response.text()) as T;
  }

  return {
    status: response.status,
    data,
    headers: response.headers,
  };
}

/**
 * Login and get auth token
 */
export async function login(
  email = 'admin@newvision.in',
  password = 'Password123!@#'
): Promise<string | null> {
  const response = await apiRequest<LoginResponse>('POST', '/api/v1/auth/login', {
    email,
    password,
  });

  if (response.status === 200) {
    return response.data.tokens?.accessToken || null;
  }
  return null;
}

/**
 * Create a unique identifier for test data
 */
export function uniqueId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Wait for a condition with timeout
 */
export async function waitFor(
  condition: () => Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await condition()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  return false;
}

/**
 * Test data factories
 */
export const factories = {
  resource: (overrides = {}) => ({
    firstName: `TestFirst_${Date.now()}`,
    lastName: `TestLast_${Date.now()}`,
    email: `test_${Date.now()}@example.com`,
    employeeId: `EMP_${Date.now()}`,
    department: 'Engineering',
    designation: 'Developer',
    status: 'ACTIVE',
    ...overrides,
  }),

  project: (clientId: string, overrides = {}) => ({
    name: `Test Project ${Date.now()}`,
    code: `PRJ_${Date.now()}`,
    clientId,
    status: 'ACTIVE',
    startDate: new Date().toISOString().split('T')[0],
    ...overrides,
  }),

  client: (overrides = {}) => ({
    name: `Test Client ${Date.now()}`,
    code: `CLI_${Date.now()}`,
    industry: 'Technology',
    status: 'ACTIVE',
    ...overrides,
  }),

  contract: (clientId: string, overrides = {}) => ({
    contractNumber: `CON_${Date.now()}`,
    clientId,
    title: `Test Contract ${Date.now()}`,
    type: 'TIME_AND_MATERIALS',
    status: 'DRAFT',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    value: 100000,
    currency: 'INR',
    ...overrides,
  }),

  request: (overrides = {}) => ({
    title: `Test Request ${Date.now()}`,
    description: 'This is a test request created by E2E tests',
    type: 'GENERAL',
    priority: 'MEDIUM',
    ...overrides,
  }),

  timeEntry: (resourceId: string, projectId: string, overrides = {}) => ({
    resourceId,
    projectId,
    date: new Date().toISOString().split('T')[0],
    hours: 8,
    description: 'E2E test time entry',
    ...overrides,
  }),

  notification: (userId: string, overrides = {}) => ({
    userId,
    type: 'INFO',
    title: 'Test Notification',
    message: 'This is a test notification',
    ...overrides,
  }),

  webhook: (overrides = {}) => ({
    name: `Test Webhook ${Date.now()}`,
    url: 'https://webhook.site/test',
    events: ['request.created', 'request.approved'],
    isActive: true,
    ...overrides,
  }),
};

/**
 * Cleanup utilities - store IDs to clean up after tests
 */
export class TestCleanup {
  private items: { type: string; id: string }[] = [];
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  add(type: string, id: string) {
    this.items.push({ type, id });
  }

  async cleanup() {
    if (!this.token) return;

    // Delete in reverse order (dependencies last)
    for (const item of this.items.reverse()) {
      try {
        await apiRequest('DELETE', `/api/v1/${item.type}/${item.id}`, undefined, this.token);
      } catch {
        // Ignore cleanup errors
      }
    }
    this.items = [];
  }
}
