/** API endpoint URLs for the KAKEN API. */
export const ENDPOINTS = {
  PROJECTS: 'https://kaken.nii.ac.jp/opensearch/',
  RESEARCHERS: 'https://nrid.nii.ac.jp/opensearch/',
} as const;

/** Default parameter values used when no explicit value is provided. */
export const DEFAULTS = {
  RESULTS_PER_PAGE: 20,
  LANGUAGE: 'ja' as const,
  FORMAT_PROJECTS: 'xml' as const,
  FORMAT_RESEARCHERS: 'json' as const,
  START_INDEX: 1,
  TIMEOUT_MS: 30000,
  MAX_RETRIES: 3,
} as const;

/** Maximum result counts imposed by the KAKEN API. */
export const LIMITS = {
  MAX_PROJECTS_RESULTS: 200000,
  MAX_RESEARCHERS_RESULTS: 1000,
} as const;

/** Valid values for the results-per-page parameter. */
export const VALID_RESULTS_PER_PAGE = [20, 50, 100, 200, 500] as const;

/** Supported response format identifiers. */
export const FORMATS = {
  HTML: 'html5',
  XML: 'xml',
  JSON: 'json',
} as const;

/** Supported language codes for API requests. */
export const LANGUAGES = {
  JAPANESE: 'ja',
  ENGLISH: 'en',
} as const;

/** Project status codes and their Japanese labels. */
export const PROJECT_STATUS = {
  adopted: '採択',
  granted: '交付',
  ceased: '中断',
  suspended: '留保',
  project_closed: '完了',
  declined: '採択後辞退',
  discontinued: '中途終了',
} as const;

/** Project type codes and their Japanese labels. */
export const PROJECT_TYPES = {
  project: '研究課題',
  area: '領域',
  organizer: '総括班',
  wrapup: '成果取りまとめ',
  planned: '計画研究',
  publicly: '公募研究',
  international: '国際活動支援班',
} as const;

/** Allocation type codes and their Japanese labels. */
export const ALLOCATION_TYPES = {
  hojokin: '補助金',
  kikin: '基金',
  ichibu_kikin: '一部基金',
} as const;

/** Researcher role codes and their Japanese labels. */
export const RESEARCHER_ROLES = {
  principal_investigator: '研究代表者',
  area_organizer: '領域代表者',
  co_investigator_buntan: '研究分担者',
  co_investigator_renkei: '連携研究者',
  research_collaborator: '研究協力者',
  research_fellow: '特別研究員',
  host_researcher: '受入研究者',
  foreign_research_fellow: '外国人特別研究員',
  principal_investigator_support: '研究支援代表者',
  co_investigator_buntan_support: '研究支援分担者',
} as const;

/** Report type codes and their Japanese labels. */
export const REPORT_TYPES = {
  jiseki_hokoku: '実績報告書',
  jiko_hyoka_hokoku: '自己評価報告書',
  kenkyu_sinchoku_hyoka: '研究進捗評価',
  kenkyu_seika_hokoku_gaiyo: '研究成果報告書概要',
  chukan_hyoka_hokoku: '中間評価報告書',
  jigo_hyoka_hokoku: '事後評価報告書',
  jishi_jokyo_hokoku_kikin: '実施状況報告書',
  kenkyu_seika_hokoku: '研究成果報告書',
  saitaku_shoken: '審査結果の所見',
  saitaku_gaiyo: '研究概要(採択時)',
  kenkyu_shinchoku_hyoka_gaiyo: '研究概要(研究進捗評価)',
  kenkyu_shinchoku_hyoka_genchi_chosa: '研究進捗評価(現地調査コメント)',
  kenkyu_shinchoku_hyoka_keka: '研究進捗評価(評価結果)',
  kenkyu_shinchoku_hyoka_kensho: '研究進捗評価(検証)',
  tsuiseki_hyoka_shoken: '評価の所見(追跡評価)',
  tsuiseki_hyoka_jiko_hyoka: '自己評価書(追跡評価)',
  tsuiseki_hyoka_kenkyu_gaiyo: '研究概要(追跡評価)',
  chukan_hyoka_shoken: '中間評価(所見)',
  jigo_hyoka_shoken: '事後評価(所見)',
  kenkyu_seika_hapyo_hokoku: '研究成果発表報告書',
} as const;

/** Product (research output) type codes and their Japanese labels. */
export const PRODUCT_TYPES = {
  journal_article: '雑誌論文',
  presentation: '学会発表',
  symposium: '学会・シンポジウム開催',
  book: '図書',
  press: 'プレス/新聞発表',
  note: '備考',
  patent: '産業財産権',
  publication: '文献書誌',
} as const;

/** Sort option codes for project search results. */
export const PROJECT_SORT_OPTIONS = {
  '1': '適合度',
  '2': '研究開始年:新しい順',
  '3': '研究開始年:古い順',
  '4': '配分額合計:多い順',
  '5': '配分額合計:少ない順',
} as const;

/** Sort option codes for researcher search results. */
export const RESEARCHER_SORT_OPTIONS = {
  '1': '適合度',
  '2': '研究者氏名のカナ:昇順',
  '3': '研究者氏名のカナ:降順',
  '4': '研究者氏名のアルファベット:昇順',
  '5': '研究者氏名のアルファベット:降順',
  '6': '研究課題数:少ない順',
  '7': '研究課題数:多い順',
} as const;
