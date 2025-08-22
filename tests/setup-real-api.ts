import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import { setTimeout } from 'timers/promises';

// Configuration for real API testing
const WORKER_URL = 'http://localhost:8787';
const WORKER_PORT = 8787;

// Global variables for managing wrangler dev process
let wranglerProcess: ChildProcess | null = null;

// For real API tests, we want to use the actual fetch
// Don't mock fetch - let it use the real implementation

// Only mock browser APIs that don't exist in Node.js environment
// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock matchMedia only if window exists (browser environment)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// Mock URL.createObjectURL only if URL exists
if (typeof URL !== 'undefined') {
  global.URL.createObjectURL = vi.fn(() => 'mocked-url');
  global.URL.revokeObjectURL = vi.fn();
}

// Mock FileReader only if it exists
if (typeof FileReader !== 'undefined') {
  global.FileReader = vi.fn().mockImplementation(() => ({
    readAsDataURL: vi.fn(),
    readAsText: vi.fn(),
    readAsArrayBuffer: vi.fn(),
    result: null,
    error: null,
    onload: null,
    onerror: null,
    onloadend: null,
  }));
}

// Helper function to start wrangler dev
async function startWranglerDev(): Promise<void> {
  if (wranglerProcess) {
    console.log('Wrangler dev already running');
    return;
  }

  console.log('🚀 Starting wrangler dev server...');
  
  wranglerProcess = spawn('npx', ['wrangler', 'dev', '--port', WORKER_PORT.toString()], {
    stdio: 'pipe',
    shell: true
  });

  // Wait for server to start
  let attempts = 0;
  const maxAttempts = 30; // 30 seconds timeout
  
  while (attempts < maxAttempts) {
    try {
      const response = await fetch(`${WORKER_URL}/api/health`);
      if (response.ok) {
        console.log('✅ Wrangler dev server is ready');
        return;
      }
    } catch (error) {
      // Server not ready yet
    }
    
    await setTimeout(1000); // Wait 1 second
    attempts++;
  }
  
  throw new Error(`Wrangler dev server failed to start within ${maxAttempts} seconds`);
}

// Helper function to stop wrangler dev
async function stopWranglerDev(): Promise<void> {
  if (!wranglerProcess) {
    return;
  }

  console.log('🛑 Stopping wrangler dev server...');
  
  return new Promise((resolve) => {
    wranglerProcess!.on('close', () => {
      console.log('✅ Wrangler dev server stopped');
      wranglerProcess = null;
      resolve();
    });
    
    wranglerProcess!.kill('SIGTERM');
    
    // Force kill after 5 seconds if graceful shutdown fails
    setTimeout(5000).then(() => {
      if (wranglerProcess) {
        wranglerProcess.kill('SIGKILL');
        wranglerProcess = null;
        resolve();
      }
    });
  });
}

// Global setup - start wrangler dev before all tests
beforeAll(async () => {
  console.log('🧪 Setting up real API test environment...');
  
  try {
    await startWranglerDev();
    console.log('✅ Real API test environment ready');
  } catch (error) {
    console.error('❌ Failed to start wrangler dev:', error);
    throw error;
  }
});

// Global cleanup - stop wrangler dev after all tests
afterAll(async () => {
  console.log('🧹 Cleaning up real API test environment...');
  
  try {
    await stopWranglerDev();
    console.log('✅ Real API test cleanup complete');
  } catch (error) {
    console.error('❌ Failed to stop wrangler dev:', error);
  }
});

// Export helper functions for use in tests
export { WORKER_URL, startWranglerDev, stopWranglerDev };
