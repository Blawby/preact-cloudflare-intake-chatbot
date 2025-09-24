/* eslint-disable import/no-unresolved */
import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import importPlugin from 'eslint-plugin-import';

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

  // TypeScript files configuration (without project for better performance)
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true
        }
        // Removed project: './tsconfig.json' to avoid performance issues
      }
    },
    plugins: {
      '@typescript-eslint': typescript,
      react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
      import: importPlugin
    },
    rules: {
      // TypeScript specific rules (basic recommended only)
      ...typescript.configs.recommended.rules,
      
      // React/Preact rules
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      
      // Import rules
      ...importPlugin.configs.recommended.rules,
      
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
      
      // Import rules
      'import/order': ['error', {
        groups: [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index'
        ],
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true
        }
      }],
      'import/no-unresolved': 'off', // TypeScript handles this
      'import/named': 'off', // TypeScript handles this
      'import/default': 'off', // TypeScript handles this
      'import/namespace': 'off', // TypeScript handles this
      
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
      },
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true
          // Removed project reference for better performance
        }
      }
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
      'jsx-a11y': jsxA11y,
      import: importPlugin
    },
    rules: {
      // React/Preact rules
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      
      // Import rules
      ...importPlugin.configs.recommended.rules,
      
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

  // Worker-specific configuration
  {
    files: ['worker/**/*.{ts,js}'],
    languageOptions: {
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
        'AbortSignal': 'readonly'
      }
    },
    rules: {
      // Worker-specific rules
      'no-console': 'off', // Console is useful in workers
      '@typescript-eslint/no-explicit-any': 'warn' // More lenient for worker code
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