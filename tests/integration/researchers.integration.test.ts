import { describe, it, expect, beforeAll } from 'vitest';
import { KakenApiClient } from '../../src/client.js';
import type { ResearchersResponse } from '../../src/models/index.js';
import { KakenApiRequestError } from '../../src/exceptions.js';

const INTEGRATION_TIMEOUT = 30_000;

describe.skipIf(!process.env.KAKEN_APP_ID)('ResearchersAPI Integration', () => {
  let client: KakenApiClient;

  beforeAll(() => {
    client = new KakenApiClient({
      appId: process.env.KAKEN_APP_ID,
      useCache: false,
    });
  });

  it(
    'should search researchers by keyword and return valid response',
    async () => {
      const result = await client.researchers.search({
        keyword: '田中',
        resultsPerPage: 20,
      });

      expect(result).toBeDefined();
      expect(typeof result.totalResults).toBe('number');
      expect(typeof result.startIndex).toBe('number');
      expect(typeof result.itemsPerPage).toBe('number');
      expect(Array.isArray(result.researchers)).toBe(true);
      expect(result.researchers.length).toBeGreaterThan(0);

      // Check that the first researcher has raw data
      const first = result.researchers[0];
      expect(first).toBeDefined();
      expect(first.rawData).toBeDefined();
    },
    INTEGRATION_TIMEOUT,
  );

  it(
    'should search researchers with name and institution parameters',
    async () => {
      const result: ResearchersResponse = await client.researchers.search({
        researcherName: '田中',
        researcherInstitution: '東京大学',
        resultsPerPage: 20,
        language: 'ja',
      });

      expect(result).toBeDefined();
      expect(typeof result.totalResults).toBe('number');
      expect(Array.isArray(result.researchers)).toBe(true);
    },
    INTEGRATION_TIMEOUT,
  );

  it(
    'should return consistent totalResults across pages',
    async () => {
      // First page
      const result1 = await client.researchers.search({
        keyword: '田中',
        resultsPerPage: 20,
        startIndex: 1,
      });

      // Second page
      const result2 = await client.researchers.search({
        keyword: '田中',
        resultsPerPage: 20,
        startIndex: 21,
      });

      // totalResults should be the same across pages
      expect(result1.totalResults).toBe(result2.totalResults);
    },
    INTEGRATION_TIMEOUT,
  );

  it(
    'should search researchers using project-related parameters',
    async () => {
      const result: ResearchersResponse = await client.researchers.search({
        projectTitle: '人工知能',
        resultsPerPage: 20,
      });

      expect(result).toBeDefined();
      expect(typeof result.totalResults).toBe('number');
      expect(Array.isArray(result.researchers)).toBe(true);
    },
    INTEGRATION_TIMEOUT,
  );

  it(
    'should throw KakenApiRequestError when startIndex exceeds the maximum',
    async () => {
      await expect(
        client.researchers.search({
          keyword: 'テスト',
          startIndex: 999_999_999,
        }),
      ).rejects.toThrow(KakenApiRequestError);
    },
    INTEGRATION_TIMEOUT,
  );
});
