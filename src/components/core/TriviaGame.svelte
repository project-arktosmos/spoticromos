<script lang="ts">
	import classNames from 'classnames';
	import type { ClientTriviaQuestion } from '$types/trivia.type';

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

	// ---------------------------------------------------------------------------
	// Constants
	// ---------------------------------------------------------------------------

	const MAX_STRIKES = 3;
	const FETCH_THRESHOLD = 3;

	// ---------------------------------------------------------------------------
	// Game state
	// ---------------------------------------------------------------------------

	let loadingQuestions = $state(true);
	let sessionId = $state('');
	let questions = $state<ClientTriviaQuestion[]>([]);
	let currentIndex = $state(0);
	let questionNumber = $state(0);
	let score = $state(0);
	let strikes = $state(0);
	let totalRewardsEarned = $state(0);
	let selectedOptionIndex = $state<number | null>(null);
	let answered = $state(false);
	let answerPending = $state(false);
	let gameStarted = $state(false);
	let gameFinished = $state(false);
	let questionsExhausted = $state(false);
	let errorMsg = $state('');

	// Revealed after server validates answer
	let revealedCorrectIndex = $state<number | null>(null);
	let revealedVerifications = $state<(string | undefined)[]>([]);

	// Submission / reward
	let rewardResult = $state<{ rewards: number; newHighscore: boolean } | null>(null);

	// Fetch-more
	let isFetchingMore = $state(false);
	let fetchExhausted = $state(false);
	let waitingForFetch = $state(false);

	// ---------------------------------------------------------------------------
	// Derived
	// ---------------------------------------------------------------------------

	let currentQuestion = $derived(
		gameStarted && currentIndex < questions.length ? questions[currentIndex] : null
	);

	let currentMultiplier = $derived(
		questionNumber > 0 ? 1 + Math.floor((questionNumber - 1) / 5) : 1
	);

	// ---------------------------------------------------------------------------
	// Fetch more questions from session
	// ---------------------------------------------------------------------------

	async function fetchMoreQuestions() {
		if (isFetchingMore || fetchExhausted || !sessionId) return;
		isFetchingMore = true;

		try {
			const res = await fetch('/api/trivia/fetch-more', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ sessionId })
			});
			if (!res.ok) {
				fetchExhausted = true;
				return;
			}
			const data = await res.json();
			if (data.questions.length > 0) {
				questions = [...questions, ...data.questions];
			}
			if (data.exhausted) {
				fetchExhausted = true;
			}
		} catch {
			fetchExhausted = true;
		} finally {
			isFetchingMore = false;

			if (waitingForFetch) {
				waitingForFetch = false;
				advanceOrFinish();
			}
		}
	}

	function checkFetchThreshold() {
		const remaining = questions.length - currentIndex - 1;
		if (remaining < FETCH_THRESHOLD && !isFetchingMore && !fetchExhausted) {
			fetchMoreQuestions();
		}
	}

	// ---------------------------------------------------------------------------
	// Game flow
	// ---------------------------------------------------------------------------

	async function startGame() {
		loadingQuestions = true;
		errorMsg = '';

		try {
			const res = await fetch('/api/trivia/start', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ collectionId })
			});

			if (!res.ok) {
				const data = await res.json().catch(() => null);
				throw new Error(data?.message ?? 'Failed to start game');
			}

			const data = await res.json();

			if (!data.questions || data.questions.length === 0) {
				throw new Error('Could not generate any questions for this collection.');
			}

			sessionId = data.sessionId;
			questions = data.questions;
			currentIndex = 0;
			questionNumber = 0;
			score = 0;
			strikes = 0;
			totalRewardsEarned = 0;
			selectedOptionIndex = null;
			answered = false;
			answerPending = false;
			revealedCorrectIndex = null;
			revealedVerifications = [];
			gameStarted = true;
			gameFinished = false;
			questionsExhausted = false;
			rewardResult = null;
			waitingForFetch = false;
			isFetchingMore = false;
			fetchExhausted = false;

			checkFetchThreshold();
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to generate questions';
		} finally {
			loadingQuestions = false;
		}
	}

	async function selectOption(index: number) {
		if (answered || answerPending || !currentQuestion) return;
		selectedOptionIndex = index;
		answerPending = true;

		try {
			const res = await fetch('/api/trivia/answer', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					sessionId,
					sessionIndex: currentQuestion.sessionIndex,
					selectedOptionIndex: index
				})
			});

			if (!res.ok) {
				const data = await res.json().catch(() => null);
				throw new Error(data?.message ?? 'Failed to submit answer');
			}

			const result = await res.json();

			// Reveal answer
			answered = true;
			revealedCorrectIndex = result.correctIndex;
			revealedVerifications = result.verification ?? [];

			// Update state from server
			score = result.score;
			strikes = result.strikes;
			questionNumber = result.questionNumber;
			totalRewardsEarned = result.totalRewardsEarned;

			// Append piggybacked questions
			if (result.nextQuestions && result.nextQuestions.length > 0) {
				questions = [...questions, ...result.nextQuestions];
			}

			// After reveal delay, advance or finish
			setTimeout(() => {
				if (result.gameOver) {
					gameFinished = true;
					questionsExhausted = result.gameOverReason === 'exhausted';
					rewardResult = result.finalResult ?? null;
				} else {
					advanceOrFinish();
				}
			}, 1500);
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Connection error';
			answerPending = false;
		}
	}

	function advanceOrFinish() {
		if (currentIndex + 1 < questions.length) {
			currentIndex++;
			selectedOptionIndex = null;
			answered = false;
			answerPending = false;
			revealedCorrectIndex = null;
			revealedVerifications = [];
			checkFetchThreshold();
		} else if (isFetchingMore) {
			waitingForFetch = true;
		} else {
			// No more questions and not fetching — explicitly fetch more
			if (!fetchExhausted) {
				waitingForFetch = true;
				fetchMoreQuestions();
			} else {
				questionsExhausted = true;
				gameFinished = true;
			}
		}
	}

	function playAgain() {
		resetGame();
		startGame();
	}

	function resetGame() {
		sessionId = '';
		questions = [];
		currentIndex = 0;
		questionNumber = 0;
		score = 0;
		strikes = 0;
		totalRewardsEarned = 0;
		selectedOptionIndex = null;
		answered = false;
		answerPending = false;
		revealedCorrectIndex = null;
		revealedVerifications = [];
		gameStarted = false;
		gameFinished = false;
		questionsExhausted = false;
		rewardResult = null;
		errorMsg = '';
		isFetchingMore = false;
		fetchExhausted = false;
		waitingForFetch = false;
	}

	// Auto-start on mount
	startGame();
</script>

{#if loadingQuestions}
	<div class="flex flex-1 flex-col items-center justify-center gap-3 py-8">
		<span class="loading loading-spinner loading-lg"></span>
		<p class="text-base-content/60 text-sm">Generating questions...</p>
	</div>

{:else if waitingForFetch}
	<div class="flex flex-1 flex-col items-center justify-center gap-3 py-8">
		<span class="loading loading-spinner loading-lg"></span>
		<p class="text-base-content/60 text-sm">Loading more questions...</p>
	</div>

{:else if gameStarted && !gameFinished && currentQuestion}
	<div class="flex flex-col gap-4">
		<div class="flex items-center gap-2">
			{#if showBackButton && onBack}
				<button class="btn btn-ghost btn-sm" onclick={onBack}>&larr; Back</button>
			{/if}
			<h1 class="text-lg font-bold">{collectionName}</h1>
		</div>

		<div class="flex items-center justify-between">
			<div class="flex items-center gap-3">
				<span class="text-base-content/60 text-sm">
					Question {questionNumber + 1}
				</span>
				<div class="flex items-center gap-1">
					{#each Array(MAX_STRIKES) as _, i}
						<span class={classNames('text-xl transition-opacity duration-300', {
							'text-error': i < MAX_STRIKES - strikes,
							'text-base-content/20': i >= MAX_STRIKES - strikes
						})}>&#9829;</span>
					{/each}
				</div>
			</div>
			<div class="flex items-center gap-3">
				<span class={classNames('badge badge-sm', {
					'badge-ghost': currentMultiplier === 1,
					'badge-warning': currentMultiplier === 2,
					'badge-secondary': currentMultiplier === 3,
					'badge-accent': currentMultiplier >= 4
				})}>
					x{currentMultiplier} reward
				</span>
				<span class="text-sm font-semibold">{score} correct</span>
			</div>
		</div>

		<div class="rounded-xl border border-base-300 bg-base-100 p-6 shadow-sm">
			{#if currentQuestion.imageUrl}
				<img
					src={currentQuestion.imageUrl}
					alt=""
					class="mx-auto mb-4 h-32 w-32 rounded-lg object-cover"
				/>
			{/if}

			<p class="mb-6 text-center text-lg font-semibold">{currentQuestion.questionText}</p>

			<div class="flex flex-col gap-2">
				{#each currentQuestion.options as option, i}
					<button
						class={classNames(
							'btn btn-block justify-start text-left',
							{
								'btn-outline': !answered,
								'btn-success': answered && i === revealedCorrectIndex,
								'btn-error': answered && i === selectedOptionIndex && i !== revealedCorrectIndex,
								'btn-ghost opacity-50': answered && i !== selectedOptionIndex && i !== revealedCorrectIndex
							}
						)}
						disabled={answered || answerPending}
						onclick={() => selectOption(i)}
					>
						{#if option.imageUrl}
							<img
								src={option.imageUrl}
								alt=""
								class="h-10 w-10 shrink-0 rounded object-cover"
							/>
						{/if}
						<span class="flex-1">{option.label}</span>
						{#if answered && revealedVerifications[i]}
							<span class="text-xs opacity-70">{revealedVerifications[i]}</span>
						{/if}
					</button>
				{/each}
			</div>
		</div>
	</div>

{:else if gameFinished}
	<div class="flex flex-col gap-4">
		<div class="flex items-center gap-2">
			{#if showBackButton && onBack}
				<button class="btn btn-ghost btn-sm" onclick={onBack}>&larr; Back</button>
			{/if}
			<h1 class="text-lg font-bold">{collectionName}</h1>
		</div>

		<div class="flex flex-col items-center gap-4 rounded-xl border border-base-300 bg-base-100 p-8 shadow-sm">
			<h2 class="text-2xl font-bold">
				{#if questionsExhausted}
					All Questions Answered!
				{:else if questionNumber >= 30}
					Legendary Run!
				{:else if questionNumber >= 20}
					Amazing!
				{:else if questionNumber >= 10}
					Great Job!
				{:else}
					Nice Try!
				{/if}
			</h2>

			<p class="text-4xl font-bold">
				{score}<span class="text-base-content/40 text-2xl"> correct</span>
			</p>

			<p class="text-base-content/60 text-sm">
				out of {questionNumber} questions
			</p>

			<div class="flex items-center gap-1">
				{#each Array(MAX_STRIKES) as _, i}
					<span class={classNames('text-xl', {
						'text-error': i < MAX_STRIKES - strikes,
						'text-base-content/20': i >= MAX_STRIKES - strikes
					})}>&#9829;</span>
				{/each}
			</div>

			{#if rewardResult && rewardResult.rewards > 0}
				<div class="alert alert-success mt-2">
					<span class="font-semibold">
						+{rewardResult.rewards} reward{rewardResult.rewards > 1 ? 's' : ''}
						{#if rewardResult.newHighscore}
							(new highscore!)
						{/if}
					</span>
				</div>
			{:else if totalRewardsEarned > 0}
				<div class="alert alert-success mt-2">
					<span class="font-semibold">
						+{totalRewardsEarned} reward{totalRewardsEarned > 1 ? 's' : ''} earned
					</span>
				</div>
			{/if}

			<div class="mt-4 flex gap-2">
				<button class="btn btn-primary btn-sm" onclick={playAgain}>Play Again</button>
				{#if onBack}
					<button class="btn btn-ghost btn-sm" onclick={onBack}>Close</button>
				{/if}
			</div>
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
