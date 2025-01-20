import { Octokit } from 'octokit';

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

export async function fetchContributors() {
  const contributors = await octokit.rest.repos.getContributorsStats({
    owner: 'hashicorp',
    repo: 'nomad'
  });
  return contributors.data;
}
