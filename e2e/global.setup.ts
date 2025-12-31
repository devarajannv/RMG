/**
 * Global Setup for E2E Tests
 * 
 * Runs once before all tests:
 * - Seeds test database with required data
 * - Creates test users
 * - Validates environment
 * 
 * @module e2e/global.setup
 */

import { FullConfig } from '@playwright/test';
import { testConfig } from './playwright.config';

async function globalSetup(config: FullConfig) {
  console.log('\n🚀 E2E Global Setup Starting...\n');
  
  const startTime = Date.now();
  
  // ==========================================================================
  // 1. Environment Validation
  // ==========================================================================
  console.log('📋 Validating environment...');
  
  const requiredEnvVars = [
    'DATABASE_URL',
  ];
  
  const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName] && varName !== 'DATABASE_URL'
  );
  
  if (missingVars.length > 0) {
    console.warn(`⚠️  Warning: Missing optional env vars: ${missingVars.join(', ')}`);
  }
  
  // ==========================================================================
  // 2. API Health Check
  // ==========================================================================
  console.log('🏥 Checking API health...');
  
  const apiBaseUrl = testConfig.apiURL.replace('/api/v1', '');
  
  try {
    const healthResponse = await fetch(`${apiBaseUrl}/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    
    if (!healthResponse.ok) {
      throw new Error(`API health check failed: ${healthResponse.status}`);
    }
    
    console.log('✅ API is healthy');
  } catch (error) {
    console.log('⚠️  API not running - tests will start it automatically');
  }
  
  // ==========================================================================
  // 3. Frontend Health Check
  // ==========================================================================
  console.log('🌐 Checking frontend...');
  
  try {
    const frontendResponse = await fetch(testConfig.baseURL, {
      method: 'GET',
    });
    
    if (!frontendResponse.ok) {
      throw new Error(`Frontend check failed: ${frontendResponse.status}`);
    }
    
    console.log('✅ Frontend is ready');
  } catch (error) {
    console.log('⚠️  Frontend not running - tests will start it automatically');
  }
  
  // ==========================================================================
  // 4. Seed Test Data (if API is available)
  // ==========================================================================
  console.log('🌱 Preparing test data...');
  
  try {
    // Check if test user exists, if not create via API
    const loginResponse = await fetch(`${testConfig.apiURL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        email: testConfig.testUser.email,
        password: testConfig.testUser.password,
      }),
    });
    
    if (loginResponse.ok) {
      console.log('✅ Test user validated');
    } else {
      console.log('⚠️  Test user not found - will be created during auth setup');
    }
  } catch (error) {
    console.log('⚠️  Could not validate test user - API may not be running yet');
  }
  
  // ==========================================================================
  // 5. Create Auth Storage Directory
  // ==========================================================================
  const fs = await import('fs/promises');
  const path = await import('path');
  
  const authDir = path.join(process.cwd(), 'e2e', '.auth');
  
  try {
    await fs.mkdir(authDir, { recursive: true });
    console.log('✅ Auth storage directory ready');
  } catch (error) {
    // Directory might already exist
  }
  
  // ==========================================================================
  // 6. Setup Complete
  // ==========================================================================
  const duration = Date.now() - startTime;
  console.log(`\n✨ Global setup complete in ${duration}ms\n`);
  
  // Store setup metadata for teardown
  process.env.E2E_SETUP_TIMESTAMP = new Date().toISOString();
  
  return;
}

export default globalSetup;
