import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import releases from '../../../../data/releases.json';
import files from '../../../../data/files.json';
import contributors from '../../../../data/contributors.json';
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

export const load: PageLoad = async () => {
  return {
    releases: releases.data,
    files: filesMap,
    contributors: contributors,
    stars: stars,
  }
}
