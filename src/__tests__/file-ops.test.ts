import { promises as fs } from 'fs';
import { join } from 'path';
import { idempotentWriteFile } from '../file-ops';
import { FileSystemError } from '../errors';

const TEST_DIR = join(__dirname, 'tmp-file-ops');

describe('idempotentWriteFile', () => {
  beforeAll(async () => {
    await fs.mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    const files = await fs.readdir(TEST_DIR);
    for (const file of files) {
      await fs.unlink(join(TEST_DIR, file));
    }
  });

  afterAll(async () => {
    await fs.rmdir(TEST_DIR);
  });

  it('should create a new file if it does not exist', async () => {
    const filePath = join(TEST_DIR, 'new-file.txt');
    const content = 'Hello, World!';

    const result = await idempotentWriteFile(filePath, content);

    expect(result.operation).toBe('created');
    expect(result.path).toBe(filePath);
    const writtenContent = await fs.readFile(filePath, 'utf-8');
    expect(writtenContent).toBe(content);
  });

  it('should update an existing file with new content', async () => {
    const filePath = join(TEST_DIR, 'update-file.txt');
    const initialContent = 'Initial content';
    const newContent = 'Updated content';

    await fs.writeFile(filePath, initialContent);
    const result = await idempotentWriteFile(filePath, newContent);

    expect(result.operation).toBe('updated');
    const writtenContent = await fs.readFile(filePath, 'utf-8');
    expect(writtenContent).toBe(newContent);
  });

  it('should do nothing if the file exists with the same content', async () => {
    const filePath = join(TEST_DIR, 'no-change-file.txt');
    const content = 'This content should not change.';

    await fs.writeFile(filePath, content);
    const result = await idempotentWriteFile(filePath, content);

    expect(result.operation).toBe('no-change');
    const stats = await fs.stat(filePath);
    expect(stats).toBeDefined();
  });

  it('should handle different encodings', async () => {
    const filePath = join(TEST_DIR, 'encoding-file.txt');
    const content = 'test data';
    const bufferData = Buffer.from(content, 'utf16le');

    const result = await idempotentWriteFile(filePath, bufferData, { encoding: 'utf16le' });

    expect(result.operation).toBe('created');
    const writtenContent = await fs.readFile(filePath, 'utf16le');
    expect(writtenContent).toBe(content);

    const noChangeResult = await idempotentWriteFile(filePath, bufferData, { encoding: 'utf16le' });
    expect(noChangeResult.operation).toBe('no-change');
  });

  it('should throw FileSystemError on permission denied', async () => {
    const filePath = '/root/permission-denied.txt';
    const content = 'no-access';
    await expect(idempotentWriteFile(filePath, content)).rejects.toThrow(FileSystemError);
  });
});