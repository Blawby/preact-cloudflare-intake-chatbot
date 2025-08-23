import { vi } from 'vitest';
import '@testing-library/jest-dom';
import { TextEncoder as NodeTextEncoder, TextDecoder as NodeTextDecoder } from 'node:util';

// Mock Cloudflare Workers environment for Node.js tests
// Only add randomUUID if it doesn't exist, preserving existing crypto methods
if (!global.crypto) {
  // Create minimal crypto object if it doesn't exist
  Object.defineProperty(global, 'crypto', {
    value: {
      randomUUID: () => `test-uuid-${Date.now()}-${Math.random()}`,
    },
    writable: true,
    configurable: true,
  });
} else if (!global.crypto.randomUUID) {
  // Add randomUUID to existing crypto object if it's missing
  Object.defineProperty(global.crypto, 'randomUUID', {
    value: () => `test-uuid-${Date.now()}-${Math.random()}`,
    writable: true,
    configurable: true,
  });
}

// Mock console methods to avoid noise in tests
const originalConsole = console;
global.console = {
  ...originalConsole,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
};

// Mock TextEncoder/TextDecoder for Node.js compatibility
global.TextEncoder = global.TextEncoder ?? NodeTextEncoder;
global.TextDecoder = global.TextDecoder ?? NodeTextDecoder;

// Use real fetch for integration tests, but provide a mock for unit tests
if (!global.fetch) {
  // Only mock if fetch doesn't exist (shouldn't happen in Node 18+)
  global.fetch = vi.fn();
}

export {};
