/**
 * Example: Search for research projects using KakenApiClient.
 *
 * Run with:
 *   npx tsx examples/search-projects.ts
 */

import { KakenApiClient } from '../src/index.js';

const appId = process.env.KAKEN_APP_ID;

if (!appId) {
  console.error('KAKEN_APP_ID is required');
  process.exit(1);
}

const client = new KakenApiClient({
  appId: appId,
  useCache: true,
});

// --- Example 1: Keyword search ---
console.log('=== Example 1: Keyword search ===');
try {
  const result = await client.projects.search({
    keyword: '人工知能',
    resultsPerPage: 5,
    language: 'ja',
  });

  console.log(`Total results: ${result.totalResults}`);
  console.log(`Returned: ${result.projects.length} projects`);

  for (const project of result.projects) {
    console.log(`  - [${project.awardNumber}] ${project.title ?? project.titleEn ?? '(no title)'}`);
  }
} catch (error) {
  console.error('Search failed:', error);
}

// --- Example 2: Filtered search (institution + period) ---
console.log('\n=== Example 2: Filtered search ===');
try {
  const result = await client.projects.search({
    keyword: '研究データ管理',
    language: 'ja',
    institution: '大阪大学',
    grantPeriodFrom: 2024,
    grantPeriodTo: 2027,
    resultsPerPage: 5,
  });

  console.log(`Total results: ${result.totalResults}`);

  for (const project of result.projects) {
    const period = project.periodOfAward;
    const periodStr = period ? `${period.startFiscalYear ?? '?'}–${period.endFiscalYear ?? '?'}` : 'unknown';
    console.log(`  - [${periodStr}] ${project.title ?? project.titleEn ?? '(no title)'}`);
  }
} catch (error) {
  console.error('Search failed:', error);
}

// --- Example 3: Search by project number ---
console.log('\n=== Example 3: Search by project number ===');
try {
  const result = await client.projects.search({
    projectNumber: '19K20626',
  });

  console.log(`Total results: ${result.totalResults}`);

  for (const project of result.projects) {
    const categories = project.categories?.map((c) => c.name).join(', ') ?? 'N/A';
    console.log(`  Title   : ${project.title ?? '(no title)'}`);
    console.log(`  Number  : ${project.awardNumber ?? 'N/A'}`);
    console.log(`  Category: ${categories}`);
  }
} catch (error) {
  console.error('Search failed:', error);
}
