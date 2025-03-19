<script lang="ts">
  import { page } from '$app/state';
  let { data } = $props();

  console.log('data', data);
  console.log('page', page);

  function hoverDataSource(release) {
    console.log('hovering', release);
  }

  function unhoverDataSource() {
    console.log('unhovering');
  }
</script>
<h2>Releases</h2>
<p>
  Nomad has seen {data.releases.length} releases since its inception in 2015.
</p>


<div>
  <h3>Hypothetical data viz</h3>
  <div class="viz">
    {#each data.releases as release}
      <div class="data-point"
      onmouseover={hoverDataSource}
      onmouseout={unhoverDataSource}
      >
        <h4>{release.name}</h4>
        <p>{release.body.length} chars</p>
      </div>
    {/each}
  </div>
</div>
