/**
 * Authentication Utilities for E2E Tests
 * 
 * Provides:
 * - Login/logout helpers
 * - Token management
 * - Session storage
 * - Multi-user authentication
 * 
 * @module e2e/utils/auth
 */

import { Page, BrowserContext, APIRequestContext } from '@playwright/test';
import { testConfig } from '../playwright.config';

// ============================================================================
// Types
// ============================================================================

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken?: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    tenantId: string;
  };
  expiresAt: number;
}

export interface StorageState {
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    expires: number;
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'Strict' | 'Lax' | 'None';
  }>;
  origins: Array<{
    origin: string;
    localStorage: Array<{
      name: string;
      value: string;
    }>;
  }>;
}

// ============================================================================
// Auth Manager Class
// ============================================================================

export class AuthManager {
  private sessions: Map<string, AuthSession> = new Map();
  
  constructor(
    private apiUrl: string = testConfig.apiURL,
  ) {}

  /**
   * Login via API and get auth tokens
   */
  async loginApi(
    request: APIRequestContext,
    credentials: LoginCredentials = testConfig.testUser,
  ): Promise<AuthSession> {
    const cacheKey = credentials.email;
    
    // Check cache first
    const cached = this.sessions.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached;
    }

    // Perform login
    const response = await request.post(`${this.apiUrl}/auth/login`, {
      data: {
        email: credentials.email,
        password: credentials.password,
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Login failed for ${credentials.email}: ${response.status} - ${error}`);
    }

    const data = await response.json();
    
    const session: AuthSession = {
      accessToken: data.data?.accessToken || data.accessToken,
      refreshToken: data.data?.refreshToken || data.refreshToken,
      user: data.data?.user || data.user,
      expiresAt: Date.now() + (60 * 60 * 1000), // 1 hour
    };

    // Cache session
    this.sessions.set(cacheKey, session);
    
    return session;
  }

  /**
   * Login via UI
   */
  async loginUi(
    page: Page,
    credentials: LoginCredentials = testConfig.testUser,
  ): Promise<void> {
    await page.goto('/login');
    
    // Wait for login form
    await page.waitForSelector('form');
    
    // Fill credentials
    await page.fill('input[name="email"], input[type="email"]', credentials.email);
    await page.fill('input[name="password"], input[type="password"]', credentials.password);
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Wait for redirect (dashboard or home)
    await page.waitForURL(/\/(dashboard|home|resources)/, { timeout: 10000 });
    
    // Verify logged in by checking for user menu or logout button
    await page.waitForSelector('[data-testid="user-menu"], [data-testid="logout-button"], button:has-text("Logout")', {
      timeout: 5000,
    });
  }

  /**
   * Logout via UI
   */
  async logoutUi(page: Page): Promise<void> {
    // Click user menu if present
    const userMenu = page.locator('[data-testid="user-menu"]');
    if (await userMenu.isVisible()) {
      await userMenu.click();
    }

    // Click logout
    const logoutButton = page.locator('[data-testid="logout-button"], button:has-text("Logout"), a:has-text("Logout")');
    await logoutButton.click();

    // Wait for redirect to login
    await page.waitForURL(/\/login/, { timeout: 5000 });
  }

  /**
   * Logout via API
   */
  async logoutApi(request: APIRequestContext, token: string): Promise<void> {
    await request.post(`${this.apiUrl}/auth/logout`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    // Clear from cache
    for (const [key, session] of this.sessions.entries()) {
      if (session.accessToken === token) {
        this.sessions.delete(key);
        break;
      }
    }
  }

  /**
   * Refresh token
   */
  async refreshToken(
    request: APIRequestContext,
    refreshToken: string,
  ): Promise<AuthSession> {
    const response = await request.post(`${this.apiUrl}/auth/refresh`, {
      data: { refreshToken },
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      accessToken: data.data?.accessToken || data.accessToken,
      refreshToken: data.data?.refreshToken || data.refreshToken,
      user: data.data?.user || data.user,
      expiresAt: Date.now() + (60 * 60 * 1000),
    };
  }

  /**
   * Check if session is valid
   */
  isSessionValid(session: AuthSession): boolean {
    return session.expiresAt > Date.now();
  }

  /**
   * Get current user info
   */
  async getCurrentUser(request: APIRequestContext, token: string): Promise<AuthSession['user']> {
    const response = await request.get(`${this.apiUrl}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get current user: ${response.status}`);
    }

    const data = await response.json();
    return data.data || data;
  }

  /**
   * Clear all cached sessions
   */
  clearCache(): void {
    this.sessions.clear();
  }
}

// ============================================================================
// Storage State Helpers
// ============================================================================

/**
 * Save authentication state to file
 */
export async function saveAuthState(
  context: BrowserContext,
  filePath: string,
): Promise<void> {
  await context.storageState({ path: filePath });
}

/**
 * Create storage state from auth session
 */
export function createStorageState(session: AuthSession, baseUrl: string): StorageState {
  const domain = new URL(baseUrl).hostname;
  const origin = new URL(baseUrl).origin;

  return {
    cookies: [
      {
        name: 'auth_token',
        value: session.accessToken,
        domain,
        path: '/',
        expires: Math.floor(session.expiresAt / 1000),
        httpOnly: true,
        secure: baseUrl.startsWith('https'),
        sameSite: 'Lax',
      },
    ],
    origins: [
      {
        origin,
        localStorage: [
          {
            name: 'auth_token',
            value: session.accessToken,
          },
          {
            name: 'user',
            value: JSON.stringify(session.user),
          },
        ],
      },
    ],
  };
}

// ============================================================================
// Auth Setup for Tests
// ============================================================================

/**
 * Setup authentication for test suite
 * 
 * Usage in auth.setup.ts:
 * ```typescript
 * import { setupAuth } from '../utils/auth';
 * 
 * test('authenticate', async ({ request }) => {
 *   await setupAuth(request, '.auth/user.json');
 * });
 * ```
 */
export async function setupAuth(
  request: APIRequestContext,
  storageStatePath: string,
  credentials: LoginCredentials = testConfig.testUser,
): Promise<void> {
  const authManager = new AuthManager();
  await authManager.loginApi(request, credentials);
  
  // Persist the actual cookie state returned by the API instead of synthesizing it.
  const fs = await import('fs/promises');
  const path = await import('path');
  
  await fs.mkdir(path.dirname(storageStatePath), { recursive: true });
  await request.storageState({ path: storageStatePath });
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const authManager = new AuthManager();

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Wait for authentication to complete
 */
export async function waitForAuth(page: Page, timeout = 10000): Promise<void> {
  await Promise.race([
    page.waitForURL(/\/(dashboard|home|resources)/, { timeout }),
    page.waitForSelector('[data-testid="user-menu"]', { timeout }),
    page.waitForSelector('text=Logout', { timeout }),
  ]);
}

/**
 * Check if user is logged in
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  try {
    await page.waitForSelector(
      '[data-testid="user-menu"], [data-testid="logout-button"], button:has-text("Logout")',
      { timeout: 2000 }
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensure user is logged out
 */
export async function ensureLoggedOut(page: Page): Promise<void> {
  if (await isLoggedIn(page)) {
    await authManager.logoutUi(page);
  }
}

/**
 * Get auth token from page context
 */
export async function getAuthToken(context: BrowserContext): Promise<string | null> {
  const cookies = await context.cookies();
  const authCookie = cookies.find(c => c.name === 'auth_token');
  return authCookie?.value || null;
}
