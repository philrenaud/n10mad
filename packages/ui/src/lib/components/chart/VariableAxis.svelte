<script lang="ts">
  import { onMount } from 'svelte';
  // import { axisLeft, axisTop, axisRight, axisBottom, type Axis } from 'd3-axis';
  import { axisLeft, axisBottom, type Axis } from 'd3';
  import { scaleLinear } from 'd3-scale';
  // import * as d3 from 'd3';
  import { select } from 'd3';
  // import { scaleLinear } from 'd3';

  let { height, width, domain, orientation, position, scale, maxTicks = 20 } = $props();

  // let scale = $derived(scaleLinear()
  //   .domain(domain)
  //   .range(orientation === 'vertical' ? [height - padding*2, 0] : [0, width - padding*2]));

  let axisElement: SVGGElement | null = $state(null);

  let axis: Axis<d3.NumberValue> | null = $derived(
    orientation === 'vertical'
    ? axisLeft(scale).tickSize(10)
    : axisBottom(scale).tickSize(10)
  );

  const padding = 80;

  let atlisTransform = $derived(
    orientation === 'vertical'
    ? `translate(${padding}, 0)`
    : `translate(0, ${height - padding})`
  );

  // let tickValues = $derived.by(() => {
  //   let tickScale = scaleLinear().domain([0, 100]).range([0, orientation === 'vertical' ? height : width]);
  //   console.log('tick scale', tickScale, tickScale.ticks(Math.max(5, Math.min(20, width / 100))));
  //   return tickScale.ticks(Math.max(5, Math.min(20, width / 100)));
  // });

  // $effect(() => {
  //   console.log('tick values', tickValues);
  //   axis.tickValues(tickValues);
  // })

  $effect(() => {
    let tickSpacing = (orientation === 'vertical' ? height : width) / 50;
    let minNumTicks = 1;
    // let maxNumTicks = 20;
    let maxNumTicks = maxTicks;
    // console.log('scale', scale);
    let baseTickValues = scale.ticks(Math.max(minNumTicks, Math.min(maxNumTicks, tickSpacing)));

    // If the ceiling is not included (because it doesn't divide evenly with tickSpacing, say), add it
    // UNLESS it's within X of the baseTickValues[baseTickValues.length - 1], where X is some fraction of tickSpacing
    let lastTickValue = baseTickValues[baseTickValues.length - 1];
    let averageTickDistance = (domain[1] - domain[0]) / baseTickValues.length;
    let bonusTickThreshold = averageTickDistance * 0.3;
    let lastTickValueWithinThreshold = lastTickValue + bonusTickThreshold;
    // console.log('+++so to be shown, the upper bound must be at least', lastTickValueWithinThreshold);
    // console.log('===it is', domain[1]);
    if (!baseTickValues.includes(domain[1]) && lastTickValueWithinThreshold < domain[1]) {
      baseTickValues.push(domain[1]);
    }

    // Don't show the 0 ticks
    // TODO: this is probably bad policy!
    if (domain[0] === 0) {
      baseTickValues = baseTickValues.filter(tick => tick !== 0);
    }
    
    axis.tickValues(baseTickValues);
    axis.tickPadding(orientation === 'vertical' ? 10 : 5);
  })

  $effect(() => {
    if (axisElement) {
      select(axisElement)
      .attr('transform', atlisTransform)
      .call(axis);
    }
  });

</script>
  <g class="{orientation}-axis" bind:this={axisElement} />
<!-- {#if orientation === 'vertical'}
  <rect width={width/2} height={height} stroke="#f00" fill="rgba(0,0,255,0.5)"/>
{:else}
  <rect width={width} height={height/2} stroke="#f00" fill="rgba(255,0,0,0.5)"/>
{/if} -->
<style>
</style>
