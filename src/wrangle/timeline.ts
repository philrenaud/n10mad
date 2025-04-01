/**
 * Organizes the raw files.json into an array of years, each with an array of weeks, each with aggregate commit information.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import files from '../../data/files.json';

type Commit = {
  author: string;
  date: string;
  message: string;
  url: string;
}

type Week = {
  weekNumber: number;
  date: string;
  commits: Commit[];
}

type Year = {
  year: string;
  weeks: Week[];
}

const allCommits = files[0].commits;

const commitsByYear = allCommits.reduce((acc, commit) => {
  // Simple version of this: year is "2025-03-28T15:13:13Z" formatted, so
  // I can just take the first 4 characters.
  const year = commit.date.slice(0, 4);
  // There's an argument for like, counting asterisks in the commit message as an indication of flattened/squashed commits. I don't think early Nomad commits did this (lots of fast back-to-back commits on the same file, etc) and it makes things appear a little lop-sided.
  acc[year] = (acc[year] || 0) + 1;
  return acc;
}, {});
const getWeeklyCommitsByYear = () => {
  console.time('getWeeklyCommitsByYear');
  // let years = allCommits.map(commit => commit.date.slice(0, 4))
  // .sort()
  // // de-dupe
  // .filter((year, index, self) => self.indexOf(year) === index);

  // ugh let's not make it weird
  const years = ['2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025'];

  const weeklyCommitsByYear = years.map((year) => {
    let commitsInYear = allCommits.filter((commit) => commit.date.slice(0, 4) === year);
    const weeksInYear = Array.from({ length: 52 }).map((_, i) => {
      return i
    });

    let binnedCommits = commitsInYear.map((commit) => {
      const date = new Date(commit.date);
      const startOfYear = new Date(`${year}-01-01`);
      const dayOfYear = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
      // Calculate which week this falls into (0-51)
      const weekNumber = Math.min(Math.floor(dayOfYear / 7), 51); // Cap at 51 (week 52)
      return {
        weekNumber,
        date,
        commit
      }
    });

    console.log('binnedCommits', binnedCommits);
    // Count by weekNumber
    const weekCounts = weeksInYear.map((week) => {  
      const commitsForWeek = binnedCommits.filter((commit) => commit.weekNumber === week);
      const uniqueAuthorCountPerWeek = new Set(commitsForWeek.map((commit) => commit.commit.author)).size;
      return {
        weekNumber: week,
        count: commitsForWeek.length,
        weekStart: new Date(`${year}-01-01`).getTime() + (week * 7 * 24 * 60 * 60 * 1000),
        weekEnd: new Date(`${year}-01-01`).getTime() + ((week + 1) * 7 * 24 * 60 * 60 * 1000),
        uniqueAuthorCount: uniqueAuthorCountPerWeek
        // weekStart: commitsForWeek[0].date,
        // weekEnd: commitsForWeek[commitsForWeek.length - 1].date
      }
    });
    console.log('weekCounts', weekCounts);
    return weekCounts;
  });

  return weeklyCommitsByYear;
}



export async function wrangleTimeline() {
  const timeline = await getWeeklyCommitsByYear();
  return timeline;
}
