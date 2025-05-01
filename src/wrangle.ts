import { parseArgs } from 'util';
import { wrangleTimeline } from './wrangle/timeline';
import { wrangleTopicsAuthor } from './wrangle/topics_author';
import { wrangleTopicsWeek } from './wrangle/topics_week';
const AVAILABLE_SOURCES = ['timeline', 'topics_author', 'topics_week'] as const;
type DataSource = typeof AVAILABLE_SOURCES[number];

const fetchers: Record<DataSource, () => Promise<any>> = {
  timeline: wrangleTimeline,
  topics_author: wrangleTopicsAuthor,
  topics_week: wrangleTopicsWeek,
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
