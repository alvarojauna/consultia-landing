/**
 * Retry utility with exponential backoff and jitter.
 *
 * Use this for any operation that can transiently fail:
 * - External API calls (ElevenLabs, Twilio, Stripe)
 * - Database connections during cold starts
 * - S3 operations under high contention
 */

interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Base delay in milliseconds (default: 1000) */
  baseDelayMs?: number;
  /** Maximum delay cap in milliseconds (default: 10000) */
  maxDelayMs?: number;
  /** Whether to add random jitter (default: true) */
  jitter?: boolean;
  /** Only retry on these error codes (default: retry all) */
  retryOn?: string[];
  /** Callback for logging retry attempts */
  onRetry?: (error: Error, attempt: number, delayMs: number) => void;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'retryOn' | 'onRetry'>> = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  jitter: true,
};

/**
 * Execute an async operation with exponential backoff retries.
 *
 * @example
 * const result = await withRetry(
 *   () => axios.post('https://api.elevenlabs.io/v1/convai/agents', payload),
 *   { maxRetries: 3, baseDelayMs: 500 }
 * );
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error = new Error('withRetry: no attempts made');

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry on the last attempt
      if (attempt >= opts.maxRetries) break;

      // Check if we should retry this error type
      if (opts.retryOn && opts.retryOn.length > 0) {
        const errorCode = error.code || error.statusCode || error.status;
        if (!opts.retryOn.includes(String(errorCode))) break;
      }

      // Don't retry on client errors (4xx) — only server/network errors
      const status = error.statusCode || error.status || error.response?.status;
      if (status && status >= 400 && status < 500 && status !== 429) break;

      // Calculate delay with exponential backoff
      let delayMs = Math.min(
        opts.baseDelayMs * Math.pow(2, attempt),
        opts.maxDelayMs
      );

      // Add random jitter (0-50% of delay) to prevent thundering herd
      if (opts.jitter) {
        delayMs += Math.random() * delayMs * 0.5;
      }

      if (opts.onRetry) {
        opts.onRetry(error, attempt + 1, delayMs);
      } else {
        console.warn(`[Retry] Attempt ${attempt + 1}/${opts.maxRetries} failed, retrying in ${Math.round(delayMs)}ms`, {
          error: error.message,
        });
      }

      await sleep(delayMs);
    }
  }

  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Predefined retry configs for common use cases.
 */
export const RETRY_CONFIGS = {
  /** For external API calls (ElevenLabs, Twilio): 3 retries, 1s base */
  externalApi: {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
    jitter: true,
  } as RetryOptions,

  /** For database operations during cold start: 2 retries, 500ms base */
  database: {
    maxRetries: 2,
    baseDelayMs: 500,
    maxDelayMs: 3000,
    jitter: false,
  } as RetryOptions,

  /** For idempotent write operations: 1 retry, 2s base */
  idempotentWrite: {
    maxRetries: 1,
    baseDelayMs: 2000,
    maxDelayMs: 5000,
    jitter: true,
  } as RetryOptions,
};
