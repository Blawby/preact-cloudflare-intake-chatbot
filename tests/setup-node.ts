import { vi } from 'vitest';

// Mock Cloudflare Workers environment for Node.js tests
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => `test-uuid-${Date.now()}-${Math.random()}`,
    // Add other crypto methods as needed
  },
  writable: true,
  configurable: true,
});

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
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Use real fetch for integration tests, but provide a mock for unit tests
if (!global.fetch) {
  // Only mock if fetch doesn't exist (shouldn't happen in Node 18+)
  global.fetch = vi.fn();
}

export {};
