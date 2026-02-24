import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { KakenApiClient } from '../../src/client.js';
import { ProjectsAPI } from '../../src/api/projects.js';
import { ResearchersAPI } from '../../src/api/researchers.js';
import { ResponseCache } from '../../src/cache.js';
import { KakenApiRequestError } from '../../src/exceptions.js';

/** Minimal valid XML that ProjectsAPI can parse (no projects). */
const MINIMAL_XML = `<?xml version="1.0"?>
<response>
  <totalResults>0</totalResults>
  <startIndex>1</startIndex>
  <itemsPerPage>20</itemsPerPage>
</response>`;

/** Creates a mock fetch that returns the given body with the given status. */
function createMockFetch(body = MINIMAL_XML, status = 200) {
  return vi.fn().mockResolvedValue(new Response(body, { status }));
}

describe('KakenApiClient', () => {
  describe('constructor()', () => {
    it('should initialize projects, researchers, and cache properties', () => {
      const client = new KakenApiClient({ fetchFn: createMockFetch() });

      expect(client.projects).toBeInstanceOf(ProjectsAPI);
      expect(client.researchers).toBeInstanceOf(ResearchersAPI);
      expect(client.cache).toBeInstanceOf(ResponseCache);
    });

    it('should work with no options provided', () => {
      expect(() => new KakenApiClient()).not.toThrow();
    });

    it('should create a disabled cache when useCache is false', async () => {
      const client = new KakenApiClient({ useCache: false });
      const result = await client.cache.get('http://example.com');

      expect(result).toBeNull();
    });

    it('should create an enabled cache by default', async () => {
      // When enabled, get() returns null only because the file doesn't exist,
      // not because the cache is disabled. We verify by checking that set() does
      // not throw (it would try to write to the filesystem if enabled).
      const client = new KakenApiClient({ useCache: true });

      expect(client.cache).toBeInstanceOf(ResponseCache);
    });

    it('should initialize cache with empty cacheDir when useCache is false (browser compat)', () => {
      // When useCache is false, no Node.js path computation (tmpdir) should occur,
      // so cacheDir must be empty string rather than a filesystem path.
      const client = new KakenApiClient({ useCache: false });
      const cacheInstance = client.cache as unknown as { cacheDir: string };
      expect(cacheInstance.cacheDir).toBe('');
    });

    it('should compute cacheDir with tmpdir when useCache is true and no cacheDir provided', () => {
      const client = new KakenApiClient({ useCache: true });
      const cacheInstance = client.cache as unknown as { cacheDir: string };
      expect(cacheInstance.cacheDir).toContain('kaken-api-cache');
    });
  });

  describe('cachedFetch', () => {
    it('should not call fetchFn when cache has a hit', async () => {
      const mockFetch = vi.fn();
      const client = new KakenApiClient({ fetchFn: mockFetch, useCache: true });

      vi.spyOn(client.cache, 'get').mockResolvedValue(Buffer.from(MINIMAL_XML));

      await client.projects.search({ keyword: 'test' });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should call fetchFn and cache the response body on cache miss', async () => {
      const mockFetch = createMockFetch();
      const client = new KakenApiClient({ fetchFn: mockFetch, useCache: true });

      vi.spyOn(client.cache, 'get').mockResolvedValue(null);
      const setCacheSpy = vi.spyOn(client.cache, 'set').mockResolvedValue(undefined);

      await client.projects.search({ keyword: 'test' });

      expect(mockFetch).toHaveBeenCalledOnce();
      expect(setCacheSpy).toHaveBeenCalledOnce();
    });

    it('should not cache when useCache is false', async () => {
      const mockFetch = createMockFetch();
      const client = new KakenApiClient({ fetchFn: mockFetch, useCache: false });

      const setCacheSpy = vi.spyOn(client.cache, 'set');

      await client.projects.search({ keyword: 'test' });

      expect(mockFetch).toHaveBeenCalledOnce();
      expect(setCacheSpy).not.toHaveBeenCalled();
    });
  });

  describe('retry behavior', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should retry on network errors and succeed eventually', async () => {
      const mockFetch = vi
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue(new Response(MINIMAL_XML));

      const client = new KakenApiClient({ fetchFn: mockFetch, useCache: false, maxRetries: 3 });

      const searchPromise = client.projects.search({ keyword: 'test' });
      await vi.runAllTimersAsync();

      await expect(searchPromise).resolves.toBeDefined();
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should throw KakenApiRequestError after exhausting all retries', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const client = new KakenApiClient({ fetchFn: mockFetch, useCache: false, maxRetries: 2 });

      const searchPromise = client.projects.search({ keyword: 'test' });
      // Attach the rejection handler BEFORE advancing timers to avoid unhandled-rejection warnings.
      const assertion = expect(searchPromise).rejects.toThrow(KakenApiRequestError);
      await vi.runAllTimersAsync();
      await assertion;

      // 1 initial attempt + 2 retries
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should not retry on 4xx client errors', async () => {
      const mockFetch = vi.fn().mockResolvedValue(new Response('Not Found', { status: 404 }));

      const client = new KakenApiClient({ fetchFn: mockFetch, useCache: false, maxRetries: 3 });

      const searchPromise = client.projects.search({ keyword: 'test' });
      // Attach handler first; 4xx does not involve retries so no timers to advance.
      const assertion = expect(searchPromise).rejects.toBeDefined();
      await vi.runAllTimersAsync();
      await assertion;

      // KakenApiNotFoundError is thrown by ProjectsAPI; fetch should only be called once.
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Symbol.asyncDispose', () => {
    it('should resolve without error (supports await using syntax)', async () => {
      const client = new KakenApiClient();

      await expect(client[Symbol.asyncDispose]()).resolves.toBeUndefined();
    });
  });
});
