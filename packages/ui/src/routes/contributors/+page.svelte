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

  const defaultSearch = "";
  let searchQuery: string = $state(page.url.searchParams.get('query') || defaultSearch);

  $effect(() => {
    if (mode !== page.url.searchParams.get('mode')) {
      mode = page.url.searchParams.get('mode') as 'stream' | 'ridgeline' || defaultMode;
    }
    if (mode === defaultMode && page.url.searchParams.get('mode')) {
      page.url.searchParams.delete('mode');
      goto(`?${page.url.searchParams.toString()}`, { replaceState: true, keepFocus: true });
    }
  });

  $effect(() => {
    console.log('query fx recompute');
    if (searchQuery !== page.url.searchParams.get('query')) {
      handleContributorBlur(null, null);
      searchQuery = page.url.searchParams.get('query') || defaultSearch;
    }
    if (searchQuery === defaultSearch && page.url.searchParams.get('query')) {
      page.url.searchParams.delete('query');
      goto(`?${page.url.searchParams.toString()}`, { replaceState: true, keepFocus: true });
    }
    if (searchQuery !== defaultSearch) {
      console.log('+++++ searchQuery', searchQuery);
      // handleFocus on it
      const contributor = contributors.find(c => c.author.login === searchQuery);
      if (contributor) {
        handleContributorFocus(null, contributor);
      } else {
        handleContributorBlur(null, null);
      }
    }
  });

  // #endregion Query Params

  let { contributors } = data;

  const nomadGreen = '#00ca8e';

  const baseAreaStyle = {
    stream: {
      strokeColor: 'black',
      strokeOpacity: 0,
      strokeWidth: 0,
    },
    ridgeline: {
      strokeColor: 'black',
      strokeOpacity: 0.5,
      strokeWidth: 0.5,
    }
  }

  let randomColor = () => {
    return d3.hsl(nomadGreen).darker((Math.random() * 1.5) - 0.5);
  }

  // I'm hungry, let's get weird
  let funkyColor = () => {
    const funkyColors = d3.schemeTableau10.map(color => 
      d3.color(color)?.brighter(0.5).toString()
    );
    return funkyColors[Math.floor(Math.random() * funkyColors.length)];
  };

  // Apply a colour to persist through later transforms
  contributors = contributors.slice(0, 100).map(c => ({
    ...c,
    style: {
      color: randomColor(),
      // color: funkyColor(),
    }
  }));

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
    return Math.max(...weeklySums, 1); // Ensure at least 1 to avoid division by zero
  });

  let maxContributorWeeklySum = $derived.by(() => {
    // return 1000; // TODO: lol, lmao
    // return Math.max(...contributors.map(c => Math.max(...c.weeks.map(week => week.c))), 1);
    // ^--- not quite d3.axisRight, that gives us the biggest total
    let allWeeksFlattened = contributors.flatMap(c => c.weeks);
    return Math.max(...allWeeksFlattened.map(week => week.c), 1);
  });


  let xDomain = $derived.by(() => {
    return [weeks[0], weeks[weeks.length - 1]];
  });

  let yDomain = $derived.by(() => {
    console.log('maxContributorWeeklySum', maxContributorWeeklySum);
    return [0, mode === 'stream' ? maxWeeklySum : maxContributorWeeklySum];
  });

  let xScale = $derived.by(() => {
    return scaleTime()
      .domain(xDomain)
      // .range([padding, chartWidth - padding]);
      .range([0,chartWidth]);
  });
  
  let yScale = $derived.by(() => {
    return scaleLinear()
      .domain(yDomain)
      // .domain([0,1]) // use for offsetExpand
      .range([chartHeight - padding, padding])
  });

  let streamAreaGenerator = $derived.by(() => {
    return d3.area()
      .x(d => xScale(d.data))
      .y0(d => yScale(d[0]) - chartHeight / 2.8)
      .y1(d => yScale(d[1]) - chartHeight / 2.8)
      .curve(d3.curveBasis);
  });

  let ridgelineAreaGenerator = $derived.by(() => {
    return (data, index) => {
        const baseY = chartHeight - padding - (index * RIDGELINE_SPACING);
        return d3.area()
          .x(d => xScale(d.data))
          .y0(() => baseY)
          .y1(d => {
            const value = d[1] - d[0];
            const ridgeHeight = value * (RIDGELINE_SPACING * 0.1); // 80% of spacing
            return baseY - ridgeHeight;
          }).curve(d3.curveBasis)
          (data);
      };
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

  let areas = $derived.by(() => {
    return contributors.map((c, i) => {
      const stack = series.find(s => s.key === c.author.login);
      return {
        ...c,
        stack,
        path: mode === 'stream'
          ? streamAreaGenerator(stack)
          : ridgelineAreaGenerator(stack, contributors.length - i),
      };
    });
  });

  let handleContributorFocus = (event, area) => {
    console.log(`${area.author.login} has made ${area.total} commits`);
    focusedContributor = area.author.login;
  };

  let handleContributorBlur = (event, area) => {
    focusedContributor = null;
  };

  let focusedContributor = $state<string | null>(null);

  function handleSearch(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    if (value) {
      page.url.searchParams.set('query', value);
      const found = areas.find(a => a.author.login === value);
      console.log('found', found);
      if (found) {
        handleContributorFocus(null, found);
      }
    } else {
      page.url.searchParams.delete('query');
    }
    goto(`?${page.url.searchParams.toString()}`, { replaceState: true, keepFocus: true });
  }

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
    /* stroke-width 0.5s ease 0.5s,
    stroke-opacity 0.5s ease 0.5s, */
    d 0.75s ease-in-out var(--delay);
  }

  path:focus {
    outline: none;
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
      <div class="search-box">
        <input
          type="text"
          placeholder="Search contributors..."
          value={searchQuery}
          oninput={handleSearch}
        />
      </div>
    </header>
    <section class="main" bind:clientWidth={chartWidth} bind:clientHeight={chartHeight}>
      <ChartContainer width={chartWidth} height={chartHeight} {yDomain} {xDomain}
        xScale={xScale} yScale={yScale} maxTicks={10}
        hideYAxis={true}
      >
      {#each areas as area, i}
        <path
          style:--delay="{(contributors.length - i) * 0.005}s"
          d={area.path}
          fill={area.style.color}
          fill-opacity={
            focusedContributor === area.author.login
              ? 1
              : focusedContributor
                ? 0.2
                : 1
          }
          stroke={baseAreaStyle[mode].strokeColor}
          stroke-width={baseAreaStyle[mode].strokeWidth}
          stroke-opacity={focusedContributor ? 0 : baseAreaStyle[mode].strokeOpacity}
          tabindex="0"
          role="button"
          aria-label={`Contributor ${area.key}'s contributions over time`}
          onmouseenter={(event) => handleContributorFocus(event, area)}
          onfocus={(event) => handleContributorFocus(event, area)}
          onmouseleave={(event) => handleContributorBlur(event, area)}
          onblur={(event) => handleContributorBlur(event, area)}
          onkeydown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              console.log('double plus focus')
              event.preventDefault();
              handleContributorFocus(event, area);
            }
            if (event.key === 'Escape') {
              handleContributorBlur(event, area);
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
