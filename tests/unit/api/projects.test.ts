import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, vi } from 'vitest';
import { ProjectsAPI } from '../../../src/api/projects.js';
import { KakenApiRequestError, KakenApiResponseError, KakenApiNotFoundError } from '../../../src/exceptions.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SAMPLE_XML = readFileSync(resolve(__dirname, '../../fixtures/projects_response.xml'), 'utf-8');

/** Creates a mock fetch function returning the given body and status. */
function createMockFetch(body: string, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(body),
  });
}

describe('ProjectsAPI', () => {
  describe('search()', () => {
    it('should return ProjectsResponse type', async () => {
      const api = new ProjectsAPI({ fetchFn: createMockFetch(SAMPLE_XML) });
      const result = await api.search({ keyword: '機械学習' });
      expect(result).toBeDefined();
      expect(Array.isArray(result.projects)).toBe(true);
    });

    it('should parse metadata (totalResults, startIndex, itemsPerPage)', async () => {
      const api = new ProjectsAPI({ fetchFn: createMockFetch(SAMPLE_XML) });
      const result = await api.search({ keyword: '機械学習' });
      expect(result.totalResults).toBe(1234);
      expect(result.startIndex).toBe(1);
      expect(result.itemsPerPage).toBe(20);
    });

    it('should build project array with correct fields', async () => {
      const api = new ProjectsAPI({ fetchFn: createMockFetch(SAMPLE_XML) });
      const result = await api.search({ keyword: '機械学習' });

      expect(result.projects).toHaveLength(2);

      const first = result.projects[0];
      expect(first.id).toBe('KAKENHI-PROJECT-21K10000');
      expect(first.awardNumber).toBe('21K10000');
      expect(first.projectType).toBe('project');
      expect(first.title).toBe('機械学習を用いた新しい研究手法の開発');

      const second = result.projects[1];
      expect(second.id).toBe('KAKENHI-PROJECT-22L20000');
      expect(second.awardNumber).toBe('22L20000');
      expect(second.projectType).toBe('area');
    });

    it('should throw KakenApiRequestError when no search params provided', async () => {
      const api = new ProjectsAPI({ fetchFn: createMockFetch(SAMPLE_XML) });
      await expect(api.search({})).rejects.toThrow(KakenApiRequestError);
    });

    it('should throw KakenApiRequestError when startIndex exceeds MAX_PROJECTS_RESULTS', async () => {
      const api = new ProjectsAPI({ fetchFn: createMockFetch(SAMPLE_XML) });
      await expect(api.search({ keyword: 'test', startIndex: 200001 })).rejects.toThrow(KakenApiRequestError);
    });

    it('should throw KakenApiNotFoundError on 404 response', async () => {
      const api = new ProjectsAPI({ fetchFn: createMockFetch('', 404) });
      await expect(api.search({ keyword: 'test' })).rejects.toThrow(KakenApiNotFoundError);
    });

    it('should throw KakenApiResponseError on invalid XML', async () => {
      const api = new ProjectsAPI({ fetchFn: createMockFetch('plain text no xml tags') });
      await expect(api.search({ keyword: 'test' })).rejects.toThrow(KakenApiResponseError);
    });

    it('should correct invalid resultsPerPage to default (20)', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(SAMPLE_XML),
      });
      const api = new ProjectsAPI({ fetchFn: mockFetch });
      // 30 is not a valid resultsPerPage value
      await api.search({ keyword: 'test', resultsPerPage: 30 as never });
      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('rw=20');
    });

    it('should use provided resultsPerPage when valid', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(SAMPLE_XML),
      });
      const api = new ProjectsAPI({ fetchFn: mockFetch });
      await api.search({ keyword: 'test', resultsPerPage: 50 });
      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('rw=50');
    });

    it('should include appId in URL when configured', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(SAMPLE_XML),
      });
      const api = new ProjectsAPI({ fetchFn: mockFetch, appId: 'my-app-id' });
      await api.search({ keyword: 'test' });
      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('appid=my-app-id');
    });

    it('should work with non-keyword search params (e.g. projectTitle only)', async () => {
      const api = new ProjectsAPI({ fetchFn: createMockFetch(SAMPLE_XML) });
      const result = await api.search({ projectTitle: '深層学習' });
      expect(result.projects).toBeDefined();
    });

    describe('parseProject expanded fields (Step 8)', () => {
      async function getFirstProject() {
        const api = new ProjectsAPI({ fetchFn: createMockFetch(SAMPLE_XML) });
        const result = await api.search({ keyword: '機械学習' });
        const first = result.projects[0];
        if (!first) throw new Error('No projects');
        return first;
      }

      it('should parse recordSet from grantAward attribute', async () => {
        const p = await getFirstProject();
        expect(p.recordSet).toBe('kakenhi');
      });

      it('should parse created as a Date', async () => {
        const p = await getFirstProject();
        expect(p.created).toBeInstanceOf(Date);
        expect(p.created?.toISOString()).toBe('2021-04-01T00:00:00.000Z');
      });

      it('should parse modified as a Date', async () => {
        const p = await getFirstProject();
        expect(p.modified).toBeInstanceOf(Date);
        expect(p.modified?.toISOString()).toBe('2023-03-31T00:00:00.000Z');
      });

      it('should parse identifiers array', async () => {
        const p = await getFirstProject();
        expect(p.identifiers).toHaveLength(2);
        expect(p.identifiers?.[0]).toEqual({ type: 'doi', value: '10.1234/test' });
        expect(p.identifiers?.[1]).toEqual({ type: 'nationalAwardNumber', value: '21K10000' });
      });

      it('should extract titleEn from en summary', async () => {
        const p = await getFirstProject();
        expect(p.titleEn).toBe('Development of New Research Methods Using Machine Learning');
      });

      it('should extract titleAbbreviated from ja summary', async () => {
        const p = await getFirstProject();
        expect(p.titleAbbreviated).toBe('機械学習研究');
      });

      it('should parse categories', async () => {
        const p = await getFirstProject();
        expect(p.categories).toHaveLength(1);
        expect(p.categories?.[0]?.name).toBe('情報学');
        expect(p.categories?.[0]?.path).toBe('1100/1101');
        expect(p.categories?.[0]?.code).toBe('1101');
      });

      it('should parse fields with sequence', async () => {
        const p = await getFirstProject();
        expect(p.fields).toHaveLength(1);
        expect(p.fields?.[0]?.name).toBe('情報科学');
        expect(p.fields?.[0]?.code).toBe('123');
        expect(p.fields?.[0]?.fieldTable).toBe('saimoku');
        expect(p.fields?.[0]?.sequence).toBe(1);
      });

      it('should parse institutions with participate', async () => {
        const p = await getFirstProject();
        expect(p.institutions).toHaveLength(1);
        expect(p.institutions?.[0]?.name).toBe('東京大学');
        expect(p.institutions?.[0]?.code).toBe('32616');
        expect(p.institutions?.[0]?.type).toBe('academic');
        expect(p.institutions?.[0]?.participate).toBe('2021-2023');
      });

      it('should parse allocations', async () => {
        const p = await getFirstProject();
        expect(p.allocations).toHaveLength(1);
        expect(p.allocations?.[0]?.name).toBe('若手研究');
        expect(p.allocations?.[0]?.code).toBe('0601');
        expect(p.allocations?.[0]?.participate).toBe('2021-2023');
      });

      it('should parse members with all fields', async () => {
        const p = await getFirstProject();
        expect(p.members).toHaveLength(1);
        const m = p.members?.[0];
        expect(m?.role).toBe('principal_investigator');
        expect(m?.sequence).toBe(1);
        expect(m?.participate).toBe('2021-2023');
        expect(m?.researcherNumber).toBe('12345678');
        expect(m?.eradCode).toBe('87654321');
      });

      it('should parse member personalName', async () => {
        const p = await getFirstProject();
        const name = p.members?.[0]?.name;
        expect(name?.fullName).toBe('山田 太郎');
        expect(name?.familyName).toBe('山田');
        expect(name?.givenName).toBe('太郎');
        expect(name?.familyNameReading).toBe('やまだ');
        expect(name?.givenNameReading).toBe('たろう');
      });

      it('should parse member affiliations', async () => {
        const p = await getFirstProject();
        const aff = p.members?.[0]?.affiliations?.[0];
        expect(aff?.institution?.name).toBe('東京大学');
        expect(aff?.institution?.code).toBe('32616');
        expect(aff?.department?.name).toBe('工学部');
        expect(aff?.jobTitle?.name).toBe('教授');
      });

      it('should parse projectStatus', async () => {
        const p = await getFirstProject();
        const ps = p.projectStatus;
        expect(ps?.statusCode).toBe('granted');
        expect(ps?.fiscalYear).toBe(2023);
        expect(ps?.date).toBeInstanceOf(Date);
        expect(ps?.note).toBe('some note');
      });

      it('should parse keywords from keywordList', async () => {
        const p = await getFirstProject();
        expect(p.keywords).toHaveLength(2);
        expect(p.keywords?.[0]?.text).toBe('機械学習');
        expect(p.keywords?.[1]?.text).toBe('深層学習');
      });

      it('should parse periodOfAward with all fields', async () => {
        const p = await getFirstProject();
        const period = p.periodOfAward;
        expect(period?.startFiscalYear).toBe(2021);
        expect(period?.endFiscalYear).toBe(2023);
        expect(period?.searchStartFiscalYear).toBe(2021);
        expect(period?.searchEndFiscalYear).toBe(2023);
        expect(period?.startDate).toBeInstanceOf(Date);
        expect(period?.endDate).toBeInstanceOf(Date);
      });

      it('should parse awardAmounts with all fields', async () => {
        const p = await getFirstProject();
        expect(p.awardAmounts).toHaveLength(1);
        const a = p.awardAmounts?.[0];
        expect(a?.totalCost).toBe(3900000);
        expect(a?.directCost).toBe(3000000);
        expect(a?.indirectCost).toBe(900000);
        expect(a?.convertedJpyTotalCost).toBe(3900000);
        expect(a?.planned).toBe(false);
        expect(a?.caption).toBe('総額');
        expect(a?.userDefinedId).toBe('id-001');
        expect(a?.unit?.originalValue).toBe('千円');
        expect(a?.unit?.normalizedValue).toBe('JPY');
      });
    });
  });
});
