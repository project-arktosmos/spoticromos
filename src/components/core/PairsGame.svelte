<script lang="ts">
	import classNames from 'classnames';
	import type { CollectionItemWithArtists } from '$lib/server/repositories/collection.repository';
	import PairCard from '$components/core/PairCard.svelte';

	interface Props {
		collectionId: number;
		collectionName: string;
		user: any;
		onBack?: () => void;
		showBackButton?: boolean;
	}

	let {
		collectionId,
		collectionName,
		user,
		onBack,
		showBackButton = true
	}: Props = $props();

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

	let items = $state<CollectionItemWithArtists[]>([]);
	let loading = $state(true);
	let errorMsg = $state('');
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
	let rewardResult = $state<{ rewards: number; newHighscore: boolean } | null>(null);

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
		rewardResult = null;
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
					submitGameResult(true);
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
						submitGameResult(false);
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

	async function submitGameResult(won: boolean) {
		if (!user) return;
		try {
			const res = await fetch('/api/pairs/complete', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					collectionId,
					gridSize,
					moves,
					errors,
					won
				})
			});
			if (res.ok) {
				rewardResult = await res.json();
			}
		} catch { /* silent */ }
	}

	let maxErrors = $derived(totalPairs);
	let gridCols = $derived(gridColsMap[Math.min(gridSize, 12)] ?? 'grid-cols-12');
	let gridMaxWidth = $derived(maxWidthMap[Math.min(gridSize, 8)] ?? 'max-w-6xl');

	// Auto-start: fetch items and begin
	async function init() {
		try {
			const res = await fetch(`/api/collections/${collectionId}`);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const json = await res.json();
			items = json.items;
			startGame();
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to load collection';
		} finally {
			loading = false;
		}
	}

	init();
</script>

{#if loading}
	<div class="flex flex-1 flex-col items-center justify-center gap-3 py-8">
		<span class="loading loading-spinner loading-lg"></span>
		<p class="text-base-content/60 text-sm">Loading pairs...</p>
	</div>

{:else if gameStarted}
	<div class="flex flex-col gap-4">
		<div class="flex items-center gap-2">
			{#if showBackButton && onBack}
				<button class="btn btn-ghost btn-sm" onclick={onBack}>&larr; Back</button>
			{/if}
			<h1 class="text-lg font-bold">{collectionName}</h1>
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
					{#if rewardResult && rewardResult.rewards > 0}
						<span class="font-semibold">
							+{rewardResult.rewards} reward{rewardResult.rewards > 1 ? 's' : ''}
							{#if rewardResult.newHighscore}
								(new highscore!)
							{/if}
						</span>
					{/if}
				</div>
				<div class="flex gap-2">
					<button class="btn btn-sm" onclick={nextLevel}>
						Next Level ({gridSize + 1}x{gridRows(gridSize + 1)})
					</button>
					{#if onBack}
						<button class="btn btn-ghost btn-sm" onclick={onBack}>Close</button>
					{/if}
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
					{#if onBack}
						<button class="btn btn-ghost btn-sm" onclick={onBack}>Close</button>
					{/if}
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
					<PairCard
						imageUrl={card.imageUrl}
						label={card.label}
						kind={card.kind}
						flipped={card.state !== 'faceDown'}
						matched={card.state === 'matched'}
						{gameLost}
					/>
				</button>
			{/each}
		</div>
	</div>

{:else if errorMsg}
	<div class="flex flex-col gap-4">
		{#if showBackButton && onBack}
			<div class="flex items-center gap-2">
				<button class="btn btn-ghost btn-sm" onclick={onBack}>&larr; Back</button>
			</div>
		{/if}
		<div class="alert alert-error"><span>{errorMsg}</span></div>
	</div>
{/if}
