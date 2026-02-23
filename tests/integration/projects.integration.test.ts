import { describe, it, expect, beforeAll } from 'vitest';
import { KakenApiClient } from '../../src/client.js';
import type { ProjectsResponse } from '../../src/models/index.js';
import { KakenApiRequestError } from '../../src/exceptions.js';

const INTEGRATION_TIMEOUT = 30_000;

describe.skipIf(!process.env.KAKEN_APP_ID)('ProjectsAPI Integration', () => {
  let client: KakenApiClient;

  beforeAll(() => {
    client = new KakenApiClient({
      appId: process.env.KAKEN_APP_ID,
      useCache: false,
    });
  });

  it(
    'should search projects by keyword and return valid response',
    async () => {
      const result = await client.projects.search({
        keyword: '人工知能',
        resultsPerPage: 20,
      });

      expect(result).toBeDefined();
      expect(typeof result.totalResults).toBe('number');
      expect(typeof result.startIndex).toBe('number');
      expect(typeof result.itemsPerPage).toBe('number');
      expect(Array.isArray(result.projects)).toBe(true);
      expect(result.projects.length).toBeGreaterThan(0);

      // Check that the first project has raw data
      const first = result.projects[0];
      expect(first).toBeDefined();
      expect(first.rawData).toBeDefined();
    },
    INTEGRATION_TIMEOUT,
  );

  it(
    'should search projects with parameter (projectTitle)',
    async () => {
      const result: ProjectsResponse = await client.projects.search({
        projectTitle: '深層学習',
        resultsPerPage: 20,
        language: 'ja',
      });

      expect(result).toBeDefined();
      expect(typeof result.totalResults).toBe('number');
      expect(Array.isArray(result.projects)).toBe(true);
    },
    INTEGRATION_TIMEOUT,
  );

  it(
    'should return consistent totalResults across pages',
    async () => {
      // First page
      const result1 = await client.projects.search({
        keyword: 'コンピュータ',
        resultsPerPage: 20,
        startIndex: 1,
      });

      // Second page
      const result2 = await client.projects.search({
        keyword: 'コンピュータ',
        resultsPerPage: 20,
        startIndex: 21,
      });

      // totalResults should be the same across pages
      expect(result1.totalResults).toBe(result2.totalResults);
    },
    INTEGRATION_TIMEOUT,
  );

  it(
    'should throw KakenApiRequestError when startIndex exceeds the maximum',
    async () => {
      await expect(
        client.projects.search({
          keyword: 'テスト',
          startIndex: 999_999_999,
        }),
      ).rejects.toThrow(KakenApiRequestError);
    },
    INTEGRATION_TIMEOUT,
  );
});
