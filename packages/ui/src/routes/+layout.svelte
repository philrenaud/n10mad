<script lang="ts">
	import '../styles/global.css';
	import { onDestroy, onMount } from 'svelte';
	import Canvas from '$lib/Canvas.svelte';
	import Circle from '$lib/Circle.svelte';
	import { page } from '$app/state';
	import * as d3 from 'd3';
  import { goto } from '$app/navigation';

	import type { LayoutProps } from './$types';
	import { setContext, getContext } from 'svelte';
	// import { metadata } from '$lib/stores/metadata';
	import { createMetadataStore } from '$lib/components/metadata.svelte'
	let metadataStore = createMetadataStore();
	let metadata = $derived.by(() => {
		return metadataStore.metadata;
	})
	setContext('metadataStore', metadataStore);

	let meta: boolean = $state(false);
	meta = page.url.searchParams.get('meta') === 'true';
	console.time('layout');
	let { data, children }: LayoutProps = $props();
	// console.log('ok data from layout', data, children);
	console.timeEnd('layout');

  // #region Query Params
  const defaultTopic = null;
  const defaultAuthor = null;
  const defaultMode = 'stream';
  let topic: string = $state(page.url.searchParams.get('topic') || defaultTopic);
  let author: string | null = $state(page.url.searchParams.get('author') || defaultAuthor);
  let mode: 'stream' | 'ridgeline' = $state(page.url.searchParams.get('mode') as 'stream' | 'ridgeline' || defaultMode);

  let searchParams = $state(page.url.searchParams.entries().toArray().flat())
  $effect(() => {
	// console.log('searchParams', searchParams);
	console.log('topic updated via effect', topic);
	
  })

	// Set focused data if it comes from query params
  $effect(() => {
    if (author !== page.url.searchParams.has('author')) { // TODO: shouldn't be .hasing here, right?
			// console.log('setting focus from layout to author', author);
      author = page.url.searchParams.get('author') || defaultAuthor;
			// focusedData = { type: 'author', query: author };
			focusedAuthor = author;
    }

		if (!author && page.url.searchParams.has('author')) {
			page.url.searchParams.delete('author');
			goto(`?${page.url.searchParams.toString()}`, { replaceState: true, keepFocus: true });
		}
  });

	$effect(() => {
		if (topic !== page.url.searchParams.get('topic')) {
			topic = page.url.searchParams.get('topic') || defaultTopic;
			// focusedData = { type: 'topic', query: topic };
			focusedTopic = topic;
		}

		if (!topic && page.url.searchParams.has('topic')) {
			page.url.searchParams.delete('topic');
			goto(`?${page.url.searchParams.toString()}`, { replaceState: true, keepFocus: true });
		}
	});

	$effect(() => {
		console.log("@@@ modeFX", mode);
		if (mode !== page.url.searchParams.get('mode')) {
			mode = page.url.searchParams.get('mode') as 'stream' | 'ridgeline' || defaultMode;
		}
		if (mode === defaultMode && page.url.searchParams.get('mode')) {
			page.url.searchParams.delete('mode');
			goto(`?${page.url.searchParams.toString()}`, { replaceState: true, keepFocus: true });
		}
	});

	// #endregion Query Params
	
	function pathToPoints(
		pathElement: SVGPathElement,
		numPoints: number = 32,
		startLength: number = 0,
		endLength: number | null = null
	): [number, number][] {
		const svg = pathElement.closest('svg');
		if (!svg) return [];

		const length = pathElement.getTotalLength();
		const finalEndLength = endLength ?? length;

		// Get SVG dimensions and scaling
		const svgRect = svg.getBoundingClientRect();
		const viewBox = svg.viewBox.baseVal;
		const scaleX = svgRect.width / viewBox.width;
		const scaleY = svgRect.height / viewBox.height;

		return Array.from({ length: numPoints }).map((_, i) => {
			const point = pathElement.getPointAtLength(
				startLength + (i * (finalEndLength - startLength)) / numPoints
			);

			// Transform point from viewBox coordinates to screen coordinates
			return [
				(point.x - viewBox.x) * scaleX + svgRect.left,
				(point.y - viewBox.y) * scaleY + svgRect.top
			];
		});
	}

	let width = $state(500);
	let height = $state(500);

	let numberOfCircles = $state(500);
	// TODO: numberOfCircles, and circleSize, should be derived from mobile v desktop
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
		.range([d3.hsl(nomadGreen).darker(0.5), d3.hsl(nomadGreen).brighter(0.5)]);

	const borderColor = 'rgba(0,0,0,0.3)';
	const borderWidth = 0.5;

	let canvasContext: CanvasRenderingContext2D | null = $state(null);

	const gooeyFilter = () => {
		const svg = `<svg xmlns="http://www.w3.org/2000/svg">
    <filter id="gooey">
      <feGaussianBlur in="SourceGraphic" stdDeviation="8" color-interpolation-filters="sRGB" result="blur" />
      <feColorMatrix class="blurValues" in="blur" mode="matrix" values=".2 0 0 0 0  0 .2 0 0 0  0 0 .2 0 0  0 0 0 17 -5" result="goo" />
			<feBlend in2="goo" in="SourceGraphic" result="mix" />
    </filter>
  </svg>`;
		// <feComposite in="SourceGraphic" in2="goo" operator="xor" result="comp" />
		// <feBlend in="comp" in2="SourceGraphic" mode="multiply" result="mix" />

		const blob = new Blob([svg], { type: 'image/svg+xml' });
		const url = URL.createObjectURL(blob);
		const filter = `url('${url}#gooey')`;
		return filter;
	};

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
		if (simulation && !titleHovered) {
			simulation.force(
				'mouse',
				d3.forceRadial(100, mouseX, mouseY).strength((d, i) => (i ? 0.02 : 0))
			);
		}
	}

	let radius = $derived.by(() => d3.randomUniform(circleSize, circleSize * 4)); // TODO: this is plainly not being observed anymore
	let simulation: d3.Simulation = $state(null);
	let circles = $state<any[]>([]);

	let localCircles: any[] = [];

	function initializeCircles() {
		let nodes = Array.from({ length: numberOfCircles }).map((_, i) => ({
			r: i ? radius() : minWidth * 10,
			x: width / 2,
			y: height / 2,
			color: nomadGreenScale(Math.random()),
			borderColor,
			borderWidth
			// color: '#00ca8e',
			// color: d3.color(nomadGreenScale(Math.random()))?.formatRgb()
			// .replace('rgb', 'rgba')
			// .replace(')', ', 0.6)'),
		}));

		localCircles = [...nodes];
	}

	let letterN: SVGPathElement | null = null;
	let nBounds: DOMRect | null = $state(null);
	let letterO: SVGPathElement | null = null;
	let oBounds: DOMRect | null = $state(null);
	let letterD: SVGPathElement | null = null;
	let dBounds = $state({
		left: 0,
		right: 0,
		top: 0,
		bottom: 0
	});

	$effect(() => {
		if (width && height && letterN) {
			nBounds = letterN.getBoundingClientRect();
		}
	});

	$effect(() => {
		if (width && height && letterO) {
			oBounds = letterO.getBoundingClientRect();
		}
	});

	const buffer = 10;
	const nLeft = $derived(nBounds?.left + nBounds?.width * 0.65 + buffer);
	const nRight = $derived(nBounds?.right - buffer);
	const nTop = $derived(nBounds?.top + buffer);
	const nBottom = $derived(nBounds?.bottom - buffer);

	const oLeft = $derived(oBounds?.left);
	const oRight = $derived(oBounds?.right);
	const oTop = $derived(oBounds?.top);
	const oBottom = $derived(oBounds?.bottom);

	let cachedNPoints = [];
	let cachedOPoints = [];

	$effect(() => {
		if (letterN && letterO) {
			cachedNPoints = letterNPoints;
			cachedOPoints = letterOPoints;
		}
	});

	// TODO: Resizeobserver was kind enough to let me know it was going really slowly, so I need to do a little perfy debouncing on letterNPoints and letterOPoints.

	const letterNPoints = $derived.by(() => {
		// console.log('---letterNPoints Calc');
		return Array.from({ length: numberOfCircles }).map((_, i) => {
			return {
				x: Math.random() * (nRight - nLeft) + nLeft,
				y: Math.random() * (nBottom - nTop) + nTop
			};
		});
	});

	const letterOPoints = $derived.by(() => {
		// console.log('---letterOPoints Calc');
		if (!letterO || !oBounds) return [];

		// Find the inner path start point using some real dark magic
		const length = letterO.getTotalLength();
		let innerStartIndex = 0;
		for (let i = 1; i < length; i++) {
			const point = letterO.getPointAtLength(i);
			const prevPoint = letterO.getPointAtLength(i - 1);
			// We're looking for a point in the path where it "jumps" at least 50 x-px and y-px. ¯\_(ツ)_/¯
			if (Math.abs(point.x - prevPoint.x) > 50 || Math.abs(point.y - prevPoint.y) > 50) {
				innerStartIndex = i;
				break;
			}
		}

		const outerPoints = pathToPoints(letterO, 32, 0, innerStartIndex);
		const innerPoints = pathToPoints(letterO, 32, innerStartIndex, length);

		// console.time('randomPoints');
		const randomPoints = [];
		while (randomPoints.length < numberOfCircles) {
			const x = Math.random() * (oRight - oLeft) + oLeft;
			const y = Math.random() * (oBottom - oTop) + oTop;

			// Add 5px buffer by checking if point is at least 5px away from inner path
			let buffer = 10;
			if (
				d3.polygonContains(outerPoints, [x + buffer, y]) &&
				d3.polygonContains(outerPoints, [x - buffer, y]) &&
				d3.polygonContains(outerPoints, [x, y + buffer]) &&
				d3.polygonContains(outerPoints, [x, y - buffer]) &&
				!d3.polygonContains(innerPoints, [x + buffer, y]) &&
				!d3.polygonContains(innerPoints, [x - buffer, y]) &&
				!d3.polygonContains(innerPoints, [x, y + buffer]) &&
				!d3.polygonContains(innerPoints, [x, y - buffer])
			) {
				randomPoints.push({ x, y });
			}
		}

		// console.timeEnd('randomPoints');
		return randomPoints;
	});

	// $inspect(letterNPoints);
	// $inspect(letterOPoints);

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
		return Math.round(d3.scaleLinear().domain([2000, 5000]).range([3, 1])(numberOfCircles));
	});

	// When height/width change, re-centre the graph

	let centeringStrength = $state(0.005);
	$effect(() => {
		if (!simulation) return;
		simulation.force(
			'x',
			d3.forceX(width / 2).strength((d, i) => (!i || d.isBoundary ? 0 : centeringStrength))
		);
		simulation.force(
			'y',
			d3.forceY(height / 2).strength((d, i) => (!i || d.isBoundary ? 0 : centeringStrength))
		);
	});

	function simulate(props: { alpha?: number } = {}) {
		let alpha = props.alpha || 0.1;
		if (localCircles.length !== numberOfCircles) {
			// Remove or add circles according to the difference
			if (localCircles.length && localCircles.length < numberOfCircles) {
				const newCircles = Array.from({ length: numberOfCircles - localCircles.length }).map(
					(_, i) => ({
						r: radius(),
						x: width / 2,
						y: height / 2,
						color: nomadGreenScale(Math.random()),
						borderColor,
						borderWidth
						// color: '#00ca8e',
					})
				);
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
				d3.forceX(width / 2).strength((d, i) => (!i || d.isBoundary ? 0 : centeringStrength))
			)
			.force(
				'y',
				d3.forceY(height / 2).strength((d, i) => (!i || d.isBoundary ? 0 : centeringStrength))
			)
			.force(
				'collide',
				d3
					.forceCollide()
					.radius((d) => (d.isBoundary ? d.r + repulsion * 5 : d.r + repulsion))
					.iterations(performanceIterations)
					.strength(1)
			)
			// .force('boundaryRepulsion', d3.forceManyBody().strength((d, i) => (!d.isBoundary ? -200 * repulsion : 0)))
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

	// #region title interaction

	const hoveredProps = {
		alpha: 0.001,
		velocityDecay: 0.95,
		alphaTarget: 0.01
		// force: d3.forceY(100).strength((_,i) => !i ? 0 : 10),
		// force2: d3.forceX(200).strength((_,i) => !i ? 0 : 10),
	};

	const unhoveredProps = {
		alpha: 0.1,
		velocityDecay: 0.9,
		alphaTarget: 0.1
	};

	let titleHovered = $state(false);

	function hoverTitle(e: PointerEvent) {
		titleHovered = true;
		if (canvasContext?.canvas) canvasContext.canvas.style.filter = gooeyFilter();
		simulation
			.alpha(hoveredProps.alpha)
			.alphaTarget(hoveredProps.alphaTarget)
			.velocityDecay(hoveredProps.velocityDecay)
			.force('x', null)
			.force('y', null)
			.force('collide', null)
			.force('mouseRepulsion', null);
		// .force('toTarget', d3.forceRadial(0, 0, 0).strength(0)); // placeholder, will tween in a sec
		// remove mouseRepulsion
		// .force('mouseRepulsion', null)
		// .force('boundingForce', hoveredProps.boundingForce(simulation))
		// .force('coverTitle', hoveredProps.force)
		// .force('coverTitle2', hoveredProps.force2)

		const oCircleThreshold = 0.3;

		localCircles.forEach((c, i) => {
			d3.select(c).interrupt();
			let targetPoint;
			if (i < numberOfCircles * oCircleThreshold) {
				targetPoint = cachedNPoints[i];
			} else {
				targetPoint = cachedOPoints[i];
			}
			if (!targetPoint) return; // in case I screw up my math (likely)
			d3.select(c)
				.transition()
				.delay(i * 0.2)
				.duration(1000)
				.ease(d3.easeCubicOut)
				.tween('position', () => {
					const startPoint = {
						x: c.x,
						y: c.y
					};

					// console.log(i, 'SP TP', startPoint, targetPoint);

					return (t: number) => {
						// If no longer hovering, break.
						if (!titleHovered) return;
						c.x = startPoint.x + (targetPoint.x - startPoint.x) * t;
						c.y = startPoint.y + (targetPoint.y - startPoint.y) * t;
						// c.r = 1;
					};
				});

			// c.x = targetPoint.x;
			// c.y = targetPoint.y;

			// c.r = 0;
			// d3.select(c)
		});
		simulation.alpha(0.1).restart();
	}

	function unhoverTitle(e: PointerEvent) {
		titleHovered = false;
		if (canvasContext?.canvas) canvasContext.canvas.style.filter = '';
		d3.selectAll('circle').interrupt();
		simulate();
	}
	// $inspect({titleHovered});
	// #endregion title interaction

	//#region hover data source

	const dataHoveredProps = {
		alpha: 0.1,
		velocityDecay: 0.4,
		alphaTarget: 0.2
	};
	function hoverDataSource(e: PointerEvent) {
		if (canvasContext?.canvas) canvasContext.canvas.style.filter = gooeyFilter();
		const midPoint = [
			e.target.getBoundingClientRect().left + e.target.getBoundingClientRect().width / 2,
			e.target.getBoundingClientRect().top + e.target.getBoundingClientRect().height / 2
		];
		// Strongly attract all nodes to the srcElement's position

		// Chop off half the circles
		localCircles = localCircles.slice(0, numberOfCircles / 10);
		// localCircles.slice(numberOfCircles / 5, numberOfCircles).forEach((c) => {
		//   c.r = 0;
		// });
		simulation
			.alpha(dataHoveredProps.alpha)
			.alphaTarget(dataHoveredProps.alphaTarget)
			.velocityDecay(dataHoveredProps.velocityDecay)
			.force('x', null)
			.force('y', null)
			// .force('collide', null)
			// .force(
			// 	'collide',
			// 	d3
			// 		.forceCollide()
			// 		.radius(1.5)
			// 		.iterations(performanceIterations)
			// 		.strength(0.5)
			// )
			// .force('mouseRepulsion', null)
			// .force('data', d3.forceRadial(20, midPoint[0], midPoint[1]).strength(0.9))
			.force('dataX', d3.forceX(midPoint[0]).strength(1))
			.force('dataY', d3.forceY(midPoint[1]).strength(2));
		// .force('dataX', d3.forceX(e.clientX).strength(0.5))
		// .force('dataY', d3.forceY(e.clientY).strength(0.5));

		simulation.force('collide').strength(0.2);
		// simulation.force('mouseRepulsion').strength(-1)
		simulation
			// .alpha(0.001)
			// .velocityDecay(0.01)
			// .alphaTarget(0.001)
			.force(
				'mouseRepulsion',
				d3.forceManyBody().strength((d, i) => (i ? -10 : -1 * repulsion))
			);

		// localCircles.forEach((c) => {
		// c.r = 1;
		// c.color = '#00ca8e';
		// });

		// localCircles.forEach((c, i) => {
		//   d3.select(c).interrupt();
		//   d3.select(c)
		//     .transition()
		//     .duration(50)
		//     .ease(d3.easeCubicInOut)
		//     .tween('r', () => {
		//       const startR = c.r;
		//       const endR = 0.5;
		//       return (t: number) => {
		//         c.r = startR + (endR - startR) * t;
		//       };
		//     });
		// });
	}
	function unhoverDataSource(e: PointerEvent) {
		if (canvasContext?.canvas) canvasContext.canvas.style.filter = '';
		simulation.alpha(0.1);
		localCircles.slice(1).forEach((c) => {
			c.r = radius();
		});
		simulate({ alpha: 0.5 });
	}
	//#endregion hover data source

	// #region sidebar
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
		'policies',
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
		'disconnected'
	];

	type Focus = {
		type: 'topic' | 'author';
		query: string;
	};

	// let focusedData: Focus = $state({
	// 	type: 'topic',
	// 	query: ''
	// });

	let highlightedTopic: string | null = $state(null);
	let highlightedAuthor: string | null = $state(null);
	let focusedTopic: string | null = $state(null);
	let focusedAuthor: string | null = $state(null);

	// let streamModeContext = $state(mode);

	// let topic = $state('');
	// setContext('focus', () => focusedData); // TODO: tie to queryParams
	setContext('focusedTopic', () => focusedTopic);
	setContext('focusedAuthor', () => focusedAuthor);
	setContext('streamMode', () => mode)

	let contributors = $state(data.contributors);
	console.log('contributors', contributors);
	// let authors = $derived.by(() => {
	// 	// console.log('contributors', contributors);
	// 	return contributors.map((c) => {
	// 		return {
	// 			avatar: c.author.avatar_url,
	// 			name: c.author.login
	// 		};
	// 	});
	// });

	// function setFocus({ type, query }: { type: 'topic' | 'author'; query: string }) {
	// 	console.log('setting focus from layout to', type, query);
	// 	focusedData = { type, query };
	// 	// goto(`?${type}=${query}`, { keepFocus: true });
	// 	page.url.searchParams.set(type, query);
	// 	goto(`?${page.url.searchParams.toString()}`, { keepFocus: true });

	// 	// console.log('existing query on setFocus is', query);
	// }

	function focusTopic(topic: string | null) {
		focusedTopic = topic;
		if (topic) {
			page.url.searchParams.set('topic', topic);
			goto(`?${page.url.searchParams.toString()}`, { keepFocus: true });
		} else {
			page.url.searchParams.delete('topic');
			goto(`?${page.url.searchParams.toString()}`, { keepFocus: true });
		}
	}

	function focusAuthor(author: string | null) {
		focusedAuthor = author;
		if (author) {
			page.url.searchParams.set('author', author);
			goto(`?${page.url.searchParams.toString()}`, { keepFocus: true });
		} else {
			page.url.searchParams.delete('author');
			goto(`?${page.url.searchParams.toString()}`, { keepFocus: true });
		}
	}

	function highlightTopic(topic: string | null) {
		if (topic) {
			highlightedTopic = topic;
		} else {
			// metadataStore.set([]);
			highlightedTopic = null;
		}
	}

	function highlightAuthor(author: string | null) {
		if (author) {
			highlightedAuthor = author;
		} else {
			highlightedAuthor = null;
		}
	}

	let associatedAuthors = $derived.by(() => {
		let filtered = contributors.filter(c => c.author.terms.map(t => t.term).includes(highlightedTopic)).map(c => c.author.login);
		// console.log('filtered', filtered);
		return filtered;
	});
	
	let associatedTopics = $derived.by(() => {
		let filtered = TOPICS.filter(t => highlightedAuthor?.author.terms.map(t => t.term).includes(t));
		console.log('filtered', filtered);
		return filtered;
	});

	function setStreamMode(vizType) {
		page.url.searchParams.set('mode', vizType);
		goto(`?${page.url.searchParams.toString()}`, { replaceState: false, keepFocus: true });
		mode = 'ridgeline';
	}

	let sidebarOpen = $state(false);

	// #endregion sidebar
</script>

<svelte:window bind:innerHeight={height} bind:innerWidth={width} {onpointermove} />
<svelte:head>
	<title>NOMAD@10</title>
</svelte:head>
<!-- 
<Canvas id="backgrounder" {width} {height} bind:ctx={canvasContext}>
	{#each circles as circle}
		<Circle midPoint={[circle.x, circle.y]} radius={circle.r} color={circle.color} borderColor={circle.borderColor} borderWidth={circle.borderWidth} />
	{/each}
</Canvas>
 -->
<main>
	<header>
		<h1
			aria-label="Nomad"
			onmouseover={hoverTitle}
			onmouseout={unhoverTitle}
			onfocus={hoverTitle}
			onblur={unhoverTitle}
			class:hovered={titleHovered}
		>
			<a href="/" aria-label="Nomad">
				<svg viewBox="24 79 1759 443" xmlns="http://www.w3.org/2000/svg">
					<path
						bind:this={letterN}
						class="letter-n"
						d="M205.8,498.59l-67.8-153c-2.4-6-7.2-4.2-7.2,1.8l2.4,145.8c0,11.4-6,16.8-16.8,16.8H40.8c-10.8,0-16.8-6-16.8-16.8V106.79c0-10.8,6-16.8,16.8-16.8h84c9.6,0,15.6,4.2,19.2,12.6l66,153c2.4,6,7.2,4.8,7.2-1.2V106.79c0-10.8,6-16.8,16.8-16.8h75.6c10.8,0,16.8,5.4,16.8,16.8l-.6,387c0,11.4-6,16.8-16.8,16.8l-84,.6c-9.6,0-15.6-3.6-19.2-12.6Z"
					/>
					<path
						bind:this={letterO}
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
						bind:this={letterD}
						class="letter-d"
						d="M1498.79,106.79c0-10.8,6-16.8,16.8-16.8h123.6c142.8,0,141.6,94.8,142.2,104.4.6,13.2,1.2,42.6,1.2,43.8v123.6c0,1.2.6,24.6-1.2,37.8-1.2,9.6,1.2,110.4-142.2,110.4h-140.4c.6,0,0-324.6,0-403.2ZM1642.19,409.79c28.8-.6,28.8-25.2,28.8-25.2v-169.2s0-25.2-28.8-25.8h-24c-3.6,0-6,2.4-6,6v214.2c0,1.2,12.6,0,30,0Z"
					/>
				</svg>
			</a>
		</h1>
		<!-- <nav>
      <a onmouseover={hoverDataSource} onmouseout={unhoverDataSource} href="/">Timeline</a>
      <a onmouseover={hoverDataSource} onmouseout={unhoverDataSource} href="/releases">Releases</a>
      <a onmouseover={hoverDataSource} onmouseout={unhoverDataSource} href="/contributors">Contributors</a>
      <a onmouseover={hoverDataSource} onmouseout={unhoverDataSource} href="/stars">Stars</a>
    </nav> -->
	</header>

	<aside class:open={sidebarOpen}>
		{#if sidebarOpen}
			<button class="toggle" onclick={() => {
				sidebarOpen = false;
			}}>
				Close
			</button>
		{:else}
			<button class="toggle" onclick={() => {
				sidebarOpen = true;
			}}>
				Open
			</button>
		{/if}
		<nav>
			<a class:active={page.url.pathname === '/'} href="/">Timeline</a>
			<!-- <a href="/releases">Releases</a> -->
			<a class:active={page.url.pathname === '/contributors'} href="/contributors">Contributors</a>
			<!-- <a href="/stars">Stars</a> -->
		</nav>

		<!-- if page is contributors -->

		{#if page.url.pathname === '/contributors'}
			<button class:active={mode === 'stream'} onclick={() => {
				setStreamMode('stream');
			}}>Stream Mode</button>
			<button class:active={mode === 'ridgeline'} onclick={() => {
				setStreamMode('ridgeline');
			}}>Ridgeline Mode</button>
		{/if}

		<div class="topics">
			<!-- <input type="text" bind:value={topic} /> -->
			{#each TOPICS as topicButton}
				<button
					class="topic"
					class:highlighted={associatedTopics.includes(topicButton)}
					onmouseover={() => {
						highlightTopic(topicButton);
					}}
					onfocus={() => {
						highlightTopic(topicButton);
					}}
					onmouseout={() => {
						highlightTopic(null);
					}}
					onblur={() => {
						highlightTopic(null);
					}}
					onclick={() => {
						metadataStore.set([{key: "Topic", value: topicButton}]);
						focusTopic(topicButton);
					}}
				>
					{topicButton}
				</button>
			{/each}
		</div>
		<div class="authors">
			{#each contributors.slice(0, 30) as contributor}
				<button
					class="author"
					class:highlighted={associatedAuthors.includes(contributor.author.login)}
					onmouseover={() => {
						highlightAuthor(contributor);
					}}
					onfocus={() => {
						highlightAuthor(contributor);
					}}
					onmouseout={() => {
						highlightAuthor(null);
					}}
					onblur={() => {
						highlightAuthor(null);
					}}
					onclick={() => {
						focusAuthor(contributor.author.login);
					}}
				>
					<img src={contributor.author.avatar_url} style="width: 20px; height: 20px; border-radius: 50%;" />
					{contributor.author.login}
				</button>
			{/each}
		</div>
		{#if focusedAuthor || focusedTopic}
			<button class="clear-filter" onclick={() => {
				focusAuthor(null);
				focusTopic(null);
			}}>
				Clear Filter
			</button>
		{/if}
		<section class="metadata">
			Metadata
			{#if metadata.length}
				{#each metadata as {key, value}}
					{#if key === 'url'}
						<a href={value} target="_blank">
							View URL
						</a>
					{:else if key === 'date'}
						<div>
							<strong>Date</strong>
							{new Date(value).toLocaleDateString('en-US', {
								year: 'numeric',
								month: 'long',
								day: 'numeric',
							})}
						</div>
					{:else}
						<div>
							<strong>{key}</strong>
							{value}
						</div>
					{/if}
				{/each}
			{/if}
		</section>
	</aside>

	<section class="page">
		{@render children({
			hoverDataSource,
			unhoverDataSource
		})}
	</section>
</main>

{#if meta}
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
		<input type="range" bind:value={numberOfCircles} min="10" max="5000" onchange={simulate} />
		{numberOfCircles}
		<hr />
		Repulsion:<br />
		<input type="range" bind:value={repulsion} min="1" max="10" onchange={simulate} />
		{repulsion}
	</section>
{/if}

<style>
	main {
		overflow: hidden;
		/* TODO: expanding chart yScale or chartHeight appears to go beyond the bottom barrier */
		position: relative;
		background: #ffe;
		border: 0.4rem solid rgba(0, 0, 0, 0.2);
		width: 100vw;
		height: 100vh;
		box-sizing: border-box;
		/* display: grid; */
		/* grid-template-rows: auto 1fr; */
		/* grid-auto-flow: row; */
		/* grid-template-columns: minmax(150px, 280px) 1fr;
		grid-template-rows: auto 1fr;
		grid-template-areas:
			'sidebar header'
			'sidebar main'; */

		header {
			grid-area: header;
			width: 100%;
			padding: 0 10%;
			box-sizing: border-box;
			h1 {
				max-width: 500px;
				display: grid;
				position: relative;
				z-index: 2;
				margin: 0 auto;
				padding: 1rem 0;
				&.hovered {
					z-index: 1;
				}
			}
			/* nav {
      display: grid;
      gap: 1px;
      grid-auto-flow: row;
      margin-bottom: 1rem;
      a {
        display: block;
        padding: 0.25rem 0.5rem;
        background-color: black;
        border-radius: 0.5rem;
        text-decoration: none;
        color: white;
        font-family: 'VaultAlarm', sans-serif;
        text-align: center;
      }
      position: relative;
      z-index: 2;
    } */
		}

		&.data-loaded {
			header {
				max-width: 30%;
			}
		}
	}

	aside {
		grid-area: sidebar;
		padding: 1rem;
		position: fixed;
		width: calc(100vw - 2rem);
		height: 100vh;
		top: 0;
		left: calc(-100vw + 2rem);
		box-sizing: border-box;
		z-index: 2;
		background-color: rgba(255, 255, 255, 0.9);
		transition: left 0.3s ease-in-out;

		&.open {
			left: 0;
		}

		.toggle {
			position: absolute;
			top: calc(50% - 25px);
			right: -25px;
			width: 50px;
			height: 50px;
			background-color: black;
			color: white;
			border-radius: 0 4px 4px 0;
			border: none;
			cursor: pointer;
		}
		

		nav {
			display: grid;
			grid-auto-flow: column;
			gap: 0.5rem;
			width: 100%;
			margin-bottom: 1rem;

			a {
				padding: 0.5rem 1rem;
				background-color: black;
				border-radius: 0.5rem;
				color: white;
				font-size: 0.8em;
				text-decoration: none;
				text-align: center;
				&.active {
					background-color: #00ca8e;
					color: black;
				}
			}
		}

		.authors,
		.topics {
			display: flex;
			flex-wrap: wrap;
			gap: 5px;
			max-width: 850px;
			margin: auto;
			margin-bottom: 10px;

			.author,
			.topic {
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
				transition: background 0.1s ease-in-out;
				&:hover {
					background: #f0f0f0;
				}
				&.highlighted {
					/* background: #00ca8e; */
					background: rgba(0, 202, 142, 0.5);
					color: black;
				}
				&.topic {
					grid-template-columns: 1fr;
				}
			}
		}
	}

	.page {
		grid-area: main;
		width: 100%;
		height: 100%;
		padding-bottom: 4rem;
	}

	@media (min-width: 960px) {
		main {
			border: 2rem solid rgba(0,0,0,0.2);
			display: grid;
			grid-template-columns: minmax(150px, 280px) 1fr;
			grid-template-rows: auto 1fr;
			grid-template-areas:
				'sidebar header'
				'sidebar main';

			
			header {
				nav {
					grid-auto-flow: column;
					gap: 1rem;
					a {
						padding: 0.5rem 1rem;
					}
				}
			}

			.page {
				height: auto;
			}

			aside {
				position: relative;
				left: 0;
				width: auto;
				height: 100%;
				transition: left 0.3s ease-in-out;
				background-color: transparent;
				.toggle {
					display: none;
				}
			}
		}
	}

</style>
