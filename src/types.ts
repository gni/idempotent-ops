export type Algorithm = 'sha256' | 'sha512' | 'md5';

export interface IdempotentFileWriteResult {
  operation: 'created' | 'updated' | 'no-change';
  path: string;
}

export interface IdempotentFileWriteOptions {
  algorithm?: Algorithm;
  encoding?: BufferEncoding;
}

export interface RetryOptions {
  retries?: number;
  factor?: number;
  minTimeout?: number;
  maxTimeout?: number;
  randomize?: boolean;
}

export interface IdempotentFetchOptions extends RequestInit {
  idempotencyKey: string;
  retry?: RetryOptions;
}