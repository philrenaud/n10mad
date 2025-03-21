<script lang="ts">
  import { page } from '$app/state';
  import type { PageProps } from './$types';
  import ChartContainer from '$lib/components/chart/ChartContainer.svelte';
  import { scaleLinear } from 'd3';
	let { data }: PageProps = $props();
  console.log('data', data);

  let chartWidth: number = $state(600);
  let chartHeight: number = $state(400);

  let yDomain: [number, number] = $derived.by(() => {
    let min = Math.min(...data.releases.map(r => r.reactions?.total_count || 0));
    let max = Math.max(...data.releases.map(r => r.reactions?.total_count || 0));
    return [min, max];
  });

  let radDomain: [number, number] = $derived.by(() => {
    let min = Math.min(...data.releases.map(r => r.body.length));
    let max = Math.max(...data.releases.map(r => r.body.length));
    return [min, max];
  });

  const padding = 80;

  let yScale = $derived(scaleLinear().domain(yDomain).range([chartHeight - padding, padding]));
  let xScale = $derived(scaleLinear().domain([0, data.releases.length]).range([padding, chartWidth - padding]));
  let radScale = $derived(scaleLinear().domain(radDomain).range([1, 20]));
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
      <ChartContainer width={chartWidth} height={chartHeight} {yDomain} xDomain={[0,100]}>
        {#each data.releases as release, i}
          <circle
            r={radScale(release.body.length)}
            cx={xScale(i)}
            cy={yScale(release.reactions?.total_count || 0)}
            fill="orange"
            on:click={() => {
              console.log('release', release);
              window.open(release.html_url, '_blank');
            }}
          />
        {/each}
      </ChartContainer>
    </section>
  {:catch error}
    <p>
      Error loading data: {error}
    </p>
  {/await}
</div>
