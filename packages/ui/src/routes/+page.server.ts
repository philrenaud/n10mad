import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
// import releases from '../../../../data/raw/releases.json';
// import files from '../../../../data/raw/files.json';
import timeline from '../../../../data/wrangled/timeline.json';
// import contributors from '../../../../data/raw/contributors.json';
// import stars from '../../../../data/raw/stars.json';
import topics from '../../../../data/wrangled/topics_week.json';

export const ssr = true;

export const load: LayoutServerLoad = async () => {
  return {
    // weeklyCommits: files,
    // releases: releases.data,
    // files: filesWithAuthorMap,
    // contributors: contributors.sort((a, b) => b.total - a.total).slice(0, 20),
    // stars: stars,
    // Add the new weekly commit data
    // weeklyCommits: weeklyCommits,
    timeline: timeline,
    // milestones,
    topics,
    // weeklyStats: weeklyStats
  }
}
