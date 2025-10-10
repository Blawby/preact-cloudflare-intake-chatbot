import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import { setTimeout as setTimeoutPromise } from 'timers/promises';

// Configuration for real API testing
const WORKER_URL = process.env.WORKER_URL ?? 'http://localhost:8787';
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
  // Preflight health check - if server is already running and healthy, return early
  try {
    const preflightResponse = await fetch(`${WORKER_URL}/api/health`);
    if (preflightResponse.ok) {
      console.log('✅ Wrangler dev server is already running and healthy');
      return;
    }
  } catch (error) {
    // Server not running, proceed to spawn
  }

  // If wranglerProcess is already set, check if it's healthy
  if (wranglerProcess) {
    try {
      const healthResponse = await fetch(`${WORKER_URL}/api/health`);
      if (healthResponse.ok) {
        console.log('✅ Existing wrangler dev server is healthy');
        return;
      }
    } catch (error) {
      // Existing process is not healthy, terminate and respawn
      console.log('⚠️ Existing wrangler dev server is not responding, terminating...');
      await stopWranglerDev();
    }
  }

  console.log('🚀 Starting wrangler dev server...');
  
  try {
    // Kill any existing processes on the port first
    try {
      await new Promise<void>((resolve) => {
        const killProcess = spawn('lsof', ['-ti', `:${WORKER_PORT}`], { stdio: 'pipe' });
        killProcess.stdout?.on('data', async (data) => {
          const pids = data.toString().trim().split('\n').filter(Boolean);
          if (pids.length > 0) {
            console.log(`🔪 Killing existing processes on port ${WORKER_PORT}: ${pids.join(', ')}`);
            await Promise.all(pids.map(pid => 
              new Promise<void>((resolve) => {
                const kill = spawn('kill', ['-9', pid], { stdio: 'pipe' });
                kill.on('exit', () => resolve());
                kill.on('error', () => resolve()); // Ignore errors
              })
            ));
          }
          resolve();
        });
        killProcess.on('exit', () => resolve());
        killProcess.on('error', () => resolve()); // Ignore errors
      });
      // Wait a moment for processes to fully terminate
      await setTimeoutPromise(2000);
    } catch (error) {
      // Ignore errors in cleanup
    }

    wranglerProcess = spawn('./scripts/load-dev-vars.sh', ['wrangler', 'dev', '--port', WORKER_PORT.toString(), '--local'], {
      stdio: 'pipe',
      shell: true,
      env: { ...process.env, NODE_ENV: 'test' }
    });

    // Capture output for debugging
    let output = '';
    wranglerProcess.stdout?.on('data', (data) => {
      output += data.toString();
      // Log important messages
      const message = data.toString();
      if (message.includes('Ready on') || message.includes('Local:') || message.includes('http://')) {
        console.log('📡 Wrangler output:', message.trim());
      }
    });

    wranglerProcess.stderr?.on('data', (data) => {
      const error = data.toString();
      console.log('⚠️ Wrangler stderr:', error.trim());
    });

    // Attach exit and error listeners to detect failures
    wranglerProcess.on('exit', (code, signal) => {
      console.log(`❌ Wrangler dev server exited with code ${code} and signal ${signal}`);
      console.log('📋 Last output:', output.slice(-500)); // Last 500 chars
      wranglerProcess = null;
    });

    wranglerProcess.on('error', (error) => {
      console.error('❌ Wrangler dev server error:', error);
      console.log('📋 Last output:', output.slice(-500)); // Last 500 chars
      wranglerProcess = null;
    });

    // Wait for server to start with exponential backoff
    let attempts = 0;
    const maxAttempts = 60; // 60 seconds timeout
    let waitTime = 1000; // Start with 1 second
    
    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`${WORKER_URL}/api/health`, {
          signal: AbortSignal.timeout(5000) // 5 second timeout per request
        });
        if (response.ok) {
          console.log('✅ Wrangler dev server is ready');
          return;
        }
      } catch (error) {
        // Server not ready yet or request failed
        if (attempts % 10 === 0) { // Log every 10 attempts
          console.log(`⏳ Waiting for wrangler dev server... (attempt ${attempts + 1}/${maxAttempts})`);
        }
      }
      
      await setTimeoutPromise(waitTime);
      attempts++;
      
      // Exponential backoff with max 5 seconds
      waitTime = Math.min(waitTime * 1.1, 5000);
    }
    
    console.log('📋 Final output:', output.slice(-1000)); // Last 1000 chars
    throw new Error(`Wrangler dev server failed to start within ${maxAttempts} seconds`);
  } catch (error) {
    console.error('❌ Failed to spawn wrangler dev server:', error);
    wranglerProcess = null;
    throw error;
  }
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
