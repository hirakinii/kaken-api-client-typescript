# Issue #5 — レスポンスモデル構造修正計画

作成日: 2026-02-24
ブランチ: `5-fix-structure-of-responses`
対象ファイル: `src/models/index.ts`, `src/api/projects.ts`

---

## 1. 調査結果サマリー

`src/models/index.ts` の TypeScript インターフェースと、以下のドキュメントを照合した結果、複数の構造的不一致を確認した。

- `docs/reference/research-project-response-xml-definition.yaml`（研究課題 XML レスポンス定義）
- `docs/reference/researcher-response-json-definition-*.yaml`（研究者 JSON レスポンス定義）

---

## 2. 発見された不一致一覧

### 2.1 HIGH PRIORITY（構造的に誤り）

#### (A) `AwardAmount` インターフェース — 大幅な構造不一致

**現状:**
```typescript
export interface AwardAmount {
  totalCost?: number;
  directCost?: number;
  indirectCost?: number;
  fiscalYear?: number;   // overallAwardAmount に存在しないフィールド
  currency?: string;     // unit オブジェクトへのマッピングが誤り
  planned?: boolean;
}
```

**XML定義（`overallAwardAmount`）の実際の構造:**
- `@planned` — 計画額フラグ（boolean）
- `@sequence` — 表示順
- `@userDefiendId` — ID（※ typo は API 側の仕様）
- `@caption` — 金額タイトル
- `directCost` — 直接経費
- `indirectCost` — 間接経費
- `totalCost` — 総経費
- `convertedJpyTotalCost` — 円換算総経費
- `unit.originalValue` — 通貨（表示用文字列）
- `unit.normalizedValue` — 通貨（正規化済み）

**問題点:**
- `fiscalYear` は `overallAwardAmount` に存在しない（`grant@fiscalYear` の値）
- `currency: string` は `unit` サブオブジェクトの `originalValue` に相当するが、単純な文字列へのマッピングが誤り
- `sequence`, `userDefinedId`, `caption`, `convertedJpyTotalCost` が欠落

---

#### (B) `ResearcherRole` インターフェース — 設計思想の誤り

**現状:**
```typescript
export interface ResearcherRole {
  researcher: Researcher;  // 完全な Researcher オブジェクトは持たない
  role: string;
  participate?: string;
}
```

**XML定義（`member` 要素）の実際の構造:**
- `@sequence` — 表示順
- `@participate` — 関与年度
- `@researcherNumber` — 統合研究者番号
- `@eradCode` — eRad コード
- `@role` — 役割コード
- `personalName` — 氏名（fullName, familyName[@yomi], givenName[@yomi]）
- `affiliation[]` — 所属（institution, department, jobTitle）
- `memberStatus` — ステータス

**問題点:**
- XML の `member` 要素は完全な `Researcher` オブジェクトを持たず、限定的な情報のみを持つ
- `researcher: Researcher` という完全オブジェクトの埋め込みは構造として誤り
- `sequence`, `researcherNumber`, `eradCode`, `name`, `affiliations` が欠落

---

#### (C) `Project.allocationType` — 型が誤り

**現状:**
```typescript
export interface Project {
  allocationType?: string;  // 単一文字列
}
```

**XML定義（`allocation` 要素）の実際の構造:**
- 複数の `allocation` 要素が存在（配列）
- 各 `allocation` は `@niiCode`, `@participate`, `@sequence` とテキスト（名称）を持つ

**問題点:**
- `string` 型では複数の配分区分を表現できない
- `Allocation` 型を新規作成し、`allocations?: Allocation[]` に変更が必要

---

### 2.2 MEDIUM PRIORITY（フィールド欠落）

#### (D) `ProjectStatus` — `fiscalYear` フィールド欠落

**XML定義の `projectStatus` 属性:** `@fiscalYear`, `@statusCode`, `@date`, `note`

**現状:** `fiscalYear` が存在しない

**修正:** `fiscalYear?: number` を追加

---

#### (E) `PeriodOfAward` — 検索用年度フィールド欠落

**XML定義の `periodOfAward` 属性:** `@searchStartFiscalYear`, `@searchEndFiscalYear`

**現状:** これらが存在しない

**修正:** `searchStartFiscalYear?: number`, `searchEndFiscalYear?: number` を追加

---

#### (F) `Project` — メタデータフィールド欠落

**XML定義の `grantAward` が持つ以下の要素が `Project` に存在しない:**
- `@recordSet` — データセット種別（例: "kakenhi"）
- `created` — データ初期作成日時（ISO8601）
- `modified` — データ更新日時（ISO8601）
- `identifier[]` — プロジェクト識別子（DOI, 統合課題番号等）

---

### 2.3 LOW PRIORITY（軽微な不一致）

#### (G) `Field` — `sequence` フィールド欠落

研究分野（`field`）の表示順 `@sequence` が `Field` インターフェースに存在しない。

#### (H) `Keyword.language` の信頼性問題

XML 定義の `keywordList.keyword` 要素には言語属性がない。
研究者 JSON の `work:project.keyword` では `lang: "und"`（固定値）が使われるため、
`Keyword.language` は意味をなさない可能性がある。

#### (I) `Institution` — プロジェクト文脈でのフィールド欠落

プロジェクト内の `institution` 要素には `@participate`（関与年度）と `@sequence`（表示順）があるが、
`Institution` インターフェースに存在しない。

---

## 3. `parseProject` の問題

`src/api/projects.ts` の `parseProject` メソッドは現状、以下の4フィールドのみを抽出している:

```typescript
// 現状の parseProject が抽出するフィールド（不十分）
id, awardNumber, projectType, title
```

`Project` インターフェースで定義された `categories`, `fields`, `institutions`, `keywords`,
`periodOfAward`, `projectStatus`, `members`, `awardAmounts` 等はまったく抽出されていない。

また、XML の `summary` 要素は日本語・英語の2要素の配列であるが、現状は単一オブジェクトとして扱っており誤りである。

---

## 4. 修正計画

TDD（RED → GREEN → REFACTOR）を遵守する。

### Step 1: `Allocation` 新規インターフェース追加

**目的:** `Project.allocationType: string` を `allocations?: Allocation[]` に置き換えるための型定義

```typescript
/** Allocation type for a research project. */
export interface Allocation {
  name: string;
  code?: string;       // @niiCode
  participate?: string; // @participate
}
```

**テスト:** 型コンパイルテスト

---

### Step 2: `AwardAmount` インターフェース修正

```typescript
/** Currency unit information. */
export interface CurrencyUnit {
  originalValue: string;   // For display purpose
  normalizedValue?: string; // Normalised value
}

/** Award amount for the overall project. */
export interface AwardAmount {
  totalCost?: number;
  directCost?: number;
  indirectCost?: number;
  convertedJpyTotalCost?: number;
  unit?: CurrencyUnit;
  planned?: boolean;
  caption?: string;     // @caption
  userDefinedId?: string; // @userDefiendId (API 側の typo を保持しない)
}
```

**削除:** `fiscalYear` と `currency: string`

**影響範囲:** `AwardAmount` を参照する箇所のコンパイルエラーを解消する

---

### Step 3: `ResearcherRole` インターフェース修正

```typescript
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
```

**削除:** `researcher: Researcher`（完全オブジェクトの埋め込みは廃止）

**影響範囲:** `ResearcherRole` を参照・生成する箇所

---

### Step 4: `ProjectStatus` 修正

```typescript
export interface ProjectStatus {
  statusCode: string;
  fiscalYear?: number; // 追加
  date?: Date;
  note?: string;
}
```

---

### Step 5: `PeriodOfAward` 修正

```typescript
export interface PeriodOfAward {
  startDate?: Date;
  endDate?: Date;
  startFiscalYear?: number;
  endFiscalYear?: number;
  searchStartFiscalYear?: number; // 追加
  searchEndFiscalYear?: number;   // 追加
}
```

---

### Step 6: `Project` インターフェース修正

```typescript
export interface Project {
  id?: string;
  recordSet?: string;        // 追加: @recordSet
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
  allocations?: Allocation[];  // 変更: allocationType: string → allocations: Allocation[]
  members?: ResearcherRole[];
  awardAmounts?: AwardAmount[];
  created?: Date;             // 追加
  modified?: Date;            // 追加
  identifiers?: ProjectIdentifier[]; // 追加
  rawData?: unknown;
}

/** Project identifier such as DOI or unified project number. */
export interface ProjectIdentifier {
  type: string;    // @type: 'doi' | 'nationalAwardNumber'
  value: string;   // normalizedValue
}
```

---

### Step 7: LOW PRIORITY 修正（`Field`, `Keyword`, `Institution`）

```typescript
export interface Field {
  name: string;
  path?: string;
  code?: string;
  fieldTable?: string;
  sequence?: number; // 追加
}

// Keyword.language は optional のまま維持するが、信頼性の低いフィールドである旨をコメントに記載

/** Institution with project-participation metadata. */
export interface Institution {
  name: string;
  code?: string;
  type?: string;
  participate?: string; // 追加: プロジェクト文脈での関与年度
}
```

---

### Step 8: `parseProject` 拡張（`src/api/projects.ts`）

`summary` が日英配列であることを考慮し、`ja` 優先で言語選択するロジックを実装する。

**追加抽出フィールド:**
- `summary[ja].categories` → `categories`
- `summary[ja].fields` → `fields`
- `summary[ja].institutions` → `institutions`
- `summary[ja].keywordList.keyword[]` → `keywords`
- `summary[ja].periodOfAward` → `periodOfAward`
- `summary[ja].projectStatus` → `projectStatus`
- `summary[ja].member[]` → `members`（→ `ResearcherRole[]`）
- `summary[ja].overallAwardAmount[]` → `awardAmounts`
- `summary[ja].titleAbbreviated` → `titleAbbreviated`
- `summary[en].title` → `titleEn`
- `grantAward.@recordSet` → `recordSet`
- `grantAward.created` → `created`
- `grantAward.modified` → `modified`
- `grantAward.identifier[]` → `identifiers`

---

## 5. 実装順序と依存関係

```
Step 1: Allocation 新規インターフェース（他の Step に依存なし）
  ↓
Step 2: CurrencyUnit + AwardAmount 修正
  ↓
Step 3: ResearcherRole 修正
  ↓
Step 4: ProjectStatus 修正（独立）
Step 5: PeriodOfAward 修正（独立）
Step 6: Project 修正（Step 1〜5 完了後）
  ↓
Step 7: Field, Keyword, Institution 軽微修正（Step 6 と並行可）
  ↓
Step 8: parseProject 拡張（全 Step 完了後）
```

---

## 6. テスト戦略

各 Step に対し TDD を適用する。

| Step | テストファイル | テスト内容 |
|------|--------------|-----------|
| 1〜7 | `tests/unit/models.test.ts` | 型コンパイルテスト、インターフェースの構造検証 |
| 8 | `tests/unit/api/projects.test.ts` | `parseProject` の出力が新モデルと一致すること |
| 8 | `tests/fixtures/projects-response.xml` | 十分なフィールドを含むフィクスチャに更新 |

### フィクスチャ更新

現在の `tests/fixtures/projects-response.xml` が `categories`, `members`, `awardAmounts` 等を含んでいるか確認し、不足する場合は追加する。

---

## 7. 後方互換性の考慮

以下の変更は**破壊的変更（breaking change）**となる:

| 変更内容 | 影響 |
|---------|------|
| `ResearcherRole.researcher` 削除 | 既存のユーザーコードが `role.researcher.xxx` でアクセスしている場合にコンパイルエラー |
| `Project.allocationType: string` → `allocations?: Allocation[]` | 既存のユーザーコードが `project.allocationType` を使用している場合にコンパイルエラー |
| `AwardAmount.fiscalYear` 削除 | `amount.fiscalYear` を参照しているコードがコンパイルエラー |
| `AwardAmount.currency` 削除 | `amount.currency` を参照しているコードがコンパイルエラー |

これらはモデルの正確性向上のための意図的な破壊的変更であり、本 Issue のスコープ内で対応する。

---

## 8. 関連ファイル

- `src/models/index.ts` — 主修正対象
- `src/api/projects.ts` — `parseProject` メソッド拡張
- `tests/unit/api/projects.test.ts` — テスト更新
- `tests/fixtures/projects-response.xml` — フィクスチャ更新（必要に応じて）
