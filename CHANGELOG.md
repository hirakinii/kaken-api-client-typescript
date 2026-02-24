# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2026-02-24

### Added

- `src/cache.browser.ts` — no-op `ResponseCache` stub for browser environments; bundlers that support the `"browser"` field in `package.json` resolve this module instead of `cache.ts`, eliminating Node.js-specific imports (`node:fs/promises`, `node:crypto`, `node:path`)
- `"browser"` field in `package.json` mapping `dist/cache.js` → `dist/cache.browser.js` for Vite, webpack, and Rollup

### Fixed

- `KakenApiClient` no longer calls `os.tmpdir()` at module initialization time; the default cache directory is now computed lazily inside the constructor only when `useCache: true`. This prevents runtime errors in browser environments when `useCache: false`

## [0.1.0] - 2026-02-24

### Added

- `KakenApiClient` — main entry point with configurable `appId`, `timeout`, `maxRetries`, `useCache`, and `cacheDir` options
- `client.projects.search()` — search KAKEN research projects by keyword, institution, researcher name, grant number, and fiscal year range
- `client.researchers.search()` — search KAKEN researchers by name, researcher number, institution, and keyword
- Disk-based response caching via `ResponseCache` to avoid redundant API calls
- Automatic exponential-backoff retry logic for transient network and 5xx errors
- `await using` support via `Symbol.asyncDispose` (TypeScript 5.2+)
- Full TypeScript types for all response models (`Project`, `Researcher`, `Affiliation`, etc.)
- Zod-validated input schemas (`ProjectSearchParamsSchema`, `ResearcherSearchParamsSchema`)
- Custom error hierarchy: `KakenApiError`, `KakenApiRequestError`, `KakenApiResponseError`, `KakenApiNotFoundError`, `KakenApiAuthError`, `KakenApiRateLimitError`
- ESM-first package with `"type": "module"` and `.js` extension imports

[Unreleased]: https://github.com/hirakinii/kaken-api-client-typescript/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/hirakinii/kaken-api-client-typescript/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/hirakinii/kaken-api-client-typescript/releases/tag/v0.1.0
