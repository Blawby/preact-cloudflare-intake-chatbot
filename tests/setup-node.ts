import { vi } from 'vitest';
import '@testing-library/jest-dom';
import { TextEncoder as NodeTextEncoder, TextDecoder as NodeTextDecoder } from 'node:util';
import { randomUUID } from 'node:crypto';

// Mock Cloudflare Workers environment for Node.js tests
// Use Node's real UUID generator and avoid Object.defineProperty
if (!global.crypto) {
  // Create minimal crypto object if it doesn't exist
  global.crypto = {
    randomUUID,
  };
} else if (!global.crypto.randomUUID) {
  // Add randomUUID to existing crypto object if it's missing
  global.crypto.randomUUID = randomUUID;
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
globalThis.TextEncoder ||= NodeTextEncoder;
globalThis.TextDecoder ||= NodeTextDecoder;

// Use real fetch for integration tests, but provide a mock for unit tests
if (!global.fetch) {
  // Only mock if fetch doesn't exist (shouldn't happen in Node 18+)
  global.fetch = vi.fn();
}

export {};
