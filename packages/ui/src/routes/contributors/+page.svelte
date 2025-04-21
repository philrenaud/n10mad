<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import type { PageProps } from './$types';
  // Contributor type is a child of data.contributors; get it
  // type Contributor = PageProps['data']['contributors'][0];
  import { getContext, setContext } from 'svelte';
  import type { Metadata, createMetadataStore } from '$lib/components/metadata.svelte';
  import ChartContainer from '$lib/components/chart/ChartContainer.svelte';
  import { scaleLinear, scaleTime } from 'd3';
  import * as d3 from 'd3';
  import type { Focus, Topic } from '$lib/types';

  // Get focus information from layout
  let focusContext: () => Focus = getContext('focus');
  let streamModeContext: () => string = getContext('streamMode');

  let focus = $derived.by(() => {
    return focusContext();
  });

  let streamMode = $derived.by(() => {
    return streamModeContext();
  });

  // Extract topic and author from focus
  let topic = $derived.by(() => {
    return focus.type === 'topic' ? focus.query : '';
  });

  let author = $derived.by(() => {
    return focus.type === 'author' ? focus.query : '';
  });

  let mode = $derived.by(() => {
    return streamMode;
  });

  // Get metadata store
  let metadataStore: ReturnType<typeof createMetadataStore> = getContext('metadataStore');
  let metadata = $derived.by(() => {
    return metadataStore.metadata;
  });

  // Define contributor type
  interface Author {
    login: string;
    terms: Topic[];
    [key: string]: any;
  }

  interface Contributor {
    author: Author;
    total: number;
    weeks: any[];
    [key: string]: any;
  }

  let { data }: PageProps = $props();
  let { contributors }: { contributors: Contributor[] } = data;

  // Focus contributors based on topic or author
  let focusedContributors = $state<string[]>([]);

  let queriedContributors = $derived.by(() => {
    let ret: string[] = [];
    
    if (author) {
      ret = [author];
    }
    
    if (topic) {
      contributors.forEach((c) => {
        if (c.author.terms.map(t => t.term).includes(topic)) {
          ret.push(c.author.login);
        }
      });
    }
    
    return ret;
  });

  $effect(() => {
    focusedContributors = queriedContributors;
  });

  // Sort contributors by total contributions
  contributors = contributors.sort((a, b) => b.total - a.total);

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
  };

  let randomColor = () => {
    return d3.hsl(nomadGreen).darker((Math.random() * 1.5) - 0.5);
  };

  // Apply color to contributors
  contributors = contributors.slice(0, 100).map(c => ({
    ...c,
    style: {
      color: randomColor(),
    }
  }));

  let chartWidth: number = $state(0);
  let chartHeight: number = $state(0);

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
    // TODO: still not quite right! Slice contributors to 20 to see it break.
    return Math.max(...allWeeksFlattened.map(week => week.c), 1);
  });


  let xDomain = $derived.by(() => {
    return [weeks[0], weeks[weeks.length - 1]];
  });

  let yDomain = $derived.by(() => {
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
    console.log('area', area);
    metadataStore.set([
      {key: 'contributor', value: area.author.login},
      // ...area.author.terms.map(t => ({key: t.term, value: t.tfidf}))
      {key: 'terms', value: area.author.terms.map(t => t.term).join(', ')}
    ]);
    if (!focusedContributors.includes(area.author.login)) {
      focusedContributors = [...focusedContributors, area.author.login];
    }
  };

  // Handle contributor blur
  let handleContributorBlur = (event: Event, area: any) => {
    // Only filter if there's something to remove
    if (area && focusedContributors.includes(area.author.login)) {
      focusedContributors = focusedContributors.filter(c => c !== area.author.login);
    } else if (!area) {
      focusedContributors = [];
    }
  };
  
  // #region Hovered Contributor

  let hoveredContributor = $state<Contributor['author'] | null>(null);

  let handleContributorHover = (event, area: Contributor) => {
    console.log('hovering', event, area);
    hoveredContributor = area.author;
    hoveredContributor.x = `${event.layerX - 32}px`;
    hoveredContributor.y = `${event.layerY - 32 }px`;
  }
  
  // #endregion Hovered Contributor

</script>

<style>
  #container {
    width: 100%;
    height: 100%;
    max-width: 1000px;
    margin: 0 auto;
    /* position: absolute; */
    display: grid;
    grid-template-rows: auto 1fr;

    .main {
      width: 100%;
    }
  }

  path {
    transition: fill-opacity 0.3s ease,
    d 0.75s ease-in-out var(--delay);
  }

  path:focus {
    outline: none;
  }

  /* button {
    margin-right: 1rem;
    &.active {
      background-color: #000;
      color: #fff;
    }
  } */

  #contributor-avatar {
    position: absolute;
    top: 0;
    left: 0;
    width: 64px;
    height: 64px;
    border-radius: 50%;
    border: 8px solid #000;
    background-color: #fff;
    overflow: hidden;
    pointer-events: none; /* This makes mouse events pass through */
    /* transition: transform 0.1s ease-out; */
    filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3));
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }
</style>

<div id="container">
  {#await data}
    Loading...
  {:then}
    <header>
      <!-- <h2>Contributors</h2>
      <p>
        Here are the stats for the top 100 contributors to Nomad over the past decade. Between them, they represent about 25,000 of the 26,000 commits Nomad has seen over her lifetime.
      </p> -->
      <button class:active={mode === 'stream'} onclick={() => {
        page.url.searchParams.set('mode', 'stream');
        goto(`?${page.url.searchParams.toString()}`, { replaceState: false, keepFocus: true });
      }}>Stream Mode</button>
      <button class:active={mode === 'ridgeline'} onclick={() => {
        page.url.searchParams.set('mode', 'ridgeline');
        goto(`?${page.url.searchParams.toString()}`, { replaceState: false, keepFocus: true });
      }}>Ridgeline Mode</button>
      <div class="search-box">
        <span>Focused Contributors: {focusedContributors.length}</span>
      </div>
    </header>
    <section class="main" bind:clientWidth={chartWidth} bind:clientHeight={chartHeight}
      onmouseleave={() => hoveredContributor = null}
    >
      <ChartContainer height={chartHeight} {yDomain} {xDomain}
        xScale={xScale} yScale={yScale} maxTicks={10}
        hideYAxis={true}
      >
      {#each areas as area, i}
        <path
          style:--delay="{(contributors.length - i) * 0.003}s"
          d={area.path}
          fill={area.style.color}
          fill-opacity={
            focusedContributors.includes(area.author.login)
              ? 1
              : focusedContributors.length > 0
                ? 0.1
                : 1
          }
          stroke={baseAreaStyle[mode].strokeColor}
          stroke-width={baseAreaStyle[mode].strokeWidth}
          stroke-opacity={focusedContributors.length > 0 ? 0 : baseAreaStyle[mode].strokeOpacity}
          tabindex="0"
          role="button"
          aria-label={`Contributor ${area.key}'s contributions over time`}
          onmouseenter={(event) => handleContributorFocus(event, area)}
          onfocus={(event) => handleContributorFocus(event, area)}
          onmouseleave={(event) => handleContributorBlur(event, area)}
          onblur={(event) => handleContributorBlur(event, area)}
          onmousemove={(event) => handleContributorHover(event, area)}
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
      {#if hoveredContributor}
        <div id="contributor-avatar" style="transform: translate({hoveredContributor.x}, {hoveredContributor.y});">
        <!-- <div id="contributor-avatar" style="transform: translate(50px, 50px);"> -->
          <img 
            class="avatar-image" 
            src={hoveredContributor.avatar_url || 'https://github.com/identicons/github.png'} 
            alt={`${hoveredContributor.login}'s avatar`}
          />
        </div>
      {/if}
    </section>
  {:catch error}
    <p>
      Error loading data: {error}
    </p>
  {/await}
</div>
