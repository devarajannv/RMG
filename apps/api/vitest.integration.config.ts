import { defineConfig } from 'vitest/config';
import * as dotenv from 'dotenv';

// Load real .env file for integration tests
dotenv.config();

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/test/integration/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    testTimeout: 30000, // Longer timeout for DB operations
    // NO setupFiles - we want real connections, not mocks
  },
});
