import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    exclude: [
      'node_modules',
      'dist',
      // Exclude integration tests - they need real DB connections
      'src/test/integration/database.integration.test.ts',
      'src/test/integration/cross-tenant-isolation.test.ts',
      'src/test/integration/workflow-state-machine.test.ts',
      'src/test/integration/sla-calculation.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules',
        'dist',
        'prisma',
        '**/*.d.ts',
        '**/*.test.ts',
        '**/*.spec.ts',
      ],
    },
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 10000,
  },
});

