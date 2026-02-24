# kaken-api-client-typescript ブラウザ互換対応計画

## 背景

現在のパッケージは Node.js 専用 API を静的 import しているため、
Vite 等のブラウザ向けバンドラでビルドエラーが発生する。

| ファイル        | 問題のある import                                             | 影響                     |
| --------------- | ------------------------------------------------------------- | ------------------------ |
| `src/cache.ts`  | `node:fs/promises`, `node:crypto`, `node:path`                | ビルドエラー（直接原因） |
| `src/client.ts` | `node:os`, `node:path` (トップレベル定数 `DEFAULT_CACHE_DIR`) | ランタイムエラー         |

---

## 修正内容

### 1. `src/client.ts` — `DEFAULT_CACHE_DIR` をコンストラクタ内に移動

```ts
// Before: トップレベルで実行される（ブラウザ不可）
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const DEFAULT_CACHE_DIR = join(tmpdir(), 'kaken-api-cache')

// After: useCache が true のときだけ実行
constructor(options: KakenApiClientOptions = {}) {
  const useCache = options.useCache ?? DEFAULTS.useCache
  const cacheDir = options.cacheDir ?? (
    useCache ? join(tmpdir(), 'kaken-api-cache') : ''
  )
  ...
}
```

### 2. `package.json` — `browser` フィールドで `cache.ts` ビルド成果物をスタブに差し替え

```json
{
  "browser": {
    "./dist/cache.js": "./dist/cache.browser.js"
  }
}
```

### 3. `src/cache.browser.ts` (新規) — ブラウザ向け no-op スタブ

```typescript
/** No-op stub of ResponseCache for browser environments. */
export class ResponseCache {
  constructor(_cacheDir: string, _enabled: boolean) {}
  async get(_key: string): Promise<Buffer | null> { return null }
  async set(_key: string, _data: Buffer): Promise<void> {}
  async invalidateExpired(_ttlMs: number): Promise<void> {}
}
```

## 対応後の効果

- `useCache`: `false`（ブラウザ想定）: ビルド・ランタイムともにエラーなし
- `useCache`: `true`（Node.js 環境）: 従来どおりファイルキャッシュが動作

## チェックリスト

- [] `src/client.ts` の top-level node:os/node:path import をコンストラクタ内に移動
- [] `src/cache.browser.ts` を作成
- [] `package.json` に `browser` フィールドを追加
- [] ビルドスクリプトに `cache.browser.ts` のコンパイルを含める
- [] ブラウザ環境向けのテスト追加（`useCache`: `false` で Node.js API が呼ばれないことを確認）
