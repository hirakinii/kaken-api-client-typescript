import { ENDPOINTS, DEFAULTS, LIMITS, VALID_RESULTS_PER_PAGE } from '../constants.js';
import { KakenApiRequestError, KakenApiResponseError, KakenApiNotFoundError } from '../exceptions.js';
import type {
  ResearcherSearchParams,
  ResearchersResponse,
  Researcher,
  Affiliation,
  Institution,
  Department,
  JobTitle,
  PersonName,
} from '../models/index.js';
import { buildUrl } from '../utils.js';

/** Fetch function signature compatible with the Web Fetch API. */
export type FetchFn = (url: string) => Promise<Response>;

/** Constructor options for ResearchersAPI. */
export interface ResearchersAPIOptions {
  /** Custom fetch implementation. Defaults to the global fetch. */
  fetchFn?: FetchFn;
  /** KAKEN API application ID (appid parameter). */
  appId?: string;
}

/** Shape of the top-level JSON response from the researchers endpoint. */
interface ResearchersJsonResponse {
  totalResults?: number;
  startIndex?: number;
  itemsPerPage?: number;
  researchers?: unknown[];
}

/** Raw researcher entry from the JSON response. */
type ResearcherData = Record<string, unknown>;

/** API client for searching KAKEN researchers. */
export class ResearchersAPI {
  constructor(private readonly options: ResearchersAPIOptions = {}) {}

  /**
   * Search for researchers.
   *
   * @param params - Search parameters. At least one condition must be specified.
   * @returns Parsed researchers response.
   * @throws {KakenApiRequestError} When no search condition is provided or startIndex is out of range.
   * @throws {KakenApiNotFoundError} When the API returns 404.
   * @throws {KakenApiResponseError} When the JSON response cannot be parsed.
   */
  async search(params: ResearcherSearchParams): Promise<ResearchersResponse> {
    this.validateParams(params);

    const startIndex = this.resolveStartIndex(params.startIndex);
    const resultsPerPage = this.resolveResultsPerPage(params.resultsPerPage);

    const queryParams: Record<string, unknown> = {
      kw: params.keyword,
      rw: resultsPerPage,
      lang: params.language ?? DEFAULTS.LANGUAGE,
      st: startIndex,
      format: DEFAULTS.FORMAT_RESEARCHERS,
      qg: params.researcherName,
      qm: params.researcherNumber,
      qh: params.researcherInstitution,
      qq: params.researcherDepartment,
      qs: params.researcherJobTitle,
      qa: params.projectTitle,
      qb: params.projectNumber,
      qc: params.researchCategory,
      qd: params.researchField,
      qe: params.institution,
      s1: params.grantPeriodFrom,
      s2: params.grantPeriodTo,
      o1: params.grantPeriodCondition,
      od: params.sortOrder,
      appid: this.options.appId,
    };

    const url = buildUrl(ENDPOINTS.RESEARCHERS, queryParams);
    const response = await this.doFetch(url);

    if (response.status === 404) {
      throw new KakenApiNotFoundError('Resource not found.', 404);
    }
    if (!response.ok) {
      throw new KakenApiRequestError(`HTTP error: ${response.status}`, response.status);
    }

    const content = await response.text();
    return this.parseJsonResponse(content);
  }

  // ----------------------------------------------------------------
  // Private helpers
  // ----------------------------------------------------------------

  private validateParams(params: ResearcherSearchParams): void {
    const {
      keyword,
      researcherName,
      researcherNumber,
      researcherInstitution,
      researcherDepartment,
      researcherJobTitle,
      projectTitle,
      projectNumber,
      researchCategory,
      researchField,
      institution,
      grantPeriodFrom,
      grantPeriodTo,
    } = params;

    const hasCondition = Boolean(
      keyword ||
      researcherName ||
      researcherNumber ||
      researcherInstitution ||
      researcherDepartment ||
      researcherJobTitle ||
      projectTitle ||
      projectNumber ||
      researchCategory ||
      researchField ||
      institution ||
      grantPeriodFrom !== undefined ||
      grantPeriodTo !== undefined,
    );

    if (!hasCondition) {
      throw new KakenApiRequestError('Either keyword or at least one search parameter must be provided.');
    }
  }

  /** Resolves startIndex: clamps to 1 if below, throws if above the maximum. */
  private resolveStartIndex(startIndex?: number): number {
    const idx = startIndex ?? DEFAULTS.START_INDEX;
    if (idx > LIMITS.MAX_RESEARCHERS_RESULTS) {
      throw new KakenApiRequestError(`Start index cannot exceed ${LIMITS.MAX_RESEARCHERS_RESULTS}.`);
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

  private parseJsonResponse(content: string): ResearchersResponse {
    let data: ResearchersJsonResponse;
    try {
      data = JSON.parse(content) as ResearchersJsonResponse;
    } catch (error) {
      throw new KakenApiResponseError(`Failed to parse JSON response: ${String(error)}`);
    }

    try {
      const researchers: Researcher[] = [];
      const list = data.researchers ?? [];
      for (const item of list) {
        researchers.push(this.parseResearcher(item as ResearcherData));
      }

      return {
        rawData: data,
        totalResults: typeof data.totalResults === 'number' ? data.totalResults : undefined,
        startIndex: typeof data.startIndex === 'number' ? data.startIndex : undefined,
        itemsPerPage: typeof data.itemsPerPage === 'number' ? data.itemsPerPage : undefined,
        researchers,
      };
    } catch (error) {
      if (error instanceof KakenApiResponseError) throw error;
      throw new KakenApiResponseError(`Failed to process JSON response: ${String(error)}`);
    }
  }

  private parseResearcher(data: ResearcherData): Researcher {
    const researcher: Researcher = {
      id: typeof data.accn === 'string' ? data.accn : undefined,
      affiliations: [],
      rawData: data,
    };

    // Parse representative name
    const nameData = data.name as Record<string, unknown> | undefined;
    if (nameData) {
      researcher.name = this.parsePersonName(nameData);
    }

    // Parse current affiliations
    const currentAffiliations = data['affiliations:current'];
    if (Array.isArray(currentAffiliations)) {
      for (const item of currentAffiliations) {
        const affiliation = this.parseAffiliation(item as ResearcherData);
        if (affiliation) {
          researcher.affiliations!.push(affiliation);
        }
      }
    }

    return researcher;
  }

  private parsePersonName(nameData: Record<string, unknown>): PersonName {
    const familyName = this.extractLocalizedText(nameData['name:familyName'] as unknown[]);
    const givenName = this.extractLocalizedText(nameData['name:givenName'] as unknown[]);
    const fullName = familyName && givenName ? `${familyName} ${givenName}` : (familyName ?? givenName ?? 'Unknown');

    return { fullName, familyName, givenName };
  }

  private parseAffiliation(data: ResearcherData): Affiliation | undefined {
    const institutionData = data['affiliation:institution'] as ResearcherData | undefined;
    const departmentData = data['affiliation:department'] as ResearcherData | undefined;
    const jobTitleData = data['affiliation:jobTitle'] as ResearcherData | undefined;

    const institution = institutionData ? this.parseInstitution(institutionData) : undefined;
    const department = departmentData ? this.parseDepartment(departmentData) : undefined;
    const jobTitle = jobTitleData ? this.parseJobTitle(jobTitleData) : undefined;

    if (!institution && !department && !jobTitle) return undefined;

    return { institution, department, jobTitle };
  }

  private parseInstitution(data: ResearcherData): Institution | undefined {
    const name = this.extractLocalizedText(data.humanReadableValue as unknown[]);
    if (!name) return undefined;

    return {
      name,
      code: typeof data['id:institution:kakenhi'] === 'string' ? data['id:institution:kakenhi'] : undefined,
      type: typeof data['category:institution:kakenhi'] === 'string' ? data['category:institution:kakenhi'] : undefined,
    };
  }

  private parseDepartment(data: ResearcherData): Department | undefined {
    const name = this.extractLocalizedText(data.humanReadableValue as unknown[]);
    if (!name) return undefined;

    return {
      name,
      code: typeof data['id:department:mext'] === 'string' ? data['id:department:mext'] : undefined,
    };
  }

  private parseJobTitle(data: ResearcherData): JobTitle | undefined {
    const name = this.extractLocalizedText(data.humanReadableValue as unknown[]);
    if (!name) return undefined;

    return {
      name,
      code: typeof data['id:jobTitle:mext'] === 'string' ? data['id:jobTitle:mext'] : undefined,
    };
  }

  /**
   * Extracts text from a localized value array, preferring the 'ja' language entry.
   * Falls back to the first available entry if no Japanese entry is found.
   */
  private extractLocalizedText(values: unknown[] | undefined): string | undefined {
    if (!Array.isArray(values) || values.length === 0) return undefined;

    const jaEntry = values.find(
      (v) => typeof v === 'object' && v !== null && (v as Record<string, unknown>).lang === 'ja',
    ) as Record<string, unknown> | undefined;

    const entry = jaEntry ?? (values[0] as Record<string, unknown>);
    return typeof entry?.text === 'string' ? entry.text : undefined;
  }
}
