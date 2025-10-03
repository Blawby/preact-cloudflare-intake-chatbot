/**
 * Tests for production-safe error handling utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleError, handleAsyncError, safeLog } from '../errorHandler';

// Mock console methods
const mockConsoleError = vi.fn();
const mockConsoleWarn = vi.fn();
const mockConsoleLog = vi.fn();

describe('errorHandler', () => {
  beforeEach(() => {
    // Mock console methods
    vi.spyOn(console, 'error').mockImplementation(mockConsoleError);
    vi.spyOn(console, 'warn').mockImplementation(mockConsoleWarn);
    vi.spyOn(console, 'log').mockImplementation(mockConsoleLog);
    
    // Mock window.Sentry
    (global as any).window = {
      Sentry: {
        captureException: vi.fn()
      }
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (global as any).window;
  });

  describe('handleError', () => {
    it('should capture error in Sentry when available', () => {
      const error = new Error('Test error');
      const context = { component: 'TestComponent', action: 'test' };

      handleError(error, context, { component: 'TestComponent' });

      expect((global as any).window.Sentry.captureException).toHaveBeenCalledWith(
        error,
        {
          tags: {
            component: 'TestComponent',
            action: 'test'
          },
          extra: expect.objectContaining({
            component: 'TestComponent',
            action: 'test'
          })
        }
      );
    });

    it('should sanitize sensitive data in context', () => {
      const error = new Error('Test error');
      const context = {
        component: 'TestComponent',
        token: 'secret-token-123',
        email: 'user@example.com',
        password: 'secret-password',
        url: 'https://api.example.com/secret'
      };

      handleError(error, context, { component: 'TestComponent' });

      expect((global as any).window.Sentry.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          extra: expect.objectContaining({
            component: 'TestComponent',
            token: '[REDACTED]',
            email: '[REDACTED]',
            password: '[REDACTED]',
            url: '[REDACTED]'
          })
        })
      );
    });

    it('should log to console in development mode', () => {
      // Mock NODE_ENV to be development
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Test error');
      const context = { component: 'TestComponent' };

      handleError(error, context, { component: 'TestComponent' });

      expect(mockConsoleError).toHaveBeenCalledWith(
        '[TestComponent] Test error',
        expect.objectContaining({
          error: 'Error',
          context: expect.objectContaining({
            component: 'TestComponent'
          }),
          timestamp: expect.any(String)
        })
      );

      // Restore original NODE_ENV
      process.env.NODE_ENV = originalEnv;
    });

    it('should not log to console in production mode', () => {
      // Mock NODE_ENV to be production
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('Test error');
      const context = { component: 'TestComponent' };

      handleError(error, context, { component: 'TestComponent' });

      expect(mockConsoleError).not.toHaveBeenCalled();

      // Restore original NODE_ENV
      process.env.NODE_ENV = originalEnv;
    });

    it('should handle non-Error objects', () => {
      const error = 'String error';
      const context = { component: 'TestComponent' };

      handleError(error, context, { component: 'TestComponent' });

      expect((global as any).window.Sentry.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          extra: expect.objectContaining({
            component: 'TestComponent'
          })
        })
      );
    });

    it('should fall back to console logging if Sentry fails', () => {
      // Mock Sentry to throw an error
      (global as any).window.Sentry.captureException.mockImplementation(() => {
        throw new Error('Sentry failed');
      });

      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Test error');
      const context = { component: 'TestComponent' };

      handleError(error, context, { component: 'TestComponent' });

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        '[ErrorHandler] Sentry capture failed:',
        expect.any(Error)
      );

      // Restore original NODE_ENV
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('handleAsyncError', () => {
    it('should return result when operation succeeds', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      const result = await handleAsyncError(operation, {}, { fallback: 'fallback' });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalled();
    });

    it('should return fallback when operation fails', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Operation failed'));
      const result = await handleAsyncError(operation, {}, { fallback: 'fallback' });

      expect(result).toBe('fallback');
      expect(operation).toHaveBeenCalled();
    });

    it('should return undefined when no fallback provided', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Operation failed'));
      const result = await handleAsyncError(operation, {}, {});

      expect(result).toBeUndefined();
    });
  });

  describe('safeLog', () => {
    it('should log in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      safeLog('log', 'Test message', { data: 'test' }, { component: 'TestComponent' });

      expect(mockConsoleLog).toHaveBeenCalledWith('[TestComponent] Test message', { data: 'test' });

      process.env.NODE_ENV = originalEnv;
    });

    it('should not log in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      safeLog('log', 'Test message', { data: 'test' }, { component: 'TestComponent' });

      expect(mockConsoleLog).not.toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });

    it('should log in production when force option is true', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      safeLog('log', 'Test message', { data: 'test' }, { component: 'TestComponent', force: true });

      expect(mockConsoleLog).toHaveBeenCalledWith('[TestComponent] Test message', { data: 'test' });

      process.env.NODE_ENV = originalEnv;
    });
  });
});
