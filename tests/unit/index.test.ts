import { describe, it, expect } from 'vitest';
import * as KakenApi from '../../src/index.js';

/**
 * Verifies that all public symbols are exported from the library entry point.
 * Types-only exports (interfaces, type aliases) are checked at compile time and
 * cannot be tested at runtime, so this suite focuses on value-level exports.
 */
describe('Public API exports (src/index.ts)', () => {
  describe('main client', () => {
    it('should export KakenApiClient class', () => {
      expect(KakenApi.KakenApiClient).toBeDefined();
      expect(typeof KakenApi.KakenApiClient).toBe('function');
    });
  });

  describe('API classes', () => {
    it('should export ProjectsAPI class', () => {
      expect(KakenApi.ProjectsAPI).toBeDefined();
      expect(typeof KakenApi.ProjectsAPI).toBe('function');
    });

    it('should export ResearchersAPI class', () => {
      expect(KakenApi.ResearchersAPI).toBeDefined();
      expect(typeof KakenApi.ResearchersAPI).toBe('function');
    });
  });

  describe('error classes', () => {
    it('should export KakenApiError', () => {
      expect(KakenApi.KakenApiError).toBeDefined();
      expect(typeof KakenApi.KakenApiError).toBe('function');
    });

    it('should export KakenApiRequestError', () => {
      expect(KakenApi.KakenApiRequestError).toBeDefined();
      const err = new KakenApi.KakenApiRequestError('test');
      expect(err).toBeInstanceOf(KakenApi.KakenApiError);
    });

    it('should export KakenApiResponseError', () => {
      expect(KakenApi.KakenApiResponseError).toBeDefined();
      const err = new KakenApi.KakenApiResponseError('test');
      expect(err).toBeInstanceOf(KakenApi.KakenApiError);
    });

    it('should export KakenApiNotFoundError', () => {
      expect(KakenApi.KakenApiNotFoundError).toBeDefined();
      const err = new KakenApi.KakenApiNotFoundError('test');
      expect(err).toBeInstanceOf(KakenApi.KakenApiError);
    });

    it('should export KakenApiAuthError', () => {
      expect(KakenApi.KakenApiAuthError).toBeDefined();
    });

    it('should export KakenApiRateLimitError', () => {
      expect(KakenApi.KakenApiRateLimitError).toBeDefined();
    });
  });

  describe('cache', () => {
    it('should export ResponseCache class', () => {
      expect(KakenApi.ResponseCache).toBeDefined();
      expect(typeof KakenApi.ResponseCache).toBe('function');
    });
  });

  describe('constants', () => {
    it('should export ENDPOINTS', () => {
      expect(KakenApi.ENDPOINTS).toBeDefined();
      expect(typeof KakenApi.ENDPOINTS).toBe('object');
    });

    it('should export DEFAULTS', () => {
      expect(KakenApi.DEFAULTS).toBeDefined();
      expect(typeof KakenApi.DEFAULTS).toBe('object');
    });
  });

  describe('Zod schemas', () => {
    it('should export ProjectSearchParamsSchema', () => {
      expect(KakenApi.ProjectSearchParamsSchema).toBeDefined();
    });

    it('should export ResearcherSearchParamsSchema', () => {
      expect(KakenApi.ResearcherSearchParamsSchema).toBeDefined();
    });

    it('should export KakenApiClientOptionsSchema', () => {
      expect(KakenApi.KakenApiClientOptionsSchema).toBeDefined();
    });
  });
});
