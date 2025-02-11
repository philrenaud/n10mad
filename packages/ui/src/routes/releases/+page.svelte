<script lang="ts">
  import { page } from '$app/state';
  let { data } = $props();
  console.log('data', data);
</script>
<h2>Releases</h2>
<p>
  Nomad has seen {data.releases.length} releases since its inception in 2015.
</p>

