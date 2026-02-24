import { describe, it, expect } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getDefaultCacheDir } from '../../src/node-env.js';

describe('getDefaultCacheDir', () => {
  it('should return a path inside the OS temp directory', () => {
    const result = getDefaultCacheDir();
    expect(result.startsWith(tmpdir())).toBe(true);
  });

  it('should return a path ending with kaken-api-cache', () => {
    const result = getDefaultCacheDir();
    expect(result).toBe(join(tmpdir(), 'kaken-api-cache'));
  });
});
