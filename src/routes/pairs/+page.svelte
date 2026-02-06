<script lang="ts">
	import { onMount } from 'svelte';
	import classNames from 'classnames';
	import type { CollectionRow } from '$lib/server/repositories/collection.repository';
	import type { CollectionItemWithArtists } from '$lib/server/repositories/collection.repository';
	import PairCardBack from '$components/core/PairCardBack.svelte';
	import PairCardFront from '$components/core/PairCardFront.svelte';

	interface CollectionWithCount extends CollectionRow {
		track_count: number;
	}

	type CardState = 'faceDown' | 'faceUp' | 'matched';
	type CardKind = 'album' | 'artist';

	interface GameCard {
		id: number;
		imageUrl: string;
		label: string;
		kind: CardKind;
		pairKey: string;
		state: CardState;
	}

	// --- Phase: collection selection ---
	let collections = $state<CollectionWithCount[]>([]);
	let loadingCollections = $state(true);
	let errorMsg = $state('');

	// --- Phase: game ---
	let selectedCollection = $state<CollectionWithCount | null>(null);
	let items = $state<CollectionItemWithArtists[]>([]);
	let loadingItems = $state(false);
	let gameStarted = $state(false);
	let cards = $state<GameCard[]>([]);
	let moves = $state(0);
	let matchedPairs = $state(0);
	let totalPairs = $state(0);
	let flippedIndices = $state<number[]>([]);
	let isChecking = $state(false);
	let errors = $state(0);
	let gameWon = $state(false);
	let gameLost = $state(false);
	let gridSize = $state(3);

	const MIN_GRID = 3;

	const gridColsMap: Record<number, string> = {
		3: 'grid-cols-3', 4: 'grid-cols-4', 5: 'grid-cols-5',
		6: 'grid-cols-6', 7: 'grid-cols-7', 8: 'grid-cols-8',
		9: 'grid-cols-9', 10: 'grid-cols-10', 11: 'grid-cols-11',
		12: 'grid-cols-12'
	};

	const maxWidthMap: Record<number, string> = {
		3: 'max-w-sm', 4: 'max-w-xl', 5: 'max-w-2xl',
		6: 'max-w-3xl', 7: 'max-w-4xl', 8: 'max-w-5xl'
	};

	onMount(async () => {
		try {
			const res = await fetch('/api/collections');
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = await res.json();
			collections = data.collections;
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to load collections';
		} finally {
			loadingCollections = false;
		}
	});

	async function selectCollection(collection: CollectionWithCount) {
		selectedCollection = collection;
		loadingItems = true;
		errorMsg = '';

		try {
			const res = await fetch(`/api/collections/${collection.id}`);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = await res.json();
			items = data.items;
			startGame();
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to load collection';
			selectedCollection = null;
		} finally {
			loadingItems = false;
		}
	}

	function getUniqueImages(): Array<{ imageUrl: string; label: string; kind: CardKind }> {
		const seen = new Set<string>();
		const result: Array<{ imageUrl: string; label: string; kind: CardKind }> = [];

		for (const item of items) {
			if (item.album_cover_url && !seen.has(item.album_cover_url)) {
				seen.add(item.album_cover_url);
				result.push({ imageUrl: item.album_cover_url, label: item.album_name ?? item.track_name, kind: 'album' });
			}
			if (item.artist_image_url && !seen.has(item.artist_image_url)) {
				seen.add(item.artist_image_url);
				result.push({ imageUrl: item.artist_image_url, label: item.artists ?? 'Unknown', kind: 'artist' });
			}
		}

		return result;
	}

	function shuffle<T>(arr: T[]): T[] {
		const a = [...arr];
		for (let i = a.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[a[i], a[j]] = [a[j], a[i]];
		}
		return a;
	}

	function gridRows(cols: number): number {
		return cols % 2 === 0 ? cols : cols + 1;
	}

	function startGame() {
		const unique = getUniqueImages();
		if (unique.length < 2) {
			errorMsg = 'Not enough unique images in this collection (need at least 2).';
			return;
		}

		const rows = gridRows(gridSize);
		const pairsForGrid = (gridSize * rows) / 2;
		const selected = shuffle(unique).slice(0, pairsForGrid);
		totalPairs = selected.length;
		matchedPairs = 0;
		moves = 0;
		errors = 0;
		flippedIndices = [];
		isChecking = false;
		gameWon = false;
		gameLost = false;
		gameStarted = true;

		const gameCards: GameCard[] = [];
		let cardId = 0;
		for (const img of selected) {
			const pairKey = img.imageUrl;
			gameCards.push({ id: cardId++, imageUrl: img.imageUrl, label: img.label, kind: img.kind, pairKey, state: 'faceDown' });
			gameCards.push({ id: cardId++, imageUrl: img.imageUrl, label: img.label, kind: img.kind, pairKey, state: 'faceDown' });
		}

		cards = shuffle(gameCards);
	}

	function flipCard(index: number) {
		if (isChecking || gameWon || gameLost) return;
		if (cards[index].state !== 'faceDown') return;
		if (flippedIndices.length >= 2) return;

		cards[index].state = 'faceUp';
		flippedIndices = [...flippedIndices, index];

		if (flippedIndices.length === 2) {
			moves++;
			const [first, second] = flippedIndices;
			if (cards[first].pairKey === cards[second].pairKey) {
				cards[first].state = 'matched';
				cards[second].state = 'matched';
				matchedPairs++;
				flippedIndices = [];

				if (matchedPairs === totalPairs) {
					gameWon = true;
				}
			} else {
				errors++;
				if (errors >= maxErrors) {
					isChecking = true;
					setTimeout(() => {
						for (const card of cards) {
							if (card.state === 'faceDown') card.state = 'faceUp';
						}
						flippedIndices = [];
						isChecking = false;
						gameLost = true;
					}, 800);
				} else {
					isChecking = true;
					setTimeout(() => {
						cards[first].state = 'faceDown';
						cards[second].state = 'faceDown';
						flippedIndices = [];
						isChecking = false;
					}, 800);
				}
			}
		}
	}

	function nextLevel() {
		gridSize++;
		startGame();
	}

	function retryLevel() {
		gridSize = Math.max(MIN_GRID, gridSize - 1);
		startGame();
	}

	function resetGame() {
		gameStarted = false;
		cards = [];
		moves = 0;
		matchedPairs = 0;
		totalPairs = 0;
		errors = 0;
		flippedIndices = [];
		isChecking = false;
		gameWon = false;
		gameLost = false;
	}

	function backToCollections() {
		resetGame();
		gridSize = MIN_GRID;
		selectedCollection = null;
		items = [];
		errorMsg = '';
	}

	let maxErrors = $derived(Math.floor(gridSize * (gridSize - 1) / 2));
	let gridCols = $derived(gridColsMap[Math.min(gridSize, 12)] ?? 'grid-cols-12');
	let gridMaxWidth = $derived(maxWidthMap[Math.min(gridSize, 8)] ?? 'max-w-6xl');
</script>

<div class="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 p-8">

	{#if !selectedCollection}
		<!-- PHASE 1: Collection selection -->
		<h1 class="text-2xl font-bold">Find the Pairs</h1>
		<p class="text-base-content/70 text-sm">Pick a collection to play with</p>

		{#if loadingCollections}
			<div class="flex flex-1 items-center justify-center">
				<span class="loading loading-spinner loading-lg"></span>
			</div>
		{:else if errorMsg}
			<div class="alert alert-error"><span>{errorMsg}</span></div>
		{:else if collections.length === 0}
			<p class="text-base-content/70 text-center">No collections available.</p>
		{:else}
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each collections as collection (collection.id)}
					<button
						class="card bg-base-200 text-left shadow-sm transition-shadow hover:shadow-md"
						onclick={() => selectCollection(collection)}
					>
						{#if collection.cover_image_url}
							<figure>
								<img
									src={collection.cover_image_url}
									alt={collection.name}
									class="aspect-square w-full object-cover"
								/>
							</figure>
						{:else}
							<figure>
								<div class="bg-base-300 flex aspect-square w-full items-center justify-center">
									<span class="text-base-content/30 text-4xl">&#9835;</span>
								</div>
							</figure>
						{/if}
						<div class="card-body p-4">
							<h2 class="card-title text-base">{collection.name}</h2>
							<p class="text-base-content/60 text-sm">{collection.track_count} tracks</p>
						</div>
					</button>
				{/each}
			</div>
		{/if}

	{:else if loadingItems}
		<div class="flex flex-1 items-center justify-center">
			<span class="loading loading-spinner loading-lg"></span>
		</div>

	{:else if gameStarted}
		<!-- PHASE 2: Game board -->
		<div class="flex items-center gap-2">
			<button class="btn btn-ghost btn-sm" onclick={backToCollections}>&larr; Back</button>
			<h1 class="text-lg font-bold">{selectedCollection.name}</h1>
			<span class="badge badge-neutral">{gridSize}x{gridRows(gridSize)}</span>
		</div>

		<div class="flex flex-wrap items-center justify-between gap-2">
			<div class="flex flex-wrap gap-3 text-sm">
				<span class="font-semibold">{matchedPairs}/{totalPairs} pairs</span>
				<span class={classNames(
					errors >= maxErrors ? 'text-error font-semibold' : 'text-base-content/60'
				)}>
					{errors}/{maxErrors} errors
				</span>
				<span class="text-base-content/60">{moves} moves</span>
			</div>
			<button class="btn btn-ghost btn-sm" onclick={startGame} disabled={gameWon || gameLost}>Restart</button>
		</div>

		{#if gameWon}
			<div class="alert alert-success shadow-lg">
				<div>
					<span class="text-lg font-bold">Level complete!</span>
					<span>{moves} moves, {errors} errors.</span>
				</div>
				<div class="flex gap-2">
					<button class="btn btn-sm" onclick={nextLevel}>
						Next Level ({gridSize + 1}x{gridRows(gridSize + 1)})
					</button>
					<button class="btn btn-ghost btn-sm" onclick={backToCollections}>Other Collection</button>
				</div>
			</div>
		{/if}

		{#if gameLost}
			<div class="alert alert-error shadow-lg">
				<div>
					<span class="text-lg font-bold">Too many errors!</span>
					<span>{errors}/{maxErrors} errors reached.</span>
				</div>
				<div class="flex gap-2">
					<button class="btn btn-sm" onclick={retryLevel}>
						Try Again ({Math.max(MIN_GRID, gridSize - 1)}x{gridRows(Math.max(MIN_GRID, gridSize - 1))})
					</button>
					<button class="btn btn-ghost btn-sm" onclick={backToCollections}>Other Collection</button>
				</div>
			</div>
		{/if}

		<div class={classNames('mx-auto grid w-full gap-3', gridCols, gridMaxWidth)}>
			{#each cards as card, index (card.id)}
				<button
					class="w-full cursor-pointer"
					onclick={() => flipCard(index)}
					disabled={card.state !== 'faceDown' || isChecking || gameWon || gameLost}
				>
					{#if card.state === 'faceDown'}
						<PairCardBack {gameLost} />
					{:else}
						<PairCardFront
							imageUrl={card.imageUrl}
							label={card.label}
							kind={card.kind}
							matched={card.state === 'matched'}
							{gameLost}
						/>
					{/if}
				</button>
			{/each}
		</div>

	{:else if selectedCollection && errorMsg}
		<div class="flex items-center gap-2">
			<button class="btn btn-ghost btn-sm" onclick={backToCollections}>&larr; Back</button>
		</div>
		<div class="alert alert-error"><span>{errorMsg}</span></div>
	{/if}
</div>
