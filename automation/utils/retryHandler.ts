import { logger } from '../utils/logger';

/**
 * RetryHandler — wraps any async test function with configurable retry logic.
 *
 * Eliminates flaky tests caused by transient Appium/emulator timeouts
 * by automatically re-running failed steps up to maxAttempts times
 * with an exponential back-off delay between retries.
 */
export class RetryHandler {
  /**
   * @param fn          The async test function to execute
   * @param maxAttempts Maximum number of attempts (default: 3)
   * @param delayMs     Base delay in ms between retries (doubles each retry)
   */
  static async withRetry<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    delayMs: number = 500
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (err: any) {
        lastError = err;
        if (attempt < maxAttempts) {
          const wait = delayMs * Math.pow(2, attempt - 1); // exponential back-off
          logger.warn(`Retry ${attempt}/${maxAttempts - 1} after ${wait}ms: ${err.message}`);
          await new Promise(r => setTimeout(r, wait));
        }
      }
    }

    throw lastError ?? new Error('RetryHandler: All attempts exhausted');
  }

  /**
   * Retries only on specific error message patterns (e.g. "StaleElementReference", "timeout")
   */
  static async withConditionalRetry<T>(
    fn: () => Promise<T>,
    retryablePatterns: string[],
    maxAttempts: number = 3,
    delayMs: number = 500
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (err: any) {
        lastError = err;
        const isRetryable = retryablePatterns.some(p =>
          err.message?.toLowerCase().includes(p.toLowerCase())
        );
        if (isRetryable && attempt < maxAttempts) {
          const wait = delayMs * attempt;
          logger.warn(`Conditional retry ${attempt}/${maxAttempts - 1} (matched pattern): ${err.message}`);
          await new Promise(r => setTimeout(r, wait));
        } else {
          throw err;
        }
      }
    }

    throw lastError ?? new Error('RetryHandler: Conditional retry exhausted');
  }
}
