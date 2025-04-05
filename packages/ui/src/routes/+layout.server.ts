import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import releases from '../../../../data/releases.json';
import files from '../../../../data/files.json';
import contributors from '../../../../data/contributors.json';
// TODO: use a wrangled contributors file instead of raw
import stars from '../../../../data/stars.json';

const filesMap = files.map((f) => {
  // Count authors and tally them
  const authors = f.commits.map(c => c.author).filter(Boolean);
  let authorEntries = authors.reduce((acc, author) => {
    acc[author] = (acc[author] || 0) + 1;
    return acc;
  }, {});
  let sortedAuthorEntries = Object.entries(authorEntries)
    .sort((a, b) => b[1] - a[1]);
  let authorCounts = sortedAuthorEntries.map(([author, count]) => ({ author, count }));
  return {
    file: f.file,
    authors: authorCounts,
    commits: f.commits,
  }
});

// export const ssr = false;
export const ssr = true;
// dimensions are more important than data I guess.
// Setting this to true causes a non-trivial delay where, because there's no window binding possible at server render, we get an initial "0" or default value for canvas and page dimensions.
// This means there's a FOUC (flash of unstyled content) and I cannot abide that tbh.
// UPDATE: maybe set ssr false on page but ssr true on layout?

export const load: LayoutServerLoad = async () => {
  // return {};
  return {
    // releases: releases.data,
    // files: filesMap,
    contributors: contributors
    .filter(c => {
      return c.author.login !== 'dependabot[bot]' && !c.author.login.includes('hc-github-team-nomad-core')
    })
    .sort((a, b) => b.contributions - a.contributions)
    .reverse()
    .slice(0,30),
    // stars: stars,
  }
}
