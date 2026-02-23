import { describe, it, expect } from 'vitest';
import { buildUrl, ensureArray, cleanText, joinValues } from '../../src/utils.js';

describe('buildUrl', () => {
  it('should return the base URL when no params are provided', () => {
    expect(buildUrl('https://example.com/', {})).toBe('https://example.com/');
  });

  it('should append query parameters to the URL', () => {
    const result = buildUrl('https://example.com/', { q: 'test', lang: 'ja' });
    expect(result).toBe('https://example.com/?q=test&lang=ja');
  });

  it('should exclude null values', () => {
    const result = buildUrl('https://example.com/', { q: 'test', lang: null });
    expect(result).toBe('https://example.com/?q=test');
  });

  it('should exclude undefined values', () => {
    const result = buildUrl('https://example.com/', { q: 'test', lang: undefined });
    expect(result).toBe('https://example.com/?q=test');
  });

  it('should URL-encode special characters', () => {
    const result = buildUrl('https://example.com/', { q: 'hello world' });
    expect(result).toBe('https://example.com/?q=hello+world');
  });

  it('should URL-encode Japanese characters', () => {
    const result = buildUrl('https://example.com/', { q: '量子' });
    expect(decodeURIComponent(result)).toBe('https://example.com/?q=量子');
  });

  it('should return base URL when all params are null', () => {
    const result = buildUrl('https://example.com/', { a: null, b: undefined });
    expect(result).toBe('https://example.com/');
  });

  it('should handle numeric values', () => {
    const result = buildUrl('https://example.com/', { count: 10, page: 1 });
    expect(result).toBe('https://example.com/?count=10&page=1');
  });
});

describe('ensureArray', () => {
  it('should return the same array when given an array', () => {
    expect(ensureArray([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it('should wrap a single value in an array', () => {
    expect(ensureArray('hello')).toEqual(['hello']);
  });

  it('should return an empty array for undefined', () => {
    expect(ensureArray(undefined)).toEqual([]);
  });

  it('should handle an empty array', () => {
    expect(ensureArray([])).toEqual([]);
  });

  it('should wrap a number in an array', () => {
    expect(ensureArray(42)).toEqual([42]);
  });

  it('should wrap an object in an array', () => {
    const obj = { key: 'value' };
    expect(ensureArray(obj)).toEqual([obj]);
  });
});

describe('cleanText', () => {
  it('should return undefined for undefined input', () => {
    expect(cleanText(undefined)).toBeUndefined();
  });

  it('should collapse multiple spaces into one', () => {
    expect(cleanText('hello   world')).toBe('hello world');
  });

  it('should trim leading and trailing whitespace', () => {
    expect(cleanText('  hello  ')).toBe('hello');
  });

  it('should handle newlines and tabs', () => {
    expect(cleanText('hello\n\tworld')).toBe('hello world');
  });

  it('should return an empty string for empty input', () => {
    expect(cleanText('')).toBe('');
  });

  it('should not modify already clean text', () => {
    expect(cleanText('hello world')).toBe('hello world');
  });
});

describe('joinValues', () => {
  it('should return undefined for an empty array', () => {
    expect(joinValues([])).toBeUndefined();
  });

  it('should return a single value without a separator', () => {
    expect(joinValues(['hello'])).toBe('hello');
  });

  it('should join multiple values with a comma', () => {
    expect(joinValues(['a', 'b', 'c'])).toBe('a,b,c');
  });

  it('should handle numeric strings', () => {
    expect(joinValues(['1', '2', '3'])).toBe('1,2,3');
  });
});
