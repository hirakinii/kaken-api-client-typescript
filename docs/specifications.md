# KAKEN API Client for TypeScript 仕様書

## 1. 概要

本ライブラリは、KAKEN（科学研究費助成事業データベース）APIと通信し、研究課題（Projects）および研究者（Researchers）の情報を検索・取得するためのTypeScript/Node.js向けクライアントライブラリです。

**参考リポジトリ**: [kojix2/kaken_api](https://github.com/kojix2/kaken_api) (Python版)

## 2. システム要件

* **動作環境**: Node.js (v18以降を推奨)
* **主要言語**: TypeScript
* **想定される外部パッケージ**:
    * HTTPクライアント: `axios` またはネイティブ `fetch`
    * XMLパーサー: `fast-xml-parser`（※研究課題APIがXMLを返すため）

## 3. ディレクトリ・モジュール構成案

```text
src/
 ├── index.ts           # エントリポイント (export KakenApiClient 等)
 ├── client.ts          # KakenApiClient クラス
 ├── api/
 │    ├── index.ts
 │    ├── projects.ts   # ProjectsAPI クラス
 │    └── researchers.ts# ResearchersAPI クラス
 ├── models/
 │    └── index.ts      # 型定義・インターフェース
 ├── cache.ts           # キャッシュ管理クラス
 ├── constants.ts       # APIエンドポイントやデフォルト値などの定数
 ├── exceptions.ts      # カスタムエラークラス
 └── utils.ts           # URL構築等のユーティリティ関数

```

## 4. 主要インターフェース（型定義）

`src/models/index.ts` にて定義する主要な型です。Python版の `models.py` に対応します。

### 4.1. 共通型

```typescript
export interface KakenApiResponse {
  rawData: any;
  totalResults?: number;
  startIndex?: number;
  itemsPerPage?: number;
}

```

### 4.2. 研究課題 (Projects) 用の型

```typescript
export interface Project {
  id?: string;
  awardNumber?: string;
  title?: string;
  titleEn?: string;
  titleAbbreviated?: string;
  projectType?: string;
  // Category, Field, Institution などのサブモデルは省略（Python版に準拠して定義）
  rawData: any;
}

export interface ProjectsResponse extends KakenApiResponse {
  projects: Project[];
}

```

### 4.3. 研究者 (Researchers) 用の型

```typescript
export interface PersonName {
  fullName: string;
  familyName?: string;
  givenName?: string;
  familyNameReading?: string;
  givenNameReading?: string;
}

export interface Affiliation {
  institution?: { name: string; code?: string; type?: string };
  department?: { name: string; code?: string };
  jobTitle?: { name: string; code?: string };
}

export interface Researcher {
  id?: string;
  name?: PersonName;
  affiliations: Affiliation[];
  researcherNumber?: string;
  // 他のID類（eRad, J-GLOBAL等）は省略
  rawData: any;
}

export interface ResearchersResponse extends KakenApiResponse {
  researchers: Researcher[];
}

```

## 5. API クライアント仕様

### 5.1. KakenApiClient クラス (`src/client.ts`)

メインとなるクライアントクラスです。

* **コンストラクタ引数**
```typescript
export interface KakenApiClientOptions {
  appId?: string;       // KAKEN API アプリケーションID
  timeout?: number;     // タイムアウト時間 (ms) default: 30000
  maxRetries?: number;  // 最大リトライ回数 default: 3
  useCache?: boolean;   // キャッシュを使用するか default: true
  cacheDir?: string;    // キャッシュ保存ディレクトリ default: ~/.kaken_api_cache
}

```

* **プロパティ**
    * `projects: ProjectsAPI`: 研究課題検索APIへのアクセスオブジェクト
    * `researchers: ResearchersAPI`: 研究者検索APIへのアクセスオブジェクト
    * `cache: ResponseCache`: キャッシュ管理オブジェクト

### 5.2. ProjectsAPI クラス (`src/api/projects.ts`)

研究課題の検索を担当します。デフォルトのレスポンスフォーマットは `xml` を使用します。

* **メソッド**: `search(params: ProjectSearchParams): Promise<ProjectsResponse>`
* **検索パラメータ (`ProjectSearchParams`)**:
    * `keyword?: string`
    * `resultsPerPage?: number` (20, 50, 100, 200, 500)
    * `language?: 'ja' | 'en'`
    * `startIndex?: number`
    * `projectTitle?: string`
    * `projectNumber?: string`
    * ...その他、Python版の `ProjectsAPI.search` の引数に準ずる。
* **実装要件**:
    * 取得したXML形式のレスポンスをJSONオブジェクトにパースし、`ProjectsResponse` の形にマッピングして返却する。

### 5.3. ResearchersAPI クラス (`src/api/researchers.ts`)

研究者の検索を担当します。デフォルトのレスポンスフォーマットは `json` を使用します。

* **メソッド**: `search(params: ResearcherSearchParams): Promise<ResearchersResponse>`
* **検索パラメータ (`ResearcherSearchParams`)**:
    * `keyword?: string`
    * `researcherName?: string`
    * `researcherNumber?: string`
    * ...その他、Python版の `ResearchersAPI.search` の引数に準ずる。
* **実装要件**:
    * 取得したJSON形式のレスポンスを `ResearchersResponse` の形にマッピングして返却する。

## 6. キャッシュ機能 (`src/cache.ts`)

APIサーバーへの負荷軽減と高速化のためのレスポンスキャッシュ機能です。

* **ResponseCache クラス**
* **初期化**: キャッシュディレクトリ（デフォルト: `~/.kaken_api_cache`）を設定。
* **メソッド**:
    * `get(url: string): Promise<string | Buffer | null>`: URLのハッシュ値をファイル名として、キャッシュがあれば読み込んで返す。
    * `set(url: string, content: any): Promise<void>`: APIのレスポンス内容をファイルに書き込む。
    * `clear(): Promise<void>`: キャッシュディレクトリ内のファイルをすべて削除する。

## 7. 例外処理・エラー (`src/exceptions.ts`)

Python版の例外クラスに対応するカスタムエラークラスを定義します。

* `KakenApiError`: すべてのAPIエラーの基底クラス
* `KakenApiRequestError`: リクエスト構築時やネットワーク関連のエラー
* `KakenApiResponseError`: XML/JSONのパース失敗など、レスポンス処理時のエラー
* `KakenApiNotFoundError`: 404 Not Found エラー

## 8. 定数 (`src/constants.ts`)

API呼び出しに必要なエンドポイントやデフォルト値を定義します。

```typescript
export const ENDPOINTS = {
  PROJECTS: "https://kaken.nii.ac.jp/opensearch/",
  RESEARCHERS: "https://nrid.nii.ac.jp/opensearch/"
};

export const DEFAULTS = {
  RESULTS_PER_PAGE: 20,
  LANGUAGE: "ja",
  FORMAT_PROJECTS: "xml",
  FORMAT_RESEARCHERS: "json",
  START_INDEX: 1
};

```
