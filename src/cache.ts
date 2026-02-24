import { getCacheFilePath, readCacheFile, writeCacheFile, clearCacheFiles } from './node-cache-io.js';

export class ResponseCache {
  constructor(
    private readonly cacheDir: string,
    private readonly enabled: boolean,
  ) {}

  async get(url: string): Promise<Buffer | null> {
    if (!this.enabled) return null;
    return readCacheFile(getCacheFilePath(this.cacheDir, url));
  }

  async set(url: string, content: Buffer | string): Promise<void> {
    if (!this.enabled) return;
    await writeCacheFile(this.cacheDir, getCacheFilePath(this.cacheDir, url), content);
  }

  async clear(): Promise<void> {
    if (!this.enabled) return;
    try {
      await clearCacheFiles(this.cacheDir);
    } catch {
      // Directory does not exist or is not readable — nothing to clear
    }
  }
}
