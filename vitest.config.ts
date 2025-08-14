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
      '@fixtures': resolve(__dirname, './tests/fixtures')
    }
  }
});

// Unified config for all tests - temporarily using Node.js environment for worker tests
const unifiedConfig = defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ["./tests/setup-node.ts"],
    include: [
      'tests/unit/**/*.{test,spec}.{js,ts,jsx,tsx}',
      'tests/integration/**/*.{test,spec}.ts',
      'tests/paralegal/**/*.{test,spec}.ts'
    ],
    exclude: [
      'node_modules/**',
      'dist/**'
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
      '@fixtures': resolve(__dirname, './tests/fixtures')
    }
  }
});

// Export unified config
export default unifiedConfig; 