import { type IdempotentFetchOptions, type RetryOptions } from './types';
import { NetworkError } from './errors';

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const shouldRetry = (status: number): boolean => {
  return status >= 500 || status === 409 || status === 429;
};

export const idempotentFetch = async (
  url: string,
  options: IdempotentFetchOptions,
): Promise<Response> => {
  const { idempotencyKey, retry, ...fetchOptions } = options;

  const retryConf: Required<RetryOptions> = {
    retries: 3,
    factor: 2,
    minTimeout: 1000,
    maxTimeout: 15000,
    randomize: true,
    ...retry,
  };

  const headers = new Headers(fetchOptions.headers);
  headers.set('Idempotency-Key', idempotencyKey);

  let lastError: unknown;

  for (let attempt = 0; attempt <= retryConf.retries; attempt++) {
    try {
      const response = await fetch(url, { ...fetchOptions, headers });

      if (!shouldRetry(response.status)) {
        return response;
      }

      lastError = new NetworkError(
        `Received retryable status code: ${response.status}`,
        url,
        response.status,
      );
    } catch (error) {
      lastError = error;
    }

    if (attempt >= retryConf.retries) {
      break;
    }

    let timeout = retryConf.minTimeout * retryConf.factor ** attempt;
    if (retryConf.randomize) {
      timeout += Math.random() * retryConf.minTimeout;
    }
    timeout = Math.min(timeout, retryConf.maxTimeout);

    await sleep(timeout);
  }

  throw new NetworkError(
    `Request failed after ${retryConf.retries + 1} attempts.`,
    url,
    (lastError as NetworkError)?.status,
    lastError,
  );
};