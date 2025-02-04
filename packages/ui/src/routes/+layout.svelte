<script lang="ts">
	import '../styles/global.css';
	import { onDestroy, onMount } from 'svelte';
	import Canvas from '$lib/Canvas.svelte';
	import Circle from '$lib/Circle.svelte';
	import * as d3 from 'd3';

	let width = $state(500);
	let height = $state(500);

	let numberOfCircles = $state(1000);
	let minWidth = 2;
	// let circleSize = $derived.by(() => Math.max(minWidth, width / numberOfCircles / 2));
  // ^--- perf nightmare
  let circleSize = 2;

	let mouseX = $state(0);
	let mouseY = $state(0);

	const nomadGreen = '#00ca8e';
	const nomadGreenScale = d3
		.scaleLinear()
		.domain([0, 1])
		.range([
			d3.hsl(nomadGreen).darker(0.5),
			d3.hsl(nomadGreen).brighter(0.5)
		]);

  let canvasContext:CanvasRenderingContext2D | null = $state(null);
  // $inspect({width, height});

	function onpointermove(e: PointerEvent) {
		canvasContext?.clearRect(0, 0, width, height);
    mouseX = e.pageX;
    mouseY = e.pageY;
		localCircles[0] = {
			...circles[0],
			x: mouseX,
			y: mouseY
		};

    // Generally follow the mouse, lightly.
    if (simulation) {
      simulation.force('mouse', d3.forceRadial(100, mouseX, mouseY).strength((d,i) => i ? 0.02 : 0))
    }
	}

	let radius = $derived.by(() => d3.randomUniform(circleSize, circleSize * 4)); // TODO: this is plainly not being observed anymore
	let simulation = $state<d3.Simulation<any, any>>();
	let circles = $state<any[]>([]);

	let localCircles: any[] = [];

	function initializeCircles() {
		localCircles = Array.from({ length: numberOfCircles }).map((_, i) => ({
			r: i ? radius() : minWidth * 10,
			x: width / 2,
			y: height / 2,
			color: nomadGreenScale(Math.random())
		}));
	}

	function ticked() {
		circles = [...localCircles];
	}

	let repulsion = $state(2);

	function appendCircles(circles) {
		circles.forEach((c) => {
			localCircles.push(c);
		});
		circles = [...localCircles];
	}

  let performanceIterations = $derived.by(() => {
    return Math.round(d3
      .scaleLinear()
      .domain([2000, 5000]).range([3, 1])(numberOfCircles));
  })

  // When height/width change, re-centre the graph

  let centeringStrength = $state(0.01);
  $effect(() => {
    if (!simulation) return;
    simulation.force('x', d3.forceX(width / 2).strength((_, i) => (!i ? 0 : centeringStrength)))
    simulation.force('y', d3.forceY(height / 2).strength((_, i) => (!i ? 0 : centeringStrength)))
  })

	function simulate() {
		console.log('simulate, is there already a simulation?', simulation, localCircles);
		let alpha = 0.1;
		if (localCircles.length !== numberOfCircles) {
			// Remove or add circles according to the difference
			if (localCircles.length && localCircles.length < numberOfCircles) {
				const newCircles = Array.from({ length: numberOfCircles - localCircles.length }).map(
					(_, i) => ({
						r: radius(),
						x: width / 2,
						y: height / 2,
						color: nomadGreenScale(Math.random())
					})
				);

				// Cool the simulation slightly so they're not insane mode
				alpha = 0.9;

				appendCircles(newCircles);
			} else {
				localCircles = localCircles.slice(0, numberOfCircles);
			}
		}
		if (simulation) simulation.stop();
		simulation = d3
			.forceSimulation(localCircles)
			.alpha(alpha)
			.alphaTarget(0.3)
			.velocityDecay(0.1)
			.force(
				'x',
				d3.forceX(width / 2).strength((_, i) => (!i ? 0 : centeringStrength))
			)
			.force(
				'y',
				d3.forceY(height / 2).strength((_, i) => (!i ? 0 : centeringStrength))
			)
			.force(
				'collide',
				d3
					.forceCollide()
					.radius((d) => d.r + repulsion)
					.iterations(performanceIterations)
          .strength(1)
			)
			.force(
				'mouseRepulsion',
				d3.forceManyBody().strength((d, i) => (i ? 0 : -200 * repulsion))
			)
			.on('tick', () => {
				ticked();
			});
	}

	onMount(() => {
		initializeCircles();
		simulate();
	});

	onDestroy(() => {
		if (simulation) simulation.stop();
	});
</script>

<svelte:window bind:innerHeight={height} bind:innerWidth={width} {onpointermove} />

<Canvas
  {width}
  {height}
  bind:ctx={canvasContext}
>
  {#each circles as circle}
    <Circle midPoint={[circle.x, circle.y]} radius={circle.r} color={circle.color} />
  {/each}
</Canvas>

<main>
  <header>
    <h1 aria-label="Nomad">
      <svg viewBox="0 0 1806.58 629.99" xmlns="http://www.w3.org/2000/svg">
        <path
          class="letter-n"
          d="M205.8,498.59l-67.8-153c-2.4-6-7.2-4.2-7.2,1.8l2.4,145.8c0,11.4-6,16.8-16.8,16.8H40.8c-10.8,0-16.8-6-16.8-16.8V106.79c0-10.8,6-16.8,16.8-16.8h84c9.6,0,15.6,4.2,19.2,12.6l66,153c2.4,6,7.2,4.8,7.2-1.2V106.79c0-10.8,6-16.8,16.8-16.8h75.6c10.8,0,16.8,5.4,16.8,16.8l-.6,387c0,11.4-6,16.8-16.8,16.8l-84,.6c-9.6,0-15.6-3.6-19.2-12.6Z"
        />
        <path
          class="letter-o"
          d="M375.6,410.99c-1.2-11.4-1.2-40.2-1.2-39v-143.4c0,1.2,0-27.6,1.2-39,2.4-14.4-.6-110.4,139.8-110.4s139.2,100.8,140.4,110.4c1.2,13.2,1.2,39,1.2,37.8v145.8c0-1.2,0,24.6-1.2,37.8-1.2,9.6,1.2,110.4-140.4,110.4s-137.4-96-139.8-110.4ZM514.8,422.39c28.8-.6,28.8-26.4,28.8-26.4v-191.4s0-26.4-28.8-26.4c-25.8,0-27,26.4-27,26.4v191.4s1.2,27,27,26.4Z"
        />
        <path
          class="letter-m"
          d="M721.8,89.99h90.6c9.6,0,15.6,4.8,19.2,13.2l51.6,123c1.8,4.8,6.6,4.8,8.4,0l51.6-123c3.6-8.4,9.6-13.2,19.2-13.2h90.6c10.8,0,16.8,6,16.8,16.8v386.4c0,10.8-6,16.8-16.8,16.8h-76.8c-10.8,0-16.8-6-16.8-16.8v-157.2c0-5.4-4.8-6.6-6.6-1.2l-25.2,65.4c-3.6,9-10.2,13.2-19.8,13.2h-40.8c-9.6,0-16.2-4.2-19.8-13.2l-25.2-65.4c-1.8-5.4-6.6-4.2-6.6,1.2v157.2c0,10.8-6,16.8-16.8,16.8h-76.8c-10.8,0-16.8-6-16.8-16.8V106.79c0-10.8,6-16.8,16.8-16.8Z"
        />
        <path
          class="letter-a"
          d="M1111.19,491.39l105.6-387c2.4-9.6,9.6-14.4,19.2-14.4h96.6c9.6,0,16.8,4.8,19.2,14.4l105.6,387c3,12-2.4,18.6-14.4,18.6h-76.2c-9.6,0-15.6-4.8-18.6-13.8l-7.2-25.2c-1.2-3-3.6-4.8-7.2-4.8h-99c-3.6,0-6,1.8-7.2,4.8l-7.2,25.2c-3,9-9,13.8-18.6,13.8h-76.2c-12,0-17.4-6.6-14.4-18.6ZM1258.19,367.79h51.6c4.2,0,6.6-2.4,5.4-6.6l-28.2-106.8c-1.2-5.4-6-6-7.2,0l-26.4,106.8c-1.2,4.2.6,6.6,4.8,6.6Z"
        />
        <path
          class="letter-d"
          d="M1498.79,106.79c0-10.8,6-16.8,16.8-16.8h123.6c142.8,0,141.6,94.8,142.2,104.4.6,13.2,1.2,42.6,1.2,43.8v123.6c0,1.2.6,24.6-1.2,37.8-1.2,9.6,1.2,110.4-142.2,110.4h-140.4c.6,0,0-324.6,0-403.2ZM1642.19,409.79c28.8-.6,28.8-25.2,28.8-25.2v-169.2s0-25.2-28.8-25.8h-24c-3.6,0-6,2.4-6,6v214.2c0,1.2,12.6,0,30,0Z"
        />
      </svg>
    </h1>
  </header>
  <section class="meta">
    <div>
      h/w: {height}, {width}
    </div>
    <div>
      mouse: {mouseX.toFixed(0)}, {mouseY.toFixed(0)}
    </div>
    <div>
      perf iters: {performanceIterations}
    </div>
    <hr />
    Num Circles:<br />
    <input
      type="range"
      bind:value={numberOfCircles}
      min="10"
      max="5000"
      onchange={simulate}
    />
    {numberOfCircles}
    <hr />
    Repulsion:<br />
    <input
      type="range"
      bind:value={repulsion}
      min="1"
      max="10"
      onchange={simulate}
    />
    {repulsion}

  </section>

  <section class="page">
    <slot />
  </section>
</main>
