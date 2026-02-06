import { json, error } from '@sveltejs/kit';
import { initializeSchema } from '$lib/server/schema';
import { findAllQuestions, createQuestion } from '$lib/server/repositories/trivia.repository';
import { validateQuestion } from '$lib/server/trivia-validation';
import type { RequestHandler } from './$types';
import type { CreateTriviaQuestionPayload } from '$types/trivia.type';

export const GET: RequestHandler = async () => {
	try {
		await initializeSchema();
		const questions = await findAllQuestions();
		return json({ questions });
	} catch (err) {
		console.error('Failed to fetch trivia questions:', err);
		const message = err instanceof Error ? err.message : 'Unknown error';
		return error(500, `Failed to fetch trivia questions: ${message}`);
	}
};

export const POST: RequestHandler = async ({ request }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return error(400, 'Invalid JSON body');
	}

	const { question_type, config } = body as Partial<CreateTriviaQuestionPayload>;

	const validationError = validateQuestion({ question_type, config });
	if (validationError) {
		return error(400, validationError);
	}

	try {
		await initializeSchema();

		const id = await createQuestion({
			question_type: question_type!,
			config: config!
		});

		return json({ id });
	} catch (err) {
		console.error('Failed to create trivia question:', err);
		const message = err instanceof Error ? err.message : 'Unknown error';
		return error(500, `Failed to create trivia question: ${message}`);
	}
};
