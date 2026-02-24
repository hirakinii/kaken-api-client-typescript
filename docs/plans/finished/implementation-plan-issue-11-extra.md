# kaken-api-client-typescript: Node.js 依存のリファクタリング計画 (Option B)

## 目的

`cache.ts` と `client.ts` が持つ Node.js 専用 API への静的 `import` を、
薄いヘルパーモジュールに切り出す。
ブラウザビルド時はヘルパーのみを `package.json` の `browser` フィールドで差し替える。

---

## 現状

| ファイル | Node.js 依存 | 現在の対応 |
|---|---|---|
| `src/cache.ts` | `node:crypto`, `node:fs/promises`, `node:path` | `cache.browser.ts`（ファイルごと差し替え = Option A）|
| `src/client.ts` | `node:os`, `node:path` | 未対応（暫定は dmp-editor 側の Vite プラグイン）|

---

## 方針

両ファイルに **Option B** を適用する。

- Node.js 固有の処理を **専用ヘルパーモジュール**に集約する
- `cache.ts` / `client.ts` 本体は**単一ソースのまま**を維持する
- `package.json` の `browser` フィールドで**ヘルパーのみ**を差し替える
- 不要になった `cache.browser.ts` は削除する

---

## ファイル変更一覧

| 操作 | ファイル | 内容 |
|---|---|---|
| **新規作成** | `src/node-cache-io.ts` | `cache.ts` 向け Node.js I/O ヘルパー |
| **新規作成** | `src/node-cache-io.browser.ts` | 同ヘルパーのブラウザ向け no-op スタブ |
| **新規作成** | `src/node-env.ts` | `client.ts` 向け Node.js 環境ヘルパー |
| **新規作成** | `src/node-env.browser.ts` | 同ヘルパーのブラウザ向けスタブ |
| **変更** | `src/cache.ts` | `node:*` 静的 import を削除 → ヘルパー経由に置換 |
| **変更** | `src/client.ts` | `node:os`/`node:path` 静的 import を削除 → ヘルパー経由に置換 |
| **変更** | `package.json` | `browser` フィールドをヘルパーへの差し替えに更新 |
| **削除** | `src/cache.browser.ts` | Option A 実装のため不要 |

---

## 各ファイルの変更内容

### 1. `src/node-cache-io.ts`（新規）

`cache.ts` が使用する Node.js I/O 操作を集約する。

```ts
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, readdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';

/** Returns the cache file path for the given URL. */
export function getCacheFilePath(cacheDir: string, url: string): string {
  const hash = createHash('md5').update(url).digest('hex');
  return join(cacheDir, `${hash}.cache`);
}

/** Reads a cache file. Returns null if the file does not exist. */
export async function readCacheFile(filePath: string): Promise<Buffer | null> {
  try {
    return await readFile(filePath);
  } catch {
    return null;
  }
}

/** Writes content to a cache file, creating the cache directory if needed. */
export async function writeCacheFile(
  cacheDir: string,
  filePath: string,
  content: Buffer | string,
): Promise<void> {
  await mkdir(cacheDir, { recursive: true });
  await writeFile(filePath, content);
}

/** Deletes all `.cache` files in the given directory. */
export async function clearCacheFiles(cacheDir: string): Promise<void> {
  const files = await readdir(cacheDir);
  await Promise.all(
    files.filter((f) => f.endsWith('.cache')).map((f) => unlink(join(cacheDir, f))),
  );
}
```

### 2. `src/node-cache-io.browser.ts`（新規）

ブラウザ向けの no-op スタブ。`enabled: false` のため実際には呼ばれないが、
型シグネチャを node-cache-io.ts と一致させる。

```ts
/** No-op stubs for browser environments. */
export function getCacheFilePath(_cacheDir: string, _url: string): string {
  return '';
}
export async function readCacheFile(_filePath: string): Promise<Buffer | null> {
  return null;
}
export async function writeCacheFile(
  _cacheDir: string,
  _filePath: string,
  _content: Buffer | string,
): Promise<void> {}
export async function clearCacheFiles(_cacheDir: string): Promise<void> {}
```

### 3. `src/node-env.ts`（新規）

`client.ts` が使用する Node.js 環境固有のヘルパー。

```ts
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** Returns the default directory for file-based response caching. */
export function getDefaultCacheDir(): string {
  return join(tmpdir(), 'kaken-api-cache');
}
```

### 4. `src/node-env.browser.ts`（新規）

```ts
/** Stub for browser environments — file-based caching is not supported. */
export function getDefaultCacheDir(): string {
  return '';
}
```

### 5. `src/cache.ts`（変更）

```diff
- import { createHash } from 'node:crypto';
- import { readFile, writeFile, mkdir, readdir, unlink } from 'node:fs/promises';
- import { join } from 'node:path';
+ import { getCacheFilePath, readCacheFile, writeCacheFile, clearCacheFiles } from './node-cache-io.js';

  async get(url: string): Promise<Buffer | null> {
    if (!this.enabled) return null;
-   const filePath = this.getCacheFilePath(url);
-   try {
-     return await readFile(filePath);
-   } catch {
-     return null;
-   }
+   return readCacheFile(getCacheFilePath(this.cacheDir, url));
  }

  async set(url: string, content: Buffer | string): Promise<void> {
    if (!this.enabled) return;
-   await mkdir(this.cacheDir, { recursive: true });
-   const filePath = this.getCacheFilePath(url);
-   await writeFile(filePath, content);
+   await writeCacheFile(this.cacheDir, getCacheFilePath(this.cacheDir, url), content);
  }

  async clear(): Promise<void> {
    if (!this.enabled) return;
    try {
-     const files = await readdir(this.cacheDir);
-     await Promise.all(files.filter((f) => f.endsWith('.cache')).map((f) => unlink(join(this.cacheDir, f))));
+     await clearCacheFiles(this.cacheDir);
    } catch {
      // Directory does not exist or is not readable — nothing to clear
    }
  }

- private getCacheFilePath(url: string): string {
-   const hash = createHash('md5').update(url).digest('hex');
-   return join(this.cacheDir, `${hash}.cache`);
- }
```

### 6. `src/client.ts`（変更）

```diff
- import { tmpdir } from 'node:os';
- import { join } from 'node:path';
+ import { getDefaultCacheDir } from './node-env.js';

- const cacheDir = options.cacheDir ?? (useCache ? join(tmpdir(), 'kaken-api-cache') : '');
+ const cacheDir = options.cacheDir ?? (useCache ? getDefaultCacheDir() : '');
```

### 7. `package.json`（変更）

```diff
  "browser": {
-   "./dist/cache.js": "./dist/cache.browser.js"
+   "./dist/node-cache-io.js": "./dist/node-cache-io.browser.js",
+   "./dist/node-env.js":      "./dist/node-env.browser.js"
  },
```

### 8. `src/cache.browser.ts`（削除）

Option A として作成したファイル。不要になるため削除する。

---

## dmp-editor 側の対応

`kaken-api-client-typescript` のパッケージ修正完了・公開後に実施する。

1. `npm update @hirakinii-packages/kaken-api-client-typescript`
2. `vite.config.ts` の `kakenNodeStubsPlugin` 関数・登録・コメントをすべて削除
3. `import type { Plugin } from "vite"` も削除
4. `npm run ci` で全チェックが通ることを確認

---

## チェックリスト (kaken-api-client-typescript)

- [ ] `src/node-cache-io.ts` を作成
- [ ] `src/node-cache-io.browser.ts` を作成
- [ ] `src/node-env.ts` を作成
- [ ] `src/node-env.browser.ts` を作成
- [ ] `src/cache.ts` を変更（Node.js import 除去・ヘルパー経由に置換）
- [ ] `src/client.ts` を変更（Node.js import 除去・ヘルパー経由に置換）
- [ ] `package.json` の `browser` フィールドを更新
- [ ] `src/cache.browser.ts` を削除
- [ ] テスト・型チェック・ビルドが通ることを確認
- [ ] npm publish

## チェックリスト (dmp-editor)

- [ ] パッケージを更新
- [ ] `vite.config.ts` の `kakenNodeStubsPlugin` を削除
- [ ] `npm run ci` が通ることを確認
