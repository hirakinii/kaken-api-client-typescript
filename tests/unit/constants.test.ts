import { describe, it, expect } from 'vitest';
import {
  ENDPOINTS,
  DEFAULTS,
  LIMITS,
  VALID_RESULTS_PER_PAGE,
  FORMATS,
  LANGUAGES,
  PROJECT_STATUS,
  PROJECT_TYPES,
  ALLOCATION_TYPES,
  RESEARCHER_ROLES,
  REPORT_TYPES,
  PRODUCT_TYPES,
  PROJECT_SORT_OPTIONS,
  RESEARCHER_SORT_OPTIONS,
} from '../../src/constants.js';

describe('ENDPOINTS', () => {
  it('should have a valid projects URL', () => {
    expect(ENDPOINTS.PROJECTS).toBe('https://kaken.nii.ac.jp/opensearch/');
  });

  it('should have a valid researchers URL', () => {
    expect(ENDPOINTS.RESEARCHERS).toBe('https://nrid.nii.ac.jp/opensearch/');
  });
});

describe('DEFAULTS', () => {
  it('should have RESULTS_PER_PAGE of 20', () => {
    expect(DEFAULTS.RESULTS_PER_PAGE).toBe(20);
  });

  it("should have LANGUAGE of 'ja'", () => {
    expect(DEFAULTS.LANGUAGE).toBe('ja');
  });

  it("should have FORMAT_PROJECTS of 'xml'", () => {
    expect(DEFAULTS.FORMAT_PROJECTS).toBe('xml');
  });

  it("should have FORMAT_RESEARCHERS of 'json'", () => {
    expect(DEFAULTS.FORMAT_RESEARCHERS).toBe('json');
  });

  it('should have START_INDEX of 1', () => {
    expect(DEFAULTS.START_INDEX).toBe(1);
  });

  it('should have TIMEOUT_MS of 30000', () => {
    expect(DEFAULTS.TIMEOUT_MS).toBe(30000);
  });

  it('should have MAX_RETRIES of 3', () => {
    expect(DEFAULTS.MAX_RETRIES).toBe(3);
  });
});

describe('LIMITS', () => {
  it('should have MAX_PROJECTS_RESULTS of 200000', () => {
    expect(LIMITS.MAX_PROJECTS_RESULTS).toBe(200000);
  });

  it('should have MAX_RESEARCHERS_RESULTS of 1000', () => {
    expect(LIMITS.MAX_RESEARCHERS_RESULTS).toBe(1000);
  });
});

describe('VALID_RESULTS_PER_PAGE', () => {
  it('should contain 20', () => {
    expect(VALID_RESULTS_PER_PAGE).toContain(20);
  });

  it('should contain 50', () => {
    expect(VALID_RESULTS_PER_PAGE).toContain(50);
  });

  it('should contain 100', () => {
    expect(VALID_RESULTS_PER_PAGE).toContain(100);
  });

  it('should contain 200', () => {
    expect(VALID_RESULTS_PER_PAGE).toContain(200);
  });

  it('should contain 500', () => {
    expect(VALID_RESULTS_PER_PAGE).toContain(500);
  });
});

describe('FORMATS', () => {
  it('should define HTML format', () => {
    expect(FORMATS.HTML).toBe('html5');
  });

  it('should define XML format', () => {
    expect(FORMATS.XML).toBe('xml');
  });

  it('should define JSON format', () => {
    expect(FORMATS.JSON).toBe('json');
  });
});

describe('LANGUAGES', () => {
  it('should define Japanese language code', () => {
    expect(LANGUAGES.JAPANESE).toBe('ja');
  });

  it('should define English language code', () => {
    expect(LANGUAGES.ENGLISH).toBe('en');
  });
});

describe('PROJECT_STATUS', () => {
  it("should have 'adopted' status", () => {
    expect(PROJECT_STATUS.adopted).toBe('採択');
  });

  it("should have 'granted' status", () => {
    expect(PROJECT_STATUS.granted).toBe('交付');
  });

  it("should have 'project_closed' status", () => {
    expect(PROJECT_STATUS.project_closed).toBe('完了');
  });

  it('should have all expected status keys', () => {
    const expectedKeys = ['adopted', 'granted', 'ceased', 'suspended', 'project_closed', 'declined', 'discontinued'];
    for (const key of expectedKeys) {
      expect(PROJECT_STATUS).toHaveProperty(key);
    }
  });
});

describe('PROJECT_TYPES', () => {
  it("should have 'project' type", () => {
    expect(PROJECT_TYPES.project).toBe('研究課題');
  });

  it('should have all expected type keys', () => {
    const expectedKeys = ['project', 'area', 'organizer', 'wrapup', 'planned', 'publicly', 'international'];
    for (const key of expectedKeys) {
      expect(PROJECT_TYPES).toHaveProperty(key);
    }
  });
});

describe('ALLOCATION_TYPES', () => {
  it("should have 'hojokin' type", () => {
    expect(ALLOCATION_TYPES.hojokin).toBe('補助金');
  });

  it('should have all expected keys', () => {
    expect(ALLOCATION_TYPES).toHaveProperty('hojokin');
    expect(ALLOCATION_TYPES).toHaveProperty('kikin');
    expect(ALLOCATION_TYPES).toHaveProperty('ichibu_kikin');
  });
});

describe('RESEARCHER_ROLES', () => {
  it("should have 'principal_investigator' role", () => {
    expect(RESEARCHER_ROLES.principal_investigator).toBe('研究代表者');
  });

  it('should have all expected role keys', () => {
    const expectedKeys = [
      'principal_investigator',
      'area_organizer',
      'co_investigator_buntan',
      'co_investigator_renkei',
      'research_collaborator',
      'research_fellow',
      'host_researcher',
      'foreign_research_fellow',
      'principal_investigator_support',
      'co_investigator_buntan_support',
    ];
    for (const key of expectedKeys) {
      expect(RESEARCHER_ROLES).toHaveProperty(key);
    }
  });
});

describe('REPORT_TYPES', () => {
  it("should have 'jiseki_hokoku' type", () => {
    expect(REPORT_TYPES.jiseki_hokoku).toBe('実績報告書');
  });

  it('should have at least 10 report type entries', () => {
    expect(Object.keys(REPORT_TYPES).length).toBeGreaterThanOrEqual(10);
  });
});

describe('PRODUCT_TYPES', () => {
  it("should have 'journal_article' type", () => {
    expect(PRODUCT_TYPES.journal_article).toBe('雑誌論文');
  });

  it('should have all expected product type keys', () => {
    const expectedKeys = [
      'journal_article',
      'presentation',
      'symposium',
      'book',
      'press',
      'note',
      'patent',
      'publication',
    ];
    for (const key of expectedKeys) {
      expect(PRODUCT_TYPES).toHaveProperty(key);
    }
  });
});

describe('PROJECT_SORT_OPTIONS', () => {
  it("should have sort option '1' as relevance", () => {
    expect(PROJECT_SORT_OPTIONS['1']).toBe('適合度');
  });

  it('should have 5 sort options', () => {
    expect(Object.keys(PROJECT_SORT_OPTIONS).length).toBe(5);
  });
});

describe('RESEARCHER_SORT_OPTIONS', () => {
  it("should have sort option '1' as relevance", () => {
    expect(RESEARCHER_SORT_OPTIONS['1']).toBe('適合度');
  });

  it('should have 7 sort options', () => {
    expect(Object.keys(RESEARCHER_SORT_OPTIONS).length).toBe(7);
  });
});
