import { json, error } from '@sveltejs/kit';
import { initializeSchema } from '$lib/server/schema';
import {
	findAllTemplates,
	createTemplate,
	findTemplateById,
	findTemplateQuestions,
	replaceTemplateQuestions
} from '$lib/server/repositories/trivia.repository';
import type { RequestHandler } from './$types';
import type { CreateTriviaTemplatePayload } from '$types/trivia.type';

export const GET: RequestHandler = async () => {
	try {
		await initializeSchema();
		const templates = await findAllTemplates();
		return json({ templates });
	} catch (err) {
		console.error('Failed to fetch trivia templates:', err);
		const message = err instanceof Error ? err.message : 'Unknown error';
		return error(500, `Failed to fetch trivia templates: ${message}`);
	}
};

export const POST: RequestHandler = async ({ request }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return error(400, 'Invalid JSON body');
	}

	const { name, description, questions } = body as Partial<CreateTriviaTemplatePayload>;

	if (typeof name !== 'string' || !name.trim()) {
		return error(400, 'Missing or invalid name');
	}

	if (!Array.isArray(questions) || questions.length === 0) {
		return error(400, 'At least one question is required');
	}

	try {
		await initializeSchema();

		const templateId = await createTemplate({
			name: name.trim(),
			description: typeof description === 'string' ? description.trim() || null : null
		});

		await replaceTemplateQuestions(
			templateId,
			questions.map((q, i) => ({
				question_type: q.question_type,
				config: q.config,
				position: q.position ?? i
			}))
		);

		const template = await findTemplateById(templateId);
		const savedQuestions = await findTemplateQuestions(templateId);

		return json({ template, questions: savedQuestions });
	} catch (err) {
		console.error('Failed to create trivia template:', err);
		const message = err instanceof Error ? err.message : 'Unknown error';
		return error(500, `Failed to create trivia template: ${message}`);
	}
};
