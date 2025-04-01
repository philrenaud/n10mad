import { parseArgs } from 'util';
import { wrangleTimeline } from './wrangle/timeline';
const AVAILABLE_SOURCES = ['timeline'] as const;
type DataSource = typeof AVAILABLE_SOURCES[number];

const fetchers: Record<DataSource, () => Promise<any>> = {
  timeline: wrangleTimeline,
};

const {positionals} = parseArgs({
  strict: false
});
const resources = positionals.length ? positionals as DataSource[] : [...AVAILABLE_SOURCES];

async function wrangleData(sourcesToWrangle: DataSource[]) {
  for (const resource of sourcesToWrangle) {
    if (!(resource in fetchers)) {
      console.error(`Resource ${resource} unknown`);
      continue;
    }
    console.log('wrangle resource', resource);
    const data = await fetchers[resource]();
    Bun.write(`data/wrangled/${resource}.json`, JSON.stringify(data, null, 2));
  }
}

wrangleData(resources);
