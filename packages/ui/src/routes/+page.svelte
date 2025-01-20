<script>
  export let data;
  console.log(data);
</script>

<h1>Releases</h1>
{#each data.releases as release}
  <h2>{release.name}</h2>
  <textarea>{release.body}</textarea>
{/each}

<hr />

<h1>Files</h1>
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
{/each}
