<script lang="ts">
	import classNames from 'classnames';
	import { PairsGameService } from '$services/pairs-game.service.svelte';
	import PairCard from '$components/core/PairCard.svelte';

	interface Props {
		collectionId: number;
		collectionName: string;
		user: any;
		onBack?: () => void;
		showBackButton?: boolean;
	}

	let { collectionId, collectionName, user, onBack, showBackButton = true }: Props = $props();

	// svelte-ignore state_referenced_locally
	const game = new PairsGameService(collectionId, user);

	const gridColsMap: Record<number, string> = {
		3: 'grid-cols-3',
		4: 'grid-cols-4',
		5: 'grid-cols-5',
		6: 'grid-cols-6',
		7: 'grid-cols-7',
		8: 'grid-cols-8',
		9: 'grid-cols-9',
		10: 'grid-cols-10',
		11: 'grid-cols-11',
		12: 'grid-cols-12'
	};

	const maxWidthMap: Record<number, string> = {
		3: 'max-w-sm',
		4: 'max-w-xl',
		5: 'max-w-2xl',
		6: 'max-w-3xl',
		7: 'max-w-4xl',
		8: 'max-w-5xl'
	};

	let gridCols = $derived(gridColsMap[Math.min(game.gridSize, 12)] ?? 'grid-cols-12');
	let gridMaxWidth = $derived(maxWidthMap[Math.min(game.gridSize, 8)] ?? 'max-w-6xl');

	game.init();
</script>

{#if game.loading}
	<div class="flex flex-1 flex-col items-center justify-center gap-3 py-8">
		<span class="loading loading-lg loading-spinner"></span>
		<p class="text-sm text-base-content/60">Loading pairs...</p>
	</div>
{:else if game.gameStarted}
	<div class="flex flex-col gap-4">
		<div class="flex items-center gap-2">
			{#if showBackButton && onBack}
				<button class="btn btn-ghost btn-sm" onclick={onBack}>&larr; Back</button>
			{/if}
			<h1 class="text-lg font-bold">{collectionName}</h1>
			<span class="badge badge-neutral">{game.gridSize}x{game.gridRows(game.gridSize)}</span>
		</div>

		<div class="flex flex-wrap items-center justify-between gap-2">
			<div class="flex flex-wrap gap-3 text-sm">
				<span class="font-semibold">{game.matchedPairs}/{game.totalPairs} pairs</span>
				<div class="flex items-center gap-1">
					{#each Array(game.maxErrors) as _, i}
						<span
							class={classNames('text-xl transition-opacity duration-300', {
								'text-error': i < game.maxErrors - game.errors,
								'text-base-content/20': i >= game.maxErrors - game.errors
							})}>&#9829;</span
						>
					{/each}
				</div>
				<span class="text-base-content/60">{game.moves} moves</span>
			</div>
			<button
				class="btn btn-ghost btn-sm"
				onclick={() => game.startGame()}
				disabled={game.gameWon || game.gameLost}>Restart</button
			>
		</div>

		{#if game.gameWon}
			<div class="alert alert-success shadow-lg">
				<div>
					<span class="text-lg font-bold">Level complete!</span>
					<span>{game.moves} moves, {game.errors} errors.</span>
					{#if game.rewardResult && game.rewardResult.rewards > 0}
						<span class="font-semibold">
							+{game.rewardResult.rewards} reward{game.rewardResult.rewards > 1 ? 's' : ''}
							{#if game.rewardResult.newHighscore}
								(new highscore!)
							{/if}
						</span>
					{/if}
				</div>
				<div class="flex gap-2">
					<button class="btn btn-sm" onclick={() => game.nextLevel()}>
						Next Level ({game.gridSize + 1}x{game.gridRows(game.gridSize + 1)})
					</button>
					{#if onBack}
						<button class="btn btn-ghost btn-sm" onclick={onBack}>Close</button>
					{/if}
				</div>
			</div>
		{/if}

		{#if game.gameLost}
			<div class="alert alert-error shadow-lg">
				<div>
					<span class="text-lg font-bold">Too many errors!</span>
					<span>{game.errors}/{game.maxErrors} errors reached.</span>
				</div>
				<div class="flex gap-2">
					<button class="btn btn-sm" onclick={() => game.retryLevel()}>
						Try Again ({Math.max(game.MIN_GRID, game.gridSize - 1)}x{game.gridRows(
							Math.max(game.MIN_GRID, game.gridSize - 1)
						)})
					</button>
					{#if onBack}
						<button class="btn btn-ghost btn-sm" onclick={onBack}>Close</button>
					{/if}
				</div>
			</div>
		{/if}

		<div class={classNames('mx-auto grid w-full gap-3', gridCols, gridMaxWidth)}>
			{#each game.cards as card, index (card.id)}
				<button
					class="w-full cursor-pointer"
					onclick={() => game.flipCard(index)}
					disabled={card.state !== 'faceDown' || game.isChecking || game.gameWon || game.gameLost}
				>
					<PairCard
						imageUrl={card.imageUrl}
						label={card.label}
						kind={card.kind}
						flipped={card.state !== 'faceDown'}
						matched={card.state === 'matched'}
						gameLost={game.gameLost}
					/>
				</button>
			{/each}
		</div>
	</div>
{:else if game.errorMsg}
	<div class="flex flex-col gap-4">
		{#if showBackButton && onBack}
			<div class="flex items-center gap-2">
				<button class="btn btn-ghost btn-sm" onclick={onBack}>&larr; Back</button>
			</div>
		{/if}
		<div class="alert alert-error"><span>{game.errorMsg}</span></div>
	</div>
{/if}
