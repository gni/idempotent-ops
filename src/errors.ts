export class IdempotencyError extends Error {
  public override readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'IdempotencyError';
    this.cause = cause;
    Object.setPrototypeOf(this, IdempotencyError.prototype);
  }
}

export class FileSystemError extends IdempotencyError {
  public readonly path: string | undefined;

  constructor(message: string, path?: string, cause?: unknown) {
    super(message, cause);
    this.name = 'FileSystemError';
    this.path = path;
    Object.setPrototypeOf(this, FileSystemError.prototype);
  }
}

export class NetworkError extends IdempotencyError {
  public readonly url: string;
  public readonly status: number | undefined;

  constructor(message: string, url: string, status?: number, cause?: unknown) {
    super(message, cause);
    this.name = 'NetworkError';
    this.url = url;
    this.status = status;
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}