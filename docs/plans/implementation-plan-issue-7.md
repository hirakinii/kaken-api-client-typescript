# Implementation Plan: Issue #7 — Fix Types for Researcher Response

## Overview

実際の KAKEN Researchers API レスポンス (`docs/reference/kaken_api_researcher_response_sample.json`) と
公式定義ドキュメント (`docs/reference/researcher-response-json-definition-researcher-part.yaml`) を分析した結果、
`src/models/index.ts` のインターフェース定義および `src/api/researchers.ts` のパーサーに
複数の不一致が確認された。本計画はそれらを修正する。

---

## 調査結果：問題点の一覧

### 1. `Affiliation` インターフェース (`src/models/index.ts`)

| 問題 | 現在の定義 | 正しい対応 |
|------|-----------|-----------|
| `startDate`/`endDate` が `Date` 型として宣言されているが、パーサーで一切セットされていない | `startDate?: Date` / `endDate?: Date` | JSON の `since` / `until` (`{ "commonEra:year": 2025, "month": 4, "day": 1 }`) をパース |
| `sequence` フィールドが未定義 | 未定義 | `sequence?: number` を追加 |

### 2. `PersonName` インターフェース (`src/models/index.ts`)

| 問題 | 現在の定義 | 正しい対応 |
|------|-----------|-----------|
| `familyNameReading` / `givenNameReading` がインターフェースに存在するが、パーサーで抽出されていない | 未抽出 | `name:familyName` / `name:givenName` 配列の `lang: "ja-Kana"` エントリから抽出 |

### 3. `Researcher` インターフェース (`src/models/index.ts`)

| 問題 | 現在の定義 | 正しい対応 |
|------|-----------|-----------|
| `affiliations` が単一配列で、`affiliations:current` と `affiliations:history` を区別できない | `affiliations?: Affiliation[]` | `currentAffiliations?: Affiliation[]` と `historicalAffiliations?: Affiliation[]` に分割 |
| `eradResearcherNumber` がパーサーでセットされない | 未パース | `id:person:erad[0]` から抽出 |
| `jglobalId` がパーサーでセットされない | 未パース | `id:person:jglobal[0]` から抽出 |
| `researchmapId` がパーサーでセットされない | 未パース | `id:person:researchmap[0]` から抽出 |
| `orcid` がパーサーでセットされない | 未パース | `id:orcid[0]` から抽出 |
| `projects` がパーサーでセットされない | 未パース | `work:project` 配列から抽出（部分パース） |
| `products` がパーサーでセットされない | 未パース | `work:product` 配列から抽出（部分パース） |

### 4. パーサーのキー参照誤り (`src/api/researchers.ts`)

| 対象メソッド | 問題 | 修正 |
|-------------|------|------|
| `parseInstitution` | `id:institution:kakenhi` のみ参照。実際のレスポンスでは `affiliations:current` に `id:institution:erad`、`affiliations:history` に `id:institution:mext` が使われている | 複数キーを優先順位付きで試す: `id:institution:erad` → `id:institution:kakenhi` → `id:institution:mext` |
| `parseDepartment` | `id:department:mext` のみ参照。`affiliations:current` では `id:department:erad` が使われている | `id:department:erad` → `id:department:mext` の順で試す |
| `parseJobTitle` | `id:jobTitle:mext` のみ参照。`affiliations:current` では `id:jobTitle:erad` が使われている | `id:jobTitle:erad` → `id:jobTitle:mext` の順で試す |
| `parseResearcher` | `affiliations:history` を無視 | `historicalAffiliations` としてパース |

---

## 修正計画

### ファイル一覧

| ファイル | 変更種別 |
|---------|---------|
| `src/models/index.ts` | インターフェース修正 |
| `src/api/researchers.ts` | パーサー修正 |
| `tests/fixtures/researchers_response.json` | フィクスチャ更新（実際のAPIレスポンス構造に近づける） |
| `tests/unit/api/researchers.test.ts` | テスト追加・更新 |

---

### Step 1: `src/models/index.ts` の修正

#### 1-1. `Affiliation` インターフェース

```typescript
export interface Affiliation {
  sequence?: number;       // 追加: 表示順
  institution?: Institution;
  department?: Department;
  jobTitle?: JobTitle;
  startDate?: Date;
  endDate?: Date;
}
```

#### 1-2. `Researcher` インターフェース

```typescript
export interface Researcher {
  id?: string;
  name?: PersonName;
  currentAffiliations?: Affiliation[];     // 変更: affiliations:current
  historicalAffiliations?: Affiliation[];  // 追加: affiliations:history
  eradResearcherNumber?: string;
  jglobalId?: string;
  researchmapId?: string;
  orcid?: string;
  projects?: Project[];
  products?: Product[];
  rawData?: unknown;
}
```

**注意**: `affiliations?: Affiliation[]` を削除し、`currentAffiliations` と `historicalAffiliations` に分割する破壊的変更。

---

### Step 2: `src/api/researchers.ts` のパーサー修正

#### 2-1. `parseResearcher` メソッド

以下を追加でパース:
- `id:person:erad[0]` → `eradResearcherNumber`
- `id:person:jglobal[0]` → `jglobalId`
- `id:person:researchmap[0]` → `researchmapId`
- `id:orcid[0]` → `orcid`
- `affiliations:current` → `currentAffiliations`（既存の `affiliations` ロジックを移行）
- `affiliations:history` → `historicalAffiliations`（新規追加）
- `work:project` → `projects`（部分パース: `rawData` に格納しつつ主要フィールドを抽出）
- `work:product` → `products`（部分パース: `rawData` に格納しつつ主要フィールドを抽出）

#### 2-2. `parsePersonName` メソッド

```typescript
// 既存: familyName (ja テキスト) / givenName (ja テキスト) のみ
// 追加: familyNameReading (ja-Kana テキスト) / givenNameReading (ja-Kana テキスト)
private extractKanaText(values: unknown[] | undefined): string | undefined {
  // lang === 'ja-Kana' のエントリから text を抽出
}
```

#### 2-3. `parseAffiliation` メソッド

- `sequence` フィールドを追加でパース
- `since` → `startDate` (`commonEra:year`, `month`, `day` から `Date` を構築)
- `until` → `endDate` (同上)

#### 2-4. `parseInstitution` メソッド

複数の ID キーを優先順位付きで探索する:
```
id:institution:erad → id:institution:kakenhi → id:institution:mext → id:institution:jsps → id:institution:jst
```

#### 2-5. `parseDepartment` メソッド

```
id:department:erad → id:department:mext → id:department:jsps → id:department:jst
```

#### 2-6. `parseJobTitle` メソッド

```
id:jobTitle:erad → id:jobTitle:mext → id:jobTitle:jsps → id:jobTitle:jst
```

---

### Step 3: テストフィクスチャの更新

`tests/fixtures/researchers_response.json` を実際の API レスポンス構造に近づける:
- `affiliations:current` の institution に `id:institution:erad` を追加
- `affiliations:current` の jobTitle に `id:jobTitle:erad` を追加
- `affiliations:history` ブロックを追加
- 研究者識別子 (`id:person:erad`, `id:person:jglobal` 等) を追加
- `name` に `ja-Kana` の読み仮名エントリを追加

---

### Step 4: テストの追加・更新

`tests/unit/api/researchers.test.ts` を更新:

1. **破壊的変更に合わせた既存テストの修正**
   - `researcher.affiliations` → `researcher.currentAffiliations` への参照変更

2. **新規テストケースの追加**
   - `currentAffiliations` が正しくパースされること
   - `historicalAffiliations` が正しくパースされること（新規）
   - `eradResearcherNumber` がパースされること（新規）
   - `jglobalId` がパースされること（新規）
   - `researchmapId` がパースされること（新規）
   - `orcid` がパースされること（新規）
   - `familyNameReading` / `givenNameReading` がパースされること（新規）
   - `affiliation.sequence` がパースされること（新規）
   - `affiliation.startDate` / `endDate` がパースされること（新規）
   - 複数の機関 ID キー (`id:institution:erad`, `id:institution:mext` 等) に対して code が正しく抽出されること（新規）
   - `projects` がパースされること（新規）
   - `products` がパースされること（新規）

---

## TDD 実施順序

1. フィクスチャ (`researchers_response.json`) を更新
2. 新しいテストを RED 状態で追加
3. モデル (`src/models/index.ts`) を修正
4. パーサー (`src/api/researchers.ts`) を修正して GREEN に
5. リファクタリング・カバレッジ確認

---

## 留意事項

- `Researcher.affiliations` → `currentAffiliations` / `historicalAffiliations` への分割は **破壊的変更** であり、`src/client.ts` や公開型の変更が伴う場合は合わせて修正が必要。
- `work:project` / `work:product` の完全な型マッピングは複雑なため、今回はトップレベルの主要フィールドの抽出に留め、`rawData` で生データを保持する方針とする。
- `since` / `until` の日付パースは `commonEra:year` が必須、`month` / `day` が任意として扱う。
