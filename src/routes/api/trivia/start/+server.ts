import { json, error } from '@sveltejs/kit';
import { generateTriviaQuestions, shuffleArray } from '$lib/server/trivia-generator';
import { createSession, serveNextBatch } from '$lib/server/trivia-session';
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

	const { collectionId } = body as { collectionId?: unknown };
	const colId = Number(collectionId);
	if (!Number.isFinite(colId) || colId <= 0) {
		return error(400, 'Missing or invalid collectionId');
	}

	try {
		const result = await generateTriviaQuestions(colId);

		if (result.questions.length === 0) {
			return error(400, 'Could not generate any questions for this collection.');
		}

		const session = createSession({
			userId: locals.user.spotifyId,
			collectionId: colId,
			collectionName: result.collectionName,
			questions: shuffleArray(result.questions)
		});

		const questions = serveNextBatch(session);

		return json({
			sessionId: session.id,
			questions
		});
	} catch (err) {
		console.error('Failed to start trivia game:', err);
		const message = err instanceof Error ? err.message : 'Unknown error';
		return error(500, `Failed to start trivia game: ${message}`);
	}
};
