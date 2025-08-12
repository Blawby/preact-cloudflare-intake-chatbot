import { describe, it, expect, vi, beforeEach } from 'vitest';
import { withRetry, withAIRetry } from '../../../worker/utils/retry.js';

describe('Retry Utility Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should succeed on first attempt', async () => {
    const mockFn = vi.fn().mockResolvedValue('success');
    
    const result = await withRetry(mockFn);
    
    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should retry and succeed on second attempt', async () => {
    const mockFn = vi.fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockResolvedValue('success');
    
    const result = await withRetry(mockFn);
    
    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it('should retry and succeed on third attempt', async () => {
    const mockFn = vi.fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockRejectedValueOnce(new Error('Second failure'))
      .mockResolvedValue('success');
    
    const result = await withRetry(mockFn);
    
    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(3);
  });

  it('should fail after all retries exhausted', async () => {
    const mockFn = vi.fn()
      .mockRejectedValue(new Error('Persistent failure'));
    
    await expect(withRetry(mockFn)).rejects.toThrow('Persistent failure');
    expect(mockFn).toHaveBeenCalledTimes(3); // Default 3 attempts
  });

  it('should use custom number of attempts', async () => {
    const mockFn = vi.fn()
      .mockRejectedValue(new Error('Persistent failure'));
    
    await expect(withRetry(mockFn, 2)).rejects.toThrow('Persistent failure');
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it('should use custom base delay', async () => {
    const mockFn = vi.fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockResolvedValue('success');
    
    const startTime = Date.now();
    const result = await withRetry(mockFn, 3, 100); // 100ms base delay
    const endTime = Date.now();
    
    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(2);
    
    // Should have waited at least 100ms (base delay)
    expect(endTime - startTime).toBeGreaterThanOrEqual(100);
  });

  it('should use AI retry with correct defaults', async () => {
    const mockFn = vi.fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockResolvedValue('success');
    
    const result = await withAIRetry(mockFn);
    
    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(2); // AI retry defaults to 2 attempts
  });

  it('should preserve error type and message', async () => {
    const customError = new TypeError('Custom error message');
    const mockFn = vi.fn().mockRejectedValue(customError);
    
    await expect(withRetry(mockFn, 1)).rejects.toThrow('Custom error message');
    await expect(withRetry(mockFn, 1)).rejects.toBeInstanceOf(TypeError);
  });

  it('should add jitter to delays', async () => {
    const mockFn = vi.fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockResolvedValue('success');
    
    const startTime = Date.now();
    await withRetry(mockFn, 3, 50); // 50ms base delay
    const endTime = Date.now();
    
    // Should have waited with some jitter (not exactly 50ms)
    const waitTime = endTime - startTime;
    expect(waitTime).toBeGreaterThanOrEqual(50);
    expect(waitTime).toBeLessThanOrEqual(200); // Reasonable upper bound
  });
});
