import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, readdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';

export class ResponseCache {
  constructor(
    private readonly cacheDir: string,
    private readonly enabled: boolean,
  ) {}

  async get(url: string): Promise<Buffer | null> {
    if (!this.enabled) return null;
    const filePath = this.getCacheFilePath(url);
    try {
      return await readFile(filePath);
    } catch {
      return null;
    }
  }

  async set(url: string, content: Buffer | string): Promise<void> {
    if (!this.enabled) return;
    await mkdir(this.cacheDir, { recursive: true });
    const filePath = this.getCacheFilePath(url);
    await writeFile(filePath, content);
  }

  async clear(): Promise<void> {
    if (!this.enabled) return;
    try {
      const files = await readdir(this.cacheDir);
      await Promise.all(files.filter((f) => f.endsWith('.cache')).map((f) => unlink(join(this.cacheDir, f))));
    } catch {
      // Directory does not exist or is not readable — nothing to clear
    }
  }

  private getCacheFilePath(url: string): string {
    const hash = createHash('md5').update(url).digest('hex');
    return join(this.cacheDir, `${hash}.cache`);
  }
}
