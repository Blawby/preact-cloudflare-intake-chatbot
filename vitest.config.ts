import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

// Unified test configuration - all tests use real API calls
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ["./tests/setup-real-api.ts", "./tests/setup-node.ts"],
    testTimeout: 60000, // 60 seconds for real API tests
    hookTimeout: 60000, // 60 seconds for hooks (beforeAll/afterAll)
    threads: false, // Disable worker threads to prevent multiple wrangler dev instances from colliding
    fileParallelism: false, // Force single-file execution to prevent file-level parallelism
    include: [
      'tests/**/*.{test,spec}.{js,ts,jsx,tsx}'
    ],
    exclude: [
      'node_modules/**',
      'dist/**',
      'e2e/**'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'tests/fixtures/',
        '**/*.d.ts',
        '**/*.config.*'
      ]
    }
  },
  esbuild: {
    target: 'es2020',
    loader: 'ts'
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '~': resolve(__dirname, './'),
      '@tests': resolve(__dirname, './tests'),
      '@fixtures': resolve(__dirname, './tests/fixtures'),
      'worker_threads': resolve(__dirname, './tests/stubs/worker_threads.ts'),
      'node:worker_threads': resolve(__dirname, './tests/stubs/worker_threads.ts')
    }
  }
}); 