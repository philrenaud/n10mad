<script lang="ts">
	import { page } from '$app/state';
  import { scaleLinear, scaleTime } from 'd3';
  import ChartContainer from '$lib/components/chart/ChartContainer.svelte';
  import Canvas from '$lib/Canvas.svelte';
	import Circle from '$lib/Circle.svelte';
	import type { PageProps } from './$types';
  import { getContext, setContext } from 'svelte';
  import type { Metadata, createMetadataStore } from '$lib/components/metadata.svelte';
	let { data }: PageProps = $props();

  // Inherit topic from layout.svelte
  console.log('page data', page.data);

  // let focusContext: () => Focus = getContext('focus');
  // let focus: Focus = $derived.by(() => {
  //   return focusContext();
  // })
  
  // 	// let topic = $state('');
	// // setContext('focus', () => focusedData); // TODO: tie to queryParams
	// setContext('focusedTopic', () => focusedTopic);
	// setContext('focusedAuthor', () => focusedAuthor);

  let focus: Focus | null = $state({});

  let focusedTopic = getContext('focusedTopic');
  let focusedAuthor = getContext('focusedAuthor');

  // $effect(() => {
  //   // Just for fun let's have author override topic. TODO:.
  //   if (focusedAuthor) {
  //     focus = {
  //       type: 'author',
  //       query: focusedAuthor
  //     }
  //   } else if (focusedTopic) {
  //     focus = {
  //       type: 'topic',
  //       query: focusedTopic
  //     }
  //   } else {
  //     focus = {};
  //   }
  // });

  let metadataStore: ReturnType<typeof createMetadataStore> = getContext('metadataStore');
  let metadata: Metadata[] = $derived.by(() => {
    return metadataStore.metadata;
  })

  let topic = $derived.by(() => {
    return focus.type === 'topic' ? focus.query : '';
  })

  let author = $derived.by(() => {
    return focus.type === 'author' ? focus.query : '';
  })

  // $inspect(topic);
  // $inspect(author);

  let authors = [];

  let timeline = $state(data.timeline);
  let contributors = $state(data.contributors);

  let topics: TopicWeek[] = data.topics;

  type Topic = {
    term: string;
    tfidf: number;
  }

  type TopicWeek = {
    year: string;
    weekNumber: number;
    weekStart: number;
    weekEnd: number;
    terms: Topic[];
  }

  let topTopics = $derived.by(() => {
    return topics.map(topic => {
      return {
        year: topic.year,
        weekNumber: topic.weekNumber,
        weekStart: topic.weekStart,
        weekEnd: topic.weekEnd,
        terms: topic.terms
      }
    })
  })

  // TODO: do this on the server or something
  $effect(() => {
    topics.forEach((topicWeek) => {
      timeline.flat().forEach((week) => {
        if (week.weekStart === topicWeek.weekStart) {
          // console.log('week', week);
          week.terms = topicWeek.terms;
        }
      })
    })
  })

  // let weeks = data.weeklyCommits;
  // let weeksByYear = $derived.by(() => {
  //   return weeks.reduce((acc, week) => {
  //     let year = week.weekStart.slice(0, 4);
  //     const existingIndex = acc.findIndex(item => item.year === year);
      
  //     if (existingIndex === -1) {
  //       acc.push({ year, data: [week] });
  //     } else {
  //       acc[existingIndex].data.push(week);
  //     }
      
  //     return acc;
  //   }, []);
  // });
  // $inspect(weeks);
  // $inspect(weeksByYear);

  let chartWidth: number = $state(0);
  let chartHeight: number = $state(0);

  $effect(() => {
    console.log('++==chartWidth', chartWidth);
  })

  let xDomain: [number, number] = $derived.by(() => {
    let min = 0;
    let max = 52;
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
    return timeline.map(year => {
      let min = 0;
      let max = Math.max(...year.map(week => week.count));
      return [min, max];
    });
  });

  const xPadding = 90; // space along the side margins; maybe replace with css margins instead of accounting in d3?
  const yPadding = 30; // vertical space between years

  let xScale = $derived.by(() => {
    return scaleTime().domain(xDomain).range([xPadding, chartWidth - xPadding]);
  });
  // let barContainerWidth = $derived.by(() => {
  //   if (xScale.length === 0) return 1;
  //   return xScale(1) - xScale(0);
  // });

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
  // $effect(() => {
  //   console.log('yScales', yScales, yDomains)
  // })

  // $effect(() => {
  //   console.log({chartHeight})
  // })

  // #region fun canvas detour
  let canvasContexts: CanvasRenderingContext2D[] = $state([]);  
  // #endregion fun canvas detour


  let individualChartHeight = $derived(chartHeight / timeline.length - 1);

  // One way to do spacing would be with a hard value:
  // const barSpacing = 5;

  // Another way might be to have a "barWidth" const
  // let barSpacing = $derived(chartWidth / 52 - barWidth);
  // and finally, a min/max solution
  // let minBarWidth = 1;
  // let maxBarWidth = 20;
  // let barWidth = $derived.by(() => {
  //   console.log('chartWidth', chartWidth);
  //   return Math.min(Math.max(chartWidth / 52 - 5, minBarWidth), maxBarWidth);
  // });
  // let barSpacing = $derived.by(() => {
  //   return chartWidth / 52 - barWidth;
  // });
  // $effect(() => {
  //   console.log('barSpacing', barSpacing);
  // })

  const nomadGreen = '#00ca8e';

  // let colorDomainMetric = 'uniqueAuthorCount';
  let colorDomainMetric = 'count';

  let colorScales = $derived.by(() => {
    return timeline.map((year, yearIter) => {
      let maxMetric = Math.max(...year.map(week => week[colorDomainMetric]));
      // console.log(`max ${colorDomainMetric} for year ${yearIter} is`, maxMetric);
      return scaleLinear().domain([0, maxMetric]).range(['black', nomadGreen]);
    });
  });

  // let topicIsAuthor = $derived(authors.map(a => a.name).includes(topic));

  // function highlightWeek(week: Week) {
  //   if (topicIsAuthor) {
  //     return week.authors.includes(topic) ? 0.5 : 0;
  //   } else {
  //     return topicScale(week.terms?.find(term => term.term === topic)?.tfidf || 0);
  //   }
  // }

  let calculateBarWidth = $derived.by(() => {
    console.log('CBW', topic, author);
    return (week) => {
      if (!topic && !author) return barWidth;
      if (author) {
        console.log('author found', author);
        return week.authors.includes(author) ? barWidth * 2 : 0.5;
      }
      if (topic) {
        console.log('topic found', topic);
        return week.terms?.find(term => term.term === topic)?.tfidf > 0 ? barWidth * 2 : 1;
      }      
    };
  });
  
  let topicScale = $derived.by(() => {
    let flatWeeks = timeline.flat();
    let maxWeekTFIDF = Math.max(...flatWeeks.map(week => week.terms?.find(term => term.term === topic)?.tfidf || 0));
    // console.log("color scale update", topic, maxWeekTFIDF);
    // console.log("maxWeekTFIDF", maxWeekTFIDF);
    return scaleLinear().domain([0, maxWeekTFIDF]).range([0, 0.5]);
  });

  let onbeforeprint = () => {
    console.log('onbeforeprint');
    // TODO: magic numbers. A4 suitable though.
    chartWidth = 775;
    chartHeight = 775;
  }

  let mainSection: HTMLDivElement | null = $state(null);

  let onafterprint = () => {
    console.log('onafterprint');
    // TODO: almost certainly too hacky for prod. window. + might SSR = woof.
    window.dispatchEvent(new Event('resize'));
    chartWidth = mainSection?.clientWidth || 0;
    chartHeight = mainSection?.clientHeight || 0;
  }

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
