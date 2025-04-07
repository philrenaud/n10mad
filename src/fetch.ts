// src/data/fetchGithubData.ts
import { fetchStars } from './fetch/stars';
import { fetchContributors } from './fetch/contributors';
import { fetchFiles } from './fetch/files';
import { fetchReleases } from './fetch/releases';
import { parseArgs } from 'util';

const AVAILABLE_SOURCES = ['contributors', 'stars', 'files', 'releases'] as const;
type DataSource = typeof AVAILABLE_SOURCES[number];

const fetchers: Record<DataSource, () => Promise<any>> = {
  contributors: fetchContributors,
  stars: fetchStars,
  files: fetchFiles,
  releases: fetchReleases,
};

const {positionals} = parseArgs({
  strict: false
});
const resources = positionals.length ? positionals as DataSource[] : [...AVAILABLE_SOURCES];

async function fetchData(sourcesToFetch: DataSource[]) {
  for (const resource of sourcesToFetch) {
    if (!(resource in fetchers)) {
      console.error(`Resource ${resource} unknown`);
      continue;
    }
    console.log('fetching resource', resource);
    const data = await fetchers[resource]();
    Bun.write(`data/raw/${resource}.json`, JSON.stringify(data, null, 2));
  }
}

fetchData(resources);
