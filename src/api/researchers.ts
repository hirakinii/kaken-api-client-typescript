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
  Project,
  Product,
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

/** Priority-ordered institution ID keys. */
const INSTITUTION_ID_KEYS = [
  'id:institution:erad',
  'id:institution:kakenhi',
  'id:institution:mext',
  'id:institution:jsps',
  'id:institution:jst',
] as const;

/** Priority-ordered department ID keys. */
const DEPARTMENT_ID_KEYS = [
  'id:department:erad',
  'id:department:mext',
  'id:department:jsps',
  'id:department:jst',
] as const;

/** Priority-ordered job title ID keys. */
const JOB_TITLE_ID_KEYS = [
  'id:jobTitle:erad',
  'id:jobTitle:mext',
  'id:jobTitle:jsps',
  'id:jobTitle:jst',
] as const;

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
        ...(typeof data.totalResults === 'number' && { totalResults: data.totalResults }),
        ...(typeof data.startIndex === 'number' && { startIndex: data.startIndex }),
        ...(typeof data.itemsPerPage === 'number' && { itemsPerPage: data.itemsPerPage }),
        researchers,
      };
    } catch (error) {
      if (error instanceof KakenApiResponseError) throw error;
      throw new KakenApiResponseError(`Failed to process JSON response: ${String(error)}`);
    }
  }

  private parseResearcher(data: ResearcherData): Researcher {
    const researcher: Researcher = {
      ...(typeof data.accn === 'string' && { id: data.accn }),
      currentAffiliations: [],
      rawData: data,
    };

    // Parse representative name
    const nameData = data.name as Record<string, unknown> | undefined;
    if (nameData) {
      researcher.name = this.parsePersonName(nameData);
    }

    // Parse person identifiers
    const eradIds = data['id:person:erad'] as unknown[] | undefined;
    if (Array.isArray(eradIds) && eradIds.length > 0 && typeof eradIds[0] === 'string') {
      researcher.eradResearcherNumber = eradIds[0];
    }

    const jglobalIds = data['id:person:jglobal'] as unknown[] | undefined;
    if (Array.isArray(jglobalIds) && jglobalIds.length > 0 && typeof jglobalIds[0] === 'string') {
      researcher.jglobalId = jglobalIds[0];
    }

    const researchmapIds = data['id:person:researchmap'] as unknown[] | undefined;
    if (Array.isArray(researchmapIds) && researchmapIds.length > 0 && typeof researchmapIds[0] === 'string') {
      researcher.researchmapId = researchmapIds[0];
    }

    const orcidIds = data['id:orcid'] as unknown[] | undefined;
    if (Array.isArray(orcidIds) && orcidIds.length > 0 && typeof orcidIds[0] === 'string') {
      researcher.orcid = orcidIds[0];
    }

    // Parse current affiliations
    const currentAffiliations = data['affiliations:current'];
    if (Array.isArray(currentAffiliations)) {
      for (const item of currentAffiliations) {
        const affiliation = this.parseAffiliation(item as ResearcherData);
        if (affiliation) {
          researcher.currentAffiliations!.push(affiliation);
        }
      }
    }

    // Parse historical affiliations
    const historicalAffiliations = data['affiliations:history'];
    if (Array.isArray(historicalAffiliations)) {
      researcher.historicalAffiliations = [];
      for (const item of historicalAffiliations) {
        const affiliation = this.parseAffiliation(item as ResearcherData);
        if (affiliation) {
          researcher.historicalAffiliations.push(affiliation);
        }
      }
    }

    // Parse projects from work:project
    const workProjects = data['work:project'];
    if (Array.isArray(workProjects)) {
      researcher.projects = workProjects.map((item) => this.parseProject(item as ResearcherData));
    }

    // Parse products from work:product
    const workProducts = data['work:product'];
    if (Array.isArray(workProducts)) {
      researcher.products = workProducts.map((item) => this.parseProduct(item as ResearcherData));
    }

    return researcher;
  }

  private parsePersonName(nameData: Record<string, unknown>): PersonName {
    const familyNameValues = nameData['name:familyName'] as unknown[] | undefined;
    const givenNameValues = nameData['name:givenName'] as unknown[] | undefined;

    const familyName = this.extractLocalizedText(familyNameValues);
    const givenName = this.extractLocalizedText(givenNameValues);
    const familyNameReading = this.extractKanaText(familyNameValues);
    const givenNameReading = this.extractKanaText(givenNameValues);
    const fullName = familyName && givenName ? `${familyName} ${givenName}` : (familyName ?? givenName ?? 'Unknown');

    return {
      fullName,
      ...(familyName !== undefined && { familyName }),
      ...(givenName !== undefined && { givenName }),
      ...(familyNameReading !== undefined && { familyNameReading }),
      ...(givenNameReading !== undefined && { givenNameReading }),
    };
  }

  private parseAffiliation(data: ResearcherData): Affiliation | undefined {
    const institutionData = data['affiliation:institution'] as ResearcherData | undefined;
    const departmentData = data['affiliation:department'] as ResearcherData | undefined;
    const jobTitleData = data['affiliation:jobTitle'] as ResearcherData | undefined;

    const institution = institutionData ? this.parseInstitution(institutionData) : undefined;
    const department = departmentData ? this.parseDepartment(departmentData) : undefined;
    const jobTitle = jobTitleData ? this.parseJobTitle(jobTitleData) : undefined;

    if (!institution && !department && !jobTitle) return undefined;

    const sequence = typeof data.sequence === 'number' ? data.sequence : undefined;
    const startDate = this.parseDateFromEra(data.since as Record<string, unknown> | undefined);
    const endDate = this.parseDateFromEra(data.until as Record<string, unknown> | undefined);

    return {
      ...(sequence !== undefined && { sequence }),
      ...(institution !== undefined && { institution }),
      ...(department !== undefined && { department }),
      ...(jobTitle !== undefined && { jobTitle }),
      ...(startDate !== undefined && { startDate }),
      ...(endDate !== undefined && { endDate }),
    };
  }

  private parseInstitution(data: ResearcherData): Institution | undefined {
    const name = this.extractLocalizedText(data.humanReadableValue as unknown[]);
    if (!name) return undefined;

    const code = INSTITUTION_ID_KEYS.map((k) => data[k]).find((v) => typeof v === 'string') as string | undefined;

    return {
      name,
      ...(code !== undefined && { code }),
      ...(typeof data['category:institution:kakenhi'] === 'string' && { type: data['category:institution:kakenhi'] }),
    };
  }

  private parseDepartment(data: ResearcherData): Department | undefined {
    const name = this.extractLocalizedText(data.humanReadableValue as unknown[]);
    if (!name) return undefined;

    const code = DEPARTMENT_ID_KEYS.map((k) => data[k]).find((v) => typeof v === 'string') as string | undefined;

    return {
      name,
      ...(code !== undefined && { code }),
    };
  }

  private parseJobTitle(data: ResearcherData): JobTitle | undefined {
    const name = this.extractLocalizedText(data.humanReadableValue as unknown[]);
    if (!name) return undefined;

    const code = JOB_TITLE_ID_KEYS.map((k) => data[k]).find((v) => typeof v === 'string') as string | undefined;

    return {
      name,
      ...(code !== undefined && { code }),
    };
  }

  /** Partially parses a work:project entry, storing the full raw data. */
  private parseProject(data: ResearcherData): Project {
    const recordSource = data.recordSource as Record<string, unknown> | undefined;
    const projectIds = recordSource?.['id:project:kakenhi'] as string[] | undefined;
    const id = Array.isArray(projectIds) && projectIds.length > 0 ? projectIds[0] : undefined;

    const titleEntries = Array.isArray(data.title) ? data.title : [];
    const firstTitleEntry = titleEntries.length > 0 ? (titleEntries[0] as Record<string, unknown>) : undefined;
    const titleValues = firstTitleEntry?.humanReadableValue as unknown[] | undefined;
    const title = this.extractLocalizedText(titleValues);
    const titleEn = this.extractEnglishText(titleValues);

    return {
      ...(id !== undefined && { id }),
      ...(title !== undefined && { title }),
      ...(titleEn !== undefined && { titleEn }),
      rawData: data,
    };
  }

  /** Partially parses a work:product entry, storing the full raw data. */
  private parseProduct(data: ResearcherData): Product {
    const accnArr = data.accn as unknown[] | undefined;
    const id = Array.isArray(accnArr) && accnArr.length > 0 && typeof accnArr[0] === 'string' ? accnArr[0] : undefined;
    const type = typeof data.resourceType === 'string' ? data.resourceType : undefined;
    const titleMain = data['title:main'] as Record<string, unknown> | undefined;
    const title = typeof titleMain?.text === 'string' ? titleMain.text : undefined;

    return {
      ...(id !== undefined && { id }),
      ...(type !== undefined && { type }),
      ...(title !== undefined && { title }),
      rawData: data,
    };
  }

  /**
   * Builds a Date from a `{ "commonEra:year": YYYY, "month": M, "day": D }` object.
   * Returns undefined if the year is not a number.
   */
  private parseDateFromEra(data: Record<string, unknown> | undefined): Date | undefined {
    if (!data) return undefined;
    const year = data['commonEra:year'];
    if (typeof year !== 'number') return undefined;
    const month = typeof data.month === 'number' ? data.month - 1 : 0; // JS months are 0-based
    const day = typeof data.day === 'number' ? data.day : 1;
    return new Date(year, month, day);
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

  /** Extracts text from a localized value array for the 'en' language entry. */
  private extractEnglishText(values: unknown[] | undefined): string | undefined {
    if (!Array.isArray(values) || values.length === 0) return undefined;

    const enEntry = values.find(
      (v) => typeof v === 'object' && v !== null && (v as Record<string, unknown>).lang === 'en',
    ) as Record<string, unknown> | undefined;

    return typeof enEntry?.text === 'string' ? enEntry.text : undefined;
  }

  /** Extracts text from a localized value array for the 'ja-Kana' language entry. */
  private extractKanaText(values: unknown[] | undefined): string | undefined {
    if (!Array.isArray(values) || values.length === 0) return undefined;

    const kanaEntry = values.find(
      (v) => typeof v === 'object' && v !== null && (v as Record<string, unknown>).lang === 'ja-Kana',
    ) as Record<string, unknown> | undefined;

    return typeof kanaEntry?.text === 'string' ? kanaEntry.text : undefined;
  }
}
