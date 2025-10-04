export interface RetryOptions {
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  timeoutMs?: number;
  jitter?: boolean;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  onRetry?: (attempt: number, error: unknown) => void;
  signal?: AbortSignal;
}

export class RetryError extends Error {
  public readonly attemptCount: number;
  public readonly cause?: unknown;

  constructor(message: string, attemptCount: number, cause?: unknown) {
    super(message);
    this.name = 'RetryError';
    this.attemptCount = attemptCount;
    this.cause = cause;
  }
}

export class RetryTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RetryTimeoutError';
  }
}

const abortError = () => {
  const error = new Error('Operation aborted');
  error.name = 'AbortError';
  return error;
};

const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);

    const cleanup = () => {
      clearTimeout(timer);
      if (signal) {
        signal.removeEventListener('abort', onAbort);
      }
    };

    const onAbort = () => {
      cleanup();
      reject(abortError());
    };

    if (signal) {
      if (signal.aborted) {
        cleanup();
        reject(abortError());
        return;
      }

      signal.addEventListener('abort', onAbort);
    }
  });

export const retryWithBackoff = async <T,>(
  fn: (attempt: number) => Promise<T>,
  {
    retries = 3,
    baseDelayMs = 200,
    maxDelayMs = 2000,
    timeoutMs,
    jitter = true,
    shouldRetry = () => true,
    onRetry,
    signal
  }: RetryOptions = {}
): Promise<T> => {
  const maxAttempts = Math.max(1, retries + 1);
  const start = Date.now();

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    if (signal?.aborted) {
      throw abortError();
    }

    if (timeoutMs && Date.now() - start >= timeoutMs) {
      throw new RetryTimeoutError('Retry operation timed out');
    }

    try {
      const result = await fn(attempt);
      return result;
    } catch (error) {
      const isLastAttempt = attempt === maxAttempts;
      if (isLastAttempt || !shouldRetry(error, attempt)) {
        throw new RetryError('Retry attempts exhausted', attempt, error);
      }

      onRetry?.(attempt, error);

      const exponentialDelay = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
      const delay = jitter
        ? Math.floor(Math.random() * (exponentialDelay - Math.min(baseDelayMs, exponentialDelay) + 1)) + Math.min(baseDelayMs, exponentialDelay)
        : exponentialDelay;

      await wait(delay, signal);
    }
  }

  throw new RetryError('Retry attempts exhausted', maxAttempts);
};
