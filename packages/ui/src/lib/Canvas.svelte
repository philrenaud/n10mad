<script lang="ts">
  import { getContext, setContext, onDestroy, onMount, createEventDispatcher } from "svelte";

  // import { derived, type Signal } from "svelte";

  let canvasElement: HTMLCanvasElement;
  let frameId: number;
  // let ctx: CanvasRenderingContext2D | null; // TODO: might have to make this state
  let { ctx = $bindable(), width, height } = $props();
  
  let reDraw = true;
  let memo: any;

  // $inspect({width, height});

  // Using Svelte 5's state management
  let fnsToDraw: $state = [];

  // Modern context API
  const canvasContext = {
    addDrawFn: (fn: (ctx: CanvasRenderingContext2D) => void) => {
      fnsToDraw = [...fnsToDraw, fn];
    },
    removeDrawFn: (fn: (ctx: CanvasRenderingContext2D) => void) => {
      fnsToDraw = fnsToDraw.filter(drawFn => drawFn !== fn);
    }
  };

  setContext('canvas', canvasContext);

  onMount(() => {
    ctx = canvasElement?.getContext("2d");
    frameId = requestAnimationFrame(() => draw(ctx));
  });

  onDestroy(() => {
    if (frameId) {
      cancelAnimationFrame(frameId);
    }
  });

  function draw(ctx: CanvasRenderingContext2D | null) {
    if (!ctx) return;
    
    fnsToDraw.forEach((fn) => fn(ctx));
    frameId = requestAnimationFrame(() => {
      clear();
      draw(ctx);
    });
  }

  function clear() {
    const context = canvasElement?.getContext("2d");
    if (context) {
      context.clearRect(0, 0, width, height);
    }
  }

  // Type-safe event dispatcher
  const dispatch = createEventDispatcher<{
    mousemove: { e: MouseEvent; canvas: CanvasRenderingContext2D | null };
    touchmove: { e: TouchEvent; canvas: CanvasRenderingContext2D | null };
    touchend: { e: TouchEvent; canvas: CanvasRenderingContext2D | null };
    touchstart: { e: TouchEvent; canvas: CanvasRenderingContext2D | null };
    mousedown: { e: MouseEvent; canvas: CanvasRenderingContext2D | null };
    mouseup: MouseEvent;
    mouseleave: MouseEvent;
    click: MouseEvent;
  }>();
</script>
<!-- ddd{width}, {height} -->
<canvas
  {width}
  {height}
  on:mousemove={(e) => {
    dispatch('mousemove', {
      e,
      canvas: canvasElement?.getContext("2d")
    });
  }}
  on:touchmove={(e) => {
    dispatch('touchmove', {
      e,
      canvas: canvasElement?.getContext("2d")
    });
  }}
  on:touchend={(e) => {
    dispatch('touchend', {
      e,
      canvas: canvasElement?.getContext("2d")
    });
  }}
  on:touchstart={(e) => {
    dispatch('touchstart', {
      e,
      canvas: canvasElement?.getContext("2d")
    });
  }}
  on:mousedown={(e) => {
    dispatch('mousedown', {
      e,
      canvas: canvasElement?.getContext("2d"),
    });
  }}
  on:mouseup
  on:mouseleave
  on:click
  bind:this={canvasElement}
/>
<slot />
