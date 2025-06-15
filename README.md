# idempotent-ops

[![npm version](https://img.shields.io/npm/v/idempotent-ops.svg)](https://www.npmjs.com/package/idempotent-ops)

> Reliable, atomic, and retryable operations for file I/O and network requests in Node.js.

---

## Features

* ✳️ Idempotent file writes with content hashing and atomic renames
* 🌐 Idempotent network requests with retry, backoff, and idempotency key support
* 🔒 Unified error abstraction (`FileSystemError`, `NetworkError`, `IdempotencyError`)
* ⚙️ No runtime dependencies (only Node.js and Fetch API)
* 🧪 Complete test suite using Jest with fetch/file mocks
* 🧼 Fully typed, zero-footgun API with defensive error handling

---

## Installation

```bash
npm install idempotent-ops
```

---

## Usage

### Idempotent File Writes

```ts
import { idempotentWriteFile } from 'idempotent-ops';

await idempotentWriteFile('./out.txt', 'Hello, world!', {
  algorithm: 'sha256',
  encoding: 'utf-8',
});
```

### Idempotent Network Fetch

```ts
import { idempotentFetch } from 'idempotent-ops';

const response = await idempotentFetch('https://api.example.com/data', {
  method: 'POST',
  idempotencyKey: 'your-key-123',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ hello: 'world' }),
  retry: {
    retries: 3,
    factor: 2,
    minTimeout: 100,
    maxTimeout: 1000,
    randomize: true,
  },
});
```

---

## API

### `idempotentWriteFile(path, data, options?)`

Safely write a file only if contents differ.

* `path`: string – Full file path
* `data`: string | Uint8Array – Data to write
* `options`:

  * `algorithm`: `'sha256' | 'sha512' | 'md5'` (default: `'sha256'`)
  * `encoding`: Node.js `BufferEncoding` (default: `'utf-8'`)

Returns:

```ts
type IdempotentFileWriteResult = {
  operation: 'created' | 'updated' | 'no-change';
  path: string;
};
```

---

### `idempotentFetch(url, options)`

Performs HTTP requests with idempotency support and retries.

* `url`: string – Target endpoint
* `options`:

  * `idempotencyKey`: string (required)
  * `retry`: `RetryOptions`
  * Standard `fetch` options: `method`, `headers`, `body`, etc.

Retry configuration:

```ts
type RetryOptions = {
  retries?: number;
  factor?: number;
  minTimeout?: number;
  maxTimeout?: number;
  randomize?: boolean;
};
```

Errors thrown:

* `NetworkError` – On permanent failure
* Propagates `fetch()` failures with extended context

---

## Development

```bash
npm install
npm run lint
npm test
npm run build
```

---

## License
MIT
See [LICENSE](./LICENSE) for details.
