import { Octokit } from 'octokit';

const REPO_DETAILS = {
  owner: 'hashicorp',
  repo: 'nomad'
};

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

// Curated list by way of running `git log --name-only --pretty=format: | sort | uniq -c | sort -rg | head -100` and picking the fun ones.
const files = [
  'nomad/structs/structs.go',
  'client/client.go',
  'nomad/state/state_store.go',
  'client/driver/docker.go',
  'nomad/fsm.go',
  'api/jobs.go',
  'ui/mirage/config.js'
]

export async function fetchFiles() {
  const fileHistories = [];
  for (const file of files) {
    console.log(`Fetching commits for ${file}`);
    const commits = await fetchCommitsForFile(file);
    // console.log(commits);
    fileHistories.push({
      file: file,
      commits: commits.map((c) => {
        return {
          author: c.author?.login,
          date: c.commit.author?.date,
          message: c.commit.message,
          url: c.html_url
        }
      })
    });
  }
  return fileHistories;
}

async function fetchCommitsForFile(file: string) {
  const commits = [];
  let page = 1;
  while (true) {
    try {
      const response = await octokit.rest.repos.listCommits({
        ...REPO_DETAILS,
        path: file,
        page: page,
        per_page: 1000
      });
      if (response.data.length === 0) break;
      commits.push(...response.data);
      page++;
    } catch (error) {
      console.error('Error fetching commits for file', file, error);
      throw error;
    }
  }
  return commits;
}
