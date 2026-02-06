import { json, error } from '@sveltejs/kit';
import { getSession, serveNextBatch, addQuestionsToSession } from '$lib/server/trivia-session';
import { generateTriviaQuestions, shuffleArray } from '$lib/server/trivia-generator';
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

	const { sessionId } = body as { sessionId?: unknown };
	if (typeof sessionId !== 'string' || !sessionId) {
		return error(400, 'Missing or invalid sessionId');
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

	// Serve any already-generated but unserved questions
	let nextQuestions = serveNextBatch(session);

	// If pool is running low, generate more
	if (session.questions.length - session.servedCount < 5 && !session.fetchExhausted) {
		try {
			const { questions } = await generateTriviaQuestions(session.collectionId);
			addQuestionsToSession(session, shuffleArray(questions));
			const more = serveNextBatch(session);
			nextQuestions = [...nextQuestions, ...more];
		} catch {
			session.fetchExhausted = true;
		}
	}

	const exhausted = session.fetchExhausted && session.servedCount >= session.questions.length;

	return json({ questions: nextQuestions, exhausted });
};
