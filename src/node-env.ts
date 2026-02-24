import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** Returns the default directory for file-based response caching. */
export function getDefaultCacheDir(): string {
  return join(tmpdir(), 'kaken-api-cache');
}
