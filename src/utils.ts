/** Build URL with query parameters, filtering out null/undefined values. */
export function buildUrl(baseUrl: string, params: Record<string, unknown>): string {
  const filtered = Object.entries(params).filter(([, v]) => v !== null && v !== undefined);
  if (filtered.length === 0) return baseUrl;
  const query = new URLSearchParams(filtered.map(([k, v]) => [k, String(v)])).toString();
  return `${baseUrl}?${query}`;
}

/** Ensure a value is an array. */
export function ensureArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  if (Array.isArray(value)) return value;
  return [value];
}

/** Clean text by removing extra whitespace. */
export function cleanText(text: string | undefined): string | undefined {
  if (text === undefined) return undefined;
  return text.replace(/\s+/g, ' ').trim();
}

/** Join array values to a comma-separated string. */
export function joinValues(values: string[]): string | undefined {
  if (values.length === 0) return undefined;
  return values.join(',');
}
