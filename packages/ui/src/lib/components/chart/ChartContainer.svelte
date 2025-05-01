<!--
Just the SVG wrapper for a chart.
Will start by having in-line chart sub-components,
but will probably end up block-levelling them if this gets much more complicated.
-->

<script lang="ts">
  import VariableAxis from './VariableAxis.svelte';
  import { type ScaleTime, type ScaleLinear } from 'd3';
  // $effect(() => {
  //   console.log('fx...width', props.width);
  //   console.log('fx...height', props.height);
  // });

  const props: {
    width: number;
    height: number;
    yDomain: [number, number];
    xDomain: [number, number];
    xScale: ScaleTime<number, number> | ScaleLinear<number, number>;
    yScale: ScaleLinear<number, number>;
    hideYAxis: boolean;
    hideXAxis: boolean;
  } = $props();

  let parentWidth: number = $derived(props.width);
  let parentHeight: number = $derived(props.height || 0);
</script>

<style>

  .chart-container {
    display: block;
    position: relative;
    width: 100%;
    height: 0px;
    overflow: hidden;
  }

  svg {
    overflow: visible;
    display: block;
    width: 100%;
    height: 100%;
  }
</style>
<div class="chart-container" style="height: {parentHeight}px;">
  <!-- <svg style="width: 100%; height: {50}px; outline: 1px solid red; overflow: hidden;"> -->
  <svg>
    {#if !props.hideYAxis}
    <!-- {console.log('passing down height to yAxis as', parentHeight)} -->
      <VariableAxis
        height={parentHeight}
        width={parentWidth}
        domain={props.yDomain}
        scale={props.yScale}
        position="left"
        orientation="vertical"
      />
    {/if}
    {#if !props.hideXAxis}
      <VariableAxis
        height={parentHeight}
        width={parentWidth}
        domain={props.xDomain}
        scale={props.xScale}
        position="bottom"
        orientation="horizontal"
        maxTicks={props.maxTicks}
      />
    {/if}
    <slot />
  </svg>
</div>
