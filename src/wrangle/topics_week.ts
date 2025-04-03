/**
 * Goes over all contributions data and assigns topics to each in the timeline
 */

import files from '../../data/files.json';
import timeline from '../../data/wrangled/timeline.json';
import natural from 'natural';

const stopwords = natural.stopwords;
const tfidf = natural.TfIdf;

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
  year: string;
}

type Year = {
  year: string;
  weeks: Week[];
}

const allCommits = files[0].commits;

// ugh let's not make it weird
const years = ['2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025'];

const getWeeklyCommitsByYear = () => {
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
        weekStart: new Date(`${year}-01-01`).getTime() + (weekNumber * 7 * 24 * 60 * 60 * 1000),
        weekEnd: new Date(`${year}-01-01`).getTime() + ((weekNumber + 1) * 7 * 24 * 60 * 60 * 1000),
        date,
        commit
      }
    });

    // Count by weekNumber
    const weekCounts = weeksInYear.map((week) => {  
      const commitsForWeek: Commit[] = binnedCommits.filter((commit) => commit.weekNumber === week).map(c => c.commit);
      const uniqueAuthorCountPerWeek = new Set(commitsForWeek.map((commit) => commit.author)).size;
      return {
        weekNumber: week,
        year,
        commits: commitsForWeek.map(c => c.message),
        weekStart: new Date(`${year}-01-01`).getTime() + (week * 7 * 24 * 60 * 60 * 1000),
        weekEnd: new Date(`${year}-01-01`).getTime() + ((week + 1) * 7 * 24 * 60 * 60 * 1000),
        uniqueAuthorCount: uniqueAuthorCountPerWeek
        // weekStart: commitsForWeek[0].date,
        // weekEnd: commitsForWeek[commitsForWeek.length - 1].date
      }
    });
    // console.log('weekCounts', weekCounts);
    return weekCounts;
  });

  return weeklyCommitsByYear;
}

//              A COMPUTER
//     CAN NEVER BE HELD ACCOUNTABLE
//    THEREFORE A COMPUTER MUST NEVER
// MAKE A MANUAL LIST OF WORDS TO IGNORE

const STOPWORDS = [
  "add",
  "request",
  "pull",
  "hashicorp",
  "gh",
  "update",
  "within",
  "nomad",
  "use",
  "change",
  "not",
  "new",
  "com",
  "github",
  "remove",
  "used",
  "will",
  "adds",
  "co",
  "com",
  "added",
  "merge",
  "adding",
  "updated",
  "closes",
  "pr",
  "authored",
];

export async function wrangleTopicsWeek() {
  console.time('wrangleTopicsWeek');
  if (!files) {
    throw new Error('files.json does not exist; you need to run `bun fetch files` first');
  }
  let corpus = new tfidf();

  // add stopwords
  corpus.setStopwords([...stopwords, ...STOPWORDS]);
  const weeklyCommitsByYear = getWeeklyCommitsByYear();
  const flatWeeks = weeklyCommitsByYear.flat();

  flatWeeks.forEach((week: Week) => {
    corpus.addDocument(week.commits.join(''));
    // console.log('adding some commits', week.commits.length, week.commits.join());
  });

  // Fun method to turn down the "temperature": only show terms with idf < 5 or so. Because idf is "number of commit messages divided by number containing this word", high values mean "this is pretty dang rare".
  // That's okay! That can be a signal! In fact TFIDF depends on that signal explicitly!
  // But it's probably too spicy in a clustered-homogeneity context like "Nomad authors".
  // For example: James and I, wihtout this method, have "behaviour" as one of our terms.
  // It's not like we talk about behaviour a lot. It's just that we respect the Crown enough to use her english.
  const SPICE_TOLERANCE = 4;

  // const AUTHORS_TO_INCLUDE = 100;
  const TERMS_TO_INCLUDE = 20;

  const output = corpus.documents
    // .slice(0, AUTHORS_TO_INCLUDE)
    .map((doc, i) => {
      return {
        year: flatWeeks[i].year,
        weekNumber: flatWeeks[i].weekNumber,
        weekStart: flatWeeks[i].weekStart,
        weekEnd: flatWeeks[i].weekEnd,
        terms: corpus.listTerms(i)
        .filter(t => t.tf >= 2 && t.idf < SPICE_TOLERANCE)
        .slice(0, TERMS_TO_INCLUDE)
        .map(t => {
          return {
            term: t.term,
            tfidf: t.tfidf,
          }
        })
      }
    });
  console.timeEnd('wrangleTopicsWeek');
  return output;
}
