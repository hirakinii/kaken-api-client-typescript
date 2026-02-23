// ============================================================
// Main client
// ============================================================
export { KakenApiClient } from './client.js';
export type { KakenApiClientOptions } from './client.js';

// ============================================================
// API classes
// ============================================================
export { ProjectsAPI } from './api/projects.js';
export type { ProjectsAPIOptions, FetchFn } from './api/projects.js';
export { ResearchersAPI } from './api/researchers.js';
export type { ResearchersAPIOptions } from './api/researchers.js';

// ============================================================
// Response models (interfaces)
// ============================================================
export type {
  KakenApiResponse,
  Institution,
  Department,
  JobTitle,
  Affiliation,
  PersonName,
  Category,
  Field,
  Keyword,
  ProjectStatus,
  PeriodOfAward,
  AwardAmount,
  ResearcherRole,
  Researcher,
  Project,
  ProductIdentifier,
  ProductAuthor,
  Product,
  ProjectsResponse,
  ResearchersResponse,
  ProductsResponse,
} from './models/index.js';

// ============================================================
// Search parameter types and Zod schemas
// ============================================================
export type { ProjectSearchParams, ResearcherSearchParams } from './models/index.js';
export {
  ProjectSearchParamsSchema,
  ResearcherSearchParamsSchema,
  KakenApiClientOptionsSchema,
} from './models/index.js';

// ============================================================
// Error classes
// ============================================================
export {
  KakenApiError,
  KakenApiRequestError,
  KakenApiResponseError,
  KakenApiNotFoundError,
  KakenApiAuthError,
  KakenApiRateLimitError,
} from './exceptions.js';

// ============================================================
// Cache
// ============================================================
export { ResponseCache } from './cache.js';

// ============================================================
// Constants
// ============================================================
export { ENDPOINTS, DEFAULTS } from './constants.js';
