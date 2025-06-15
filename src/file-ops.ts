import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import {
  type Algorithm,
  type IdempotentFileWriteOptions,
  type IdempotentFileWriteResult,
} from './types';
import { FileSystemError } from './errors'; 

const getFileHash = async (
  path: string,
  algorithm: Algorithm,
): Promise<string | null> => {
  try {
    const content = await fs.readFile(path);
    return createHash(algorithm).update(content).digest('hex');
  } catch (error: unknown) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === 'ENOENT') {
      return null;
    }
    throw new FileSystemError(`Failed to read file for hashing: ${path}`, path, error);
  }
};

const atomicWriteFile = async (
  path: string,
  data: string | Uint8Array,
  encoding: BufferEncoding,
): Promise<void> => {
  const tempPath = join(dirname(path), `.${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`);
  try {
    await fs.writeFile(tempPath, data, { encoding, mode: 0o644 });
    await fs.rename(tempPath, path);
  } catch (error: unknown) {
    await fs.unlink(tempPath).catch(() => {});
    throw new FileSystemError(`Atomic write to ${path} failed`, path, error);
  }
};

export const idempotentWriteFile = async (
  path: string,
  data: string | Uint8Array,
  options: IdempotentFileWriteOptions = {},
): Promise<IdempotentFileWriteResult> => {
  const { algorithm = 'sha256', encoding = 'utf-8' } = options;

  let contentBuffer: Buffer;
  if (typeof data === 'string') {
    contentBuffer = Buffer.from(data, encoding);
  } else {
    contentBuffer = Buffer.from(data);
  }

  try {
    const [currentHash, newHash] = await Promise.all([
      getFileHash(path, algorithm),
      Promise.resolve(createHash(algorithm).update(contentBuffer).digest('hex')),
    ]);

    if (currentHash === newHash) {
      return { operation: 'no-change', path };
    }

    await fs.mkdir(dirname(path), { recursive: true });
    await atomicWriteFile(path, contentBuffer, encoding);

    return { operation: currentHash ? 'updated' : 'created', path };
  } catch (error) {
    if (error instanceof FileSystemError) {
      throw error;
    }
    throw new FileSystemError(`An unexpected error occurred during idempotent write to ${path}`, path, error);
  }
};