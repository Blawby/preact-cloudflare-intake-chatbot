import { describe, expect, it, vi } from 'vitest';
import { retryWithBackoff, RetryError, RetryTimeoutError } from '../../../utils/network/retry.ts';

describe('retryWithBackoff', () => {
  it('resolves on first attempt', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await retryWithBackoff(fn, { retries: 2, baseDelayMs: 1, maxDelayMs: 2 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries when the function throws', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce('ok');

    const result = await retryWithBackoff(fn, { retries: 2, baseDelayMs: 1, maxDelayMs: 2 });

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws RetryError after exhausting attempts', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'));

    await expect(
      retryWithBackoff(fn, { retries: 1, baseDelayMs: 1, maxDelayMs: 2 })
    ).rejects.toBeInstanceOf(RetryError);

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('aborts when timeout is exceeded', async () => {
    const fn = vi.fn().mockImplementation(
      () => new Promise((_, reject) => setTimeout(() => reject(new Error('slow')), 10))
    );

    await expect(
      retryWithBackoff(fn, { retries: 3, timeoutMs: 5, baseDelayMs: 1, maxDelayMs: 2 })
    ).rejects.toBeInstanceOf(RetryTimeoutError);
  });

  it('stops retrying when shouldRetry returns false', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('permanent'));

    await expect(
      retryWithBackoff(fn, {
        retries: 3,
        baseDelayMs: 1,
        maxDelayMs: 2,
        shouldRetry: (error) => {
          return (error as Error).message !== 'permanent';
        }
      })
    ).rejects.toBeInstanceOf(RetryError);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('honors abort signals', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      retryWithBackoff(() => Promise.resolve('ok'), {
        signal: controller.signal
      })
    ).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('fires onRetry callback', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('temporary'))
      .mockResolvedValue('ok');

    const onRetry = vi.fn();

    const result = await retryWithBackoff(fn, {
      retries: 2,
      baseDelayMs: 1,
      maxDelayMs: 2,
      onRetry,
    });

    expect(result).toBe('ok');
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
