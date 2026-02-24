# Examples

Runnable TypeScript examples for `@hirakinii-packages/kaken-api-client-typescript`.

## Prerequisites

1. **Install dependencies** from the project root:
   ```bash
   npm install
   ```

2. **(Optional) Set your KAKEN App ID** — requests work without it, but registering at [KAKEN](https://kaken.nii.ac.jp/) allows higher rate limits:
   ```bash
   export KAKEN_APP_ID=your_app_id_here
   ```

## Running the Examples

Use `tsx` to execute TypeScript files directly:

```bash
# Search for research projects
npx tsx examples/search-projects.ts

# Search for researchers
npx tsx examples/search-researchers.ts
```

## Available Examples

### [`search-projects.ts`](search-projects.ts)

Demonstrates three project search patterns:

| Example | Description |
|---------|-------------|
| Keyword search | Find projects matching `人工知能` (AI) |
| Filtered search | Search by keyword + institution (`大阪大学`) |
| By grant number | Look up a specific project by award number (`19K20626`) |

### [`search-researchers.ts`](search-researchers.ts)

Demonstrates three researcher search patterns:

| Example | Description |
|---------|-------------|
| By name | Search researchers named `山田` |
| By keyword + institution | Find researchers on `量子` (quantum) topics at `京都大学` |
| By researcher number | Look up a specific researcher by their 8-digit KAKEN number |
