import { json, error } from '@sveltejs/kit';
import { initializeSchema } from '$lib/server/schema';
import {
	getSession,
	deleteSession,
	serveNextBatch,
	addQuestionsToSession,
	MAX_STRIKES
} from '$lib/server/trivia-session';
import { generateTriviaQuestions, shuffleArray } from '$lib/server/trivia-generator';
import {
	saveTriviaGameResult,
	findBestTriviaScore
} from '$lib/server/repositories/trivia-game.repository';
import { addRewards } from '$lib/server/repositories/rewards.repository';
import type { ClientTriviaQuestion } from '$types/trivia.type';
import type { TriviaGameSession } from '$lib/server/trivia-session';
import type { RequestHandler } from './$types';

const FETCH_THRESHOLD = 5;

async function finalizeGame(
	session: TriviaGameSession
): Promise<{ rewards: number; newHighscore: boolean }> {
	await initializeSchema();

	const userId = session.userId;
	const collectionId = session.collectionId;

	const previousBest = await findBestTriviaScore(userId, collectionId);

	await saveTriviaGameResult({
		userSpotifyId: userId,
		collectionId,
		score: session.score,
		totalQuestions: session.questionNumber
	});

	let rewards = 0;
	let newHighscore = false;

	try {
		if (session.totalRewardsEarned > 0) {
			await addRewards(userId, collectionId, session.totalRewardsEarned);
			rewards = session.totalRewardsEarned;
		}

		const isNewHighscore = previousBest === null || session.score > previousBest;
		if (isNewHighscore) {
			await addRewards(userId, collectionId, 10);
			rewards += 10;
			newHighscore = true;
		}
	} catch {
		// User may not own the collection — skip rewards silently
	}

	return { rewards, newHighscore };
}

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return error(401, 'Not authenticated');
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return error(400, 'Invalid JSON body');
	}

	const { sessionId, sessionIndex, selectedOptionIndex } = body as {
		sessionId?: unknown;
		sessionIndex?: unknown;
		selectedOptionIndex?: unknown;
	};

	if (typeof sessionId !== 'string' || !sessionId) {
		return error(400, 'Missing or invalid sessionId');
	}
	if (typeof sessionIndex !== 'number' || !Number.isInteger(sessionIndex) || sessionIndex < 0) {
		return error(400, 'Missing or invalid sessionIndex');
	}
	if (
		typeof selectedOptionIndex !== 'number' ||
		!Number.isInteger(selectedOptionIndex) ||
		selectedOptionIndex < 0
	) {
		return error(400, 'Missing or invalid selectedOptionIndex');
	}

	const session = getSession(sessionId);
	if (!session) {
		return error(404, 'Game session not found or expired');
	}
	if (session.userId !== locals.user.spotifyId) {
		return error(403, 'Session belongs to another user');
	}
	if (session.gameOver) {
		return error(400, 'Game is already over');
	}
	if (session.answeredSet.has(sessionIndex)) {
		return error(400, 'Question already answered');
	}
	if (sessionIndex >= session.servedCount) {
		return error(400, 'Question has not been served yet');
	}
	if (sessionIndex >= session.questions.length) {
		return error(400, 'Invalid question index');
	}

	const question = session.questions[sessionIndex];
	if (selectedOptionIndex >= question.options.length) {
		return error(400, 'Invalid option index');
	}

	const correct = selectedOptionIndex === question.correctIndex;

	// Update session state
	session.answeredSet.add(sessionIndex);
	session.questionNumber++;

	if (correct) {
		session.score++;
		const reward = 1 + Math.floor((session.questionNumber - 1) / 5);
		session.totalRewardsEarned += reward;
	} else {
		session.strikes++;
	}

	// Check game-over: strikes
	if (session.strikes >= MAX_STRIKES) {
		session.gameOver = true;
		session.gameOverReason = 'strikes';
	}

	// Serve more questions to client if running low
	let nextQuestions: ClientTriviaQuestion[] = [];
	if (!session.gameOver) {
		const unansweredServed = session.servedCount - session.answeredSet.size;
		if (unansweredServed < FETCH_THRESHOLD) {
			nextQuestions = serveNextBatch(session);
		}

		// Trigger background generation if server pool is running low
		const unserved = session.questions.length - session.servedCount;
		if (unserved < FETCH_THRESHOLD && !session.fetchExhausted) {
			generateTriviaQuestions(session.collectionId)
				.then(({ questions }) => {
					addQuestionsToSession(session, shuffleArray(questions));
				})
				.catch(() => {
					session.fetchExhausted = true;
				});
		}

		// Check game-over: exhausted
		if (session.answeredSet.size >= session.questions.length && session.fetchExhausted) {
			session.gameOver = true;
			session.gameOverReason = 'exhausted';
		}
	}

	const currentMultiplier =
		session.questionNumber > 0 ? 1 + Math.floor((session.questionNumber - 1) / 5) : 1;

	const verifications = question.options.map((opt) => opt.verification);

	const response: Record<string, unknown> = {
		correct,
		correctIndex: question.correctIndex,
		verification: verifications,
		score: session.score,
		strikes: session.strikes,
		questionNumber: session.questionNumber,
		currentMultiplier,
		totalRewardsEarned: session.totalRewardsEarned,
		gameOver: session.gameOver,
		gameOverReason: session.gameOverReason,
		nextQuestions
	};

	if (session.gameOver) {
		try {
			response.finalResult = await finalizeGame(session);
		} catch (err) {
			console.error('Failed to finalize trivia game:', err);
			response.finalResult = { rewards: 0, newHighscore: false };
		}
		deleteSession(sessionId);
	}

	return json(response);
};
