# @hirakinii-packages/kaken-api-client-typescript

[![CI](https://github.com/hirakinii/kaken-api-client-typescript/actions/workflows/ci.yml/badge.svg)](https://github.com/hirakinii/kaken-api-client-typescript/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/@hirakinii-packages%2Fkaken-api-client-typescript.svg)](https://badge.fury.io/js/@hirakinii-packages%2Fkaken-api-client-typescript)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

TypeScript/Node.js client library for the [KAKEN](https://kaken.nii.ac.jp/) (科学研究費助成事業データベース) API.

> Easily search and retrieve Japanese research grant data — projects and researchers — from the KAKEN database.

## Features

- **Project search** — search by keyword, institution, researcher name, grant number, and more
- **Researcher search** — search by name, institution, researcher number, and keyword
- **Automatic retries** — exponential backoff on transient network/server errors
- **Disk-based response caching** — avoid redundant API calls (Node.js only)
- **Browser compatible** — works in Vite and other browser bundlers with `useCache: false`
- **Fully typed** — rich TypeScript types and Zod-validated input schemas
- **ESM-first** — native ES modules with `"type": "module"`

## Requirements

- Node.js **≥ 20.0.0** (for disk caching; browser environments are supported with `useCache: false`)

## Installation

```bash
npm install @hirakinii-packages/kaken-api-client-typescript
```

## Quick Start

```typescript
import { KakenApiClient } from '@hirakinii-packages/kaken-api-client-typescript';

const client = new KakenApiClient({
  appId: process.env.KAKEN_APP_ID, // optional but recommended
});

// Search for research projects
const projects = await client.projects.search({
  keyword: '人工知能',
  resultsPerPage: 10,
  language: 'ja',
});

console.log(`Found ${projects.totalResults} projects`);
for (const project of projects.projects) {
  console.log(`  [${project.awardNumber}] ${project.title}`);
}

// Search for researchers
const researchers = await client.researchers.search({
  researcherName: '山田',
  language: 'ja',
});

console.log(`Found ${researchers.totalResults} researchers`);
```

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `appId` | `string` | `undefined` | KAKEN API application ID (register at [KAKEN](https://kaken.nii.ac.jp/)) |
| `timeout` | `number` | `30000` | Request timeout in milliseconds |
| `maxRetries` | `number` | `3` | Maximum retry attempts on transient failures |
| `useCache` | `boolean` | `true` | Whether to cache responses on disk (Node.js only) |
| `cacheDir` | `string` | OS temp dir | Directory to store cache files (Node.js only) |

### Browser usage

Browser environments are supported when `useCache` is set to `false`. Bundlers that respect the `"browser"` field in `package.json` (e.g. Vite, webpack, Rollup) will automatically use a no-op cache stub that avoids all Node.js-specific APIs.

```typescript
const client = new KakenApiClient({
  appId: import.meta.env.VITE_KAKEN_APP_ID,
  useCache: false, // required for browser environments
});
```

> **Note:** `useCache: true` (the default) requires a Node.js file system and is not supported in browsers.

### Without caching

```typescript
const client = new KakenApiClient({
  appId: process.env.KAKEN_APP_ID,
  useCache: false,
});
```

### `await using` (TypeScript 5.2+)

```typescript
await using client = new KakenApiClient({ appId: process.env.KAKEN_APP_ID });
const result = await client.projects.search({ keyword: 'AI' });
// client is automatically disposed here
```

## API Reference

### `client.projects.search(params)`

Search for research projects.

| Parameter | Type | Description |
|-----------|------|-------------|
| `keyword` | `string` | Keyword to search across title, abstract, etc. |
| `projectNumber` | `string` | Grant award number (e.g. `"19K20626"`) |
| `institution` | `string` | Institution name |
| `researcherName` | `string` | Principal investigator name |
| `grantPeriodFrom` | `number` | Grant start fiscal year (e.g. `2020`) |
| `grantPeriodTo` | `number` | Grant end fiscal year (e.g. `2025`) |
| `resultsPerPage` | `number` | Results per page (default: `20`) |
| `startRecord` | `number` | Pagination offset (default: `1`) |
| `language` | `"ja"` \| `"en"` | Response language |

**Returns:** `ProjectsResponse` — `{ totalResults, projects[] }`

### `client.researchers.search(params)`

Search for researchers.

| Parameter | Type | Description |
|-----------|------|-------------|
| `researcherName` | `string` | Researcher name |
| `researcherNumber` | `string` | KAKEN researcher number (8 digits) |
| `researcherInstitution` | `string` | Institution name |
| `keyword` | `string` | Keyword search |
| `resultsPerPage` | `number` | Results per page (default: `20`) |
| `startRecord` | `number` | Pagination offset (default: `1`) |
| `language` | `"ja"` \| `"en"` | Response language |

**Returns:** `ResearchersResponse` — `{ totalResults, researchers[] }`

## Error Handling

```typescript
import {
  KakenApiClient,
  KakenApiAuthError,
  KakenApiRateLimitError,
  KakenApiNotFoundError,
  KakenApiError,
} from '@hirakinii-packages/kaken-api-client-typescript';

try {
  const result = await client.projects.search({ keyword: 'AI' });
} catch (error) {
  if (error instanceof KakenApiAuthError) {
    console.error('Invalid or missing appId');
  } else if (error instanceof KakenApiRateLimitError) {
    console.error('Rate limit exceeded — please wait before retrying');
  } else if (error instanceof KakenApiNotFoundError) {
    console.error('No results found');
  } else if (error instanceof KakenApiError) {
    console.error('KAKEN API error:', error.message);
  }
}
```

## Examples

See the [examples/](examples/) directory for runnable scripts:

- [`search-projects.ts`](examples/search-projects.ts) — keyword search, filtered search, search by grant number
- [`search-researchers.ts`](examples/search-researchers.ts) — search by name, institution, researcher number

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint
npm run lint

# Build
npm run build
```

## License

MIT — see [LICENSE](LICENSE) for details.
