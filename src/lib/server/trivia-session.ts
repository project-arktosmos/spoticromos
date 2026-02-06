import type { GeneratedTriviaQuestion, ClientTriviaQuestion } from '$types/trivia.type';

// ---------------------------------------------------------------------------
// Session type
// ---------------------------------------------------------------------------

export interface TriviaGameSession {
	id: string;
	userId: string;
	collectionId: number;
	collectionName: string;

	// Question pool (full server-side data with answers)
	questions: GeneratedTriviaQuestion[];
	servedCount: number;
	answeredSet: Set<number>;
	usedQuestionTexts: Set<string>;

	// Game state (authoritative)
	score: number;
	strikes: number;
	questionNumber: number;
	totalRewardsEarned: number;
	gameOver: boolean;
	gameOverReason?: 'strikes' | 'exhausted';

	// Fetch-more tracking
	fetchExhausted: boolean;

	// Timestamps
	createdAt: number;
	lastActivityAt: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const MAX_STRIKES = 3;
const SESSION_TTL_MS = 30 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const SERVE_BATCH_SIZE = 5;

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const sessions = new Map<string, TriviaGameSession>();

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function ensureCleanupTimer() {
	if (cleanupTimer) return;
	cleanupTimer = setInterval(() => {
		const now = Date.now();
		for (const [id, session] of sessions) {
			if (now - session.lastActivityAt > SESSION_TTL_MS) {
				sessions.delete(id);
			}
		}
		if (sessions.size === 0 && cleanupTimer) {
			clearInterval(cleanupTimer);
			cleanupTimer = null;
		}
	}, CLEANUP_INTERVAL_MS);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function createSession(params: {
	userId: string;
	collectionId: number;
	collectionName: string;
	questions: GeneratedTriviaQuestion[];
}): TriviaGameSession {
	const id = crypto.randomUUID();
	const usedTexts = new Set(params.questions.map((q) => q.questionText));

	const session: TriviaGameSession = {
		id,
		userId: params.userId,
		collectionId: params.collectionId,
		collectionName: params.collectionName,
		questions: params.questions,
		servedCount: 0,
		answeredSet: new Set(),
		usedQuestionTexts: usedTexts,
		score: 0,
		strikes: 0,
		questionNumber: 0,
		totalRewardsEarned: 0,
		gameOver: false,
		fetchExhausted: false,
		createdAt: Date.now(),
		lastActivityAt: Date.now()
	};

	sessions.set(id, session);
	ensureCleanupTimer();
	return session;
}

export function getSession(sessionId: string): TriviaGameSession | null {
	const session = sessions.get(sessionId);
	if (!session) return null;
	if (Date.now() - session.lastActivityAt > SESSION_TTL_MS) {
		sessions.delete(sessionId);
		return null;
	}
	session.lastActivityAt = Date.now();
	return session;
}

export function deleteSession(sessionId: string): void {
	sessions.delete(sessionId);
}

export function addQuestionsToSession(
	session: TriviaGameSession,
	newQuestions: GeneratedTriviaQuestion[]
): number {
	const unique = newQuestions.filter((q) => !session.usedQuestionTexts.has(q.questionText));
	for (const q of unique) {
		session.usedQuestionTexts.add(q.questionText);
		session.questions.push(q);
	}
	if (unique.length === 0) {
		session.fetchExhausted = true;
	}
	return unique.length;
}

// ---------------------------------------------------------------------------
// Helpers for stripping answer data
// ---------------------------------------------------------------------------

export function stripQuestion(
	q: GeneratedTriviaQuestion,
	sessionIndex: number
): ClientTriviaQuestion {
	return {
		questionId: q.questionId,
		questionType: q.questionType,
		questionText: q.questionText,
		options: q.options.map((opt) => ({
			label: opt.label,
			imageUrl: opt.imageUrl
		})),
		imageUrl: q.imageUrl,
		sessionIndex
	};
}

export function serveNextBatch(
	session: TriviaGameSession,
	count: number = SERVE_BATCH_SIZE
): ClientTriviaQuestion[] {
	const start = session.servedCount;
	const end = Math.min(start + count, session.questions.length);
	const batch: ClientTriviaQuestion[] = [];

	for (let i = start; i < end; i++) {
		batch.push(stripQuestion(session.questions[i], i));
	}

	session.servedCount = end;
	return batch;
}
