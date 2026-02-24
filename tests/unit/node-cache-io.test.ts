import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getCacheFilePath, readCacheFile, writeCacheFile, clearCacheFiles } from '../../src/node-cache-io.js';

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'kaken-node-cache-io-test-'));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe('getCacheFilePath', () => {
  it('should return a path ending with .cache', () => {
    const filePath = getCacheFilePath(tempDir, 'https://example.com/');
    expect(filePath).toMatch(/\.cache$/);
  });

  it('should return a path inside the given cacheDir', () => {
    const filePath = getCacheFilePath(tempDir, 'https://example.com/');
    expect(filePath.startsWith(tempDir)).toBe(true);
  });

  it('should produce an MD5 hex filename', () => {
    const filePath = getCacheFilePath(tempDir, 'https://example.com/');
    const basename = filePath.split('/').at(-1)!;
    expect(basename).toMatch(/^[a-f0-9]{32}\.cache$/);
  });

  it('should return different paths for different URLs', () => {
    const a = getCacheFilePath(tempDir, 'https://example.com/a');
    const b = getCacheFilePath(tempDir, 'https://example.com/b');
    expect(a).not.toBe(b);
  });

  it('should return the same path for the same URL', () => {
    const a = getCacheFilePath(tempDir, 'https://example.com/same');
    const b = getCacheFilePath(tempDir, 'https://example.com/same');
    expect(a).toBe(b);
  });
});

describe('readCacheFile', () => {
  it('should return null when file does not exist', async () => {
    const result = await readCacheFile(join(tempDir, 'nonexistent.cache'));
    expect(result).toBeNull();
  });

  it('should return Buffer content when file exists', async () => {
    const filePath = join(tempDir, 'test.cache');
    const content = Buffer.from('hello');
    await writeFile(filePath, content);
    const result = await readCacheFile(filePath);
    expect(result).toEqual(content);
  });
});

describe('writeCacheFile', () => {
  it('should write Buffer content to file', async () => {
    const filePath = join(tempDir, 'out.cache');
    const content = Buffer.from('written');
    await writeCacheFile(tempDir, filePath, content);
    const read = await readFile(filePath);
    expect(read).toEqual(content);
  });

  it('should write string content to file', async () => {
    const filePath = join(tempDir, 'out.cache');
    await writeCacheFile(tempDir, filePath, 'hello string');
    const read = await readFile(filePath, 'utf-8');
    expect(read).toBe('hello string');
  });

  it('should create cacheDir if it does not exist', async () => {
    const newDir = join(tempDir, 'sub', 'dir');
    const filePath = join(newDir, 'out.cache');
    await writeCacheFile(newDir, filePath, Buffer.from('x'));
    const read = await readFile(filePath);
    expect(read.toString()).toBe('x');
  });
});

describe('clearCacheFiles', () => {
  it('should delete all .cache files', async () => {
    await writeFile(join(tempDir, 'a.cache'), 'a');
    await writeFile(join(tempDir, 'b.cache'), 'b');
    await clearCacheFiles(tempDir);
    const { readdir } = await import('node:fs/promises');
    const files = await readdir(tempDir);
    expect(files.filter((f) => f.endsWith('.cache'))).toHaveLength(0);
  });

  it('should not delete non-.cache files', async () => {
    await writeFile(join(tempDir, 'keep.txt'), 'x');
    await writeFile(join(tempDir, 'del.cache'), 'y');
    await clearCacheFiles(tempDir);
    const { readdir } = await import('node:fs/promises');
    const files = await readdir(tempDir);
    expect(files).toContain('keep.txt');
    expect(files).not.toContain('del.cache');
  });

  it('should not throw when directory has no .cache files', async () => {
    await expect(clearCacheFiles(tempDir)).resolves.not.toThrow();
  });
});
