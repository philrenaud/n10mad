import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import releases from '../../../../data/releases.json';
// import files from '../../../../data/files.json';
import timeline from '../../../../data/wrangled/timeline.json';
import contributors from '../../../../data/contributors.json';
import stars from '../../../../data/stars.json';

export const ssr = false;

export const load: LayoutServerLoad = async () => {
  return {
    // weeklyCommits: files,
    // releases: releases.data,
    // files: filesWithAuthorMap,
    contributors: contributors,
    stars: stars,
    // Add the new weekly commit data
    // weeklyCommits: weeklyCommits,
    timeline: timeline,
    // weeklyStats: weeklyStats
  }
}
