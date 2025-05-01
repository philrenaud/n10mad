import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
// import releases from '../../../../data/raw/releases.json';
// import contributors from '../../../../data/raw/contributors.json';
import contributors from '../../../../data/wrangled/topics_author.json';

export const ssr = false;
// export const ssr = true;
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
    .sort((a, b) => b.total - a.total)
    .slice(0,100),
    // stars: stars,
  }
}
