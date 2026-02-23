import { describe, it, expect } from 'vitest';
import {
  ProjectSearchParamsSchema,
  ResearcherSearchParamsSchema,
  KakenApiClientOptionsSchema,
} from '../../src/models/index.js';

describe('ProjectSearchParamsSchema', () => {
  it('should accept an empty object', () => {
    const result = ProjectSearchParamsSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should accept a valid keyword', () => {
    const result = ProjectSearchParamsSchema.safeParse({ keyword: 'machine learning' });
    expect(result.success).toBe(true);
  });

  it('should accept all valid resultsPerPage values', () => {
    for (const value of [20, 50, 100, 200, 500]) {
      const result = ProjectSearchParamsSchema.safeParse({ resultsPerPage: value });
      expect(result.success).toBe(true);
    }
  });

  it('should reject an invalid resultsPerPage', () => {
    const result = ProjectSearchParamsSchema.safeParse({ resultsPerPage: 30 });
    expect(result.success).toBe(false);
  });

  it('should reject resultsPerPage of 0', () => {
    const result = ProjectSearchParamsSchema.safeParse({ resultsPerPage: 0 });
    expect(result.success).toBe(false);
  });

  it('should accept language "ja"', () => {
    const result = ProjectSearchParamsSchema.safeParse({ language: 'ja' });
    expect(result.success).toBe(true);
  });

  it('should accept language "en"', () => {
    const result = ProjectSearchParamsSchema.safeParse({ language: 'en' });
    expect(result.success).toBe(true);
  });

  it('should reject an invalid language', () => {
    const result = ProjectSearchParamsSchema.safeParse({ language: 'fr' });
    expect(result.success).toBe(false);
  });

  it('should accept a positive startIndex', () => {
    const result = ProjectSearchParamsSchema.safeParse({ startIndex: 1 });
    expect(result.success).toBe(true);
  });

  it('should reject startIndex of 0', () => {
    const result = ProjectSearchParamsSchema.safeParse({ startIndex: 0 });
    expect(result.success).toBe(false);
  });

  it('should reject a negative startIndex', () => {
    const result = ProjectSearchParamsSchema.safeParse({ startIndex: -1 });
    expect(result.success).toBe(false);
  });

  it('should accept a string for projectType', () => {
    const result = ProjectSearchParamsSchema.safeParse({ projectType: 'project' });
    expect(result.success).toBe(true);
  });

  it('should accept a string array for projectType', () => {
    const result = ProjectSearchParamsSchema.safeParse({ projectType: ['project', 'area'] });
    expect(result.success).toBe(true);
  });

  it('should accept a string array for projectStatus', () => {
    const result = ProjectSearchParamsSchema.safeParse({
      projectStatus: ['adopted', 'granted'],
    });
    expect(result.success).toBe(true);
  });

  it('should accept a full valid params object', () => {
    const result = ProjectSearchParamsSchema.safeParse({
      keyword: '量子コンピュータ',
      resultsPerPage: 50,
      language: 'ja',
      startIndex: 1,
      projectTitle: 'テスト',
      projectNumber: '12345678',
      researcherName: '山田太郎',
      sortOrder: '2',
    });
    expect(result.success).toBe(true);
  });
});

describe('ResearcherSearchParamsSchema', () => {
  it('should accept an empty object', () => {
    const result = ResearcherSearchParamsSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should accept a valid keyword', () => {
    const result = ResearcherSearchParamsSchema.safeParse({ keyword: 'physics' });
    expect(result.success).toBe(true);
  });

  it('should accept all valid resultsPerPage values', () => {
    for (const value of [20, 50, 100, 200, 500]) {
      const result = ResearcherSearchParamsSchema.safeParse({ resultsPerPage: value });
      expect(result.success).toBe(true);
    }
  });

  it('should reject an invalid resultsPerPage', () => {
    const result = ResearcherSearchParamsSchema.safeParse({ resultsPerPage: 10 });
    expect(result.success).toBe(false);
  });

  it('should accept language "ja"', () => {
    const result = ResearcherSearchParamsSchema.safeParse({ language: 'ja' });
    expect(result.success).toBe(true);
  });

  it('should reject an invalid language', () => {
    const result = ResearcherSearchParamsSchema.safeParse({ language: 'zh' });
    expect(result.success).toBe(false);
  });

  it('should accept a positive startIndex', () => {
    const result = ResearcherSearchParamsSchema.safeParse({ startIndex: 5 });
    expect(result.success).toBe(true);
  });

  it('should reject startIndex of 0', () => {
    const result = ResearcherSearchParamsSchema.safeParse({ startIndex: 0 });
    expect(result.success).toBe(false);
  });

  it('should accept a full valid params object', () => {
    const result = ResearcherSearchParamsSchema.safeParse({
      keyword: 'quantum',
      researcherName: 'Yamada',
      researcherNumber: '12345678',
      researcherInstitution: '東京大学',
      researcherDepartment: '工学部',
      language: 'en',
      resultsPerPage: 100,
      startIndex: 1,
    });
    expect(result.success).toBe(true);
  });
});

describe('KakenApiClientOptionsSchema', () => {
  it('should accept an empty object', () => {
    const result = KakenApiClientOptionsSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should accept a valid appId', () => {
    const result = KakenApiClientOptionsSchema.safeParse({ appId: 'my-app-id' });
    expect(result.success).toBe(true);
  });

  it('should accept a positive timeoutMs', () => {
    const result = KakenApiClientOptionsSchema.safeParse({ timeoutMs: 30000 });
    expect(result.success).toBe(true);
  });

  it('should reject zero timeoutMs', () => {
    const result = KakenApiClientOptionsSchema.safeParse({ timeoutMs: 0 });
    expect(result.success).toBe(false);
  });

  it('should reject a negative timeoutMs', () => {
    const result = KakenApiClientOptionsSchema.safeParse({ timeoutMs: -1 });
    expect(result.success).toBe(false);
  });

  it('should accept maxRetries of 0', () => {
    const result = KakenApiClientOptionsSchema.safeParse({ maxRetries: 0 });
    expect(result.success).toBe(true);
  });

  it('should accept a positive maxRetries', () => {
    const result = KakenApiClientOptionsSchema.safeParse({ maxRetries: 5 });
    expect(result.success).toBe(true);
  });

  it('should reject a negative maxRetries', () => {
    const result = KakenApiClientOptionsSchema.safeParse({ maxRetries: -1 });
    expect(result.success).toBe(false);
  });

  it('should accept language "ja"', () => {
    const result = KakenApiClientOptionsSchema.safeParse({ language: 'ja' });
    expect(result.success).toBe(true);
  });

  it('should reject an invalid language', () => {
    const result = KakenApiClientOptionsSchema.safeParse({ language: 'de' });
    expect(result.success).toBe(false);
  });

  it('should accept a full valid options object', () => {
    const result = KakenApiClientOptionsSchema.safeParse({
      appId: 'my-app',
      timeoutMs: 10000,
      maxRetries: 3,
      language: 'ja',
    });
    expect(result.success).toBe(true);
  });
});
