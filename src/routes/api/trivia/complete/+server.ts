import { json, error } from '@sveltejs/kit';
import { initializeSchema } from '$lib/server/schema';
import {
	saveTriviaGameResult,
	findBestTriviaScore
} from '$lib/server/repositories/trivia-game.repository';
import { addRewards } from '$lib/server/repositories/rewards.repository';
import type { RequestHandler } from './$types';

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

	const { collectionId, score, totalQuestions } = body as {
		collectionId?: unknown;
		score?: unknown;
		totalQuestions?: unknown;
	};

	if (typeof collectionId !== 'number' || !Number.isFinite(collectionId) || collectionId <= 0) {
		return error(400, 'Missing or invalid collectionId');
	}
	if (typeof score !== 'number' || !Number.isFinite(score) || score < 0) {
		return error(400, 'Missing or invalid score');
	}
	if (typeof totalQuestions !== 'number' || !Number.isFinite(totalQuestions) || totalQuestions < 1) {
		return error(400, 'Missing or invalid totalQuestions');
	}
	if (score > totalQuestions) {
		return error(400, 'Score cannot exceed totalQuestions');
	}

	// Compute rewards server-side: 1 + floor((q-1)/5) per correct answer
	let totalRewards = 0;
	for (let q = 1; q <= score; q++) {
		totalRewards += 1 + Math.floor((q - 1) / 5);
	}

	try {
		await initializeSchema();

		const userId = locals.user.spotifyId;
		const previousBest = await findBestTriviaScore(userId, collectionId);

		await saveTriviaGameResult({
			userSpotifyId: userId,
			collectionId,
			score,
			totalQuestions
		});

		let rewards = 0;
		let newHighscore = false;

		try {
			if (totalRewards > 0) {
				await addRewards(userId, collectionId, totalRewards);
				rewards = totalRewards;
			}

			const isNewHighscore = previousBest === null || score > previousBest;
			if (isNewHighscore) {
				await addRewards(userId, collectionId, 10);
				rewards += 10;
				newHighscore = true;
			}
		} catch {
			// User may not own the collection — skip rewards silently
		}

		return json({ saved: true, rewards, newHighscore });
	} catch (err) {
		console.error('Failed to save trivia game result:', err);
		const message = err instanceof Error ? err.message : 'Unknown error';
		return error(500, `Failed to save game result: ${message}`);
	}
};
