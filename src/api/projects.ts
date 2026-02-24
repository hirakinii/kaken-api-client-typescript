import { XMLParser } from 'fast-xml-parser';
import { ENDPOINTS, DEFAULTS, LIMITS, VALID_RESULTS_PER_PAGE } from '../constants.js';
import { KakenApiRequestError, KakenApiResponseError, KakenApiNotFoundError } from '../exceptions.js';
import type {
  ProjectSearchParams,
  ProjectsResponse,
  Project,
  Category,
  Field,
  Institution,
  Allocation,
  Keyword,
  PeriodOfAward,
  ProjectStatus,
  AwardAmount,
  ResearcherRole,
  ProjectIdentifier,
  PersonName,
  Affiliation,
  Department,
  JobTitle,
} from '../models/index.js';
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
  // Private helpers — validation / request
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

  // ----------------------------------------------------------------
  // Private helpers — XML parsing
  // ----------------------------------------------------------------

  private parseXmlResponse(content: string): ProjectsResponse {
    try {
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        isArray: (name) =>
          [
            'grantAward',
            'summary',
            'identifier',
            'field',
            'keyword',
            'member',
            'category',
            'institution',
            'allocation',
            'affiliation',
            'overallAwardAmount',
          ].includes(name),
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
        ...(root.totalResults !== undefined && { totalResults: Number(root.totalResults) }),
        ...(root.startIndex !== undefined && { startIndex: Number(root.startIndex) }),
        ...(root.itemsPerPage !== undefined && { itemsPerPage: Number(root.itemsPerPage) }),
        projects,
      };
    } catch (error) {
      if (error instanceof KakenApiResponseError) throw error;
      throw new KakenApiResponseError(`Failed to parse XML response: ${String(error)}`);
    }
  }

  private parseProject(grantAward: Record<string, unknown>): Project {
    const id = grantAward['@_id'] as string | undefined;
    const awardNumber = grantAward['@_awardNumber'] as string | undefined;
    const projectType = grantAward['@_projectType'] as string | undefined;
    const recordSet = grantAward['@_recordSet'] as string | undefined;

    // Top-level date strings
    const created = this.parseIsoDate(grantAward.created as string | undefined);
    const modified = this.parseIsoDate(grantAward.modified as string | undefined);

    // Project identifiers (DOI, nationalAwardNumber, etc.)
    const identifiers = this.parseIdentifiers(grantAward);

    // Select summaries — prefer 'ja', fall back to first available
    const summaries = ensureArray(grantAward.summary as Record<string, unknown>[]);
    const jaSummary = summaries.find((s) => s['@_xml:lang'] === 'ja') ?? summaries[0];
    const enSummary = summaries.find((s) => s['@_xml:lang'] === 'en');

    // Titles
    const title = cleanText(jaSummary !== undefined ? String(jaSummary.title ?? '') || undefined : undefined);
    const titleEn = cleanText(enSummary !== undefined ? String(enSummary.title ?? '') || undefined : undefined);
    const titleAbbreviated = cleanText(
      jaSummary !== undefined ? String(jaSummary.titleAbbreviated ?? '') || undefined : undefined,
    );

    const project: Project = {
      ...(id !== undefined && { id }),
      ...(awardNumber !== undefined && { awardNumber }),
      ...(projectType !== undefined && { projectType }),
      ...(recordSet !== undefined && { recordSet }),
      ...(title !== undefined && { title }),
      ...(titleEn !== undefined && { titleEn }),
      ...(titleAbbreviated !== undefined && { titleAbbreviated }),
      ...(created !== undefined && { created }),
      ...(modified !== undefined && { modified }),
      ...(identifiers.length > 0 && { identifiers }),
      rawData: grantAward,
    };

    if (jaSummary !== undefined) {
      const categories = this.parseCategories(jaSummary);
      const fields = this.parseFields(jaSummary);
      const institutions = this.parseInstitutions(jaSummary);
      const allocations = this.parseAllocations(jaSummary);
      const members = this.parseMembers(jaSummary);
      const keywords = this.parseKeywords(jaSummary);
      const periodOfAward = this.parsePeriodOfAward(jaSummary);
      const projectStatus = this.parseProjectStatus(jaSummary);
      const awardAmounts = this.parseAwardAmounts(jaSummary);

      if (categories.length > 0) project.categories = categories;
      if (fields.length > 0) project.fields = fields;
      if (institutions.length > 0) project.institutions = institutions;
      if (allocations.length > 0) project.allocations = allocations;
      if (members.length > 0) project.members = members;
      if (keywords.length > 0) project.keywords = keywords;
      if (periodOfAward !== undefined) project.periodOfAward = periodOfAward;
      if (projectStatus !== undefined) project.projectStatus = projectStatus;
      if (awardAmounts.length > 0) project.awardAmounts = awardAmounts;
    }

    return project;
  }

  // ----------------------------------------------------------------
  // Private helpers — field parsers
  // ----------------------------------------------------------------

  /** Parses an ISO 8601 string (date or datetime) into a Date. Returns undefined on failure. */
  private parseIsoDate(value: string | undefined): Date | undefined {
    if (!value) return undefined;
    const d = new Date(value);
    return isNaN(d.getTime()) ? undefined : d;
  }

  /**
   * Extracts the text content from an XML node that may be:
   *   - a plain string (element with no attributes)
   *   - a number (auto-parsed by fast-xml-parser)
   *   - an object with '#text' key (element with attributes + text)
   */
  private extractText(node: unknown): string | undefined {
    if (typeof node === 'string') return node || undefined;
    if (typeof node === 'number') return String(node);
    if (typeof node === 'object' && node !== null) {
      const obj = node as Record<string, unknown>;
      const text = obj['#text'];
      if (typeof text === 'string') return text || undefined;
      if (typeof text === 'number') return String(text);
    }
    return undefined;
  }

  private parseIdentifiers(grantAward: Record<string, unknown>): ProjectIdentifier[] {
    return ensureArray(grantAward.identifier as Record<string, unknown>[]).flatMap((id) => {
      const type = id['@_type'] as string | undefined;
      const value = typeof id.normalizedValue === 'string' ? id.normalizedValue : undefined;
      if (!type || !value) return [];
      return [{ type, value }];
    });
  }

  private parseCategories(summary: Record<string, unknown>): Category[] {
    return ensureArray(summary.category as Record<string, unknown>[]).flatMap((cat) => {
      const name = this.extractText(cat);
      if (!name) return [];
      return [
        {
          name,
          ...(typeof cat['@_path'] === 'string' && { path: cat['@_path'] }),
          ...(typeof cat['@_niiCode'] === 'string' && { code: cat['@_niiCode'] }),
        } satisfies Category,
      ];
    });
  }

  private parseFields(summary: Record<string, unknown>): Field[] {
    return ensureArray(summary.field as Record<string, unknown>[]).flatMap((f) => {
      const name = this.extractText(f);
      if (!name) return [];
      return [
        {
          name,
          ...(typeof f['@_path'] === 'string' && { path: f['@_path'] }),
          ...(typeof f['@_niiCode'] === 'string' && { code: f['@_niiCode'] }),
          ...(typeof f['@_fieldTable'] === 'string' && { fieldTable: f['@_fieldTable'] }),
          ...(typeof f['@_sequence'] === 'string' && { sequence: Number(f['@_sequence']) }),
        } satisfies Field,
      ];
    });
  }

  private parseInstitutions(summary: Record<string, unknown>): Institution[] {
    return ensureArray(summary.institution as Record<string, unknown>[]).flatMap((inst) => {
      const name = this.extractText(inst);
      if (!name) return [];
      return [
        {
          name,
          ...(typeof inst['@_niiCode'] === 'string' && { code: inst['@_niiCode'] }),
          ...(typeof inst['@_type'] === 'string' && { type: inst['@_type'] }),
          ...(typeof inst['@_participate'] === 'string' && { participate: inst['@_participate'] }),
        } satisfies Institution,
      ];
    });
  }

  private parseAllocations(summary: Record<string, unknown>): Allocation[] {
    return ensureArray(summary.allocation as Record<string, unknown>[]).flatMap((alloc) => {
      const name = this.extractText(alloc);
      if (!name) return [];
      return [
        {
          name,
          ...(typeof alloc['@_niiCode'] === 'string' && { code: alloc['@_niiCode'] }),
          ...(typeof alloc['@_participate'] === 'string' && { participate: alloc['@_participate'] }),
        } satisfies Allocation,
      ];
    });
  }

  private parseKeywords(summary: Record<string, unknown>): Keyword[] {
    const keywordList = summary.keywordList as Record<string, unknown> | undefined;
    if (!keywordList) return [];
    return ensureArray(keywordList.keyword as unknown[]).flatMap((kw) => {
      const text = this.extractText(kw) ?? (typeof kw === 'string' ? kw : undefined);
      if (!text) return [];
      return [{ text } satisfies Keyword];
    });
  }

  private parsePeriodOfAward(summary: Record<string, unknown>): PeriodOfAward | undefined {
    const p = summary.periodOfAward as Record<string, unknown> | undefined;
    if (!p) return undefined;

    const startDateStr = typeof p.startDate === 'string' ? p.startDate : this.extractText(p.startDate);
    const endDateStr = typeof p.endDate === 'string' ? p.endDate : this.extractText(p.endDate);

    // Pre-compute to avoid passing `Date | undefined` into spread (exactOptionalPropertyTypes)
    const startDate = startDateStr !== undefined ? this.parseIsoDate(startDateStr) : undefined;
    const endDate = endDateStr !== undefined ? this.parseIsoDate(endDateStr) : undefined;
    const startFiscalYear = typeof p.startFiscalYear === 'number' ? p.startFiscalYear : undefined;
    const endFiscalYear = typeof p.endFiscalYear === 'number' ? p.endFiscalYear : undefined;
    const searchStartFiscalYear =
      typeof p['@_searchStartFiscalYear'] === 'string' ? Number(p['@_searchStartFiscalYear']) : undefined;
    const searchEndFiscalYear =
      typeof p['@_searchEndFiscalYear'] === 'string' ? Number(p['@_searchEndFiscalYear']) : undefined;

    const period: PeriodOfAward = {
      ...(startDate !== undefined && { startDate }),
      ...(endDate !== undefined && { endDate }),
      ...(startFiscalYear !== undefined && { startFiscalYear }),
      ...(endFiscalYear !== undefined && { endFiscalYear }),
      ...(searchStartFiscalYear !== undefined && { searchStartFiscalYear }),
      ...(searchEndFiscalYear !== undefined && { searchEndFiscalYear }),
    };

    return Object.keys(period).length > 0 ? period : undefined;
  }

  private parseProjectStatus(summary: Record<string, unknown>): ProjectStatus | undefined {
    const ps = summary.projectStatus as Record<string, unknown> | undefined;
    if (!ps) return undefined;
    const statusCode = ps['@_statusCode'] as string | undefined;
    if (!statusCode) return undefined;

    // Pre-compute date to avoid `Date | undefined` in spread (exactOptionalPropertyTypes)
    const fiscalYear = typeof ps['@_fiscalYear'] === 'string' ? Number(ps['@_fiscalYear']) : undefined;
    const date = typeof ps['@_date'] === 'string' ? this.parseIsoDate(ps['@_date']) : undefined;
    const note = typeof ps.note === 'string' ? ps.note : undefined;

    return {
      statusCode,
      ...(fiscalYear !== undefined && { fiscalYear }),
      ...(date !== undefined && { date }),
      ...(note !== undefined && { note }),
    };
  }

  private parseAwardAmounts(summary: Record<string, unknown>): AwardAmount[] {
    return ensureArray(summary.overallAwardAmount as Record<string, unknown>[]).map((a) => {
      const unitNode = a.unit as Record<string, unknown> | undefined;
      const unit =
        unitNode !== undefined && typeof unitNode.originalValue === 'string'
          ? {
              originalValue: unitNode.originalValue,
              ...(typeof unitNode.normalizedValue === 'string' && { normalizedValue: unitNode.normalizedValue }),
            }
          : undefined;

      return {
        ...(typeof a.totalCost === 'number' && { totalCost: a.totalCost }),
        ...(typeof a.directCost === 'number' && { directCost: a.directCost }),
        ...(typeof a.indirectCost === 'number' && { indirectCost: a.indirectCost }),
        ...(typeof a.convertedJpyTotalCost === 'number' && { convertedJpyTotalCost: a.convertedJpyTotalCost }),
        ...(a['@_planned'] !== undefined && { planned: a['@_planned'] === 'true' }),
        ...(typeof a['@_caption'] === 'string' && { caption: a['@_caption'] }),
        ...(typeof a['@_userDefiendId'] === 'string' && { userDefinedId: a['@_userDefiendId'] }),
        ...(unit !== undefined && { unit }),
      } satisfies AwardAmount;
    });
  }

  private parseMembers(summary: Record<string, unknown>): ResearcherRole[] {
    return ensureArray(summary.member as Record<string, unknown>[]).flatMap((m) => {
      const role = m['@_role'] as string | undefined;
      if (!role) return [];

      const member: ResearcherRole = {
        role,
        ...(typeof m['@_participate'] === 'string' && { participate: m['@_participate'] }),
        ...(typeof m['@_sequence'] === 'string' && { sequence: Number(m['@_sequence']) }),
        ...(typeof m['@_researcherNumber'] === 'string' && { researcherNumber: m['@_researcherNumber'] }),
        ...(typeof m['@_eradCode'] === 'string' && { eradCode: m['@_eradCode'] }),
      };

      // Parse personalName
      const pn = m.personalName as Record<string, unknown> | undefined;
      if (pn !== undefined) {
        const name = this.parsePersonName(pn);
        if (name !== undefined) member.name = name;
      }

      // Parse affiliations
      const affiliationNodes = ensureArray(m.affiliation as Record<string, unknown>[]);
      if (affiliationNodes.length > 0) {
        const affiliations = affiliationNodes.flatMap((aff) => this.parseMemberAffiliation(aff));
        if (affiliations.length > 0) member.affiliations = affiliations;
      }

      return [member];
    });
  }

  private parsePersonName(pn: Record<string, unknown>): PersonName | undefined {
    const fullName = typeof pn.fullName === 'string' ? pn.fullName : undefined;
    if (!fullName) return undefined;

    const familyNameNode = pn.familyName as Record<string, unknown> | string | undefined;
    const givenNameNode = pn.givenName as Record<string, unknown> | string | undefined;

    const familyName = this.extractText(familyNameNode);
    const givenName = this.extractText(givenNameNode);
    const familyNameReading =
      typeof familyNameNode === 'object' && familyNameNode !== null
        ? ((familyNameNode as Record<string, unknown>)['@_yomi'] as string | undefined)
        : undefined;
    const givenNameReading =
      typeof givenNameNode === 'object' && givenNameNode !== null
        ? ((givenNameNode as Record<string, unknown>)['@_yomi'] as string | undefined)
        : undefined;

    return {
      fullName,
      ...(familyName !== undefined && { familyName }),
      ...(givenName !== undefined && { givenName }),
      ...(familyNameReading !== undefined && { familyNameReading }),
      ...(givenNameReading !== undefined && { givenNameReading }),
    };
  }

  private parseMemberAffiliation(aff: Record<string, unknown>): Affiliation[] {
    // 'institution' inside affiliation is forced to array by isArray config
    const instNodes = ensureArray(aff.institution as Record<string, unknown>[]);
    const deptNode = aff.department as Record<string, unknown> | undefined;
    const jobNode = aff.jobTitle as Record<string, unknown> | undefined;

    const instName = instNodes[0] !== undefined ? this.extractText(instNodes[0]) : undefined;
    const deptName = this.extractText(deptNode);
    const jobName = this.extractText(jobNode);

    if (!instName && !deptName && !jobName) return [];

    const institution: Institution | undefined =
      instName !== undefined
        ? {
            name: instName,
            ...(typeof instNodes[0]?.['@_niiCode'] === 'string' && { code: instNodes[0]['@_niiCode'] }),
            ...(typeof instNodes[0]?.['@_institutionType'] === 'string' && {
              type: instNodes[0]['@_institutionType'],
            }),
          }
        : undefined;

    const department: Department | undefined =
      deptName !== undefined
        ? {
            name: deptName,
            ...(typeof deptNode?.['@_niiCode'] === 'string' && { code: deptNode['@_niiCode'] }),
          }
        : undefined;

    const jobTitle: JobTitle | undefined =
      jobName !== undefined
        ? {
            name: jobName,
            ...(typeof jobNode?.['@_niiCode'] === 'string' && { code: jobNode['@_niiCode'] }),
          }
        : undefined;

    return [
      {
        ...(institution !== undefined && { institution }),
        ...(department !== undefined && { department }),
        ...(jobTitle !== undefined && { jobTitle }),
      },
    ];
  }
}
