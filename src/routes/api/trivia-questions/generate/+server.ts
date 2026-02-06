import { json, error } from '@sveltejs/kit';
import { generateTriviaQuestions } from '$lib/server/trivia-generator';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return error(400, 'Invalid JSON body');
	}

	const { collectionId, questionId } = body as { collectionId?: unknown; questionId?: unknown };
	const colId = Number(collectionId);
	if (!Number.isFinite(colId) || colId <= 0) {
		return error(400, 'Missing or invalid collectionId');
	}

	const qId = questionId != null ? Number(questionId) : undefined;

	try {
		const trivia = await generateTriviaQuestions(colId, qId);
		return json({ trivia });
	} catch (err) {
		console.error('Failed to generate trivia:', err);
		const message = err instanceof Error ? err.message : 'Unknown error';
		if (message === 'Collection not found' || message === 'Question not found') {
			return error(404, message);
		}
		if (message === 'No trivia questions configured') {
			return error(404, message);
		}
		return error(500, `Failed to generate trivia: ${message}`);
	}
};
