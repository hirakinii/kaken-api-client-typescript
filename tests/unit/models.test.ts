import { describe, it, expect } from 'vitest';
import {
  ProjectSearchParamsSchema,
  ResearcherSearchParamsSchema,
  KakenApiClientOptionsSchema,
  type Allocation,
  type CurrencyUnit,
  type AwardAmount,
  type ResearcherRole,
  type ProjectStatus,
  type PeriodOfAward,
  type Project,
  type ProjectIdentifier,
  type Field,
  type Institution,
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

// ============================================================
// Interface type compilation tests (Steps 1–5)
// ============================================================

describe('Allocation interface (Step 1)', () => {
  it('should accept required name field only', () => {
    const allocation: Allocation = { name: 'Young Scientists' };
    expect(allocation.name).toBe('Young Scientists');
  });

  it('should accept optional code and participate fields', () => {
    const allocation: Allocation = { name: 'Young Scientists', code: '001', participate: '2024' };
    expect(allocation.code).toBe('001');
    expect(allocation.participate).toBe('2024');
  });
});

describe('CurrencyUnit interface (Step 2)', () => {
  it('should accept required originalValue', () => {
    const unit: CurrencyUnit = { originalValue: 'JPY' };
    expect(unit.originalValue).toBe('JPY');
  });

  it('should accept optional normalizedValue', () => {
    const unit: CurrencyUnit = { originalValue: 'JPY', normalizedValue: 'jpy' };
    expect(unit.normalizedValue).toBe('jpy');
  });
});

describe('AwardAmount interface (Step 2)', () => {
  it('should accept new convertedJpyTotalCost field', () => {
    const amount: AwardAmount = { convertedJpyTotalCost: 1_000_000 };
    expect(amount.convertedJpyTotalCost).toBe(1_000_000);
  });

  it('should accept unit as CurrencyUnit object', () => {
    const amount: AwardAmount = { unit: { originalValue: 'JPY' } };
    expect(amount.unit?.originalValue).toBe('JPY');
  });

  it('should accept caption and userDefinedId fields', () => {
    const amount: AwardAmount = { caption: 'Total Budget', userDefinedId: 'id-001' };
    expect(amount.caption).toBe('Total Budget');
    expect(amount.userDefinedId).toBe('id-001');
  });
});

describe('ResearcherRole interface (Step 3)', () => {
  it('should accept role without researcher (researcher field removed)', () => {
    const role: ResearcherRole = { role: 'principal_investigator' };
    expect(role.role).toBe('principal_investigator');
  });

  it('should accept new optional sequence, researcherNumber, eradCode fields', () => {
    const role: ResearcherRole = {
      role: 'co_investigator',
      sequence: 1,
      researcherNumber: '12345678',
      eradCode: 'ERAD001',
    };
    expect(role.sequence).toBe(1);
    expect(role.researcherNumber).toBe('12345678');
    expect(role.eradCode).toBe('ERAD001');
  });
});

describe('ProjectStatus interface (Step 4)', () => {
  it('should accept new fiscalYear field', () => {
    const status: ProjectStatus = { statusCode: 'adopted', fiscalYear: 2024 };
    expect(status.fiscalYear).toBe(2024);
  });
});

describe('PeriodOfAward interface (Step 5)', () => {
  it('should accept new searchStartFiscalYear field', () => {
    const period: PeriodOfAward = { searchStartFiscalYear: 2020 };
    expect(period.searchStartFiscalYear).toBe(2020);
  });

  it('should accept new searchEndFiscalYear field', () => {
    const period: PeriodOfAward = { searchEndFiscalYear: 2024 };
    expect(period.searchEndFiscalYear).toBe(2024);
  });
});

describe('Project interface (Step 6)', () => {
  it('should accept new recordSet field', () => {
    const project: Project = { recordSet: 'kakenhi' };
    expect(project.recordSet).toBe('kakenhi');
  });

  it('should accept new created and modified Date fields', () => {
    const now = new Date('2024-01-01T00:00:00Z');
    const project: Project = { created: now, modified: now };
    expect(project.created).toBe(now);
    expect(project.modified).toBe(now);
  });

  it('should accept identifiers as ProjectIdentifier array', () => {
    const project: Project = {
      identifiers: [{ type: 'doi', value: '10.1234/test' }],
    };
    expect(project.identifiers?.[0]?.type).toBe('doi');
    expect(project.identifiers?.[0]?.value).toBe('10.1234/test');
  });
});

describe('ProjectIdentifier interface (Step 6)', () => {
  it('should accept required type and value fields', () => {
    const id: ProjectIdentifier = { type: 'nationalAwardNumber', value: '12345678' };
    expect(id.type).toBe('nationalAwardNumber');
    expect(id.value).toBe('12345678');
  });
});

describe('Field interface (Step 7)', () => {
  it('should accept new sequence field', () => {
    const field: Field = { name: 'Computer Science', sequence: 1 };
    expect(field.sequence).toBe(1);
  });
});

describe('Institution interface (Step 7)', () => {
  it('should accept new participate field', () => {
    const institution: Institution = { name: 'Tokyo University', participate: '2020-2024' };
    expect(institution.participate).toBe('2020-2024');
  });
});
