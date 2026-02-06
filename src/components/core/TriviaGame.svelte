<script lang="ts">
	import classNames from 'classnames';
	import { TriviaGameService } from '$services/trivia-game.service.svelte';

	interface Props {
		collectionId: number;
		collectionName: string;
		user: any;
		onBack?: () => void;
		showBackButton?: boolean;
	}

	let { collectionId, collectionName, onBack, showBackButton = true }: Props = $props();

	// svelte-ignore state_referenced_locally
	const game = new TriviaGameService(collectionId);

	game.startGame();
</script>

{#if game.loadingQuestions}
	<div class="flex flex-1 flex-col items-center justify-center gap-3 py-8">
		<span class="loading loading-lg loading-spinner"></span>
		<p class="text-sm text-base-content/60">Generating questions...</p>
	</div>
{:else if game.waitingForFetch}
	<div class="flex flex-1 flex-col items-center justify-center gap-3 py-8">
		<span class="loading loading-lg loading-spinner"></span>
		<p class="text-sm text-base-content/60">Loading more questions...</p>
	</div>
{:else if game.gameStarted && !game.gameFinished && game.currentQuestion}
	<div class="flex flex-col gap-4">
		<div class="flex items-center gap-2">
			{#if showBackButton && onBack}
				<button class="btn btn-ghost btn-sm" onclick={onBack}>&larr; Back</button>
			{/if}
			<h1 class="text-lg font-bold">{collectionName}</h1>
		</div>

		<div class="flex items-center justify-between">
			<div class="flex items-center gap-3">
				<span class="text-sm text-base-content/60">
					Question {game.questionNumber + 1}
				</span>
				<div class="flex items-center gap-1">
					{#each Array(game.MAX_STRIKES) as _, i}
						<span
							class={classNames('text-xl transition-opacity duration-300', {
								'text-error': i < game.MAX_STRIKES - game.strikes,
								'text-base-content/20': i >= game.MAX_STRIKES - game.strikes
							})}>&#9829;</span
						>
					{/each}
				</div>
			</div>
			<div class="flex items-center gap-3">
				<span
					class={classNames('badge badge-sm', {
						'badge-ghost': game.currentMultiplier === 1,
						'badge-warning': game.currentMultiplier === 2,
						'badge-secondary': game.currentMultiplier === 3,
						'badge-accent': game.currentMultiplier >= 4
					})}
				>
					x{game.currentMultiplier} reward
				</span>
				<span class="text-sm font-semibold">{game.score} correct</span>
			</div>
		</div>

		<div class="rounded-xl border border-base-300 bg-base-100 p-6 shadow-sm">
			{#if game.currentQuestion.imageUrl}
				<img
					src={game.currentQuestion.imageUrl}
					alt=""
					class="mx-auto mb-4 h-32 w-32 rounded-lg object-cover"
				/>
			{/if}

			<p class="mb-6 text-center text-lg font-semibold">{game.currentQuestion.questionText}</p>

			<div class="flex flex-col gap-2">
				{#each game.currentQuestion.options as option, i}
					<button
						class={classNames('btn btn-block justify-start text-left', {
							'btn-outline': !game.answered,
							'btn-success': game.answered && i === game.revealedCorrectIndex,
							'btn-error':
								game.answered && i === game.selectedOptionIndex && i !== game.revealedCorrectIndex,
							'opacity-50 btn-ghost':
								game.answered && i !== game.selectedOptionIndex && i !== game.revealedCorrectIndex
						})}
						disabled={game.answered || game.answerPending}
						onclick={() => game.selectOption(i)}
					>
						{#if option.imageUrl}
							<img src={option.imageUrl} alt="" class="h-10 w-10 shrink-0 rounded object-cover" />
						{/if}
						<span class="flex-1">{option.label}</span>
						{#if game.answered && game.revealedVerifications[i]}
							<span class="text-xs opacity-70">{game.revealedVerifications[i]}</span>
						{/if}
					</button>
				{/each}
			</div>
		</div>
	</div>
{:else if game.gameFinished}
	<div class="flex flex-col gap-4">
		<div class="flex items-center gap-2">
			{#if showBackButton && onBack}
				<button class="btn btn-ghost btn-sm" onclick={onBack}>&larr; Back</button>
			{/if}
			<h1 class="text-lg font-bold">{collectionName}</h1>
		</div>

		<div
			class="flex flex-col items-center gap-4 rounded-xl border border-base-300 bg-base-100 p-8 shadow-sm"
		>
			<h2 class="text-2xl font-bold">
				{#if game.questionsExhausted}
					All Questions Answered!
				{:else if game.questionNumber >= 30}
					Legendary Run!
				{:else if game.questionNumber >= 20}
					Amazing!
				{:else if game.questionNumber >= 10}
					Great Job!
				{:else}
					Nice Try!
				{/if}
			</h2>

			<p class="text-4xl font-bold">
				{game.score}<span class="text-2xl text-base-content/40"> correct</span>
			</p>

			<p class="text-sm text-base-content/60">
				out of {game.questionNumber} questions
			</p>

			<div class="flex items-center gap-1">
				{#each Array(game.MAX_STRIKES) as _, i}
					<span
						class={classNames('text-xl', {
							'text-error': i < game.MAX_STRIKES - game.strikes,
							'text-base-content/20': i >= game.MAX_STRIKES - game.strikes
						})}>&#9829;</span
					>
				{/each}
			</div>

			{#if game.rewardResult && game.rewardResult.rewards > 0}
				<div class="mt-2 alert alert-success">
					<span class="font-semibold">
						+{game.rewardResult.rewards} reward{game.rewardResult.rewards > 1 ? 's' : ''}
						{#if game.rewardResult.newHighscore}
							(new highscore!)
						{/if}
					</span>
				</div>
			{:else if game.totalRewardsEarned > 0}
				<div class="mt-2 alert alert-success">
					<span class="font-semibold">
						+{game.totalRewardsEarned} reward{game.totalRewardsEarned > 1 ? 's' : ''} earned
					</span>
				</div>
			{/if}

			<div class="mt-4 flex gap-2">
				<button class="btn btn-sm btn-primary" onclick={() => game.playAgain()}>Play Again</button>
				{#if onBack}
					<button class="btn btn-ghost btn-sm" onclick={onBack}>Close</button>
				{/if}
			</div>
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
