import { json, error } from '@sveltejs/kit';
import { initializeSchema } from '$lib/server/schema';
import {
	savePairGameResult,
	findHighestWinGridSize
} from '$lib/server/repositories/pair-game.repository';
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

	const { collectionId, gridSize, moves, errors, won } = body as {
		collectionId?: unknown;
		gridSize?: unknown;
		moves?: unknown;
		errors?: unknown;
		won?: unknown;
	};

	if (typeof collectionId !== 'number' || !Number.isFinite(collectionId) || collectionId <= 0) {
		return error(400, 'Missing or invalid collectionId');
	}
	if (typeof gridSize !== 'number' || !Number.isFinite(gridSize) || gridSize < 3) {
		return error(400, 'Missing or invalid gridSize');
	}
	if (typeof moves !== 'number' || !Number.isFinite(moves) || moves < 0) {
		return error(400, 'Missing or invalid moves');
	}
	if (typeof errors !== 'number' || !Number.isFinite(errors) || errors < 0) {
		return error(400, 'Missing or invalid errors');
	}
	if (typeof won !== 'boolean') {
		return error(400, 'Missing or invalid won');
	}

	try {
		await initializeSchema();

		const userId = locals.user.spotifyId;
		let previousHighscore: number | null = null;

		if (won) {
			previousHighscore = await findHighestWinGridSize(userId, collectionId);
		}

		await savePairGameResult({
			userSpotifyId: userId,
			collectionId,
			gridSize,
			moves,
			errors,
			won
		});

		let rewards = 0;
		let newHighscore = false;

		if (won) {
			const isNewHighscore = previousHighscore === null || gridSize > previousHighscore;

			try {
				await addRewards(userId, collectionId, 1);
				rewards = 1;

				if (isNewHighscore) {
					await addRewards(userId, collectionId, 10);
					rewards = 11;
					newHighscore = true;
				}
			} catch {
				// User may not own the collection — skip rewards silently
			}
		}

		return json({ saved: true, rewards, newHighscore });
	} catch (err) {
		console.error('Failed to save pair game result:', err);
		const message = err instanceof Error ? err.message : 'Unknown error';
		return error(500, `Failed to save game result: ${message}`);
	}
};
