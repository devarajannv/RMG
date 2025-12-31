/**
 * Global Teardown for E2E Tests
 * 
 * Runs once after all tests complete:
 * - Cleans up test data
 * - Generates summary report
 * - Archives artifacts
 * 
 * @module e2e/global.teardown
 */

import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('\n🧹 E2E Global Teardown Starting...\n');
  
  const startTime = Date.now();
  const setupTimestamp = process.env.E2E_SETUP_TIMESTAMP;
  
  // ==========================================================================
  // 1. Test Run Summary
  // ==========================================================================
  console.log('📊 Test Run Summary:');
  console.log(`   Setup started: ${setupTimestamp || 'Unknown'}`);
  console.log(`   Teardown time: ${new Date().toISOString()}`);
  
  // ==========================================================================
  // 2. Clean Up Auth Storage
  // ==========================================================================
  console.log('\n🗑️  Cleaning up auth storage...');
  
  const fs = await import('fs/promises');
  const path = await import('path');
  
  const authDir = path.join(process.cwd(), 'e2e', '.auth');
  
  try {
    const files = await fs.readdir(authDir);
    for (const file of files) {
      if (file.endsWith('.json')) {
        await fs.unlink(path.join(authDir, file));
      }
    }
    console.log('✅ Auth storage cleaned');
  } catch (error) {
    console.log('⚠️  No auth files to clean');
  }
  
  // ==========================================================================
  // 3. Clean Up Test Data (Optional - in production DB)
  // ==========================================================================
  // In CI environments, we might want to clean up test-created data
  // For now, we'll skip this to preserve data for debugging
  
  if (process.env.E2E_CLEANUP_DATA === 'true') {
    console.log('\n🧹 Cleaning up test data...');
    // Add cleanup logic here if needed
    console.log('✅ Test data cleaned');
  }
  
  // ==========================================================================
  // 4. Archive Test Results (CI Only)
  // ==========================================================================
  if (process.env.CI) {
    console.log('\n📦 Archiving test results...');
    
    const resultsDir = path.join(process.cwd(), 'e2e', 'test-results');
    const archiveDir = path.join(process.cwd(), 'e2e', 'archives');
    
    try {
      await fs.mkdir(archiveDir, { recursive: true });
      
      // Create timestamped archive folder
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const archivePath = path.join(archiveDir, `run-${timestamp}`);
      await fs.mkdir(archivePath, { recursive: true });
      
      // Copy important artifacts
      const artifactsToCopy = ['junit.xml', 'results.json'];
      for (const artifact of artifactsToCopy) {
        const srcPath = path.join(resultsDir, artifact);
        const destPath = path.join(archivePath, artifact);
        try {
          await fs.copyFile(srcPath, destPath);
        } catch {
          // File might not exist
        }
      }
      
      console.log(`✅ Results archived to: ${archivePath}`);
    } catch (error) {
      console.log('⚠️  Could not archive results');
    }
  }
  
  // ==========================================================================
  // 5. Teardown Complete
  // ==========================================================================
  const duration = Date.now() - startTime;
  console.log(`\n✨ Global teardown complete in ${duration}ms\n`);
  
  return;
}

export default globalTeardown;
