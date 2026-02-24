/**
 * Example: Search for researchers using KakenApiClient.
 *
 * Run with:
 *   npx tsx examples/search-researchers.ts
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

// --- Example 1: Search by researcher name ---
console.log('=== Example 1: Search by researcher name ===');
try {
  const result = await client.researchers.search({
    researcherName: '山田',
    resultsPerPage: 5,
    language: 'ja',
  });

  console.log(`Total results: ${result.totalResults}`);
  console.log(`Returned: ${result.researchers.length} researchers`);

  for (const researcher of result.researchers) {
    const name = researcher.name?.fullName ?? '(no name)';
    const affiliation = researcher.currentAffiliations?.[0];
    const institution = affiliation?.institution?.name ?? 'N/A';
    console.log(`  - ${name}  (${institution})`);
  }
} catch (error) {
  console.error('Search failed:', error);
}

// --- Example 2: Search by keyword and institution ---
console.log('\n=== Example 2: Search by keyword and institution ===');
try {
  const result = await client.researchers.search({
    keyword: '量子',
    language: 'ja',
    researcherInstitution: '京都大学',
    resultsPerPage: 5,
  });

  console.log(`Total results: ${result.totalResults}`);

  for (const researcher of result.researchers) {
    const name = researcher.name?.fullName ?? '(no name)';
    const projectCount = researcher.projects?.length ?? 0;
    console.log(`  - ${name}  (${projectCount} project(s))`);
  }
} catch (error) {
  console.error('Search failed:', error);
}

// --- Example 3: Search by researcher number ---
console.log('\n=== Example 3: Search by researcher number ===');
try {
  const result = await client.researchers.search({
    researcherNumber: '00000001',
  });

  console.log(`Total results: ${result.totalResults}`);

  for (const researcher of result.researchers) {
    const name = researcher.name?.fullName ?? '(no name)';
    const affiliations =
      researcher.currentAffiliations
        ?.map((a) => a.institution?.name)
        .filter(Boolean)
        .join(', ') ?? 'N/A';

    console.log(`  Name        : ${name}`);
    console.log(`  eRad ID     : ${researcher.eradResearcherNumber ?? 'N/A'}`);
    console.log(`  Affiliations: ${affiliations}`);

    const latestProject = researcher.projects?.[0];
    if (latestProject) {
      console.log(`  Latest proj.: ${latestProject.title ?? latestProject.titleEn ?? '(no title)'}`);
    }
  }
} catch (error) {
  console.error('Search failed:', error);
}
