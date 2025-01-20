import { Octokit } from 'octokit';

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

const REPO_DETAILS = {
  owner: 'hashicorp',
  repo: 'nomad'
};

export async function fetchReleases() {
  const releases = await octokit.rest.repos.listReleases({...REPO_DETAILS, per_page: 1000});
  return releases;
}
