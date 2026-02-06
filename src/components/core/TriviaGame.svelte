<script lang="ts">
	import classNames from 'classnames';
	import type {
		TriviaTemplateWithQuestions,
		GeneratedTriviaQuestion
	} from '$types/trivia.type';

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

	let loadingQuestions = $state(true);
	let questions = $state<GeneratedTriviaQuestion[]>([]);
	let currentIndex = $state(0);
	let score = $state(0);
	let selectedOptionIndex = $state<number | null>(null);
	let answered = $state(false);
	let gameStarted = $state(false);
	let errorMsg = $state('');

	let gameFinished = $state(false);
	let submitting = $state(false);
	let rewardResult = $state<{ rewards: number; newHighscore: boolean } | null>(null);

	const MAX_QUESTIONS = 10;

	let currentQuestion = $derived(
		gameStarted && currentIndex < questions.length ? questions[currentIndex] : null
	);

	let totalQuestions = $derived(questions.length);

	function shuffle<T>(arr: T[]): T[] {
		const a = [...arr];
		for (let i = a.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[a[i], a[j]] = [a[j], a[i]];
		}
		return a;
	}

	async function startGame() {
		loadingQuestions = true;
		errorMsg = '';

		try {
			const templatesRes = await fetch('/api/trivia-templates?expand=questions');
			if (!templatesRes.ok) throw new Error(`HTTP ${templatesRes.status}`);
			const templatesData = await templatesRes.json();
			const templates: TriviaTemplateWithQuestions[] = templatesData.templates ?? [];

			if (templates.length === 0) {
				throw new Error('No trivia templates available. Create some first.');
			}

			const allQuestions: GeneratedTriviaQuestion[] = [];

			for (const template of templates) {
				if (template.questions.length === 0) continue;

				try {
					const res = await fetch(`/api/trivia-templates/${template.id}/generate`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ collectionId })
					});
					if (!res.ok) continue;

					const data = await res.json();
					const generated = data.trivia?.questions ?? [];
					allQuestions.push(...generated);
				} catch {
					// Skip failed templates
				}
			}

			if (allQuestions.length === 0) {
				throw new Error('Could not generate any questions for this collection.');
			}

			questions = shuffle(allQuestions).slice(0, MAX_QUESTIONS);
			currentIndex = 0;
			score = 0;
			selectedOptionIndex = null;
			answered = false;
			gameStarted = true;
			gameFinished = false;
			rewardResult = null;
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to generate questions';
		} finally {
			loadingQuestions = false;
		}
	}

	function selectOption(index: number) {
		if (answered) return;
		selectedOptionIndex = index;
		answered = true;

		if (currentQuestion && index === currentQuestion.correctIndex) {
			score++;
		}

		setTimeout(() => {
			if (currentIndex + 1 < questions.length) {
				currentIndex++;
				selectedOptionIndex = null;
				answered = false;
			} else {
				gameFinished = true;
				submitResult();
			}
		}, 1500);
	}

	async function submitResult() {
		if (!user) return;
		submitting = true;
		try {
			const res = await fetch('/api/trivia/complete', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					collectionId,
					score,
					totalQuestions
				})
			});
			if (res.ok) {
				rewardResult = await res.json();
			}
		} catch {
			// silent
		} finally {
			submitting = false;
		}
	}

	function playAgain() {
		resetGame();
		startGame();
	}

	function resetGame() {
		questions = [];
		currentIndex = 0;
		score = 0;
		selectedOptionIndex = null;
		answered = false;
		gameStarted = false;
		gameFinished = false;
		rewardResult = null;
		errorMsg = '';
	}

	// Auto-start on mount
	startGame();
</script>

{#if loadingQuestions}
	<div class="flex flex-1 flex-col items-center justify-center gap-3 py-8">
		<span class="loading loading-spinner loading-lg"></span>
		<p class="text-base-content/60 text-sm">Generating questions...</p>
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
			<span class="text-base-content/60 text-sm">
				Question {currentIndex + 1} of {totalQuestions}
			</span>
			<span class="text-sm font-semibold">{score} correct</span>
		</div>

		<progress
			class="progress progress-primary w-full"
			value={currentIndex}
			max={totalQuestions}
		></progress>

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
								'btn-success': answered && i === currentQuestion.correctIndex,
								'btn-error': answered && i === selectedOptionIndex && i !== currentQuestion.correctIndex,
								'btn-ghost opacity-50': answered && i !== selectedOptionIndex && i !== currentQuestion.correctIndex
							}
						)}
						disabled={answered}
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
						{#if answered && option.verification}
							<span class="text-xs opacity-70">{option.verification}</span>
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
				{#if score === totalQuestions}
					Perfect Score!
				{:else if score >= totalQuestions * 0.7}
					Great Job!
				{:else if score >= totalQuestions * 0.4}
					Not Bad!
				{:else}
					Keep Trying!
				{/if}
			</h2>

			<p class="text-4xl font-bold">
				{score}<span class="text-base-content/40 text-2xl">/{totalQuestions}</span>
			</p>

			<p class="text-base-content/60 text-sm">correct answers</p>

			{#if submitting}
				<span class="loading loading-spinner loading-sm"></span>
			{:else if rewardResult && rewardResult.rewards > 0}
				<div class="alert alert-success mt-2">
					<span class="font-semibold">
						+{rewardResult.rewards} reward{rewardResult.rewards > 1 ? 's' : ''}
						{#if rewardResult.newHighscore}
							(new highscore!)
						{/if}
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
