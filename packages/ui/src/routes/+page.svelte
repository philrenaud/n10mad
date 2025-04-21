<script lang="ts">
	import { page } from '$app/state';
  import { scaleLinear, scaleTime } from 'd3';
  import ChartContainer from '$lib/components/chart/ChartContainer.svelte';
  import Canvas from '$lib/Canvas.svelte';
	import Circle from '$lib/Circle.svelte';
	import type { PageProps } from './$types';
  import { getContext } from 'svelte';
  import type { Metadata, createMetadataStore } from '$lib/components/metadata.svelte';
  import type { Focus, Week, Topic, TopicWeek } from '$lib/types';
	let { data }: PageProps = $props();

  // Get focus context from layout with proper typing
  let focusContext: () => Focus = getContext('focus');
  let focus = $derived.by(() => {
    return focusContext();
  });

  // Extract topic and author from the focus context
  let topic = $derived.by(() => {
    return focus.type === 'topic' ? focus.query : '';
  });

  let author = $derived.by(() => {
    return focus.type === 'author' ? focus.query : '';
  });

  // Get metadata store context with proper typing
  let metadataStore: ReturnType<typeof createMetadataStore> = getContext('metadataStore');
  let metadata = $derived.by(() => {
    return metadataStore.metadata;
  });

  let timeline = $state(data.timeline);
  let contributors = $state(data.contributors);

  let topics: TopicWeek[] = data.topics;

  let topTopics = $derived.by(() => {
    return topics.map((topic: TopicWeek) => {
      return {
        year: topic.year,
        weekNumber: topic.weekNumber,
        weekStart: topic.weekStart,
        weekEnd: topic.weekEnd,
        terms: topic.terms
      };
    });
  });

  // TODO: do this on the server or something
  $effect(() => {
    topics.forEach((topicWeek: TopicWeek) => {
      timeline.flat().forEach((week: Week) => {
        if (week.weekStart === topicWeek.weekStart) {
          // console.log('week', week);
          week.terms = topicWeek.terms;
        }
      });
    });
  });

  let chartWidth: number = $state(0);
  let chartHeight: number = $state(0);

  $effect(() => {
    console.log('++==chartWidth', chartWidth);
  });

  let xDomain: [number, number] = $derived.by(() => {
    let min = 0;
    let max = 52;
    return [min, max];
  });

  let yDomains: [number, number][] = $derived.by(() => {
    return timeline.map((year: Week[]) => {
      let min = 0;
      let max = Math.max(...year.map((week: Week) => week.count));
      return [min, max];
    });
  });

  const xPadding = 90; // space along the side margins; maybe replace with css margins instead of accounting in d3?
  const yPadding = 30; // vertical space between years

  let xScale = $derived.by(() => {
    return scaleTime().domain(xDomain).range([xPadding, chartWidth - xPadding]);
  });

  // eh, just use num divided by 52
  let barContainerWidth = $derived.by(() => {
    return chartWidth / 52;
  });
  const barWidth = 3;

  const minBarHeight = 1;

  let yScales = $derived.by(() => {
    return yDomains.map(domain => {
      const maxHeight = Math.max(minBarHeight, chartHeight / timeline.length - yPadding);
      return scaleLinear()
        .domain(domain)
        .range([minBarHeight, maxHeight])
        .clamp(true); // prevent a bug with negative <rect> from clientHeight race condition (maybe!)
    });
  });

  // #region fun canvas detour
  let canvasContexts: CanvasRenderingContext2D[] = $state([]);  
  // #endregion fun canvas detour

  let individualChartHeight = $derived(chartHeight / timeline.length - 1);

  const nomadGreen = '#00ca8e';

  // let colorDomainMetric = 'uniqueAuthorCount';
  let colorDomainMetric = 'count' as keyof Week;

  let colorScales = $derived.by(() => {
    return timeline.map((year: Week[], yearIter: number) => {
      let maxMetric = Math.max(...year.map((week: Week) => week[colorDomainMetric] as number));
      return scaleLinear().domain([0, maxMetric]).range(['black', nomadGreen]);
    });
  });

  let calculateBarWidth = $derived.by(() => {
    console.log('CBW', topic, author);
    return (week: Week) => {
      if (!topic && !author) return barWidth;
      if (author) {
        // console.log('author found', author);
        return week.authors.includes(author) ? barWidth * 2 : 0.5;
      }
      if (topic) {
        // console.log('topic found', topic);
        return week.terms?.find((term: Topic) => term.term === topic)?.tfidf > 0 ? barWidth * 2 : 1;
      }      
    };
  });
  
  let topicScale = $derived.by(() => {
    let flatWeeks = timeline.flat();
    let maxWeekTFIDF = Math.max(...flatWeeks.map((week: Week) => 
      week.terms?.find((term: Topic) => term.term === topic)?.tfidf || 0
    ));
    return scaleLinear().domain([0, maxWeekTFIDF]).range([0, 0.5]);
  });

  let onbeforeprint = () => {
    console.log('onbeforeprint');
    // TODO: magic numbers. A4 suitable though.
    chartWidth = 775;
    chartHeight = 775;
  };

  let mainSection: HTMLElement | null = $state(null);

  let onafterprint = () => {
    console.log('onafterprint');
    // TODO: almost certainly too hacky for prod. window. + might SSR = woof.
    window.dispatchEvent(new Event('resize'));
    chartWidth = mainSection?.clientWidth || 0;
    chartHeight = mainSection?.clientHeight || 0;
  };

</script>

<style>
  /* #container {
    width: 100%;
    height: 100%;
    position: absolute;
    display: grid;
  } */

  .commit {
    /* fill: #000; */
    /* transform: scaleY(-1);  */
    /* make them start from the bottom, because I don't know how to math otherwise. */
    transition: width 0.1s ease-in-out;
    
  }

  .milestone {
    font-family: system-ui, sans-serif;
    font-size: 12px;
    letter-spacing: -0.05em;
    font-style: italic;
    opacity: 0.4;
  }

  .hoverbar {
    opacity: 0;
    transition: opacity 0.1s ease-in-out;
  }

  .main {
    display: grid;
    height: 100%;
    max-width: 1100px;
    margin: 0 auto;
  }
</style>

<!-- Watch for beforeprint event -->
<svelte:window {onbeforeprint} {onafterprint} />


<!-- <div id="container"> -->
  {#await data}
    Loading...
  {:then}
    <section class="main" bind:clientWidth={chartWidth} bind:clientHeight={chartHeight} bind:this={mainSection}>
      {#each timeline as year, yearIter}
        <ChartContainer width={chartWidth} height={individualChartHeight} yDomain={yDomains[yearIter]} {xDomain}
          xScale={xScale} yScale={yScales[yearIter]} hideXAxis={true} hideYAxis={true}>
          {#each year as week, weekIter}
            {#if week.milestone}
              <g class="milestone">
                <text x={xScale(weekIter) + barContainerWidth / 2 + 5} y={25}>{week.milestone.title}</text>
                <line x1={xScale(weekIter) + barContainerWidth / 2} y1={15} x2={xScale(weekIter) + barContainerWidth / 2} y2={individualChartHeight - 5} stroke="black" stroke-dasharray="1,3" />
              </g>
            {/if}

            <rect
              class="commit"
              x={xScale(weekIter) + barContainerWidth / 2 - barWidth / 2 + 1} {...{/* lol, lmao */}}
              y={individualChartHeight - yScales[yearIter](week.count)}
              fill={colorScales[yearIter](week[colorDomainMetric])}
              width={calculateBarWidth(week)}
              height={yScales[yearIter](week.count)}
            />

            <rect
              class="hoverbar"
              x={xScale(weekIter)}
              y=0
              width={barContainerWidth}
              height={individualChartHeight}
              opacity=0
              role="tooltip"
              onmouseenter={(e) => {
                if (week.milestone) {
                  console.log('milestone', week.milestone);
                  console.log('but what about metadataStore', metadataStore, metadata);
                  // set metadata context
                  metadataStore.set(Object.entries(week.milestone).map(([key, value]) => ({
                    key,
                    value
                  })));
                }
                // console.log(`week ${weekIter}`);
                // console.log(`${new Date(week.weekStart).toLocaleDateString()} to ${new Date(week.weekEnd).toLocaleDateString()}`);
                // console.log('Commit count', week.count);
                // console.log('raw', week);
                // console.log('Terms', week.terms.slice(0,10).map(x => x.term));
                // e.target.style.opacity = .1;
              }}
              onmouseleave={(e) => {
                // e.target.style.opacity = 0;
              }}
              fill="transparent"
            />
          {/each}
        </ChartContainer>

      {/each}
        <!-- {#each circles as circle}
          <Circle midPoint={[circle.x, circle.y]} radius={circle.r} color={circle.color} borderColor={circle.borderColor} borderWidth={circle.borderWidth} />
        {/each} -->
    </section>
  {:catch error}
    <p>
      Error loading data: {error}
    </p>
  {/await}
<!-- </div> -->
