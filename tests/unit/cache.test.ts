import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ResponseCache } from '../../src/cache.js';

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'kaken-cache-test-'));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe('ResponseCache', () => {
  describe('get / set', () => {
    it('should return null for a cache miss', async () => {
      const cache = new ResponseCache(tempDir, true);
      const result = await cache.get('https://example.com/');
      expect(result).toBeNull();
    });

    it('should store and retrieve Buffer content', async () => {
      const cache = new ResponseCache(tempDir, true);
      const content = Buffer.from('hello cache');
      await cache.set('https://example.com/', content);
      const result = await cache.get('https://example.com/');
      expect(result).toEqual(content);
    });

    it('should store and retrieve string content as Buffer', async () => {
      const cache = new ResponseCache(tempDir, true);
      await cache.set('https://example.com/', 'hello string');
      const result = await cache.get('https://example.com/');
      expect(result?.toString()).toBe('hello string');
    });

    it('should store different URLs in separate cache files', async () => {
      const cache = new ResponseCache(tempDir, true);
      await cache.set('https://example.com/a', Buffer.from('aaa'));
      await cache.set('https://example.com/b', Buffer.from('bbb'));
      expect((await cache.get('https://example.com/a'))?.toString()).toBe('aaa');
      expect((await cache.get('https://example.com/b'))?.toString()).toBe('bbb');
    });
  });

  describe('clear', () => {
    it('should delete all .cache files', async () => {
      const cache = new ResponseCache(tempDir, true);
      await cache.set('https://example.com/1', Buffer.from('1'));
      await cache.set('https://example.com/2', Buffer.from('2'));
      await cache.clear();
      const files = await readdir(tempDir);
      expect(files.filter((f) => f.endsWith('.cache'))).toHaveLength(0);
    });

    it('should not throw when the cache is empty', async () => {
      const cache = new ResponseCache(tempDir, true);
      await expect(cache.clear()).resolves.not.toThrow();
    });
  });

  describe('enabled: false', () => {
    it('get should always return null', async () => {
      const cache = new ResponseCache(tempDir, false);
      await cache.set('https://example.com/', Buffer.from('data'));
      const result = await cache.get('https://example.com/');
      expect(result).toBeNull();
    });

    it('set should not write any files', async () => {
      const cache = new ResponseCache(tempDir, false);
      await cache.set('https://example.com/', Buffer.from('data'));
      const files = await readdir(tempDir);
      expect(files).toHaveLength(0);
    });

    it('clear should not throw', async () => {
      const cache = new ResponseCache(tempDir, false);
      await expect(cache.clear()).resolves.not.toThrow();
    });
  });

  describe('getCacheFilePath (via behavior)', () => {
    it('cache file should have .cache extension', async () => {
      const cache = new ResponseCache(tempDir, true);
      await cache.set('https://example.com/', Buffer.from('data'));
      const files = await readdir(tempDir);
      expect(files).toHaveLength(1);
      expect(files[0]).toMatch(/^[a-f0-9]{32}\.cache$/);
    });
  });
});
