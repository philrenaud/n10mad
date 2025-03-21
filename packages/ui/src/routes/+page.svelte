<script lang="ts">
	import { page } from '$app/state';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
  console.log('incoming data', data);
  console.log('page', page);
</script>

<p class="intro">
  Nomad has been around for ten years. Explore the data:
</p>

<div style="height: 1600px; background: rgba(0,0,0,0.1);">
  Testing a pretty long one
</div>

<!-- <h1>Releases</h1>
{#each data.releases as release}
  <h2>{release.name}</h2>
  <textarea>{release.body}</textarea>
{/each} -->

<!-- <h1>Files</h1>
{#each data.files as file}
  <h2>{file.file}</h2>
  <h3>Top Authors:</h3>
  <ul>
    {#each file.authors as author}
      <li>
        <strong>{author.author}</strong> - {author.count} commits
      </li>
    {/each}
  </ul>
  <h3>Commits:</h3>
  <ul>
    {#each file.commits as commit}
      <li>
        <strong>{commit.author}</strong> - <em>{commit.date}</em> - <a href={commit.url}>{commit.message}</a>
      </li>
    {/each}
  </ul>
{/each} -->
