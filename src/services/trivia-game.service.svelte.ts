import type { ClientTriviaQuestion } from '$types/trivia.type';

export class TriviaGameService {
	loadingQuestions = $state(true);
	sessionId = $state('');
	questions = $state<ClientTriviaQuestion[]>([]);
	currentIndex = $state(0);
	questionNumber = $state(0);
	score = $state(0);
	strikes = $state(0);
	totalRewardsEarned = $state(0);
	selectedOptionIndex = $state<number | null>(null);
	answered = $state(false);
	answerPending = $state(false);
	gameStarted = $state(false);
	gameFinished = $state(false);
	questionsExhausted = $state(false);
	errorMsg = $state('');

	revealedCorrectIndex = $state<number | null>(null);
	revealedVerifications = $state<(string | undefined)[]>([]);

	rewardResult = $state<{ rewards: number; newHighscore: boolean } | null>(null);

	isFetchingMore = $state(false);
	fetchExhausted = $state(false);
	waitingForFetch = $state(false);

	readonly MAX_STRIKES = 3;
	private readonly FETCH_THRESHOLD = 3;

	currentQuestion = $derived(
		this.gameStarted && this.currentIndex < this.questions.length ? this.questions[this.currentIndex] : null
	);

	currentMultiplier = $derived(
		this.questionNumber > 0 ? 1 + Math.floor((this.questionNumber - 1) / 5) : 1
	);

	private collectionId: number;

	constructor(collectionId: number) {
		this.collectionId = collectionId;
	}

	async fetchMoreQuestions() {
		if (this.isFetchingMore || this.fetchExhausted || !this.sessionId) return;
		this.isFetchingMore = true;

		try {
			const res = await fetch('/api/trivia/fetch-more', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ sessionId: this.sessionId })
			});
			if (!res.ok) {
				this.fetchExhausted = true;
				return;
			}
			const data = await res.json();
			if (data.questions.length > 0) {
				this.questions = [...this.questions, ...data.questions];
			}
			if (data.exhausted) {
				this.fetchExhausted = true;
			}
		} catch {
			this.fetchExhausted = true;
		} finally {
			this.isFetchingMore = false;

			if (this.waitingForFetch) {
				this.waitingForFetch = false;
				this.advanceOrFinish();
			}
		}
	}

	private checkFetchThreshold() {
		const remaining = this.questions.length - this.currentIndex - 1;
		if (remaining < this.FETCH_THRESHOLD && !this.isFetchingMore && !this.fetchExhausted) {
			this.fetchMoreQuestions();
		}
	}

	async startGame() {
		this.loadingQuestions = true;
		this.errorMsg = '';

		try {
			const res = await fetch('/api/trivia/start', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ collectionId: this.collectionId })
			});

			if (!res.ok) {
				const data = await res.json().catch(() => null);
				throw new Error(data?.message ?? 'Failed to start game');
			}

			const data = await res.json();

			if (!data.questions || data.questions.length === 0) {
				throw new Error('Could not generate any questions for this collection.');
			}

			this.sessionId = data.sessionId;
			this.questions = data.questions;
			this.currentIndex = 0;
			this.questionNumber = 0;
			this.score = 0;
			this.strikes = 0;
			this.totalRewardsEarned = 0;
			this.selectedOptionIndex = null;
			this.answered = false;
			this.answerPending = false;
			this.revealedCorrectIndex = null;
			this.revealedVerifications = [];
			this.gameStarted = true;
			this.gameFinished = false;
			this.questionsExhausted = false;
			this.rewardResult = null;
			this.waitingForFetch = false;
			this.isFetchingMore = false;
			this.fetchExhausted = false;

			this.checkFetchThreshold();
		} catch (err) {
			this.errorMsg = err instanceof Error ? err.message : 'Failed to generate questions';
		} finally {
			this.loadingQuestions = false;
		}
	}

	async selectOption(index: number) {
		if (this.answered || this.answerPending || !this.currentQuestion) return;
		this.selectedOptionIndex = index;
		this.answerPending = true;

		try {
			const res = await fetch('/api/trivia/answer', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					sessionId: this.sessionId,
					sessionIndex: this.currentQuestion.sessionIndex,
					selectedOptionIndex: index
				})
			});

			if (!res.ok) {
				const data = await res.json().catch(() => null);
				throw new Error(data?.message ?? 'Failed to submit answer');
			}

			const result = await res.json();

			this.answered = true;
			this.revealedCorrectIndex = result.correctIndex;
			this.revealedVerifications = result.verification ?? [];

			this.score = result.score;
			this.strikes = result.strikes;
			this.questionNumber = result.questionNumber;
			this.totalRewardsEarned = result.totalRewardsEarned;

			if (result.nextQuestions && result.nextQuestions.length > 0) {
				this.questions = [...this.questions, ...result.nextQuestions];
			}

			setTimeout(() => {
				if (result.gameOver) {
					this.gameFinished = true;
					this.questionsExhausted = result.gameOverReason === 'exhausted';
					this.rewardResult = result.finalResult ?? null;
				} else {
					this.advanceOrFinish();
				}
			}, 1500);
		} catch (err) {
			this.errorMsg = err instanceof Error ? err.message : 'Connection error';
			this.answerPending = false;
		}
	}

	advanceOrFinish() {
		if (this.currentIndex + 1 < this.questions.length) {
			this.currentIndex++;
			this.selectedOptionIndex = null;
			this.answered = false;
			this.answerPending = false;
			this.revealedCorrectIndex = null;
			this.revealedVerifications = [];
			this.checkFetchThreshold();
		} else if (this.isFetchingMore) {
			this.waitingForFetch = true;
		} else {
			if (!this.fetchExhausted) {
				this.waitingForFetch = true;
				this.fetchMoreQuestions();
			} else {
				this.questionsExhausted = true;
				this.gameFinished = true;
			}
		}
	}

	playAgain() {
		this.resetGame();
		this.startGame();
	}

	private resetGame() {
		this.sessionId = '';
		this.questions = [];
		this.currentIndex = 0;
		this.questionNumber = 0;
		this.score = 0;
		this.strikes = 0;
		this.totalRewardsEarned = 0;
		this.selectedOptionIndex = null;
		this.answered = false;
		this.answerPending = false;
		this.revealedCorrectIndex = null;
		this.revealedVerifications = [];
		this.gameStarted = false;
		this.gameFinished = false;
		this.questionsExhausted = false;
		this.rewardResult = null;
		this.errorMsg = '';
		this.isFetchingMore = false;
		this.fetchExhausted = false;
		this.waitingForFetch = false;
	}
}
