import { Octokit } from 'octokit';

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

export async function fetchStars() {
  const stars = [];
  let page = 1;
  
  while (true) {
    try {
      const response = await octokit.rest.activity.listStargazersForRepo({
        owner: 'hashicorp',
        repo: 'nomad',
        per_page: 100,
        page: page,
        headers: {
          accept: 'application/vnd.github.star+json'  // This gives us timestamps
        }
      });
      
      if (response.data.length === 0) break;
      
      stars.push(...response.data.map(star => ({
        starred_at: star.starred_at,
        user: star.user.login
      })));
      
      console.log(`Fetched page ${page} - Total stars so far: ${stars.length}`);
      page++;
      
      // GitHub API has rate limits, so let's be nice
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      if (error.status === 403) {
        console.log('Hit rate limit, waiting a minute...');
        await new Promise(resolve => setTimeout(resolve, 60000));
        continue;
      }
      throw error;
    }
  }
  
  return stars.sort((a, b) => new Date(a.starred_at).getTime() - new Date(b.starred_at).getTime());
}
