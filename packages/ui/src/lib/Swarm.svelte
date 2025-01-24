<script lang="ts">
  import { getContext, onDestroy, onMount } from "svelte";

  type Point = [number, number];
  
  // export let midPoint: Point;
  // export let radius: number;
  // export let color = "black";

  type Circle = {
    x: number;
    y: number;
    r: number;
    color: string;
    group: number;
  }
  export let nodes: Circle[];

  // Type the canvas context
  type CanvasContext = {
    addDrawFn: (fn: (ctx: CanvasRenderingContext2D) => void) => void;
    removeDrawFn: (fn: (ctx: CanvasRenderingContext2D) => void) => void;
  };

  const canvasContext = getContext<CanvasContext>("canvas");

  const draw = (ctx: CanvasRenderingContext2D) => {
    nodes.forEach((node) => {
      // ctx.beginPath();
      // ctx.lineWidth = 1;
      // ctx.arc(node.x, node.y, node.r, 0, 2 * Math.PI);
      // ctx.fillStyle = node.color;
      // ctx.fill();
      // ctx.strokeStyle = node.color;
      // ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(node.x + node.r, node.y);
      ctx.arc(node.x, node.y, node.r, 0, 2 * Math.PI);
      ctx.fillStyle = node.color;
      ctx.fill();

    });
  };

  onMount(() => {
    canvasContext?.addDrawFn(draw);
  });

  onDestroy(() => {
    canvasContext?.removeDrawFn(draw);
  });
</script>
