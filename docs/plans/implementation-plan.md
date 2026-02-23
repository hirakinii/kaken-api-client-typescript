# KAKEN API Client for TypeScript — 実装計画

作成日: 2026-02-23
仕様書: [docs/specifications.md](../specifications.md)
参考リポジトリ: `~/repos/kaken_api/` (Python版)

---

## 1. 技術スタック

| 用途 | パッケージ |
|------|-----------|
| HTTP クライアント | ネイティブ `fetch` (Node.js 18+) |
| XML パーサー | `fast-xml-parser` |
| スキーマバリデーション | `zod` |
| テストランナー | `vitest` |
| カバレッジ | `@vitest/coverage-v8` |

> **選定理由**: Node.js 18+ のネイティブ `fetch` を採用することで外部 HTTP ライブラリへの依存を排除。`axios` は不要。

---

## 2. ディレクトリ構成

仕様書 §3 に準拠した最終的なファイル構成：

```text
src/
 ├── index.ts                 # エントリポイント (パブリック API の re-export)
 ├── client.ts                # KakenApiClient クラス
 ├── api/
 │    ├── index.ts            # API クラスの re-export
 │    ├── projects.ts         # ProjectsAPI クラス
 │    └── researchers.ts      # ResearchersAPI クラス
 ├── models/
 │    └── index.ts            # 型定義・インターフェース (Zod スキーマも含む)
 ├── cache.ts                 # ResponseCache クラス
 ├── constants.ts             # API エンドポイント・デフォルト値定数
 ├── exceptions.ts            # カスタムエラークラス
 └── utils.ts                 # URL 構築等のユーティリティ関数

tests/
 ├── unit/
 │    ├── constants.test.ts
 │    ├── exceptions.test.ts
 │    ├── utils.test.ts
 │    ├── cache.test.ts
 │    ├── api/
 │    │    ├── projects.test.ts
 │    │    └── researchers.test.ts
 │    └── client.test.ts
 ├── integration/
 │    ├── projects.integration.test.ts
 │    └── researchers.integration.test.ts
 └── fixtures/
      ├── projects-response.xml   # テスト用サンプル XML レスポンス
      └── researchers-response.json # テスト用サンプル JSON レスポンス
```

---

## 3. TDD 実装ステップ

各ステップで **RED → GREEN → REFACTOR** サイクルを遵守する。

### Step 0: プロジェクト初期設定　→　完了

**作業内容**:
- `package.json` の `scripts` を更新し、`vitest` を追加
- 依存パッケージのインストール: `fast-xml-parser`, `zod`, `vitest`, `@vitest/coverage-v8`
- `vitest.config.ts` の作成

**実施コマンド**:
```bash
npm install fast-xml-parser zod
npm install --save-dev vitest @vitest/coverage-v8
```

**`package.json` scripts 更新内容**:
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint '{src,tests}/**/*.{ts,tsx}'",
    "format": "prettier --write '{src,tests}/**/*.{ts,tsx}'",
    "build": "tsc",
    "type-check": "tsc --noEmit"
  }
}
```

---

### Step 1: `src/constants.ts` の実装　→　完了

**目的**: API エンドポイント・デフォルト値・定数を定義する。
Python版: `kaken_api/constants.py`

**実装内容**:
```typescript
export const ENDPOINTS = {
  PROJECTS: "https://kaken.nii.ac.jp/opensearch/",
  RESEARCHERS: "https://nrid.nii.ac.jp/opensearch/",
};

export const DEFAULTS = {
  RESULTS_PER_PAGE: 20,
  LANGUAGE: "ja" as const,
  FORMAT_PROJECTS: "xml" as const,
  FORMAT_RESEARCHERS: "json" as const,
  START_INDEX: 1,
  TIMEOUT_MS: 30000,
  MAX_RETRIES: 3,
};

export const LIMITS = {
  MAX_PROJECTS_RESULTS: 200000,
  MAX_RESEARCHERS_RESULTS: 1000,
};

export const VALID_RESULTS_PER_PAGE = [20, 50, 100, 200, 500] as const;

export const PROJECT_STATUS = { /* ... */ };
export const PROJECT_TYPES = { /* ... */ };
export const RESEARCHER_ROLES = { /* ... */ };
```

**テスト観点** (`tests/unit/constants.test.ts`):
- エンドポイント URL が正しい文字列であること
- デフォルト値が仕様通りであること
- `VALID_RESULTS_PER_PAGE` に期待される値が含まれること

---

### Step 2: `src/exceptions.ts` の実装　→　完了

**目的**: カスタムエラークラスを定義する。
Python版: `kaken_api/exceptions.py`

**実装内容**:
```typescript
export class KakenApiError extends Error {
  constructor(message: string, public readonly statusCode?: number) {
    super(message);
    this.name = "KakenApiError";
  }
}

export class KakenApiRequestError extends KakenApiError { /* ... */ }
export class KakenApiResponseError extends KakenApiError { /* ... */ }
export class KakenApiNotFoundError extends KakenApiError { /* ... */ }
```

**テスト観点** (`tests/unit/exceptions.test.ts`):
- 各エラークラスが `KakenApiError` を継承していること
- `instanceof` チェックが正しく動作すること
- `message` プロパティが保持されること
- `name` プロパティが各クラス名に設定されること

---

### Step 3: `src/models/index.ts` の実装　→　完了

**目的**: 型定義・インターフェースおよび Zod バリデーションスキーマを定義する。
Python版: `kaken_api/models.py`

**実装内容** (主要型):

```typescript
// Base response
export interface KakenApiResponse {
  rawData: unknown;
  totalResults?: number;
  startIndex?: number;
  itemsPerPage?: number;
}

// Project related types
export interface Institution { name: string; code?: string; type?: string; }
export interface Department { name: string; code?: string; }
export interface JobTitle { name: string; code?: string; }
export interface Category { name: string; path?: string; code?: string; }
export interface Field { name: string; path?: string; code?: string; fieldTable?: string; }
export interface Keyword { text: string; language?: string; }
export interface PeriodOfAward {
  startDate?: Date;
  endDate?: Date;
  startFiscalYear?: number;
  endFiscalYear?: number;
}
export interface AwardAmount { totalCost?: number; directCost?: number; /* ... */ }
export interface Project { /* 仕様書 §4.2 準拠 + Python版完全対応 */ rawData: unknown; }
export interface ProjectsResponse extends KakenApiResponse { projects: Project[]; }

// Researcher related types
export interface PersonName { fullName: string; familyName?: string; givenName?: string; /* ... */ }
export interface Affiliation { institution?: Institution; department?: Department; jobTitle?: JobTitle; }
export interface Researcher { /* 仕様書 §4.3 準拠 */ rawData: unknown; }
export interface ResearchersResponse extends KakenApiResponse { researchers: Researcher[]; }

// Search parameter types
export interface ProjectSearchParams { /* ... */ }
export interface ResearcherSearchParams { /* ... */ }
export interface KakenApiClientOptions { /* ... */ }
```

**テスト観点** (`tests/unit/models.test.ts`):
- 型定義のコンパイルチェック (型テスト)
- Zod スキーマを使ったバリデーションが正しく動作すること

---

### Step 4: `src/utils.ts` の実装　→　完了

**目的**: URL 構築・テキスト処理等のユーティリティ関数を実装する。
Python版: `kaken_api/utils.py`

**実装内容**:
```typescript
/** Build URL with query parameters, filtering out null/undefined values. */
export function buildUrl(baseUrl: string, params: Record<string, unknown>): string

/** Ensure a value is an array. */
export function ensureArray<T>(value: T | T[] | undefined): T[]

/** Clean text by removing extra whitespace. */
export function cleanText(text: string | undefined): string | undefined

/** Join array values to a comma-separated string. */
export function joinValues(values: string[]): string | undefined
```

**テスト観点** (`tests/unit/utils.test.ts`):
- `buildUrl`: `null`/`undefined` パラメータが除外されること、URLエンコードが正しいこと
- `ensureArray`: 単値・配列・`undefined` の各ケース
- `cleanText`: 複数スペース・前後スペースのトリム
- `joinValues`: 空配列は `undefined`、値あり配列はカンマ区切り文字列

---

### Step 5: `src/cache.ts` の実装　→　完了

**目的**: ファイルベースのレスポンスキャッシュを実装する。
Python版: `kaken_api/cache.py`

**実装内容**:
```typescript
export class ResponseCache {
  constructor(private readonly cacheDir: string, private readonly enabled: boolean) {}

  async get(url: string): Promise<Buffer | null>
  async set(url: string, content: Buffer | string): Promise<void>
  async clear(): Promise<void>

  private getCacheFilePath(url: string): string  // MD5 ハッシュをファイル名に使用
}
```

**設計詳細**:
- キャッシュファイルパス: `{cacheDir}/{md5(url)}.cache`
- `Node.js` の `fs/promises` を使用 (外部ライブラリ不要)
- キャッシュ無効時は `get` が常に `null` を返す

**テスト観点** (`tests/unit/cache.test.ts`):
- `get`/`set`: 保存→取得が正しく動作すること
- 存在しないキャッシュの `get` は `null` を返すこと
- `clear` でキャッシュディレクトリ内のファイルが削除されること
- `enabled: false` のとき `get` は常に `null`、`set` は何もしないこと
- テストには一時ディレクトリを使用 (テスト後クリーンアップ)

---

### Step 6: `src/api/projects.ts` の実装

**目的**: 研究課題検索 API クラスを実装する。
Python版: `kaken_api/api/projects.py`

**実装内容**:
```typescript
export class ProjectsAPI {
  constructor(private readonly options: ProjectsAPIOptions) {}

  async search(params: ProjectSearchParams): Promise<ProjectsResponse>

  private parseXmlResponse(content: string): ProjectsResponse
  private parseProject(grantAward: XmlNode): Project
}
```

**設計詳細**:
- HTTP 通信はコンストラクタ引数として渡される `fetchFn` を通じて行う (テスタビリティのため)
- `fast-xml-parser` を使用して XML をパース
- パラメータバリデーション:
  - `keyword` または他の検索条件が少なくとも1つ必要
  - `startIndex` は `1` 以上 `LIMITS.MAX_PROJECTS_RESULTS` 以下
  - `resultsPerPage` は `VALID_RESULTS_PER_PAGE` 内の値のみ (それ以外はデフォルト値に補正)

**テスト観点** (`tests/unit/api/projects.test.ts`):
- `fetch` をモックし、サンプル XML フィクスチャを返す
- `search` が `ProjectsResponse` 型で返ること
- メタデータ (`totalResults`, `startIndex`, `itemsPerPage`) が正しくパースされること
- プロジェクト配列が正しく構築されること
- 検索パラメータなしで呼ぶと `KakenApiRequestError` がスローされること
- 404 レスポンスで `KakenApiNotFoundError` がスローされること
- XML パース失敗で `KakenApiResponseError` がスローされること

---

### Step 7: `src/api/researchers.ts` の実装

**目的**: 研究者検索 API クラスを実装する。
Python版: `kaken_api/api/researchers.py`

**実装内容**:
```typescript
export class ResearchersAPI {
  constructor(private readonly options: ResearchersAPIOptions) {}

  async search(params: ResearcherSearchParams): Promise<ResearchersResponse>

  private parseJsonResponse(data: unknown): ResearchersResponse
  private parseResearcher(data: Record<string, unknown>): Researcher
}
```

**設計詳細**:
- JSON レスポンスを `JSON.parse` → Zod でバリデーション
- 研究者名のパース: `ja` 言語の `familyName`/`givenName` を優先
- 所属情報: `affiliations:current` 配列から構築

**テスト観点** (`tests/unit/api/researchers.test.ts`):
- `fetch` をモックし、サンプル JSON フィクスチャを返す
- `search` が `ResearchersResponse` 型で返ること
- 研究者の名前・所属が正しくパースされること
- 検索パラメータなしで呼ぶと `KakenApiRequestError` がスローされること
- JSON パース失敗で `KakenApiResponseError` がスローされること

---

### Step 8: `src/client.ts` の実装

**目的**: メインクライアントクラスを実装する。
Python版: `kaken_api/client.py`

**実装内容**:
```typescript
export class KakenApiClient {
  public readonly projects: ProjectsAPI;
  public readonly researchers: ResearchersAPI;
  public readonly cache: ResponseCache;

  constructor(options?: KakenApiClientOptions) { /* ... */ }

  // Context manager support (async)
  async [Symbol.asyncDispose](): Promise<void>
}
```

**設計詳細**:
- `fetchFn` をラップし、キャッシュを透過的に適用する内部 `cachedFetch` を生成
- `cachedFetch` を `ProjectsAPI` / `ResearchersAPI` に渡す
- リトライロジックは `cachedFetch` 内で実装 (exponential backoff)
- `Symbol.asyncDispose` で `using` 構文のサポート (TypeScript 5.2+)

**テスト観点** (`tests/unit/client.test.ts`):
- `projects` / `researchers` / `cache` プロパティが初期化されること
- デフォルトオプションが適用されること
- `useCache: false` のときキャッシュが無効化されること
- モック `fetch` でキャッシュヒット時は HTTP リクエストが送られないこと

---

### Step 9: `src/index.ts` の実装

**目的**: ライブラリのパブリック API をエクスポートするエントリポイント。

**実装内容**:
```typescript
// Main client
export { KakenApiClient } from "./client.js";

// API classes
export { ProjectsAPI } from "./api/projects.js";
export { ResearchersAPI } from "./api/researchers.js";

// Models / Types
export type { /* all public types */ } from "./models/index.js";

// Errors
export { KakenApiError, KakenApiRequestError, KakenApiResponseError, KakenApiNotFoundError } from "./exceptions.js";

// Cache
export { ResponseCache } from "./cache.js";

// Constants (readonly export)
export { ENDPOINTS, DEFAULTS } from "./constants.js";
```

---

### Step 10: インテグレーションテスト

**目的**: 実際の KAKEN API への接続を検証する。

**テストファイル**:
- `tests/integration/projects.integration.test.ts`
- `tests/integration/researchers.integration.test.ts`

**設計詳細**:
- `KAKEN_APP_ID` 環境変数がない場合はテストをスキップ
- `vitest` の `describe.skipIf` を使用
- Python 版の統合テストに対応するテストケースを実装

**テストケース例**:
```typescript
describe.skipIf(!process.env.KAKEN_APP_ID)("ProjectsAPI Integration", () => {
  it("should search projects by keyword", async () => { /* ... */ });
  it("should paginate results", async () => { /* ... */ });
});
```

---

## 4. 実装順序サマリー

```
Step 0: プロジェクト初期設定 (依存パッケージ・vitest)
  ↓
Step 1: constants.ts (定数定義)
  ↓
Step 2: exceptions.ts (エラークラス)
  ↓
Step 3: models/index.ts (型定義)
  ↓
Step 4: utils.ts (ユーティリティ関数)
  ↓
Step 5: cache.ts (キャッシュクラス)
  ↓
Step 6: api/projects.ts (研究課題 API)
  ↓
Step 7: api/researchers.ts (研究者 API)
  ↓
Step 8: client.ts (メインクライアント)
  ↓
Step 9: index.ts (エントリポイント)
  ↓
Step 10: インテグレーションテスト
```

各ステップは独立しており、前のステップの完了後に次のステップを開始する。

---

## 5. テスト戦略

### テストカバレッジ目標: 80% 以上

| テスト種別 | 対象 | ツール |
|----------|------|-------|
| ユニットテスト | 全モジュール | `vitest` + `vi.fn()` モック |
| インテグレーションテスト | API 接続 | `vitest` + 実 API (環境変数制御) |

### フィクスチャ
- `tests/fixtures/projects-response.xml`: 実際の API レスポンスに基づくサンプル XML
- `tests/fixtures/researchers-response.json`: 実際の API レスポンスに基づくサンプル JSON

### モック戦略
- `fetch` は `vi.fn()` でモック
- ファイルシステムは一時ディレクトリを使用 (実ディレクトリ操作)

---

## 6. セキュリティチェック事項

仕様書 §5.1 の `appId` は環境変数から取得する想定：
```typescript
const client = new KakenApiClient({
  appId: process.env.KAKEN_APP_ID,  // ハードコード禁止
});
```

実装後のセキュリティチェック:
- [ ] `appId` がハードコードされていないこと
- [ ] ユーザー入力 (検索パラメータ) が URL エンコードされること
- [ ] エラーメッセージに内部情報が漏洩しないこと
- [ ] キャッシュファイルのパストラバーサル対策

---

## 7. 参考情報

- Python版実装: `~/repos/kaken_api/kaken_api/`
- KAKEN API Projects エンドポイント: `https://kaken.nii.ac.jp/opensearch/`
- KAKEN API Researchers エンドポイント: `https://nrid.nii.ac.jp/opensearch/`
- XML パーサー: [fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser)
- スキーマバリデーション: [zod](https://github.com/colinhacks/zod)
