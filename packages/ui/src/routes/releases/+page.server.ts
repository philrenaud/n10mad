import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import releases from '../../../../../data/raw/releases.json';

export const ssr = false;

export const load: PageLoad = async () => {
  return {
    releases: releases.data,
  }
}
