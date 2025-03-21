<script lang="ts">
  import { page } from '$app/state';
  import type { PageProps } from './$types';
  import ChartContainer from '$lib/components/chart/ChartContainer.svelte';
	let { data }: PageProps = $props();

  let chartWidth: number = $state(600);
  let chartHeight: number = $state(400);
</script>

<style>
  #container {
    width: 100%;
    height: 100%;
    position: absolute;
    display: grid;
    grid-template-rows: auto 1fr;
  }
</style>

<div id="container">
  {#await data}
    Loading...
  {:then}
    <header>
      <h2>Releases</h2>
      <p>
        Nomad has seen {data.releases.length} releases since its inception in 2015.
      </p>
    </header>
    <section class="main" bind:clientWidth={chartWidth} bind:clientHeight={chartHeight}>
      <ChartContainer width={chartWidth} height={chartHeight} />
    </section>
  {:catch error}
    <p>
      Error loading data: {error}
    </p>
  {/await}
</div>
