import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, readdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';

/** Returns the cache file path for the given URL. */
export function getCacheFilePath(cacheDir: string, url: string): string {
  const hash = createHash('md5').update(url).digest('hex');
  return join(cacheDir, `${hash}.cache`);
}

/** Reads a cache file. Returns null if the file does not exist. */
export async function readCacheFile(filePath: string): Promise<Buffer | null> {
  try {
    return await readFile(filePath);
  } catch {
    return null;
  }
}

/** Writes content to a cache file, creating the cache directory if needed. */
export async function writeCacheFile(cacheDir: string, filePath: string, content: Buffer | string): Promise<void> {
  await mkdir(cacheDir, { recursive: true });
  await writeFile(filePath, content);
}

/** Deletes all `.cache` files in the given directory. */
export async function clearCacheFiles(cacheDir: string): Promise<void> {
  const files = await readdir(cacheDir);
  await Promise.all(files.filter((f) => f.endsWith('.cache')).map((f) => unlink(join(cacheDir, f))));
}
