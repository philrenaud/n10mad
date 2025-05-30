/**
 * Goes over all contributions data and assigns topics to each commit author
 */

import files from '../../data/raw/files.json';
import contributors from '../../data/raw/contributors.json';
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
}

type Year = {
  year: string;
  weeks: Week[];
}

type ContributorWeek = {
  w: number;
  a: number;
  d: number;
  c: number;
}

type Author = {
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  gravatar_id: string;
  url: string;
  html_url: string;
  followers_url: string;
  following_url: string;
  gists_url: string;
  starred_url: string;
  subscriptions_url: string;
  organizations_url: string;
  repos_url: string;
  events_url: string;
  received_events_url: string;
  type: string;
  user_view_type: string;
  site_admin: boolean;
}


const allCommits = files[0].commits;


const AUTHORS_TO_IGNORE = [
  'dependabot[bot]',
  'hc-github-team-nomad-core',
];

function organizeCommitsByAuthor(commits: Commit[]) {
  const authorMap = new Map<string, {author: string, commits: Commit[]}>();

  // Fun mystery: a good chunk of commits are made by "undefined" when returned by oktokit,
  // like https://github.com/hashicorp/nomad/commit/0cc2ab5ae96f96fb29e97937936476863dca08b4 etc.
  // My best guess is that this happens when a user sometimes merges via CLI, and other times via the github UI,
  // and github doesn't know how to reconcile it?
  commits
  .filter(c => c.author !== undefined && !AUTHORS_TO_IGNORE.includes(c.author))
  .forEach(commit => {
    if (!authorMap.has(commit.author)) {
      authorMap.set(commit.author, {author: commit.author, commits: []});
    }
    authorMap.get(commit.author)!.commits.push(commit);
  });
  
  return Array.from(authorMap.values()).sort((a, b) => b.commits.length - a.commits.length);
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

export async function wrangleTopicsAuthor() {
  if (!files) {
    throw new Error('files.json does not exist; you need to run `bun fetch files` first');
  }
  let corpus = new tfidf();

  // add stopwords
  corpus.setStopwords([...stopwords, ...STOPWORDS]);
  const commitsByAuthor = organizeCommitsByAuthor(allCommits);

  commitsByAuthor.forEach(({author, commits}) => {
    // console.log('adding author to corpus', author, commits.length);
    corpus.addDocument(commits.map(c => c.message).join(' '));
  });

  // Fun method to turn down the "temperature": only show terms with idf < 5 or so. Because idf is "number of commit messages divided by number containing this word", high values mean "this is pretty dang rare".
  // That's okay! That can be a signal! In fact TFIDF depends on that signal explicitly!
  // But it's probably too spicy in a clustered-homogeneity context like "Nomad authors".
  // For example: James and I, without this method, have "behaviour" as one of our terms.
  // It's not like we talk about behaviour a lot. It's just that we respect the Crown enough to use her english.
  const SPICE_TOLERANCE = 10;

  const AUTHORS_TO_INCLUDE = 100;
  const TERMS_TO_INCLUDE = 50;

  const topicsByAuthor = corpus.documents
    .slice(0, AUTHORS_TO_INCLUDE)
    .map((doc, i) => {
      return {
        author: commitsByAuthor[i].author,
        terms: corpus.listTerms(i)
        .filter(t => t.idf < SPICE_TOLERANCE)
        .slice(0, TERMS_TO_INCLUDE)
        .map(t => {
          return {
            term: t.term,
            tfidf: t.tfidf
          }
        })
      }
    });
  // return topicsByAuthor;

  const wrangledContributors = contributors
  .filter(c => !AUTHORS_TO_IGNORE.includes(c.author.login))
  .sort((a, b) => b.contributions - a.contributions)
  .slice(0, AUTHORS_TO_INCLUDE)
  .map(c => {
    return {
      weeks: c.weeks.map(week => {
        return {
          w: week.w,
          c: week.c,
        }
      }),
      total: c.total,
      author: {
        ...c.author,
        terms: topicsByAuthor.find(t => t.author === c.author.login)?.terms || []
      },
    }
  })
  
  return wrangledContributors;
}
