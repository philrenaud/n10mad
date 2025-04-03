<script lang="ts">
	import { page } from '$app/state';
  import { scaleLinear, scaleTime } from 'd3';
  import ChartContainer from '$lib/components/chart/ChartContainer.svelte';
  import Canvas from '$lib/Canvas.svelte';
	import Circle from '$lib/Circle.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
  console.log('data', data);

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
  $inspect(yDomains);

  const xPadding = 90;
  const yPadding = 30;

  // let xScale = $derived(scaleLinear().domain(xDomain).range([padding, chartWidth - padding]));
  // ^--- use a time scale scale for week/months of the year
  // let xScale = $derived(scaleLinear().domain(xDomain).range([padding, chartWidth - padding]));
  let xScale = $derived(scaleTime().domain(xDomain).range([xPadding, chartWidth - xPadding]));
  const barContainerWidth = $derived(xScale(1) - xScale(0));
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


  let individualChartHeight = $derived(chartHeight / timeline.length);

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


  const TOPICS = [
    'docs',
    'consul',
    'node',
    'docker',
    'tests',
    'api',
    'ui',
    'cli',
    'csi',
    'connect',
    'rpc',
    'token',
    'namespace',
    'scheduler',
    'volumes',
    'master',
    'grpc',
    'memory',
    'identity',
    'raft',
    'windows',
    'variables',
    'panic',
    'policy',
    'fingerprint',
    'ember',
    'go',
    'auth',
    'region',
    'vault',
    'actions',
    'tls',
    'e2e',
    'fs',
    'dependency',
    'preemption',
    'vagrant',
    'hcl2',
    'quota',
    'disconnected',
  ]

  let authors = $derived.by(() => {
    // console.log('contributors', contributors);
    return contributors.slice(0,20).map((c) => {
      return {
        avatar: c.author.avatar_url,
        name: c.author.login,
      }
    })
  })

  let topic = $state('');
  let topicIsAuthor = $derived(authors.map(a => a.name).includes(topic));

  function highlightWeek(week: Week) {
    if (topicIsAuthor) {
      return week.authors.includes(topic) ? 0.5 : 0;
    } else {
      return topicScale(week.terms?.find(term => term.term === topic)?.tfidf || 0);
    }
  }

  let calculateBarWidth = $derived.by(() => {
    // console.log('CBW', topic, topicIsAuthor);
    return (week) => {
      if (!topic) return barWidth;
      
      if (topicIsAuthor) {
        return week.authors.includes(topic) ? barWidth * 2 : 0.5;
      }
      // console.log('week', week, week.terms);
      
      return week.terms?.find(term => term.term === topic)?.tfidf > 0 ? barWidth * 2 : 1;
    };
  });
  
  let topicScale = $derived.by(() => {
    let flatWeeks = timeline.flat();
    let maxWeekTFIDF = Math.max(...flatWeeks.map(week => week.terms?.find(term => term.term === topic)?.tfidf || 0));
    // console.log("color scale update", topic, maxWeekTFIDF);
    // console.log("maxWeekTFIDF", maxWeekTFIDF);
    return scaleLinear().domain([0, maxWeekTFIDF]).range([0, 0.5]);
  });

</script>

<style>
  #container {
    width: 100%;
    height: 100%;
    position: absolute;
    display: grid;
    /* grid-template-rows: auto 1fr; */
  }

  .authors {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;

    .author {
      display: inline-grid;
      grid-template-columns: 20px 1fr;
      gap: 5px;
      background: white;
      border-radius: 40px;
      padding: 2px 4px;
      box-shadow: 2px 2px 2px 0px rgba(0, 0, 0, 0.1);
      border: none;
      align-items: center;
      cursor: pointer;
      &:hover {
        background: #f0f0f0;
      }
    }
  }

  .commit {
    /* fill: #000; */
    /* transform: scaleY(-1);  */
    /* make them start from the bottom, because I don't know how to math otherwise. */
    transition: width 0.1s ease-in-out;
    
  }

  .hoverbar {
    opacity: 0;
    transition: opacity 0.1s ease-in-out;
  }

  .main {
    display: grid;
    grid-auto-flow: row;
    gap: 0;
    margin: 0 auto 50px auto;
    max-width: 1000px;
    width: 100%;
  }
</style>

<div id="container">
  {#await data}
    Loading...
  {:then}
    <header>
      <input type="text" bind:value={topic} />
      {#each TOPICS as topicButton}
        <button onmouseover={() => { topic = topicButton }}>{topicButton}</button>
      {/each}
      <hr />
      <div class="authors">
        {#each authors as author}
          <button class="author"
            onmouseover={() => { topic = author.name }}
            onfocus={() => { topic = author.name }}
            onmouseleave={() => { topic = '' }}
        >
          <img src={author.avatar} style="width: 20px; height: 20px; border-radius: 50%;" />
          {author.name}
        </button>
      {/each}
    </div>
    </header>
    <section class="main" bind:clientWidth={chartWidth} bind:clientHeight={chartHeight}>
      {#each timeline as year, yearIter}
        <!-- <Canvas width={chartWidth} height={chartHeight / weeksByYear.length - yPadding} bind:ctx={canvasContexts[yearIter]}>
          {#each year.data as week, weekIter}
            {#each week.commits as commit, commitIter}
              <Circle
                midPoint={[xScale(weekIter), yScales[yearIter](commitIter)]}
                radius={chartHeight / weeksByYear.length / yDomains[yearIter][1] / .5}
                color="black"
                borderColor="green"
                borderWidth={0}
              />
            {/each}
          {/each}
        </Canvas> -->
        <ChartContainer width={chartWidth} height={individualChartHeight} yDomain={yDomains[yearIter]} {xDomain}
          xScale={xScale} yScale={yScales[yearIter]} hideXAxis={true} hideYAxis={true}>
          {#each year as week, weekIter}
            <rect
              class="commit"
              x={xScale(weekIter) + barContainerWidth / 2 - barWidth / 2} {...{/* lol, lmao */}}
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
                console.log(`week ${weekIter}`);
                console.log(`${new Date(week.weekStart).toLocaleDateString()} to ${new Date(week.weekEnd).toLocaleDateString()}`);
                console.log('Commit count', week.count);
                console.log('raw', week);
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
</div>
