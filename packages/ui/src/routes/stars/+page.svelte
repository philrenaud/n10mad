<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import type { PageProps } from './$types';
  import ChartContainer from '$lib/components/chart/ChartContainer.svelte';
  import { scaleLinear, scaleTime, type ScaleTime } from 'd3';
	let { data }: PageProps = $props();
  let { stars } = data;

  let chartWidth: number = $state(600);
  let chartHeight: number = $state(400);

  type StarsByPeriod = {  
    period: string;
    count: number;
    users: string[];
  }

  type StarsByPeriodWithRolling = StarsByPeriod & {
    rollingAverage: number;
    rollingDiff: number;
  }

  // let period: 'day' | 'week' | 'month' = $state('week');
  const defaultPeriod = 'week';
  const defaultRolling = false;
  let period: 'day' | 'week' | 'month' = $state(page.url.searchParams.get('period') as 'day' | 'week' | 'month' || defaultPeriod);
  let useRollingAverage: boolean = $state(page.url.searchParams.get('rolling') === 'true' || defaultRolling);

  $effect(() => {
    if (period !== page.url.searchParams.get('period')) {
      period = page.url.searchParams.get('period') as 'day' | 'week' | 'month' || defaultPeriod;
    }
    if (period === defaultPeriod && page.url.searchParams.get('period')) {
      page.url.searchParams.delete('period');
      goto(`?${page.url.searchParams.toString()}`, { replaceState: true, keepFocus: true });
    }
  });

  $effect(() => {
    if (useRollingAverage !== (page.url.searchParams.get('rolling') === 'true')) {
      useRollingAverage = page.url.searchParams.get('rolling') === 'true' || defaultRolling;
    }
    if (useRollingAverage === defaultRolling && page.url.searchParams.get('rolling')) {
      page.url.searchParams.delete('rolling');
      goto(`?${page.url.searchParams.toString()}`, { replaceState: true, keepFocus: true });
    }
  });

  let starsByPeriod: StarsByPeriod[] = $derived.by(() => {
    return stars.reduce((acc: StarsByPeriod[], star) => {
      // split by month or week
      let periodKey;
      if (period === 'day') {
        periodKey = star.starred_at.split('T')[0];
      } else if (period === 'week') {
        const date = new Date(star.starred_at);
        // 0=Sunday, 1=Monday, etc.
        const day = date.getUTCDay();

        // const diff = (day + 6) % 7; // start weeks on Monday
        const diff = day; // start weeks on Sunday
        
        const weekStart = new Date(Date.UTC(
          date.getUTCFullYear(),
          date.getUTCMonth(),
          date.getUTCDate() - diff
        ));
        
        // YYYY-MM-DD
        periodKey = weekStart.toISOString().split('T')[0];
      } else {
        // periodKey = star.starred_at.split('T')[0].split('-')[1];
        periodKey = star.starred_at.split('T')[0].slice(0, 7);
      }
      let existingPeriod = acc.find(p => p.period === periodKey);
      if (existingPeriod) {
        existingPeriod.count++;
        existingPeriod.users.push(star.user);
      } else {
        acc.push({
          period: periodKey,
          count: 1,
          users: [star.user],
        });
      }
      return acc;
    }, []);
  });

  let starsByPeriodWithRolling: StarsByPeriodWithRolling[] = $derived.by(() => {
    const smoothingFactor = 0.2;
    let ema = starsByPeriod[0]?.count || 0;

    let avg = starsByPeriod.map(p => p.count).reduce((sum, p) => sum + p, 0) / starsByPeriod.length;

    return starsByPeriod.map((period, i, arr) => {
      ema = (period.count * smoothingFactor) + (ema * (1 - smoothingFactor));

      const start = Math.max(0, i - rollingPeriod);
      const previousPeriods = arr.slice(start, i);
      const avgPreviousCounts = previousPeriods.length ? 
        previousPeriods.reduce((sum, p) => sum + p.count, 0) / previousPeriods.length : 
        period.count;

      // Calculate standard deviation
      const stdDev = previousPeriods.length ? 
        Math.sqrt(
          previousPeriods.reduce((sum, p) => 
            sum + Math.pow(p.count - avgPreviousCounts, 2), 0
          ) / previousPeriods.length
        ) : 1;
      const zScore = avgPreviousCounts && avgPreviousCounts >= rollingPeriod && stdDev > 0 ? 
        (period.count - avgPreviousCounts) / stdDev :
        0;

      let smoothedCount = previousPeriods.map(p => p.count).reduce((sum, p) => sum + p, 0) + period.count;

      return {
        ...period,
        rollingAverage: avgPreviousCounts,

        // Bunch of ways top indicate "Does this matter, relative to trend?"
        // I spent a bunch of time on this and I'm not sure there's a story to tell short of
        // "We get a lot of stars when someone links to us and it catches fire on HN"
        // -Phil

        // Basic: Current week compared to average of previous 12 weeks.
        rollingDiff: avgPreviousCounts ? period.count - avgPreviousCounts : 0

        // Exponential moving average: emphasizes historical importance.
        // rollingDiff: ema ? ((period.count - ema) / ema) * 100 : 0

        // Standard deviation: emphasizes volatility.
        // rollingDiff: zScore

        // Smoothed/averaged counts over median: emphasizes central tendency.
        // rollingDiff: smoothedCount - (avg * previousPeriods.length)
      };
    });
  });

  let chartData:StarsByPeriod[] | StarsByPeriodWithRolling[] = $derived.by(() => {
    console.log('chartData recomp');
    if (useRollingAverage) {
      return starsByPeriodWithRolling;
    }
    return starsByPeriod;
  });

  $effect(() => {
    console.log('chartData', chartData);
  });

  let dataKey: 'count' | 'rollingDiff' = $derived.by(() => 
    useRollingAverage ? 'rollingDiff' : 'count'
  ); // TODO: Consider using rollingAverage or something instead.

  const rollingPeriod = 12;
  // let rollingPeriod = $derived.by(() => {
  //   return starsByPeriod.length / 20;
  // })

  let maxPeriodCount: number = $derived(Math.max(...chartData.map(p => p[dataKey])));
  let minPeriodCount: number = $derived(Math.min(...chartData.map(p => p[dataKey])));

  let zeroPoint = 0; // Leaving this as a marker for when I thought I was soooooooo clever but ended up just saying "zero is zero actually"

  let yDomain: [number, number] = $derived([minPeriodCount, maxPeriodCount]);
  // let xDomain: [number, number] = $derived([0, chartData.length]);
  // ^--- lets use dates instead
  let xDomain: [Date, Date] = $derived([
    new Date(chartData[0].period),
    new Date(chartData[chartData.length - 1].period)
  ]);

  // let xDomainDates: ScaleTime<number, number> = $derived.by(() => {
  //   // We want this to be a list of dates. Probably use d3.scaleTime.
  //   return scaleTime().domain(chartData.map(p => new Date(p.period)));
  // });
  // $effect(() => {
  //   console.log('xDomainDates', xDomainDates);
  // });

  let yScale = $derived(scaleLinear().domain(yDomain).range([chartHeight - padding, padding]));
  // let xScale = $derived(scaleLinear().domain(xDomain).range([padding, chartWidth - padding]));
  let xScale = $derived(scaleTime().domain(xDomain).range([padding, chartWidth - padding]));
  $effect(() => {
    console.log('xScale', xScale);
  });

  const padding = 80;

  let rollingColorScale = $derived.by(() => scaleLinear().domain([
    Math.min(...chartData.map(p => p[dataKey])),
    // midpoint
    zeroPoint,
    Math.max(...chartData.map(p => p[dataKey]))
  ]).range(['#c84034', 'yellow', '#00ca8e']));
</script>

<style>
  #container {
    width: 100%;
    height: 100%;
    position: absolute;
    display: grid;
    grid-template-rows: auto 1fr;
  }
  button {
    margin-right: 1rem;
    &.active {
      background-color: #000;
      color: #fff;
    }
  }
</style>

<div id="container">
  {#await data}
    Loading...
  {:then}
    <header>
      <h2>Stars</h2>
      <p>
        Can you believe Nomad has {data.stars.length} stars? That's {(data.stars.length / 10 / 52).toFixed(1)} stars per week. Actually, that's an interesting measure. How do the weeks stack up?
      </p>
      {#each ['day', 'week', 'month'] as p}
        <button class:active={period === p} onclick={() => {
          page.url.searchParams.set('period', p);
          goto(`?${page.url.searchParams.toString()}`, { replaceState: false, keepFocus: true });
        }}>{p}</button>
      {/each}
      <hr />
      <label>
        <input type="checkbox" bind:checked={useRollingAverage} onclick={() => {
          page.url.searchParams.set('rolling', (!useRollingAverage).toString());
          goto(`?${page.url.searchParams.toString()}`, { replaceState: false, keepFocus: true });
        }} />
        Use rolling average
      </label>
    </header>
    <section class="main" bind:clientWidth={chartWidth} bind:clientHeight={chartHeight}>
      <ChartContainer width={chartWidth} height={chartHeight} {yDomain} xDomain={xDomain}
        xScale={xScale} yScale={yScale} maxTicks={10}
      >
        {#each chartData as period, i}
          <g>
            <rect
              x={xScale(new Date(period.period))}
              y={
                useRollingAverage
                  ? (
                    period[dataKey] > 0 ? 
                      yScale(0) - Math.abs(yScale(0) - yScale(period[dataKey])) :
                      yScale(0)
                )
                  : yScale(period.count)
              }
              width={chartWidth / chartData.length}
              height={useRollingAverage ? 
                Math.abs(yScale(0) - yScale(period[dataKey])) :
                yScale(0) - yScale(period[dataKey])
              }
              fill={
                useRollingAverage
                  ? rollingColorScale(period[dataKey])
                  : '#00ca8e'
              }
            />
            <rect
              class="hoverbar"
              x={xScale(new Date(period.period))}
              y={padding}
              width={chartWidth / chartData.length}
              height={chartHeight - padding * 2}
              opacity={0.1}
              role="tooltip"
              onmouseenter={() => {
                console.log('period', period);
              }}
              fill='transparent'
            />
          </g> 
        {/each}
      </ChartContainer>
    </section>
  {:catch error}
    <p>
      Error loading data: {error}
    </p>
  {/await}
</div>
