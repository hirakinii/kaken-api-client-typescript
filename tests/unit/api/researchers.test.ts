import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, vi } from 'vitest';
import { ResearchersAPI } from '../../../src/api/researchers.js';
import { KakenApiRequestError, KakenApiResponseError } from '../../../src/exceptions.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SAMPLE_JSON = readFileSync(resolve(__dirname, '../../fixtures/researchers_response.json'), 'utf-8');

/** Creates a mock fetch function returning the given body and status. */
function createMockFetch(body: string, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(body),
  });
}

describe('ResearchersAPI', () => {
  describe('search()', () => {
    it('should return ResearchersResponse type', async () => {
      const api = new ResearchersAPI({ fetchFn: createMockFetch(SAMPLE_JSON) });
      const result = await api.search({ keyword: '田中' });
      expect(result).toBeDefined();
      expect(Array.isArray(result.researchers)).toBe(true);
    });

    it('should parse metadata (totalResults, startIndex, itemsPerPage)', async () => {
      const api = new ResearchersAPI({ fetchFn: createMockFetch(SAMPLE_JSON) });
      const result = await api.search({ keyword: '田中' });
      expect(result.totalResults).toBe(50);
      expect(result.startIndex).toBe(1);
      expect(result.itemsPerPage).toBe(20);
    });

    it('should parse researcher name correctly (ja preferred)', async () => {
      const api = new ResearchersAPI({ fetchFn: createMockFetch(SAMPLE_JSON) });
      const result = await api.search({ keyword: '田中' });

      expect(result.researchers).toHaveLength(1);
      const researcher = result.researchers[0];
      expect(researcher.id).toBe('1000000001');
      expect(researcher.name).toBeDefined();
      expect(researcher.name!.familyName).toBe('田中');
      expect(researcher.name!.givenName).toBe('太郎');
      expect(researcher.name!.fullName).toBe('田中 太郎');
    });

    it('should parse current affiliations correctly', async () => {
      const api = new ResearchersAPI({ fetchFn: createMockFetch(SAMPLE_JSON) });
      const result = await api.search({ keyword: '田中' });

      const researcher = result.researchers[0];
      expect(researcher.currentAffiliations).toBeDefined();
      expect(researcher.currentAffiliations!).toHaveLength(1);

      const affiliation = researcher.currentAffiliations![0];
      expect(affiliation.institution).toBeDefined();
      expect(affiliation.institution!.name).toBe('東京大学');
      expect(affiliation.institution!.code).toBe('32616');
      expect(affiliation.institution!.type).toBe('university');

      expect(affiliation.department).toBeDefined();
      expect(affiliation.department!.name).toBe('工学部');
      expect(affiliation.department!.code).toBe('12345');

      expect(affiliation.jobTitle).toBeDefined();
      expect(affiliation.jobTitle!.name).toBe('教授');
      expect(affiliation.jobTitle!.code).toBe('67890');
    });

    it('should throw KakenApiRequestError when no search params provided', async () => {
      const api = new ResearchersAPI({ fetchFn: createMockFetch(SAMPLE_JSON) });
      await expect(api.search({})).rejects.toThrow(KakenApiRequestError);
    });

    it('should throw KakenApiRequestError when startIndex exceeds MAX_RESEARCHERS_RESULTS', async () => {
      const api = new ResearchersAPI({ fetchFn: createMockFetch(SAMPLE_JSON) });
      await expect(api.search({ keyword: 'test', startIndex: 1001 })).rejects.toThrow(KakenApiRequestError);
    });

    it('should throw KakenApiResponseError on invalid JSON', async () => {
      const api = new ResearchersAPI({ fetchFn: createMockFetch('not valid json {{{') });
      await expect(api.search({ keyword: '田中' })).rejects.toThrow(KakenApiResponseError);
    });

    it('should correct invalid resultsPerPage to default (20)', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(SAMPLE_JSON),
      });
      const api = new ResearchersAPI({ fetchFn: mockFetch });
      await api.search({ keyword: 'test', resultsPerPage: 30 as never });
      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('rw=20');
    });

    it('should work with non-keyword search params (e.g. researcherName only)', async () => {
      const api = new ResearchersAPI({ fetchFn: createMockFetch(SAMPLE_JSON) });
      const result = await api.search({ researcherName: '田中' });
      expect(result.researchers).toBeDefined();
    });
  });
});
