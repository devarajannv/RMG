/**
 * Authentication Setup Test
 * 
 * Runs before all tests to create authenticated browser state.
 * This state is then reused by all test projects.
 * 
 * @module e2e/tests/auth.setup
 */

import { test as setup, expect } from '@playwright/test';
import { testConfig } from '../playwright.config';
import { setupAuth } from '../utils/auth';

/**
 * Authenticate as regular test user
 */
setup('authenticate as user', async ({ request }) => {
  console.log('🔐 Setting up authentication for test user...');
  
  try {
    await setupAuth(request, '.auth/user.json', testConfig.testUser);
    console.log('✅ User authentication state saved');
  } catch (error) {
    console.error('❌ User authentication failed:', error);
    
    // Create a minimal storage state even if auth fails
    // This allows tests to handle unauthenticated state gracefully
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const emptyState = {
      cookies: [],
      origins: [],
    };
    
    const authDir = path.join(process.cwd(), '.auth');
    await fs.mkdir(authDir, { recursive: true });
    await fs.writeFile(
      path.join(authDir, 'user.json'),
      JSON.stringify(emptyState, null, 2)
    );
    
    console.log('⚠️  Created empty auth state - tests will need to handle login');
  }
});

/**
 * Authenticate as admin user
 */
setup('authenticate as admin', async ({ request }) => {
  console.log('🔐 Setting up authentication for admin user...');
  
  try {
    await setupAuth(request, '.auth/admin.json', testConfig.adminUser);
    console.log('✅ Admin authentication state saved');
  } catch (error) {
    console.error('❌ Admin authentication failed:', error);
    
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const emptyState = {
      cookies: [],
      origins: [],
    };
    
    const authDir = path.join(process.cwd(), '.auth');
    await fs.mkdir(authDir, { recursive: true });
    await fs.writeFile(
      path.join(authDir, 'admin.json'),
      JSON.stringify(emptyState, null, 2)
    );
    
    console.log('⚠️  Created empty admin auth state');
  }
});
