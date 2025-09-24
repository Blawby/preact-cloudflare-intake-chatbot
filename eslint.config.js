import js from '@eslint/js';
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
      'playwright-report/**',
      'test-results/**',
      'test-logs-*/**',
      '*.min.js',
      '*.bundle.js',
      'sw.js',
      'workbox-*.js',
      'workbox-*.js.map'
    ]
  },

  // Frontend TypeScript files configuration
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        // Browser globals for frontend
        'window': 'readonly',
        'document': 'readonly',
        'console': 'readonly',
        'fetch': 'readonly',
        'URL': 'readonly',
        'URLSearchParams': 'readonly',
        'FormData': 'readonly',
        'Blob': 'readonly',
        'File': 'readonly',
        'FileReader': 'readonly',
        'atob': 'readonly',
        'btoa': 'readonly',
        'setTimeout': 'readonly',
        'clearTimeout': 'readonly',
        'setInterval': 'readonly',
        'clearInterval': 'readonly',
        'alert': 'readonly',
        'confirm': 'readonly',
        'prompt': 'readonly',
        'localStorage': 'readonly',
        'sessionStorage': 'readonly',
        'navigator': 'readonly',
        'location': 'readonly',
        'history': 'readonly'
      }
    },
    plugins: {
      '@typescript-eslint': typescript,
      react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y
    },
    rules: {
      // TypeScript specific rules (basic recommended only)
      ...typescript.configs.recommended.rules,
      
      // React/Preact rules
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      
      // Custom overrides
      '@typescript-eslint/no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      
      // React/JSX rules (works with Preact)
      'react/jsx-uses-react': 'off', // Not needed with Preact
      'react/react-in-jsx-scope': 'off', // Not needed with Preact
      'react/prop-types': 'off', // Using TypeScript instead
      'react/jsx-key': 'error',
      'react/jsx-no-duplicate-props': 'error',
      'react/jsx-no-undef': 'error',
      'react/no-unknown-property': 'error',
      'react/self-closing-comp': 'error',
      
      // React Hooks rules
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      
      
      // General rules
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-unused-vars': 'off', // Using TypeScript version instead
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

  // Worker TypeScript files configuration
  {
    files: ['worker/**/*.{ts,js}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
      },
      globals: {
        // Cloudflare Workers globals
        'Request': 'readonly',
        'Response': 'readonly',
        'Headers': 'readonly',
        'URL': 'readonly',
        'URLSearchParams': 'readonly',
        'FormData': 'readonly',
        'Blob': 'readonly',
        'File': 'readonly',
        'ReadableStream': 'readonly',
        'WritableStream': 'readonly',
        'TransformStream': 'readonly',
        'crypto': 'readonly',
        'fetch': 'readonly',
        'console': 'readonly',
        'setTimeout': 'readonly',
        'clearTimeout': 'readonly',
        'setInterval': 'readonly',
        'clearInterval': 'readonly',
        'addEventListener': 'readonly',
        'removeEventListener': 'readonly',
        'dispatchEvent': 'readonly',
        'atob': 'readonly',
        'btoa': 'readonly',
        'TextEncoder': 'readonly',
        'TextDecoder': 'readonly',
        'AbortController': 'readonly',
        'AbortSignal': 'readonly',
        'Buffer': 'readonly',
        'ReadableStreamDefaultController': 'readonly'
      }
    },
    plugins: {
      '@typescript-eslint': typescript
    },
    rules: {
      ...typescript.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': 'off', // Console is useful in workers
      'no-unused-vars': 'off'
    }
  },

  // JavaScript files configuration
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y
    },
    rules: {
      // React/Preact rules
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      
      // React/JSX rules (works with Preact)
      'react/jsx-uses-react': 'off', // Not needed with Preact
      'react/react-in-jsx-scope': 'off', // Not needed with Preact
      'react/prop-types': 'off', // Using TypeScript instead
      'react/jsx-key': 'error',
      'react/jsx-no-duplicate-props': 'error',
      'react/jsx-no-undef': 'error',
      'react/no-unknown-property': 'error',
      'react/self-closing-comp': 'error',
      
      // React Hooks rules
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      
      // General rules
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],
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


  // Test files configuration
  {
    files: ['**/*.{test,spec}.{ts,tsx,js,jsx}', 'tests/**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      globals: {
        'describe': 'readonly',
        'it': 'readonly',
        'test': 'readonly',
        'expect': 'readonly',
        'beforeEach': 'readonly',
        'afterEach': 'readonly',
        'beforeAll': 'readonly',
        'afterAll': 'readonly',
        'vi': 'readonly',
        'vitest': 'readonly'
      }
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off', // Tests often need any
      'no-console': 'off', // Console is useful in tests
      '@typescript-eslint/no-non-null-assertion': 'off' // Tests often use non-null assertions
    }
  }
];