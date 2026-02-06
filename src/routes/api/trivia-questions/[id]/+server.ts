import { json, error } from '@sveltejs/kit';
import { initializeSchema } from '$lib/server/schema';
import {
	findQuestionById,
	updateQuestion,
	deleteQuestion
} from '$lib/server/repositories/trivia.repository';
import { validateQuestion } from '$lib/server/trivia-validation';
import type { RequestHandler } from './$types';
import type { UpdateTriviaQuestionPayload } from '$types/trivia.type';

export const GET: RequestHandler = async ({ params }) => {
	const id = Number(params.id);
	if (!Number.isFinite(id) || id <= 0) {
		return error(400, 'Invalid question ID');
	}

	try {
		await initializeSchema();

		const question = await findQuestionById(id);
		if (!question) {
			return error(404, 'Question not found');
		}

		return json({ question });
	} catch (err) {
		console.error('Failed to fetch trivia question:', err);
		const message = err instanceof Error ? err.message : 'Unknown error';
		return error(500, `Failed to fetch trivia question: ${message}`);
	}
};

export const PUT: RequestHandler = async ({ params, request }) => {
	const id = Number(params.id);
	if (!Number.isFinite(id) || id <= 0) {
		return error(400, 'Invalid question ID');
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return error(400, 'Invalid JSON body');
	}

	const { question_type, config, position } = body as Partial<UpdateTriviaQuestionPayload>;

	// If type or config changed, validate the full combination
	if (question_type !== undefined || config !== undefined) {
		try {
			await initializeSchema();
			const existing = await findQuestionById(id);
			if (!existing) return error(404, 'Question not found');

			const mergedType = question_type ?? existing.question_type;
			const mergedConfig = config ?? existing.config;
			const validationError = validateQuestion({ question_type: mergedType, config: mergedConfig });
			if (validationError) return error(400, validationError);
		} catch (err) {
			console.error('Failed to update trivia question:', err);
			const message = err instanceof Error ? err.message : 'Unknown error';
			return error(500, `Failed to update trivia question: ${message}`);
		}
	}

	try {
		await initializeSchema();

		const existing = await findQuestionById(id);
		if (!existing) return error(404, 'Question not found');

		await updateQuestion(id, { question_type, config, position });

		const updated = await findQuestionById(id);
		return json({ question: updated });
	} catch (err) {
		console.error('Failed to update trivia question:', err);
		const message = err instanceof Error ? err.message : 'Unknown error';
		return error(500, `Failed to update trivia question: ${message}`);
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	const id = Number(params.id);
	if (!Number.isFinite(id) || id <= 0) {
		return error(400, 'Invalid question ID');
	}

	try {
		await initializeSchema();

		const existing = await findQuestionById(id);
		if (!existing) {
			return error(404, 'Question not found');
		}

		await deleteQuestion(id);
		return json({ success: true });
	} catch (err) {
		console.error('Failed to delete trivia question:', err);
		const message = err instanceof Error ? err.message : 'Unknown error';
		return error(500, `Failed to delete trivia question: ${message}`);
	}
};
