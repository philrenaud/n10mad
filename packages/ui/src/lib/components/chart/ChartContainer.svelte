<!--
Just the SVG wrapper for a chart.
Will start by having in-line chart sub-components,
but will probably end up block-levelling them if this gets much more complicated.
-->

<script lang="ts">
  import VariableAxis from './VariableAxis.svelte';
  
  $effect(() => {
    console.log('fx...width', props.width);
    console.log('fx...height', props.height);
  });

  const props: {
    width: number;
    height: number;
  } = $props();

  let parentWidth: number = $derived(props.width);
  let parentHeight: number = $derived(props.height);
</script>

<style>
 
  svg {
    overflow: visible;
    width: 100%;
    height: 100%;
    display: block;
    /* box-sizing: border-box;
    border: 1px solid red; */
  }
</style>

<!-- <div class="chart-container"> -->
  <slot />
  <svg>
    <VariableAxis 
      height={parentHeight}
      width={parentWidth}
      domain={[0, 100]}
      position="left"
      orientation="vertical"
    />
    <VariableAxis 
      height={parentHeight}
      width={parentWidth}
      domain={[0, 100]}
      position="bottom"
      orientation="horizontal"
    />
  </svg>
<!-- </div> -->
