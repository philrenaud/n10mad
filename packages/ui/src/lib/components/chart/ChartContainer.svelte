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
  } = $props();

  let parentWidth: number = $derived(props.width);
  let parentHeight: number = $derived(props.height);
</script>

<style>
 
  svg {
    overflow: visible;
    /* width: 100%;
    height: 100%; */
    display: block;
    /* box-sizing: border-box;
    border: 1px solid red; */
  }
</style>
<!-- <div class="chart-container"> -->
  <svg style="height:{parentHeight}px">
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
    <VariableAxis 
      height={parentHeight}
      width={parentWidth}
      domain={props.xDomain}
      scale={props.xScale}
      position="bottom"
      orientation="horizontal"
      maxTicks={props.maxTicks}
    />
    <slot />
  </svg>
<!-- </div> -->
