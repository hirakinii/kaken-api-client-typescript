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
  });
});
