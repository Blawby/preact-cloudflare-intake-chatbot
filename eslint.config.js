import js from '@eslint/js';
import { fixupPluginRules } from '@eslint/compat';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default [
  // Base JavaScript configuration
  js.configs.recommended,

  // Global ignores
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'worker/node_modules/**',
      'coverage/**',
      'test-results/**',
      'test-logs-*/**',
      '*.min.js',
      '*.bundle.js',
      'sw.js',
      'workbox-*.js',
      'workbox-*.js.map',
      '.wrangler/tmp/**',
      '.wrangler/**',
      'public/sw.js', // Service worker file
      'sync-teams.js', // Node.js script with different globals
      'tailwind.config.js' // Config file with require()
    ]
  },

  // Application source (frontend TS/JS + JSX/TSX)
  {
    files: ['src/**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true }
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        FormData: 'readonly',
        Blob: 'readonly',
        File: 'readonly',
        FileReader: 'readonly',
        atob: 'readonly',
        btoa: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        prompt: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        navigator: 'readonly',
        location: 'readonly',
        history: 'readonly',
        crypto: 'readonly'
      }
    },
    plugins: {
      '@typescript-eslint': typescript,
      react: fixupPluginRules(react),
      'react-hooks': fixupPluginRules(reactHooks),
      'jsx-a11y': fixupPluginRules(jsxA11y)
    },
    rules: {
      // TypeScript rules
      ...typescript.configs.recommended.rules,
      'no-undef': 'off', // Let TypeScript compiler handle DOM/ambient types
      '@typescript-eslint/no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_', 
        varsIgnorePattern: '^_', 
        caughtErrorsIgnorePattern: '^_',
        ignoreRestSiblings: true 
      }],
      '@typescript-eslint/no-explicit-any': 'off', // Allow any in development
      '@typescript-eslint/no-non-null-assertion': 'warn', // TODO: consider stricter null safety later

      // React/JSX + hooks + a11y
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      // Relax some accessibility rules for development
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/no-static-element-interactions': 'warn',
      'jsx-a11y/media-has-caption': 'warn',
      'jsx-a11y/no-autofocus': 'warn',
      'jsx-a11y/role-supports-aria-props': 'warn',
      'jsx-a11y/no-noninteractive-element-to-interactive-role': 'warn',
      'react/jsx-uses-react': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off', // using TS instead
      'react/jsx-key': 'error',
      'react/jsx-no-duplicate-props': 'error',
      'react/jsx-no-undef': 'error',
      'react/no-unknown-property': 'warn', // Allow class instead of className in some cases
      'react/self-closing-comp': 'warn',
      'react-hooks/rules-of-hooks': 'error', // Keep this as error for safety
      'react-hooks/exhaustive-deps': 'warn', // TODO: consider error once deps are stabilized

      // General best practices
      'no-console': 'off', // Allow console in development
      'no-debugger': 'error',
      'no-unused-vars': 'off', // handled by TS rule
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-template': 'error'
    },
    settings: {
      react: {
        version: 'detect',
        pragma: 'h'
      }
    }
  },

  // Worker files (Cloudflare Workers runtime)
  {
    files: ['worker/**/*.{ts,js}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
      globals: {
        Request: 'readonly',
        Response: 'readonly',
        Headers: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        FormData: 'readonly',
        Blob: 'readonly',
        File: 'readonly',
        ReadableStream: 'readonly',
        WritableStream: 'readonly',
        TransformStream: 'readonly',
        crypto: 'readonly',
        fetch: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        addEventListener: 'readonly',
        removeEventListener: 'readonly',
        dispatchEvent: 'readonly',
        atob: 'readonly',
        btoa: 'readonly',
        TextEncoder: 'readonly',
        TextDecoder: 'readonly',
        AbortController: 'readonly',
        AbortSignal: 'readonly',
        Buffer: 'readonly',
        ReadableStreamDefaultController: 'readonly',
        ExecutionContext: 'readonly', // TODO: validate Worker typing approach
        process: 'readonly', // TODO: replace with CF-safe env vars if possible
        MessageBatch: 'readonly',
        BodyInit: 'readonly'
      }
    },
    plugins: { '@typescript-eslint': typescript },
    rules: {
      ...typescript.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_', 
        varsIgnorePattern: '^_', 
        caughtErrorsIgnorePattern: '^_',
        ignoreRestSiblings: true 
      }],
      '@typescript-eslint/no-explicit-any': 'off', // Allow any in development
      'no-console': 'off', // keep console logging for Workers (debugging/forensics)
      'no-unused-vars': 'off'
    }
  },

  // Node.js scripts
  {
    files: ['scripts/**/*.{js,ts,mjs}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        URL: 'readonly'
      }
    },
    plugins: { '@typescript-eslint': typescript },
    rules: {
      ...typescript.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_', 
        varsIgnorePattern: '^_', 
        caughtErrorsIgnorePattern: '^_',
        ignoreRestSiblings: true 
      }],
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off', // console useful in scripts
      'no-unused-vars': 'off'
    }
  },

  // Root config files (Node environment)
  {
    files: ['*.config.{js,ts,mjs}', 'vite.config.ts', 'vitest.config.ts', 'tailwind.config.js', 'postcss.config.js'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
      globals: {
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly'
      }
    },
    plugins: { '@typescript-eslint': typescript },
    rules: {
      ...typescript.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_', 
        varsIgnorePattern: '^_', 
        caughtErrorsIgnorePattern: '^_',
        ignoreRestSiblings: true 
      }],
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
      'no-unused-vars': 'off'
    }
  },

  // Tests (Vitest / Jest style globals)
  {
    files: ['**/*.{test,spec}.{ts,tsx,js,jsx}', 'tests/**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true }
      },
      globals: {
        // Test framework globals
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        vi: 'readonly',
        vitest: 'readonly',
        // Browser/Node globals for tests
        global: 'readonly',
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
        FormData: 'readonly',
        Blob: 'readonly',
        File: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        crypto: 'readonly',
        TextEncoder: 'readonly',
        TextDecoder: 'readonly',
        AbortController: 'readonly',
        AbortSignal: 'readonly',
        // Worker globals
        Request: 'readonly',
        Response: 'readonly',
        Headers: 'readonly',
        ReadableStream: 'readonly',
        WritableStream: 'readonly',
        TransformStream: 'readonly',
        addEventListener: 'readonly',
        removeEventListener: 'readonly',
        dispatchEvent: 'readonly',
        atob: 'readonly',
        btoa: 'readonly',
        // Service Worker globals
        self: 'readonly',
        event: 'readonly',
        // Cloudflare Workers globals
        ExecutionContext: 'readonly',
        MessageBatch: 'readonly',
        BodyInit: 'readonly'
      }
    },
    plugins: {
      '@typescript-eslint': typescript,
      react: fixupPluginRules(react),
      'react-hooks': fixupPluginRules(reactHooks),
      'jsx-a11y': fixupPluginRules(jsxA11y)
    },
    rules: {
      ...typescript.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_', 
        varsIgnorePattern: '^_', 
        caughtErrorsIgnorePattern: '^_',
        ignoreRestSiblings: true 
      }],
      '@typescript-eslint/no-explicit-any': 'off', // TODO: re-enable once tests are typed
      '@typescript-eslint/no-non-null-assertion': 'off', // tests often assert non-null
      '@typescript-eslint/no-require-imports': 'off', // allow require in tests
      'no-console': 'off', // console useful in tests
      'no-unused-vars': 'off', // handled by TS rule
      'no-undef': 'off', // Let TypeScript compiler handle DOM/ambient types
      // React rules for test files
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      'react/jsx-uses-react': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off'
    },
    settings: {
      react: {
        version: 'detect',
        pragma: 'h'
      }
    }
  }
];
