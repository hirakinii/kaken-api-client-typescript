/** No-op stubs for browser environments. */

export function getCacheFilePath(_cacheDir: string, _url: string): string {
  return '';
}

export async function readCacheFile(_filePath: string): Promise<Buffer | null> {
  return null;
}

export async function writeCacheFile(_cacheDir: string, _filePath: string, _content: Buffer | string): Promise<void> {}

export async function clearCacheFiles(_cacheDir: string): Promise<void> {}
