import { defineConfig } from 'vitest/config';
import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";
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

// Worker tests (DO, services, routes, queues) - use Workers runtime
const workerConfig = defineWorkersConfig({
  test: {
    globals: true,
    poolOptions: {
      workers: {
        // Use wrangler.toml for real bindings (DO, KV, R2, D1, Queues)
        wrangler: { configPath: "./wrangler.toml" },
        // Isolated storage per test file
        isolatedStorage: true,
        // Add compatibility settings
        miniflare: {
          compatibilityDate: "2024-12-01",
          compatibilityFlags: ["nodejs_compat"]
        }
      },
    },
    setupFiles: ["./tests/setup-workers.ts"],
    include: [
      'tests/unit/worker/**/*.{test,spec}.ts',
      'tests/integration/**/*.{test,spec}.ts',
      'tests/paralegal/**/*.{test,spec}.ts'
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
      '~': resolve(__dirname, './'),
      '@tests': resolve(__dirname, './tests'),
      '@fixtures': resolve(__dirname, './tests/fixtures')
    }
  }
});

// Export worker config by default (most of our new tests will be worker tests)
export default workerConfig; 