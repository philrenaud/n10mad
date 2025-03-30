import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import releases from '../../../../data/releases.json';
import files from '../../../../data/files.json';
import contributors from '../../../../data/contributors.json';
import stars from '../../../../data/stars.json';

// Helper function to bin commits by week
function binCommitsByWeek(files) {
  // Create a map to store weekly bins
  const weeklyBins = new Map();
  
  // Process each file
  files.forEach(file => {
    file.commits.forEach(commit => {
      const date = new Date(commit.date);
      
      // Format the week key: YYYY-WW (year and week number)
      // Set date to the start of the week (Sunday)
      const startOfWeek = new Date(date);
      startOfWeek.setDate(date.getDate() - date.getDay()); // Go back to Sunday
      startOfWeek.setHours(0, 0, 0, 0); // Set to beginning of the day
      
      // Use ISO date format for the week's start date as our key
      const weekKey = startOfWeek.toISOString().slice(0, 10);
      
      // Get or create the bin for this week
      if (!weeklyBins.has(weekKey)) {
        weeklyBins.set(weekKey, {
          weekStart: weekKey,
          weekEnd: new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), // Add 6 days for end of week
          count: 0,
          authors: new Map(),
          files: new Set(),
          commits: []
        });
      }
      
      const bin = weeklyBins.get(weekKey);
      bin.count++;
      bin.files.add(file.file);
      
      // Track authors
      if (!bin.authors.has(commit.author)) {
        bin.authors.set(commit.author, 0);
      }
      bin.authors.set(commit.author, bin.authors.get(commit.author) + 1);
      
      // Store commit info
      bin.commits.push({
        author: commit.author,
        date: commit.date,
        message: commit.message,
        url: commit.url,
        file: file.file
      });
    });
  });
  
  // Convert to array and sort by week
  const result = Array.from(weeklyBins.values()).map(bin => {
    return {
      weekStart: bin.weekStart,
      weekEnd: bin.weekEnd,
      count: bin.count,
      // Sort authors by commit count (descending)
      authors: Array.from(bin.authors.entries())
        .map(([author, count]) => ({ author, count }))
        .sort((a, b) => b.count - a.count),
      files: Array.from(bin.files),
      commits: bin.commits
    };
  }).sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  
  return result;
}

// Calculate weekly statistics
function getWeeklyCommitStats(weeklyBins) {
  if (weeklyBins.length === 0) return null;
  
  // Find the week with the most commits
  const mostActiveWeek = [...weeklyBins].reduce((max, week) => 
    week.count > max.count ? week : max, { count: 0 });
  
  // Find the week with the most unique authors
  const weekWithMostAuthors = [...weeklyBins].reduce((max, week) => 
    week.authors.length > max.authorCount ? { week, authorCount: week.authors.length } : max, 
    { week: null, authorCount: 0 }).week;
  
  // Count total weeks with activity
  const totalWeeks = weeklyBins.length;
  
  // Calculate average commits per week
  const totalCommits = weeklyBins.reduce((sum, week) => sum + week.count, 0);
  const avgCommitsPerWeek = totalCommits / totalWeeks;
  
  return {
    totalWeeks,
    totalCommits,
    avgCommitsPerWeek,
    mostActiveWeek: mostActiveWeek ? {
      weekStart: mostActiveWeek.weekStart,
      weekEnd: mostActiveWeek.weekEnd,
      commitCount: mostActiveWeek.count,
      authors: mostActiveWeek.authors.slice(0, 5) // Top 5 authors for that week
    } : null,
    weekWithMostAuthors: weekWithMostAuthors ? {
      weekStart: weekWithMostAuthors.weekStart,
      weekEnd: weekWithMostAuthors.weekEnd,
      authorCount: weekWithMostAuthors.authors.length,
      authors: weekWithMostAuthors.authors.slice(0, 5) // Top 5 authors for that week
    } : null
  };
}

// Process files to get author data (as before)
const filesWithAuthorMap = files.map((f) => {
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

// Generate weekly commit bins
const weeklyCommits = binCommitsByWeek(files);

// Calculate weekly stats
const weeklyStats = getWeeklyCommitStats(weeklyCommits);

// You can use the aggregateData for other time-based aggregations
let aggregateData = {
  weeklyCommits,
  weeklyStats
};

console.log('Files processed with author data');
console.log('Weekly commits binned:', weeklyCommits.length, 'weeks');

export const ssr = true;

export const load: LayoutServerLoad = async () => {
  return {
    // releases: releases.data,
    // files: filesWithAuthorMap,
    // contributors: contributors,
    // stars: stars,
    // Add the new weekly commit data
    weeklyCommits: weeklyCommits,
    // weeklyStats: weeklyStats
  }
}
