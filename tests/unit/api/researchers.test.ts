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

    it('should parse familyNameReading and givenNameReading from ja-Kana entries', async () => {
      const api = new ResearchersAPI({ fetchFn: createMockFetch(SAMPLE_JSON) });
      const result = await api.search({ keyword: '田中' });
      const researcher = result.researchers[0];
      expect(researcher.name!.familyNameReading).toBe('タナカ');
      expect(researcher.name!.givenNameReading).toBe('タロウ');
    });

    it('should parse eradResearcherNumber from id:person:erad[0]', async () => {
      const api = new ResearchersAPI({ fetchFn: createMockFetch(SAMPLE_JSON) });
      const result = await api.search({ keyword: '田中' });
      expect(result.researchers[0].eradResearcherNumber).toBe('80802743');
    });

    it('should parse jglobalId from id:person:jglobal[0]', async () => {
      const api = new ResearchersAPI({ fetchFn: createMockFetch(SAMPLE_JSON) });
      const result = await api.search({ keyword: '田中' });
      expect(result.researchers[0].jglobalId).toBe('12345678');
    });

    it('should parse researchmapId from id:person:researchmap[0]', async () => {
      const api = new ResearchersAPI({ fetchFn: createMockFetch(SAMPLE_JSON) });
      const result = await api.search({ keyword: '田中' });
      expect(result.researchers[0].researchmapId).toBe('rm123456');
    });

    it('should parse orcid from id:orcid[0]', async () => {
      const api = new ResearchersAPI({ fetchFn: createMockFetch(SAMPLE_JSON) });
      const result = await api.search({ keyword: '田中' });
      expect(result.researchers[0].orcid).toBe('0000-0001-2345-6789');
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
      // Code from id:institution:erad (highest priority)
      expect(affiliation.institution!.code).toBe('2112601000');
      expect(affiliation.institution!.type).toBe('university');

      expect(affiliation.department).toBeDefined();
      expect(affiliation.department!.name).toBe('工学部');
      // Code from id:department:erad (highest priority)
      expect(affiliation.department!.code).toBe('012');

      expect(affiliation.jobTitle).toBeDefined();
      expect(affiliation.jobTitle!.name).toBe('教授');
      // Code from id:jobTitle:erad (highest priority)
      expect(affiliation.jobTitle!.code).toBe('0001');
    });

    it('should parse affiliation sequence, startDate, and endDate', async () => {
      const api = new ResearchersAPI({ fetchFn: createMockFetch(SAMPLE_JSON) });
      const result = await api.search({ keyword: '田中' });
      const affiliation = result.researchers[0].currentAffiliations![0];

      expect(affiliation.sequence).toBe(1);
      expect(affiliation.startDate).toBeInstanceOf(Date);
      expect(affiliation.startDate!.getFullYear()).toBe(2020);
      expect(affiliation.startDate!.getMonth()).toBe(3); // April = month index 3
      expect(affiliation.startDate!.getDate()).toBe(1);

      expect(affiliation.endDate).toBeInstanceOf(Date);
      expect(affiliation.endDate!.getFullYear()).toBe(2025);
      expect(affiliation.endDate!.getMonth()).toBe(2); // March = month index 2
      expect(affiliation.endDate!.getDate()).toBe(31);
    });

    it('should parse historical affiliations correctly', async () => {
      const api = new ResearchersAPI({ fetchFn: createMockFetch(SAMPLE_JSON) });
      const result = await api.search({ keyword: '田中' });
      const researcher = result.researchers[0];

      expect(researcher.historicalAffiliations).toBeDefined();
      expect(researcher.historicalAffiliations!).toHaveLength(1);

      const hist = researcher.historicalAffiliations![0];
      expect(hist.sequence).toBe(1);
      expect(hist.institution!.name).toBe('京都大学');
      // Code from id:institution:mext (erad not present, falls back to mext)
      expect(hist.institution!.code).toBe('14301');
      expect(hist.startDate).toBeInstanceOf(Date);
      expect(hist.startDate!.getFullYear()).toBe(2015);
      expect(hist.endDate).toBeInstanceOf(Date);
      expect(hist.endDate!.getFullYear()).toBe(2020);
    });

    it('should parse projects from work:project', async () => {
      const api = new ResearchersAPI({ fetchFn: createMockFetch(SAMPLE_JSON) });
      const result = await api.search({ keyword: '田中' });
      const researcher = result.researchers[0];

      expect(researcher.projects).toBeDefined();
      expect(researcher.projects!).toHaveLength(1);
      const project = researcher.projects![0];
      expect(project.id).toBe('KAKENHI-PROJECT-20K00001');
      expect(project.title).toBe('テスト研究プロジェクト');
      expect(project.titleEn).toBe('Test Research Project');
      expect(project.rawData).toBeDefined();
    });

    it('should parse products from work:product', async () => {
      const api = new ResearchersAPI({ fetchFn: createMockFetch(SAMPLE_JSON) });
      const result = await api.search({ keyword: '田中' });
      const researcher = result.researchers[0];

      expect(researcher.products).toBeDefined();
      expect(researcher.products!).toHaveLength(1);
      const product = researcher.products![0];
      expect(product.id).toBe('id:product:kakenhi**12345');
      expect(product.type).toBe('Journal Article');
      expect(product.title).toBe('テスト論文タイトル');
      expect(product.rawData).toBeDefined();
    });

    it('should use id:institution:mext when id:institution:erad is absent', async () => {
      const json = JSON.stringify({
        totalResults: 1,
        startIndex: 1,
        itemsPerPage: 20,
        researchers: [
          {
            accn: 'test-001',
            'affiliations:current': [
              {
                'affiliation:institution': {
                  humanReadableValue: [{ lang: 'ja', text: '大阪大学' }],
                  'id:institution:mext': '14501',
                },
              },
            ],
          },
        ],
      });
      const api = new ResearchersAPI({ fetchFn: createMockFetch(json) });
      const result = await api.search({ keyword: 'test' });
      expect(result.researchers[0].currentAffiliations![0].institution!.code).toBe('14501');
    });

    it('should use id:department:mext as fallback when id:department:erad is absent', async () => {
      const json = JSON.stringify({
        totalResults: 1,
        startIndex: 1,
        itemsPerPage: 20,
        researchers: [
          {
            accn: 'test-002',
            'affiliations:current': [
              {
                'affiliation:institution': {
                  humanReadableValue: [{ lang: 'ja', text: '大阪大学' }],
                },
                'affiliation:department': {
                  humanReadableValue: [{ lang: 'ja', text: '理学部' }],
                  'id:department:mext': '99999',
                },
              },
            ],
          },
        ],
      });
      const api = new ResearchersAPI({ fetchFn: createMockFetch(json) });
      const result = await api.search({ keyword: 'test' });
      expect(result.researchers[0].currentAffiliations![0].department!.code).toBe('99999');
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
