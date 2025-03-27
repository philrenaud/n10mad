<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import type { PageProps } from './$types';
  // Contributor type is a child of data.contributors; get it
  // type Contributor = PageProps['data']['contributors'][0];

  // get PageData type
  type Contributor = PageProps['data']['contributors'][0]; // TODO: this feel unnecessary and Svelte should be handling it for me.

  import ChartContainer from '$lib/components/chart/ChartContainer.svelte';
  import { scaleLinear, scaleTime, type ScaleTime } from 'd3';

  // TODO: Temporary D3 in the browser so I can fuck around a bit
  import * as d3 from 'd3';
  window.d3 = d3;

	let { data }: PageProps = $props();

  // #region Query Params
  const defaultMode = 'stream';
  let mode: 'stream' | 'ridgeline' = $state(page.url.searchParams.get('mode') as 'stream' | 'ridgeline' || defaultMode);

  $effect(() => {
    if (mode !== page.url.searchParams.get('mode')) {
      mode = page.url.searchParams.get('mode') as 'stream' | 'ridgeline' || defaultMode;
    }
    if (mode === defaultMode && page.url.searchParams.get('mode')) {
      page.url.searchParams.delete('mode');
      goto(`?${page.url.searchParams.toString()}`, { replaceState: true, keepFocus: true });
    }
  });

  // #endregion Query Params

  let { contributors } = data;
  contributors = contributors.slice(0, 100);
  $effect(() => {
    // console.log('contributors', contributors);
    let contributors: Contributor[] = data.contributors;
  });

  let chartWidth: number = $state(600);
  let chartHeight: number = $state(400);

  const padding = 80;

  // Contributors' weeks are all the same, so we can just use the first one
  let weeks = $derived(contributors[0].weeks.map(week => new Date(week.w * 1000)));
  
  // TODO: reducer
  let weeklySums = $derived.by(() => {
    const sums = Array(weeks.length).fill(0);

    contributors.forEach(contributor => {
      contributor.weeks.forEach((week, i) => {
        sums[i] += week.c;
      });
    });
  
    return sums;
  });

  let maxWeeklySum = $derived.by(() => {
    console.log('weeklySums', weeklySums);
    return Math.max(...weeklySums, 1); // Ensure at least 1 to avoid division by zero
  });

  let maxContributorSum = $derived.by(() => {
    return Math.max(...contributors.map(c => c.total), 1);
  });

  let maxContributorWeeklySum = $derived.by(() => {
    // return Math.max(...contributors.map(c => c.weeks.map(w => w.c).reduce((a, b) => a + b, 0)), 1);
    return 1000; // TODO: lol, lmao
  });

  $effect(() => {
    console.log('maxWeeklySum', maxWeeklySum);
    console.log('maxContributorSum', maxContributorSum);
    console.log('maxContributorWeeklySum', maxContributorWeeklySum);
  });

  let timePivot = $derived.by(() => {
    if (!contributors) return [];
    const allWeeks = weeks;
    contributors.forEach(c => {
      const username = c.author.login;
      c.weeks.forEach((week, i) => {
        if (i < allWeeks.length) {
          allWeeks[i][username] = week.c;
        }
      })
    })
    return allWeeks;
    // return contributors.map((c) => {
    //   return c.weeks.map((week) => {
    //     return {[c.author.login]: week.c}
    //   })
    // })
  });

  $effect(() => {
    console.log('contributors', contributors);
  });
  $effect(() => {
    console.log('timePivot', timePivot);
  });

  // const RIDGELINE_SPACING = 4.5; // TODO: maybe derived based on chartHeight / number of contributors?
  let RIDGELINE_SPACING = $derived.by(() => {
    return chartHeight / contributors.length * .58; // we love a magic number
  });
  
  let series = $derived.by(() => {
    const stackGenerator = d3.stack()
      .keys(contributors.map(c => c.author.login))
      .order(d3.stackOrderInsideOut)
      // .order(d3.stackOrderDescending)
      // .order(d3.stackOrderAppearance)
      // .offset(d3.stackOffsetWiggle)
      // .offset(d3.stackOffsetSilhouette)

    if (mode === 'stream') {
      stackGenerator.offset(d3.stackOffsetWiggle);
    } else if (mode === 'ridgeline') {
      stackGenerator.offset(d3.stackOffsetNone);
    }

    // return d3.stack()
    //   .keys(contributors.map(c => c.author.login))
    //   .order(d3.stackOrderAppearance)
    //   .offset(d3.stackOffsetSilhouette)
    return stackGenerator(timePivot);
  });

  // const scheme = d3.schemeObservable10;
  const scheme = d3.schemeTableau10;
  let colorScale = $derived.by(() => {
    return d3.scaleOrdinal(scheme);
  });

  // I'm hungry, let's get weird
  let fillColorScale = $derived.by(() => {
    const funkyColors = scheme.map(color => 
      d3.color(color)?.brighter(1).toString()
    );
    return d3.scaleOrdinal(funkyColors);
  });

  $effect(() => {
    console.log('series', series);
  });

  // let stacked = $derived.by(() => {
  //   return d3.stack()
  //     .keys(timePivot.map(week => week.author))
  //     .order(d3.stackOrderNone)
  //     .offset(d3.stackOffsetNone)(timePivot);
  // });

  // let series = $derived.by(() => {
  //   return d3.stack()
  //     .keys(timePivot.map(week => week.author))
  //     .value(d => d.contributions)
  //     .order(d3.stackOrderNone)
  //     .offset(d3.stackOffsetNone)(timePivot);
  // });
  // let timeStacks = $derived.by(() => {
  //   return weeks.map((week, i) => {
  //     let weekObject = {
  //       date: week,
  //       contributors: contributors.map(c => {
  //         return {
  //           [c.author.login]: c.weeks[i].c
  //         }
  //         // return {
  //         //   name: c.author.login,
  //         //   value: c.weeks[i].c
  //         // }
  //       })
  //     }
  //     // contributors.forEach(c => {
  //     //   weekObject.contributors.push({
  //     //     name: c.name,
  //     //     value: c.weeks[i].c
  //     //   })
  //     // })
  //     return weekObject;
  //   })
  // });

  let xDomain = $derived.by(() => {
    return [weeks[0], weeks[weeks.length - 1]];
  });

  let yDomain = $derived.by(() => {
    return [0, mode === 'stream' ? maxWeeklySum : maxContributorWeeklySum];
  });

  let xScale = $derived.by(() => {
    return scaleTime()
      .domain(xDomain)
      .range([padding, chartWidth - padding]);
  });
  
  let yScale = $derived.by(() => {
    return scaleLinear()
      .domain(yDomain)
      // .domain([0,1]) // use for offsetExpand
      .range([chartHeight - padding, padding])
  });

  $effect(() => {
    console.log('===yScale', yDomain, yScale);
  });

  let areaGenerator = $derived.by(() => {
    // For ridgeline mode, return a function that takes an index
    if (mode === 'ridgeline') {
      return (data, index) => {
        const baseY = chartHeight - padding - (index * RIDGELINE_SPACING);
        return d3.area()
          .x(d => xScale(d.data))
          .y0(() => baseY)
          .y1(d => {
            const value = d[1] - d[0];
            // Instead of subtracting from baseY, we'll add a scaled height
            // We'll use a separate scale for the ridge heights to keep them reasonable
            const ridgeHeight = value * (RIDGELINE_SPACING * 0.1); // 80% of spacing
            if (index === 0) {
              console.log('data point:', {
                value,
                ridgeHeight,
                baseY,
                finalY: baseY - ridgeHeight
              });
            }
            return baseY - ridgeHeight;
          })          .curve(d3.curveBasis)
          (data);
      };
    }

    // For stream mode, return the regular area generator
    return d3.area()
      .x(d => xScale(d.data))
      .y0(d => yScale(d[0]) - chartHeight / 2.8)
      .y1(d => yScale(d[1]) - chartHeight / 2.8)
      .curve(d3.curveBasis);
  });

  let handleContributorFocus = (event, contributor) => {
    console.log('mouseenter', contributor.key, contributors.find(c => c.author.login === contributor.key));
    event.target.style.fill = 'black';
    event.target.style.strokeWidth = '2px';
    event.target.style.fillOpacity = '1';
  };

  let handleContributorBlur = (event, contributor) => {
    event.target.style.fill = fillColorScale(contributor.key);
    event.target.style.strokeWidth = '1px';
    event.target.style.fillOpacity = '0.2';
  };

  </script>

<style>
  #container {
    width: 100%;
    height: 100%;
    position: absolute;
    display: grid;
    grid-template-rows: auto 1fr;
  }

  path {
    transition: fill-opacity 0.3s ease,
    d 0.5s ease-in-out var(--delay),
    transform 0.5s ease-in-out var(--delay);
  }

  path:focus {
    outline: none;
    stroke-width: 20px;
    stroke: black;
    fill: black;
  }
</style>

<div id="container">
  {#await data}
    Loading...
  {:then}
    <header>
      <h2>Contributors</h2>
      <p>
        Here are the stats for the top 100 contributors to Nomad over the past decade. Between them, they represent about 25,000 of the 26,000 commits Nomad has seen over her lifetime.
      </p>
      <button class:active={mode === 'stream'} onclick={() => {
        page.url.searchParams.set('mode', 'stream');
        goto(`?${page.url.searchParams.toString()}`, { replaceState: false, keepFocus: true });
      }}>Stream Mode</button>
      <button class:active={mode === 'ridgeline'} onclick={() => {
        page.url.searchParams.set('mode', 'ridgeline');
        goto(`?${page.url.searchParams.toString()}`, { replaceState: false, keepFocus: true });
      }}>Ridgeline Mode</button>

    </header>
    <section class="main" bind:clientWidth={chartWidth} bind:clientHeight={chartHeight}>
      <ChartContainer width={chartWidth} height={chartHeight} {yDomain} xDomain={xDomain}
        xScale={xScale} yScale={yScale} maxTicks={10}
        hideYAxis={true}
      >
      <!-- {console.log('timePivot', timePivot)}
      {console.log('series', series)} -->
      {#each series as s, i}
    <!-- {console.log('s', i, areaGenerator(s))} -->
          <path
            style:--delay="{(contributors.length - i) * 0.00}s"
            d={areaGenerator(s,contributors.length - i)}
            fill={fillColorScale(s.key)}
            fill-opacity={0.2}
            stroke={colorScale(s.key)}
            tabindex="0"
            role="button"
            aria-label={`Contributor ${s.key}'s contributions over time`}
            onmouseenter={(event) => handleContributorFocus(event, s)}
            onfocus={(event) => handleContributorFocus(event, s)}
            onmouseleave={(event) => handleContributorBlur(event, s)}
            onblur={(event) => handleContributorBlur(event, s)}
            onkeydown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                // Trigger the same behavior as mouseenter
                handleContributorFocus(event, s);
              }
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
