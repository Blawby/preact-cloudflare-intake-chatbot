import { render, RenderOptions } from '@testing-library/preact';
import { h } from 'preact';
import { vi } from 'vitest';
import { ComponentType } from 'preact';

// Custom render function with providers
const customRender = (
  ui: h.JSX.Element,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  const AllTheProviders = ({ children }: { children: h.JSX.Element }) => {
    return children;
  };

  return render(ui, { wrapper: AllTheProviders, ...options });
};

// Mock API responses
export const mockApiResponse = (data: any, status = 200) => {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  });
};

// Mock API error - returns a resolved Promise that mimics a fetch Response with ok: false
export const mockApiError = (status = 500, message = 'Internal Server Error') => {
  const errorPayload = { error: message, status };
  
  return Promise.resolve({
    ok: false,
    status,
    statusText: message,
    json: () => Promise.resolve(errorPayload),
    text: () => Promise.resolve(message),
    body: {
      getReader: () => ({
        read: () => Promise.resolve({ done: true, value: new TextEncoder().encode(message) })
      })
    }
  });
};

// Mock network error - returns a rejected Promise to simulate true network failures
export const mockNetworkError = (message = 'Network Error') => {
  return Promise.reject(new TypeError(message));
};

// Test data factories
export const createMockMessage = (overrides = {}) => ({
  id: `msg-${Date.now()}`,
  role: 'user' as const,
  content: 'Test message',
  timestamp: new Date().toISOString(),
  ...overrides,
});

export const createMockFile = (overrides = {}) => ({
  id: `file-${Date.now()}`,
  name: 'test-document.pdf',
  size: 1024,
  type: 'application/pdf',
  url: 'https://example.com/test-document.pdf',
  ...overrides,
});

export const createMockMatter = (overrides = {}) => ({
  id: `matter-${Date.now()}`,
  service: 'Family Law',
  description: 'Test matter description',
  urgency: 'Somewhat Urgent',
  qualityScore: 75,
  answers: {},
  ...overrides,
});

// Re-export everything
export * from '@testing-library/preact';
export { customRender as render }; 