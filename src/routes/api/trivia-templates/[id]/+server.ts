import { json, error } from '@sveltejs/kit';
import { initializeSchema } from '$lib/server/schema';
import {
	findTemplateById,
	findTemplateQuestions,
	updateTemplate,
	deleteTemplate,
	replaceTemplateQuestions
} from '$lib/server/repositories/trivia.repository';
import type { RequestHandler } from './$types';
import type { UpdateTriviaTemplatePayload } from '$types/trivia.type';

export const GET: RequestHandler = async ({ params }) => {
	const id = Number(params.id);
	if (!Number.isFinite(id) || id <= 0) {
		return error(400, 'Invalid template ID');
	}

	try {
		await initializeSchema();

		const template = await findTemplateById(id);
		if (!template) {
			return error(404, 'Template not found');
		}

		const questions = await findTemplateQuestions(id);
		return json({ template, questions });
	} catch (err) {
		console.error('Failed to fetch trivia template:', err);
		const message = err instanceof Error ? err.message : 'Unknown error';
		return error(500, `Failed to fetch trivia template: ${message}`);
	}
};

export const PUT: RequestHandler = async ({ params, request }) => {
	const id = Number(params.id);
	if (!Number.isFinite(id) || id <= 0) {
		return error(400, 'Invalid template ID');
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return error(400, 'Invalid JSON body');
	}

	const { name, description, questions } = body as Partial<UpdateTriviaTemplatePayload>;

	try {
		await initializeSchema();

		const existing = await findTemplateById(id);
		if (!existing) {
			return error(404, 'Template not found');
		}

		await updateTemplate(id, {
			name: typeof name === 'string' ? name.trim() : undefined,
			description: typeof description === 'string' ? description.trim() || null : undefined
		});

		if (Array.isArray(questions)) {
			await replaceTemplateQuestions(
				id,
				questions.map((q, i) => ({
					question_type: q.question_type,
					config: q.config,
					position: q.position ?? i
				}))
			);
		}

		const template = await findTemplateById(id);
		const savedQuestions = await findTemplateQuestions(id);

		return json({ template, questions: savedQuestions });
	} catch (err) {
		console.error('Failed to update trivia template:', err);
		const message = err instanceof Error ? err.message : 'Unknown error';
		return error(500, `Failed to update trivia template: ${message}`);
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	const id = Number(params.id);
	if (!Number.isFinite(id) || id <= 0) {
		return error(400, 'Invalid template ID');
	}

	try {
		await initializeSchema();

		const existing = await findTemplateById(id);
		if (!existing) {
			return error(404, 'Template not found');
		}

		await deleteTemplate(id);
		return json({ success: true });
	} catch (err) {
		console.error('Failed to delete trivia template:', err);
		const message = err instanceof Error ? err.message : 'Unknown error';
		return error(500, `Failed to delete trivia template: ${message}`);
	}
};
