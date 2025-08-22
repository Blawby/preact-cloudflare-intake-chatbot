import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

// Frontend tests (components, utils) - use happy-dom
const frontendConfig = defineConfig({
  test: {
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'src/__tests__/',
        'tests/fixtures/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/index.tsx',
        '**/main.tsx',
        '**/setup.ts'
      ]
    },
    include: [
      'tests/unit/components/**/*.{test,spec}.{js,ts,jsx,tsx}',
      'tests/unit/utils/**/*.{test,spec}.{js,ts}',
      'src/**/*.{test,spec}.{js,ts,jsx,tsx}'
    ],
    exclude: [
      'node_modules/**',
      'dist/**',
      'src/__tests__/**', // Legacy test directory
      'tests/unit/worker/**',
      'tests/integration/**',
      'tests/paralegal/**'
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

// Fast tests config - excludes slow integration and LLM judge tests
const fastConfig = defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ["./tests/setup-node.ts"],
    timeout: 30000, // 30 seconds
    include: [
      'tests/unit/**/*.{test,spec}.{js,ts,jsx,tsx}',
      'tests/integration/**/*.{test,spec}.ts',
      'tests/paralegal/**/*.{test,spec}.ts'
    ],
    exclude: [
      'node_modules/**',
      'dist/**',
      'tests/llm-judge/**/*.{test,spec}.ts', // Exclude slow LLM judge tests
      'tests/integration/llm-judge.test.ts' // Also exclude the integration LLM judge test
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

// Slow tests config - includes LLM judge tests with extended timeout
const slowConfig = defineConfig({
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

// Export fast config as default
export default fastConfig; 