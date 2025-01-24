<script lang="ts">
  import { getContext, onDestroy, onMount } from "svelte";

  type Point = [number, number];
  
  export let midPoint: Point;
  export let radius: number;
  export let color = "black";

  // Type the canvas context
  type CanvasContext = {
    addDrawFn: (fn: (ctx: CanvasRenderingContext2D) => void) => void;
    removeDrawFn: (fn: (ctx: CanvasRenderingContext2D) => void) => void;
  };

  const canvasContext = getContext<CanvasContext>("canvas");

  const draw = (ctx: CanvasRenderingContext2D) => {
    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.arc(midPoint[0], midPoint[1], radius, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.stroke();
  };

  onMount(() => {
    canvasContext?.addDrawFn(draw);
  });

  onDestroy(() => {
    canvasContext?.removeDrawFn(draw);
  });
</script>
