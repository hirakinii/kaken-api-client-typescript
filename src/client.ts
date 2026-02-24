import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FetchFn } from './api/projects.js';
import { ProjectsAPI } from './api/projects.js';
import { ResearchersAPI } from './api/researchers.js';
import { ResponseCache } from './cache.js';
import { DEFAULTS } from './constants.js';

/** Options for the KakenApiClient constructor. */
export interface KakenApiClientOptions {
  /** KAKEN API application ID (appid parameter). */
  appId?: string;
  /** Request timeout in milliseconds. Defaults to 30000. */
  timeout?: number;
  /** Maximum number of retry attempts on transient failures. Defaults to 3. */
  maxRetries?: number;
  /** Whether to cache responses on disk. Defaults to true. */
  useCache?: boolean;
  /** Directory to store cache files. Defaults to a system temp directory. */
  cacheDir?: string;
  /** Custom fetch implementation. Defaults to the global fetch. */
  fetchFn?: FetchFn;
}

const BASE_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 30_000;

/**
 * Main client for the KAKEN API.
 *
 * Provides access to KAKEN project and researcher search endpoints with
 * optional file-based response caching and exponential-backoff retry logic.
 *
 * @example Basic usage
 * ```ts
 * const client = new KakenApiClient({ appId: 'your_app_id' });
 * const results = await client.projects.search({ keyword: '人工知能' });
 * ```
 *
 * @example Using the `await using` keyword (TypeScript 5.2+)
 * ```ts
 * await using client = new KakenApiClient();
 * const results = await client.projects.search({ keyword: 'AI' });
 * // client[Symbol.asyncDispose]() is called automatically here
 * ```
 */
export class KakenApiClient {
  public readonly projects: ProjectsAPI;
  public readonly researchers: ResearchersAPI;
  public readonly cache: ResponseCache;

  constructor(options: KakenApiClientOptions = {}) {
    const {
      appId,
      timeout = DEFAULTS.TIMEOUT_MS,
      maxRetries = DEFAULTS.MAX_RETRIES,
      useCache = true,
      fetchFn = fetch,
    } = options;

    const cacheDir = options.cacheDir ?? (useCache ? join(tmpdir(), 'kaken-api-cache') : '');

    this.cache = new ResponseCache(cacheDir, useCache);

    const cachedFetch = this.createCachedFetch(fetchFn, timeout, maxRetries, useCache);
    this.projects = new ProjectsAPI({ fetchFn: cachedFetch, ...(appId !== undefined && { appId }) });
    this.researchers = new ResearchersAPI({ fetchFn: cachedFetch, ...(appId !== undefined && { appId }) });
  }

  /**
   * Async disposal for use with the `await using` syntax (TypeScript 5.2+).
   * Currently a no-op — included for forward compatibility and API symmetry
   * with resource-managing clients.
   */
  async [Symbol.asyncDispose](): Promise<void> {
    // Nothing to release for the fetch-based implementation.
  }

  /**
   * Creates a fetch function that transparently applies caching and
   * exponential-backoff retries around the provided base fetch.
   *
   * Cache policy:
   *   - HIT  → return cached bytes immediately; skip HTTP request.
   *   - MISS → fetch, save successful (2xx) responses to cache.
   *
   * Retry policy:
   *   - Network errors and 5xx responses → retry up to `maxRetries` times.
   *   - 4xx responses → return immediately without retrying.
   */
  private createCachedFetch(fetchFn: FetchFn, timeout: number, maxRetries: number, useCache: boolean): FetchFn {
    return async (url: string): Promise<Response> => {
      // Return cached response immediately if available.
      if (useCache) {
        const cached = await this.cache.get(url);
        if (cached !== null) {
          return new Response(new Uint8Array(cached));
        }
      }

      // Attempt the request, retrying on transient failures.
      let lastError: unknown = new Error('Unexpected: no retry attempts were made');

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        if (attempt > 0) {
          const delay = Math.min(BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1), MAX_RETRY_DELAY_MS);
          await sleep(delay);
        }

        let response: Response;
        try {
          response = await withTimeout(fetchFn(url), timeout);
        } catch (error) {
          lastError = error;
          continue;
        }

        // Do not retry client errors (4xx) — they are not transient.
        if (response.status >= 400 && response.status < 500) {
          return response;
        }

        // Treat 5xx as transient and retry.
        if (!response.ok) {
          lastError = new Error(`HTTP ${response.status}`);
          continue;
        }

        // Cache the response body and return a fresh Response.
        if (useCache) {
          const body = await response.arrayBuffer();
          const buffer = Buffer.from(body);
          await this.cache.set(url, buffer);
          return new Response(buffer, { status: response.status });
        }

        return response;
      }

      throw lastError;
    };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms),
  );
  return Promise.race([promise, timeout]);
}
