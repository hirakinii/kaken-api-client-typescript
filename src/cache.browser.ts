/** No-op stub of ResponseCache for browser environments.
 *
 * Bundlers that support the "browser" field in package.json will resolve
 * this module instead of cache.ts, avoiding Node.js-specific imports
 * (node:fs/promises, node:crypto, node:path).
 */
export class ResponseCache {
  constructor(_cacheDir: string, _enabled: boolean) {}

  async get(_key: string): Promise<Buffer | null> {
    return null;
  }

  async set(_key: string, _data: Buffer | string): Promise<void> {}

  async clear(): Promise<void> {}
}
