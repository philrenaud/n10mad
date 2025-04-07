import type { PageServerLoad } from './$types';
import stars from '../../../../../data/raw/stars.json';

export const ssr = false;

type Star = {
  starred_at: string;
  user: string;
}

type StarsPageData = Promise<{
  stars: Star[];
}>

export const load: PageServerLoad = async (): StarsPageData => {
  return {
    stars: stars,
  }
}
