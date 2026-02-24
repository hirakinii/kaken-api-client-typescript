import { z } from 'zod';
import { VALID_RESULTS_PER_PAGE } from '../constants.js';

// ============================================================
// Response Data Interfaces
// ============================================================

/** Base interface for all KAKEN API responses. */
export interface KakenApiResponse {
  rawData: unknown;
  totalResults?: number;
  startIndex?: number;
  itemsPerPage?: number;
}

/** Institution information. */
export interface Institution {
  name: string;
  code?: string;
  type?: string;
  /** Fiscal years of participation in the project context (e.g. "2020-2024"). */
  participate?: string;
}

/** Department information. */
export interface Department {
  name: string;
  code?: string;
}

/** Job title information. */
export interface JobTitle {
  name: string;
  code?: string;
}

/** Affiliation combining institution, department, and job title with tenure dates. */
export interface Affiliation {
  sequence?: number;
  institution?: Institution;
  department?: Department;
  jobTitle?: JobTitle;
  startDate?: Date;
  endDate?: Date;
}

/** Person name with reading support for Japanese names. */
export interface PersonName {
  fullName: string;
  familyName?: string;
  givenName?: string;
  familyNameReading?: string;
  givenNameReading?: string;
}

/** Research category information. */
export interface Category {
  name: string;
  path?: string;
  code?: string;
}

/** Research field information. */
export interface Field {
  name: string;
  path?: string;
  code?: string;
  fieldTable?: string;
  sequence?: number;
}

/** Keyword with language tag. */
export interface Keyword {
  text: string;
  /** Language tag. Note: reliability is low — the API may emit "und" (undetermined) for all entries. */
  language?: string;
}

/** Project status at a specific point in time. */
export interface ProjectStatus {
  statusCode: string;
  fiscalYear?: number;
  date?: Date;
  note?: string;
}

/** Award period covering fiscal year range and exact dates. */
export interface PeriodOfAward {
  startDate?: Date;
  endDate?: Date;
  startFiscalYear?: number;
  endFiscalYear?: number;
  searchStartFiscalYear?: number;
  searchEndFiscalYear?: number;
}

/** Currency unit information. */
export interface CurrencyUnit {
  originalValue: string;
  normalizedValue?: string;
}

/** Award amount for the overall project. */
export interface AwardAmount {
  totalCost?: number;
  directCost?: number;
  indirectCost?: number;
  convertedJpyTotalCost?: number;
  unit?: CurrencyUnit;
  planned?: boolean;
  caption?: string;
  userDefinedId?: string;
}

/** Allocation type for a research project. */
export interface Allocation {
  name: string;
  code?: string;
  participate?: string;
}

/** Researcher role within a project. */
export interface ResearcherRole {
  role: string;
  participate?: string;
  sequence?: number;
  researcherNumber?: string;
  eradCode?: string;
  name?: PersonName;
  affiliations?: Affiliation[];
}

/** Researcher information. */
export interface Researcher {
  id?: string;
  name?: PersonName;
  currentAffiliations?: Affiliation[];
  historicalAffiliations?: Affiliation[];
  eradResearcherNumber?: string;
  jglobalId?: string;
  researchmapId?: string;
  orcid?: string;
  projects?: Project[];
  products?: Product[];
  rawData?: unknown;
}

/** Project identifier such as DOI or unified project number. */
export interface ProjectIdentifier {
  type: string;
  value: string;
}

/** Project (research grant) information. */
export interface Project {
  id?: string;
  recordSet?: string;
  awardNumber?: string;
  title?: string;
  titleEn?: string;
  titleAbbreviated?: string;
  categories?: Category[];
  fields?: Field[];
  institutions?: Institution[];
  keywords?: Keyword[];
  periodOfAward?: PeriodOfAward;
  projectStatus?: ProjectStatus;
  projectType?: string;
  allocations?: Allocation[];
  members?: ResearcherRole[];
  awardAmounts?: AwardAmount[];
  created?: Date;
  modified?: Date;
  identifiers?: ProjectIdentifier[];
  rawData?: unknown;
}

/** Product identifier such as DOI or ISBN. */
export interface ProductIdentifier {
  type: string;
  value: string;
  authenticated?: boolean;
}

/** Author of a research product. */
export interface ProductAuthor {
  name: string;
  sequence?: number;
  researcherId?: string;
}

/** Research product (paper, book, presentation, etc.). */
export interface Product {
  id?: string;
  type?: string;
  title?: string;
  titleEn?: string;
  authors?: ProductAuthor[];
  journalTitle?: string;
  journalTitleEn?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  publicationDate?: Date;
  language?: string;
  reviewed?: boolean;
  invited?: boolean;
  foreign?: boolean;
  openAccess?: boolean;
  acknowledgement?: boolean;
  jointInternational?: boolean;
  identifiers?: ProductIdentifier[];
  rawData?: unknown;
}

/** Response for a projects search. */
export interface ProjectsResponse extends KakenApiResponse {
  projects: Project[];
}

/** Response for a researchers search. */
export interface ResearchersResponse extends KakenApiResponse {
  researchers: Researcher[];
}

/** Response for a products search. */
export interface ProductsResponse extends KakenApiResponse {
  products: Product[];
}

// ============================================================
// Shared schema fragments
// ============================================================

const resultsPerPageSchema = z
  .number()
  .int()
  .refine((v) => (VALID_RESULTS_PER_PAGE as readonly number[]).includes(v), {
    message: `resultsPerPage must be one of: ${VALID_RESULTS_PER_PAGE.join(', ')}`,
  })
  .optional();

const languageSchema = z.enum(['ja', 'en']).optional();

const stringOrArraySchema = z.union([z.string(), z.array(z.string())]).optional();

// ============================================================
// Zod Schemas for Search Parameters and Client Options
// ============================================================

/** Zod schema for validating project search parameters. */
export const ProjectSearchParamsSchema = z.object({
  keyword: z.string().optional(),
  resultsPerPage: resultsPerPageSchema,
  language: languageSchema,
  startIndex: z.number().int().positive().optional(),
  projectTitle: z.string().optional(),
  projectNumber: z.string().optional(),
  projectType: stringOrArraySchema,
  researchCategory: z.string().optional(),
  allocationType: stringOrArraySchema,
  researchField: z.string().optional(),
  institution: z.string().optional(),
  grantPeriodFrom: z.number().int().optional(),
  grantPeriodTo: z.number().int().optional(),
  grantPeriodCondition: z.string().optional(),
  totalGrantAmount: z.string().optional(),
  projectStatus: stringOrArraySchema,
  researcherName: z.string().optional(),
  researcherInstitution: z.string().optional(),
  researcherNumber: z.string().optional(),
  researcherRole: stringOrArraySchema,
  sortOrder: z.string().optional(),
});

/** TypeScript type inferred from ProjectSearchParamsSchema. */
export type ProjectSearchParams = z.infer<typeof ProjectSearchParamsSchema>;

/** Zod schema for validating researcher search parameters. */
export const ResearcherSearchParamsSchema = z.object({
  keyword: z.string().optional(),
  resultsPerPage: resultsPerPageSchema,
  language: languageSchema,
  startIndex: z.number().int().positive().optional(),
  researcherName: z.string().optional(),
  researcherNumber: z.string().optional(),
  researcherInstitution: z.string().optional(),
  researcherDepartment: z.string().optional(),
  researcherJobTitle: z.string().optional(),
  projectTitle: z.string().optional(),
  projectNumber: z.string().optional(),
  researchCategory: z.string().optional(),
  researchField: z.string().optional(),
  institution: z.string().optional(),
  grantPeriodFrom: z.number().int().optional(),
  grantPeriodTo: z.number().int().optional(),
  grantPeriodCondition: z.string().optional(),
  sortOrder: z.string().optional(),
});

/** TypeScript type inferred from ResearcherSearchParamsSchema. */
export type ResearcherSearchParams = z.infer<typeof ResearcherSearchParamsSchema>;

/** Zod schema for validating KAKEN API client options. */
export const KakenApiClientOptionsSchema = z.object({
  appId: z.string().optional(),
  timeoutMs: z.number().int().positive().optional(),
  maxRetries: z.number().int().min(0).optional(),
  language: languageSchema,
});

/** TypeScript type inferred from KakenApiClientOptionsSchema. */
export type KakenApiClientOptions = z.infer<typeof KakenApiClientOptionsSchema>;
