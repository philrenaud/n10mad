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
	import { createMetadataStore } from '$lib/components/metadata.svelte'

	function sanitizeParam(param: string | null): string | null {
		if (param === null) return null;
		return param.replace(/[<>"'&]/g, '');
	}
	
	let metadataStore = createMetadataStore();
	let metadata = $derived.by(() => {
		return metadataStore.metadata;
	})
	setContext('metadataStore', metadataStore);

	// find by key 'author' or null
	let authorMetadata: { key: string; value: string } | null = $derived.by(() => {
		// console.log('searching metadata for author', metadata.length, metadata[0]?.key);
		return metadata.find(m => m.key === 'author') || null;
	})

	let topicMetadata: { key: string; value: string } | null = $derived.by(() => {
		return metadata.find(m => m.key === 'topic') || null;
	})

	let contextualAuthorName: string | null = $derived.by(() => {
		return metadata.find(m => m.key === 'contextualAuthorName')?.value || null;
	})

	let contextualAuthorMetadata = $state<{ key: string; value: string } | null>(null);

	let contextualTopicName: string | null = $derived.by(() => {
		return metadata.find(m => m.key === 'contextualTopicName')?.value || null;
	})

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
  // Sanitize URL parameters at the entry point
  let topic: string | null = $state(sanitizeParam(page.url.searchParams.get('topic')) || defaultTopic);
  let author: string | null = $state(sanitizeParam(page.url.searchParams.get('author')) || defaultAuthor);
  let mode: 'stream' | 'ridgeline' = $state(page.url.searchParams.get('mode') as 'stream' | 'ridgeline' || defaultMode);

  // Sync URL changes to state
  $effect(() => {
    // Check for author parameter changes and sanitize
    const urlAuthor = sanitizeParam(page.url.searchParams.get('author'));
    if (urlAuthor !== author) {
      author = urlAuthor;
      focusedAuthor = urlAuthor;
    }

    // Check for topic parameter changes and sanitize
    const urlTopic = sanitizeParam(page.url.searchParams.get('topic'));
    if (urlTopic !== topic) {
      topic = urlTopic;
      focusedTopic = urlTopic;
    }

    // Check for mode parameter changes
    const urlMode = page.url.searchParams.get('mode') as 'stream' | 'ridgeline';
    if (urlMode !== mode && (urlMode === 'stream' || urlMode === 'ridgeline')) {
      mode = urlMode;
    }
  });

  // Filter any new URL parameters when they're set
  function setURLParam(name: string, value: string | null) {
    if (value === null) {
      page.url.searchParams.delete(name);
    } else {
      page.url.searchParams.set(name, sanitizeParam(value) || '');
    }
    goto(`?${page.url.searchParams.toString()}`, { replaceState: true, keepFocus: true });
  }

	function getAuthorMetadata(author: string) {
		let contributorInfo = data.contributors.find(c => c.author.login === author);
		const contributingWeeks = contributorInfo?.weeks.filter(w => w.c > 0).length;
		const firstCommitWeek = new Date(contributorInfo?.weeks.find(w => w.c > 0)?.w*1000).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		});
		const totalCommits = contributorInfo?.total;
		const topics = contributorInfo?.author.terms.map(t => t.term).slice(0,5);
		return `${contributorInfo?.author.login} has contributed ${totalCommits} commits over ${contributingWeeks} weeks, starting ${firstCommitWeek}. <br /><br /> Characteristic commit messages include things like <strong>${topics.map(t => `"${t}"`).join('</strong>, <strong>')}</strong>.`
	}

	function getTopicMetadata(topic: string) {
		const weeksWithTopic = data.topics.filter(t => t.terms.map(t => t.term).includes(topic));
		const authorsWithTopic = data.contributors.filter(c => c.author.terms.map(t => t.term).includes(topic)).map(c => c.author.login).slice(0,5);
		return `The term <strong>"${topic}"</strong> has been mentioned in ${weeksWithTopic.length} weeks, by at least ${authorsWithTopic.length} authors, including <strong>${authorsWithTopic.slice(0, -1).join('</strong>, <strong>')}</strong>, and <strong>${authorsWithTopic[authorsWithTopic.length - 1]}</strong>.`
	}

	// set metadata from url params or from in-context page setting like hover where we don't want to set urlParams
	$effect(() => {
		if (contextualAuthorName) {
			// Only set author metadata if the author exists in our data
			const authorExists = data.contributors.some(c => c.author.login === contextualAuthorName);
			if (authorExists) {
				contextualAuthorMetadata = {key: "contextualAuthor", value: getAuthorMetadata(contextualAuthorName)};
			}
		} else if (author) {
			// Only set author metadata if the author exists in our data
			const authorExists = data.contributors.some(c => c.author.login === author);
			if (authorExists) {
				metadataStore.set([{key: "author", value: getAuthorMetadata(author)}]);
			} else {
				// Invalid author in URL, clear it
				author = null;
				focusedAuthor = null;
				setURLParam('author', null);
			}
		} else if (topic) {
			// Only set topic metadata if the topic exists in our data
			const topicExists = data.topics.some(t => t.terms.some(term => term.term === topic));
			if (topicExists) {
				metadataStore.set([{key: "topic", value: getTopicMetadata(topic)}]);
			} else {
				// Invalid topic in URL, clear it
				topic = null;
				focusedTopic = null;
				setURLParam('topic', null);
			}
		}
	})

  // Clean up URL parameters when values are null
  $effect(() => {
    let needsUpdate = false;
    
    // Remove topic param if it's the default
    if (!topic && page.url.searchParams.has('topic')) {
      page.url.searchParams.delete('topic');
      needsUpdate = true;
    }
    
    // Remove author param if it's the default
    if (!author && page.url.searchParams.has('author')) {
      page.url.searchParams.delete('author');
      needsUpdate = true;
    }
    
    // Remove mode param if it's the default
    if (mode === defaultMode && page.url.searchParams.has('mode')) {
      page.url.searchParams.delete('mode');
      needsUpdate = true;
    }
    
    // Update URL if needed
    if (needsUpdate) {
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

	let numberOfCircles = $state(200);
	const NODE_DELAY = 10;
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
		.range([d3.hsl(nomadGreen).darker(0.2), d3.hsl(nomadGreen).brighter(0.2)]);

	const borderColor = 'rgba(0,0,0,0.3)';
	// const borderWidth = 0.5;
	const borderWidth = 0.05;

	let canvasContext: CanvasRenderingContext2D | null = $state(null);

	const gooeyFilter = () => {
		const svg = `<svg xmlns="http://www.w3.org/2000/svg">
    <filter id="gooey">
      <feGaussianBlur in="SourceGraphic" stdDeviation="8" color-interpolation-filters="sRGB" result="blur" />
      <feColorMatrix class="blurValues" in="blur" mode="matrix" values=".5 0 0 0 0  0 .5 0 0 0  0 0 .5 0 0  0 0 0 17 -5" result="goo" />
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

	let radius = $derived.by(() => d3.randomUniform(circleSize, circleSize * 4)); // TODO: this is plainly not being observed anymore
	let simulation: d3.Simulation = $state(null);
	let circles = $state<any[]>([]);

	let localCircles: any[] = [];

	const ANIMATION_DELAY = 1000;

	function initializeCircles() {
  let nodes = Array.from({ length: numberOfCircles }).map((_, i) => ({
    r: radius(),
    x: Math.random() * width,
    y: -500 + Math.random() * 500, // Start off-screen
    color: nomadGreenScale(Math.random()),
    borderColor,
    borderWidth
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

	const buffer = 5;
	const nLeft = $derived(nBounds?.left + nBounds?.width * 0.65 + buffer);
	const nRight = $derived(nBounds?.right - buffer);
	const nTop = $derived(nBounds?.top + buffer);
	const nBottom = $derived(nBounds?.bottom - buffer);

	const oLeft = $derived(oBounds?.left);
	const oRight = $derived(oBounds?.right);
	const oTop = $derived(oBounds?.top);
	const oBottom = $derived(oBounds?.bottom);

	let cachedNPoints = $state<{x: number, y: number}[]>([]);
	let cachedOPoints = $state<{x: number, y: number}[]>([]);

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
			// let buffer = 10;
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

	function startSimpleSimulation() {
		// Stop any existing simulation
		if (simulation) simulation.stop();
		
		// Create a simple initial simulation
		simulation = d3
			.forceSimulation(localCircles)
			.alpha(0.3)
			.alphaDecay(0.01)
			.force('collide', d3.forceCollide().radius(d => d.r + 0.2).iterations(2))
			.on('tick', () => {
				circles = [...localCircles];
			});

		// Start timer to transition to letter shapes
		setTimeout(() => {
			moveCirclesToLetters();
		}, ANIMATION_DELAY);
	}

	function moveCirclesToLetters() {
		console.log('moving circles to letters');
		if (!cachedNPoints.length || !cachedOPoints.length) return;
		
		// Stop the simulation during transition
		simulation.stop();
		
		const oCircleThreshold = 0.3;
		
		// For each circle, transition to its letter position
		localCircles.forEach((c, i) => {
			// First interrupt any ongoing transitions
			d3.select(c).interrupt();
			
			// Determine target position
			let targetPoint;
			if (i < numberOfCircles * oCircleThreshold) {
				targetPoint = cachedNPoints[i];
			} else {
				targetPoint = cachedOPoints[i - Math.floor(numberOfCircles * oCircleThreshold)];
			}
			
			if (!targetPoint) return;
			
			// Create transition with staggered delay
			d3.select(c)
				.transition()
				.delay(i * NODE_DELAY)
				.duration(1000)
				.ease(d3.easeCubicOut)
				.tween('position', () => {
					const startX = c.x;
					const startY = c.y;
					
					return (t) => {
						c.x = startX + (targetPoint.x - startX) * t;
						c.y = startY + (targetPoint.y - startY) * t;
						circles = [...localCircles]; 
					};
				});
		});
		
		// Set up animation loop to continuously update circles during transition
		const updateCircles = () => {
			circles = [...localCircles];
		};
		
		// Start the animation loop
		updateCircles();
		
		// After all transitions complete, stop the animation loop and start final simulation
		setTimeout(() => {
			startFinalSimulation();
		}, numberOfCircles * NODE_DELAY + 1100); // Slightly longer than the longest transition
	}

	function startFinalSimulation() {
		// Very light simulation to maintain letter shape
		simulation = d3
			.forceSimulation(localCircles)
			.alpha(0.1)
			.alphaDecay(0.02)
			.velocityDecay(0.8)
			.force('collide', d3.forceCollide().radius(d => d.r * 0.3).iterations(2))
			.on('tick', () => {
				circles = [...localCircles];
			});
	}

	onMount(() => {
		if (width > 1000) {
			initializeCircles();
			if (canvasContext?.canvas) {
				canvasContext.canvas.style.filter = gooeyFilter();
			}
			// Wait for letter elements to be available
			const checkLetters = setInterval(() => {
				if (letterN && letterO) {
					clearInterval(checkLetters);
					nBounds = letterN.getBoundingClientRect();
					oBounds = letterO.getBoundingClientRect();
					cachedNPoints = letterNPoints;
					cachedOPoints = letterOPoints;
					// console.log('cachedOPoints', cachedOPoints);
					startSimpleSimulation();
				}
			}, 100);
		}
	});

	onDestroy(() => {
		if (simulation) simulation.stop();
	});

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

	// Define Focus interface and export it
	interface Focus {
		type?: 'topic' | 'author';
		query?: string;
	}

	let highlightedTopic: string | null = $state(null);
	let highlightedAuthor: string | null = $state(null);
	let focusedTopic: string | null = $state(topic);
	let focusedAuthor: string | null = $state(author);

	// Calculate the current focus based on highlighted and focused states
	let currentFocus: Focus = $state({});

	$effect(() => {
		// Priority: highlight (hover) takes precedence over focus (clicked/URL)
		if (highlightedAuthor) {
			currentFocus = {
				type: 'author',
				query: highlightedAuthor
			};
		} else if (highlightedTopic) {
			currentFocus = {
				type: 'topic',
				query: highlightedTopic
			};
		} else if (focusedAuthor) {
			currentFocus = {
				type: 'author',
				query: focusedAuthor
			};
		} else if (focusedTopic) {
			currentFocus = {
				type: 'topic',
				query: focusedTopic
			};
		} else {
			currentFocus = {};
		}
	});

	// Set context for all the focus states
	setContext('focus', () => currentFocus);
	setContext('focusedTopic', () => focusedTopic);
	setContext('focusedAuthor', () => focusedAuthor);
	setContext('highlightedTopic', () => highlightedTopic);
	setContext('highlightedAuthor', () => highlightedAuthor);
	setContext('streamMode', () => mode);

	let contributors = $state(data.contributors);
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

	function focusTopic(newTopic: string | null) {
		if (newTopic === focusedTopic) return;
		
		focusedTopic = newTopic;
		topic = newTopic;
		
		if (newTopic) {
			// Clear any author focus when setting topic
			focusedAuthor = null;
			author = null;
			
			// Update URL
			page.url.searchParams.set('topic', newTopic);
			if (page.url.searchParams.has('author')) {
				page.url.searchParams.delete('author');
			}
		} else {
			// Clear topic from URL
			page.url.searchParams.delete('topic');
		}
		
		goto(`?${page.url.searchParams.toString()}`, { keepFocus: true });
	}

	function focusAuthor(newAuthor: string | null) {
		if (newAuthor === focusedAuthor) return;
		
		focusedAuthor = newAuthor;
		author = newAuthor;
		
		if (newAuthor) {
			// Clear any topic focus when setting author
			focusedTopic = null;
			topic = null;
			
			// Update URL
			page.url.searchParams.set('author', newAuthor);
			if (page.url.searchParams.has('topic')) {
				page.url.searchParams.delete('topic');
			}
		} else {
			// Clear author from URL
			page.url.searchParams.delete('author');
		}
		
		goto(`?${page.url.searchParams.toString()}`, { keepFocus: true });
	}

	function highlightTopic(newTopic: string | null) {
		highlightedTopic = newTopic;
		
		if (newTopic) {
			// Clear any author highlight when setting topic highlight
			highlightedAuthor = null;
		}
	}

	function highlightAuthor(newAuthor: string | null) {
		highlightedAuthor = newAuthor;
		
		if (newAuthor) {
			// Clear any topic highlight when setting author highlight
			highlightedTopic = null;
		}
	}

	let associatedAuthors = $derived.by(() => {
		let filtered = contributors.filter(c => c.author.terms.map(t => t.term).includes(highlightedTopic)).map(c => c.author.login);
		// console.log('filtered', filtered);
		return filtered;
	});
	
	let associatedTopics = $derived.by(() => {
		let author = contributors.find(c => c.author.login === highlightedAuthor);
		let filtered = TOPICS.filter(t => author?.author.terms.map(t => t.term).includes(t));
		// console.log('filtered', filtered);
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

<svelte:window bind:innerHeight={height} bind:innerWidth={width} />

<svelte:head>
	<title>NOMAD@10</title>
</svelte:head>

<Canvas id="backgrounder" {width} {height} bind:ctx={canvasContext}>
	{#each circles as circle}
		<Circle midPoint={[circle.x, circle.y]} radius={circle.r} color={circle.color} borderColor={circle.borderColor} borderWidth={circle.borderWidth} />
	{/each}
</Canvas>

<main>
	<header>
		<h1
			aria-label="Nomad"
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
	</header>

	<section class="metadata">
		<p>
			{#if contextualAuthorMetadata}
				{@html contextualAuthorMetadata.value}
			{:else if authorMetadata}
				{@html authorMetadata.value}
			{:else if topicMetadata}
				{@html topicMetadata.value}
			{:else}
				Nomad is turning 10! Since the first commit on June 1st, 2015, we've merged more than 27,000 commits. Nomad has been a journey of steady growth, focus, and determination by over 1,000 authors. Explore some topics and their contributors and learn more about the project!
			{/if}			
		</p>
	</section>

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
			<a class:active={page.url.pathname === '/contributors'} href="/contributors">Contributors</a>
		</nav>

		{#if page.url.pathname === '/contributors'}
		<div class="mode-buttons">
			<button class="mode-button" class:active={mode === 'stream'} onclick={() => {
				setStreamMode('stream');
			}}>Stream Mode</button>
				<button class="mode-button" class:active={mode === 'ridgeline'} onclick={() => {
					setStreamMode('ridgeline');
				}}>Ridgeline Mode</button>
		</div>
		{/if}

		<div class="topics">
			<!-- <input type="text" bind:value={topic} /> -->
			{#each TOPICS as topicButton}
				<button
					class="topic"
					class:highlighted={associatedTopics.includes(topicButton)}
					class:pinned={focusedTopic === topicButton}
					title="click to pin topic"
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
						if (topicButton === focusedTopic) {
							focusTopic(null);
						} else {
							metadataStore.set([{key: "topic", value: topicButton}]);
							focusTopic(topicButton);
						}
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
					class:pinned={focusedAuthor === contributor.author.login}
					title="click to pin author"
					onmouseover={() => {
						highlightAuthor(contributor.author.login);
					}}
					onfocus={() => {
						highlightAuthor(contributor.author.login);
					}}
					onmouseout={() => {
						highlightAuthor(null);
					}}
					onblur={() => {
						highlightAuthor(null);
					}}
					onclick={() => {
						if (contributor.author.login === focusedAuthor) {
							focusAuthor(null);
						} else {
							metadataStore.set([{key: "author", value: contributor.author.login}]);
							focusAuthor(contributor.author.login);
						}
					}}
				>
					<img src={contributor.author.avatar_url} style="width: 20px; height: 20px; border-radius: 50%;" />
					{contributor.author.login}
				</button>
			{/each}

			<input class="author-search" placeholder="search authors" type="text" onkeyup={(e) => {
				if (contributors.find(c => c.author.login === e.target.value)) {
					focusAuthor(e.target.value);
				} else {
					focusAuthor(null);
				}
			}} />
		</div>
		{#if focusedAuthor || focusedTopic}
			<button class="clear-filter" onclick={() => {
				focusAuthor(null);
				focusTopic(null);
				metadataStore.set([]);
				contextualAuthorMetadata = null;
				// contextualTopicMetadata = null;
			}}>
				Clear Filter
			</button>
		{/if}

		<!-- <section class="metadata">
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
		</section> -->

	</aside>

	<section class="page">
		{@render children()}
	</section>
</main>

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
		display: grid;
		grid-template-rows: auto 150px 1fr;
		grid-template-areas:
			'header'
			'metadata'
			'main';
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
				/* z-index: 2; */
				z-index: 1;
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

		.metadata {
			grid-area: metadata;
			padding: 0 10%;

			p {
					max-width: 850px;
					margin: auto;
					padding: 1rem;
				}

		}
	}

/* TODO: need to establish "metadata" area in the grid */

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
		overflow: auto;

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
				background-color: white;
				border-radius: 0.5rem;
				color: black;
				font-size: 0.8em;
				text-decoration: none;
				text-align: center;
				box-shadow: 2px 2px 2px 0px rgba(0, 0, 0, 0.1);
				
				&.active {
					background-color: #00ca8e;
					color: black;
				}
			}
		}

		.mode-buttons {
			display: grid;
			grid-auto-flow: column;
			gap: 0.5rem;
			width: 100%;
			margin-bottom: 1rem;
			button {
				padding: 0.5rem 0rem;
				background-color: white;
				border-radius: 0.5rem;
				border-width: 0;
				color: black;
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
				border: 2px solid transparent;
				display: inline-grid;
				grid-template-columns: 20px 1fr;
				gap: 5px;
				background: white;
				border-radius: 40px;
				padding: 2px 4px;
				box-shadow: 2px 2px 2px 0px rgba(0, 0, 0, 0.1);
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
				&.pinned {
					background: #00ca8e;
					border: 2px solid rgba(0, 0, 0, 0.6);
					box-sizing: border-box;
					box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
				}
				&.topic {
					grid-template-columns: 1fr;
				}
			}
		}

		.author-search {
			width: 100%;
			padding: 0.5rem;
			border-radius: 0.5rem;
			border: 1px solid #ccc;
			margin: 1rem 0;
		}

		.clear-filter {
			margin-top: 1rem;
			width: 100%;
			background-color: #222;
			color: white;
			border-radius: 0.5rem;
			padding: 0.5rem 1rem;
		}
	}

	.page {
		grid-area: main;
		/* width: 100%; */
		height: 100%;
		/* padding-bottom: 4rem; */
	}

	@media (min-width: 960px) {
		main {
			border: 2rem solid rgba(0,0,0,0.2);
			display: grid;
			grid-template-columns: minmax(150px, 280px) 1fr;
			grid-template-rows: auto 150px 1fr;
			grid-template-areas:
				'sidebar header'
				'sidebar metadata'
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
				padding-bottom: 0;
			}

			.metadata {
				grid-area: metadata;
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

	@page {
		size: A4;
		margin: 0;
	}

	@media print {
    aside {
      display: none;
    }
		.meta {
			display: none;
		}
	}

	/* @media print {
		main {
			display: block;
			width: 100vw;
			height: 100vh;
			overflow: visible;
			border: none;
			header {
				height: 20vh;
			}

			.page {
				height: 80vh;
				width: 100vw;
			}
		}
	} */

</style>
