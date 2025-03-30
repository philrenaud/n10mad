<script lang="ts">
	import { page } from '$app/state';
  import { scaleLinear, scaleTime } from 'd3';
  import ChartContainer from '$lib/components/chart/ChartContainer.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
  let weeks = data.weeklyCommits;
  let weeksByYear = $derived.by(() => {
    return weeks.reduce((acc, week) => {
      let year = week.weekStart.slice(0, 4);
      const existingIndex = acc.findIndex(item => item.year === year);
      
      if (existingIndex === -1) {
        acc.push({ year, data: [week] });
      } else {
        acc[existingIndex].data.push(week);
      }
      
      return acc;
    }, []);
  });
  $inspect(weeks);
  $inspect(weeksByYear);

  let chartWidth: number = $state(600);
  let chartHeight: number = $state(400);

  let xDomain: [number, number] = $derived.by(() => {
    let min = 1;
    let max = 52; // TODO: because we're counting weeks by Sun-Sat, there are sometimes 51 and sometimes 53 weeks.
    return [min, max];
  });
  // let maxWeek = $derived.by(() => {
  //   return Math.max(...weeks.map(week => week.count));
  // });
  // let yDomain: [number, number] = $derived.by(() => {
  //   let min = 0;
  //   let max = maxWeek;
  //   return [min, max];
  // });

  let yDomains: [number, number][] = $derived.by(() => {
    return weeksByYear.map(year => {
      let min = 0;
      let max = Math.max(...year.data.map(week => week.count));
      return [min, max];
    });
  });
  $inspect(yDomains);



  const padding = 80;

  // let xScale = $derived(scaleLinear().domain(xDomain).range([padding, chartWidth - padding]));
  // ^--- use a time scale scale for week/months of the year
  // let xScale = $derived(scaleLinear().domain(xDomain).range([padding, chartWidth - padding]));
  let xScale = $derived(scaleTime().domain(xDomain).range([padding, chartWidth - padding]));
  

  let yScales = $derived.by(() => {
    return yDomains.map(domain => scaleLinear().domain(domain).range([0, chartHeight / weeksByYear.length]));
  });
  $effect(() => {
    console.log('yScales', yScales, yDomains)
  })

  $effect(() => {
    console.log({chartHeight})
  })


</script>

<style>
  #container {
    width: 100%;
    height: 100%;
    position: absolute;
    display: grid;
    grid-template-rows: auto 1fr;
  }

  .commit {
    fill: #000;
    transform: scaleY(-1); 
    /* make them start from the bottom, because I don't know how to math otherwise. */
  }
</style>

<div id="container">
  {#await data}
    Loading...
  {:then}
    <header>
      <h2>Commits x Week x Year</h2>
    </header>
    <section class="main" bind:clientWidth={chartWidth} bind:clientHeight={chartHeight}>
      {#each weeksByYear as year, yearIter}
        <ChartContainer width={chartWidth} height={chartHeight / weeksByYear.length} yDomain={yDomains[yearIter]} {xDomain}
          xScale={xScale} yScale={yScales[yearIter]}>
          {#each year.data as week, weekIter}
            <!-- {console.log('weekIter in scale', weekIter, xScale(weekIter))} -->
             <!-- Eventually: make squares per commit, but then that's a whole lot of commits. Might have to switch to canvas for this, or else just do weeks instead of commits. -->
              <rect
                class="commit"
                x={xScale(weekIter)}
                y=0
                width=10
                height={yScales[yearIter](week.count)}
              />a
            <!-- {#each week.commits as commit, commitIter}
              <rect
                x={xScale(weekIter)}
                y={yScales[yearIter](commitIter)}
                width={1}
                height={1 }
              />
            {/each} -->
          {/each}
      </ChartContainer>
      {/each}
    </section>
  {:catch error}
    <p>
      Error loading data: {error}
    </p>
  {/await}
</div>
