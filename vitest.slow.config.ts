import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

// Slow tests config - includes LLM judge tests with extended timeout
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ["./tests/setup-node.ts"],
    timeout: 300000, // 5 minutes for slow tests
    include: [
      'tests/llm-judge/**/*.{test,spec}.ts'
    ],
    exclude: [
      'node_modules/**',
      'dist/**'
    ]
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
