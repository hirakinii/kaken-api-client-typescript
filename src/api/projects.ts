import { XMLParser } from 'fast-xml-parser';
import { ENDPOINTS, DEFAULTS, LIMITS, VALID_RESULTS_PER_PAGE } from '../constants.js';
import { KakenApiRequestError, KakenApiResponseError, KakenApiNotFoundError } from '../exceptions.js';
import type { ProjectSearchParams, ProjectsResponse, Project } from '../models/index.js';
import { buildUrl, ensureArray, cleanText, joinValues } from '../utils.js';

/** Fetch function signature compatible with the Web Fetch API. */
export type FetchFn = (url: string) => Promise<Response>;

/** Constructor options for ProjectsAPI. */
export interface ProjectsAPIOptions {
  /** Custom fetch implementation. Defaults to the global fetch. */
  fetchFn?: FetchFn;
  /** KAKEN API application ID (appid parameter). */
  appId?: string;
}

/** API client for searching KAKEN research projects. */
export class ProjectsAPI {
  constructor(private readonly options: ProjectsAPIOptions = {}) {}

  /**
   * Search for research projects.
   *
   * @param params - Search parameters. At least one condition must be specified.
   * @returns Parsed projects response.
   * @throws {KakenApiRequestError} When no search condition is provided or startIndex is out of range.
   * @throws {KakenApiNotFoundError} When the API returns 404.
   * @throws {KakenApiResponseError} When the XML response cannot be parsed.
   */
  async search(params: ProjectSearchParams): Promise<ProjectsResponse> {
    this.validateParams(params);

    const startIndex = this.resolveStartIndex(params.startIndex);
    const resultsPerPage = this.resolveResultsPerPage(params.resultsPerPage);

    const queryParams: Record<string, unknown> = {
      kw: params.keyword,
      rw: resultsPerPage,
      lang: params.language ?? DEFAULTS.LANGUAGE,
      st: startIndex,
      format: DEFAULTS.FORMAT_PROJECTS,
      qa: params.projectTitle,
      qb: params.projectNumber,
      c6: joinValues(ensureArray(params.projectType)),
      qc: params.researchCategory,
      c7: joinValues(ensureArray(params.allocationType)),
      qd: params.researchField,
      qe: params.institution,
      s1: params.grantPeriodFrom,
      s2: params.grantPeriodTo,
      o1: params.grantPeriodCondition,
      s3: params.totalGrantAmount,
      c1: joinValues(ensureArray(params.projectStatus)),
      qg: params.researcherName,
      qh: params.researcherInstitution,
      qm: params.researcherNumber,
      c2: joinValues(ensureArray(params.researcherRole)),
      od: params.sortOrder,
      appid: this.options.appId,
    };

    const url = buildUrl(ENDPOINTS.PROJECTS, queryParams);
    const response = await this.doFetch(url);

    if (response.status === 404) {
      throw new KakenApiNotFoundError('Resource not found.', 404);
    }
    if (!response.ok) {
      throw new KakenApiRequestError(`HTTP error: ${response.status}`, response.status);
    }

    const content = await response.text();
    return this.parseXmlResponse(content);
  }

  // ----------------------------------------------------------------
  // Private helpers
  // ----------------------------------------------------------------

  private validateParams(params: ProjectSearchParams): void {
    const {
      keyword,
      projectTitle,
      projectNumber,
      projectType,
      researchCategory,
      allocationType,
      researchField,
      institution,
      grantPeriodFrom,
      grantPeriodTo,
      totalGrantAmount,
      projectStatus,
      researcherName,
      researcherInstitution,
      researcherNumber,
      researcherRole,
    } = params;

    const hasCondition = Boolean(
      keyword ||
      projectTitle ||
      projectNumber ||
      projectType ||
      researchCategory ||
      allocationType ||
      researchField ||
      institution ||
      grantPeriodFrom !== undefined ||
      grantPeriodTo !== undefined ||
      totalGrantAmount ||
      projectStatus ||
      researcherName ||
      researcherInstitution ||
      researcherNumber ||
      researcherRole,
    );

    if (!hasCondition) {
      throw new KakenApiRequestError('Either keyword or at least one search parameter must be provided.');
    }
  }

  /** Resolves startIndex: clamps to 1 if below, throws if above the maximum. */
  private resolveStartIndex(startIndex?: number): number {
    const idx = startIndex ?? DEFAULTS.START_INDEX;
    if (idx > LIMITS.MAX_PROJECTS_RESULTS) {
      throw new KakenApiRequestError(`Start index cannot exceed ${LIMITS.MAX_PROJECTS_RESULTS}.`);
    }
    return idx < 1 ? DEFAULTS.START_INDEX : idx;
  }

  /** Corrects resultsPerPage to the default when it is not in the allowed set. */
  private resolveResultsPerPage(resultsPerPage?: number): number {
    if (resultsPerPage !== undefined && (VALID_RESULTS_PER_PAGE as readonly number[]).includes(resultsPerPage)) {
      return resultsPerPage;
    }
    return DEFAULTS.RESULTS_PER_PAGE;
  }

  private async doFetch(url: string): Promise<Response> {
    const fetchFn = this.options.fetchFn ?? fetch;
    try {
      return await fetchFn(url);
    } catch (error) {
      throw new KakenApiRequestError(`Request failed: ${String(error)}`);
    }
  }

  private parseXmlResponse(content: string): ProjectsResponse {
    try {
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        isArray: (name) => name === 'grantAward',
      });
      const parsed = parser.parse(content) as Record<string, unknown>;

      // Skip the XML declaration key ('?xml') to find the actual root element.
      const rootKey = Object.keys(parsed).find((k) => !k.startsWith('?'));
      if (!rootKey) {
        throw new Error('Empty parsed result — not valid XML');
      }
      const root = parsed[rootKey] as Record<string, unknown>;
      if (typeof root !== 'object' || root === null) {
        throw new Error('Unexpected root element type');
      }

      const grantAwards = (root.grantAward as unknown[]) ?? [];
      const projects = (Array.isArray(grantAwards) ? grantAwards : [grantAwards]).map((ga) =>
        this.parseProject(ga as Record<string, unknown>),
      );

      return {
        rawData: content,
        totalResults: root.totalResults !== undefined ? Number(root.totalResults) : undefined,
        startIndex: root.startIndex !== undefined ? Number(root.startIndex) : undefined,
        itemsPerPage: root.itemsPerPage !== undefined ? Number(root.itemsPerPage) : undefined,
        projects,
      };
    } catch (error) {
      if (error instanceof KakenApiResponseError) throw error;
      throw new KakenApiResponseError(`Failed to parse XML response: ${String(error)}`);
    }
  }

  private parseProject(grantAward: Record<string, unknown>): Project {
    const summary = grantAward.summary as Record<string, unknown> | undefined;
    const title = summary?.title as string | undefined;

    return {
      id: grantAward['@_id'] as string | undefined,
      awardNumber: grantAward['@_awardNumber'] as string | undefined,
      projectType: grantAward['@_projectType'] as string | undefined,
      title: cleanText(title),
      rawData: grantAward,
    };
  }
}
