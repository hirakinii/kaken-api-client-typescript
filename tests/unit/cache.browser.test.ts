import { describe, it, expect } from 'vitest';
import { ResponseCache } from '../../src/cache.browser.js';

describe('ResponseCache (browser stub)', () => {
  describe('get()', () => {
    it('should always return null', async () => {
      const cache = new ResponseCache('/tmp/cache', true);
      expect(await cache.get('http://example.com/api')).toBeNull();
    });

    it('should return null even when enabled is true', async () => {
      const cache = new ResponseCache('/tmp/cache', true);
      expect(await cache.get('any-key')).toBeNull();
    });
  });

  describe('set()', () => {
    it('should not throw', async () => {
      const cache = new ResponseCache('/tmp/cache', true);
      await expect(cache.set('http://example.com/api', Buffer.from('data'))).resolves.toBeUndefined();
    });
  });

  describe('clear()', () => {
    it('should not throw', async () => {
      const cache = new ResponseCache('/tmp/cache', true);
      await expect(cache.clear()).resolves.toBeUndefined();
    });
  });

  describe('constructor', () => {
    it('should not throw when instantiated', () => {
      expect(() => new ResponseCache('', false)).not.toThrow();
    });
  });
});
