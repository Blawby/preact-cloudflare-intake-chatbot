// Retry utility with exponential backoff for AI calls
export async function withRetry<T>(
  fn: () => Promise<T>, 
  attempts = 3,
  baseDelay = 300
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't wait on the last attempt
      if (i < attempts - 1) {
        const delay = baseDelay * Math.pow(2, i) + Math.random() * 100; // Add jitter
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError ?? new Error('Retry failed after all attempts');
}

// Specific retry wrapper for AI calls
export async function withAIRetry<T>(
  fn: () => Promise<T>,
  attempts = 2
): Promise<T> {
  return withRetry(fn, attempts, 500); // Longer base delay for AI calls
}
