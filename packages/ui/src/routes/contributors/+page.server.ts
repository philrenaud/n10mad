import type { PageServerLoad } from './$types';
// import contributors from '../../../../../data/raw/contributors.json';
import wrangledContributors from '../../../../../data/wrangled/topics_author.json';
export const ssr = true;

type Author = {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  type: string;
}

type Week = {
  w: number;      // Unix timestamp
  // a: number;      // Additions
  // d: number;      // Deletions
  c: number;      // Commits
}

export type Contributor = {
  total: number;  // Total commits
  weeks: Week[];
  author: Author;
  mode?: string;
  stack?: unknown[];
  color?: string;
}

// New type for quarterly data
export type Quarter = {
  w: number;      // Unix timestamp of first day of quarter
  // a: number;      // Total additions for quarter
  // d: number;      // Total deletions for quarter
  c: number;      // Total commits for quarter
  label: string;  // Quarter label (e.g., "2023-Q1")
}

// Modified contributor type with quarterly data
export type QuarterlyContributor = {
  total: number;  // Total commits (unchanged)
  quarters: Quarter[]; // Quarterly data instead of weekly
  author: Author; // Author data (unchanged)
}

type ContributorsPageData = Promise<{
  contributors: QuarterlyContributor[];
}>

export const load: PageServerLoad = async (): ContributorsPageData => {
  // Convert weekly data to quarterly data for each contributor
  const quarterlyContributors: QuarterlyContributor[] = (wrangledContributors as Contributor[]).map(contributor => {
    // Group weeks by quarter
    const quartersMap: Record<string, Quarter> = {};
    
    contributor.weeks.forEach(week => {
      const date = new Date(week.w * 1000);
      const year = date.getFullYear();
      const month = date.getMonth();
      const quarter = Math.floor(month / 3) + 1; // 1-4 for Q1-Q4
      const quarterKey = `${year}-Q${quarter}`;
      
      // Get first day of quarter as timestamp
      const firstMonthOfQuarter = quarter * 3 - 3; // 0, 3, 6, 9
      const firstDayOfQuarter = new Date(year, firstMonthOfQuarter, 1).getTime() / 1000;
      
      // Initialize the quarter if it doesn't exist
      if (!quartersMap[quarterKey]) {
        quartersMap[quarterKey] = {
          w: firstDayOfQuarter,
          // a: 0,
          // d: 0,
          c: 0,
          label: quarterKey
        };
      }
      
      // Aggregate the weekly data
      // quartersMap[quarterKey].a += week.a || 0;
      // quartersMap[quarterKey].d += week.d || 0;
      quartersMap[quarterKey].c += week.c || 0;
    });
    
    // Convert map to sorted array
    const quarters = Object.values(quartersMap).sort((a, b) => a.w - b.w);
    
    // Return new contributor object with quarterly data
    return {
      total: contributor.total, // Keep original total
      weeks: quarters,
      author: contributor.author
    };
  });
  
  return {
    contributors: quarterlyContributors.reverse()
  };
}
