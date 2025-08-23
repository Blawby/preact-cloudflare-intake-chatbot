import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

// Slow test configuration - specifically for LLM judge tests
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ["./tests/setup-real-api.ts"],
    timeout: 120000, // 2 minutes for slow LLM judge tests
    hookTimeout: 120000, // 2 minutes for hooks (beforeAll/afterAll)
    include: [
      'tests/llm-judge/**/*.{test,spec}.{js,ts,jsx,tsx}'
    ],
    exclude: [
      'node_modules/**',
      'dist/**',
      'tests/unit/**',
      'tests/integration/**'
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
