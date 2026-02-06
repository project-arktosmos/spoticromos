import { query, execute } from '$lib/server/db';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import type {
	TriviaTemplateRow,
	TriviaTemplateQuestionRow,
	TriviaTemplateWithQuestions,
	TriviaQuestionType,
	TriviaQuestionConfig
} from '$types/trivia.type';

// ---------------------------------------------------------------------------
// Row types
// ---------------------------------------------------------------------------

interface TriviaTemplateDbRow extends RowDataPacket, TriviaTemplateRow {}

interface TriviaTemplateQuestionDbRow extends RowDataPacket {
	id: number;
	template_id: number;
	question_type: string;
	config: string;
	position: number;
	created_at: string;
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export async function findAllTemplates(): Promise<
	(TriviaTemplateRow & { question_count: number })[]
> {
	const [rows] = await query<(TriviaTemplateDbRow & { question_count: number })[]>(
		`SELECT t.*, COUNT(q.id) AS question_count
		 FROM trivia_templates t
		 LEFT JOIN trivia_template_questions q ON q.template_id = t.id
		 GROUP BY t.id
		 ORDER BY t.updated_at DESC`
	);
	return rows;
}

export async function findAllTemplatesWithQuestions(): Promise<TriviaTemplateWithQuestions[]> {
	const [templates] = await query<TriviaTemplateDbRow[]>(
		'SELECT * FROM trivia_templates ORDER BY updated_at DESC'
	);
	const [questionRows] = await query<TriviaTemplateQuestionDbRow[]>(
		'SELECT * FROM trivia_template_questions ORDER BY template_id, position ASC'
	);

	const questionsByTemplate = new Map<number, TriviaTemplateQuestionRow[]>();
	for (const row of questionRows) {
		const parsed = parseQuestionRow(row);
		const list = questionsByTemplate.get(parsed.template_id) ?? [];
		list.push(parsed);
		questionsByTemplate.set(parsed.template_id, list);
	}

	return templates.map((t) => ({
		...t,
		questions: questionsByTemplate.get(t.id) ?? []
	}));
}

export async function findTemplateById(id: number): Promise<TriviaTemplateRow | null> {
	const [rows] = await query<TriviaTemplateDbRow[]>(
		'SELECT * FROM trivia_templates WHERE id = ?',
		[id]
	);
	return rows.length ? rows[0] : null;
}

export async function createTemplate(data: {
	name: string;
	description: string | null;
}): Promise<number> {
	const [result] = await query<ResultSetHeader>(
		'INSERT INTO trivia_templates (name, description) VALUES (?, ?)',
		[data.name, data.description]
	);
	return result.insertId;
}

export async function updateTemplate(
	id: number,
	data: { name?: string; description?: string | null }
): Promise<void> {
	const sets: string[] = [];
	const values: unknown[] = [];

	if (data.name !== undefined) {
		sets.push('name = ?');
		values.push(data.name);
	}
	if (data.description !== undefined) {
		sets.push('description = ?');
		values.push(data.description);
	}

	if (sets.length === 0) return;

	values.push(id);
	await execute(`UPDATE trivia_templates SET ${sets.join(', ')} WHERE id = ?`, values);
}

export async function deleteTemplate(id: number): Promise<void> {
	await execute('DELETE FROM trivia_template_questions WHERE template_id = ?', [id]);
	await execute('DELETE FROM trivia_templates WHERE id = ?', [id]);
}

// ---------------------------------------------------------------------------
// Template questions
// ---------------------------------------------------------------------------

function parseQuestionRow(row: TriviaTemplateQuestionDbRow): TriviaTemplateQuestionRow {
	return {
		id: row.id,
		template_id: row.template_id,
		question_type: row.question_type as TriviaQuestionType,
		config: typeof row.config === 'string' ? JSON.parse(row.config) : row.config,
		position: row.position,
		created_at: row.created_at
	};
}

export async function findTemplateQuestions(
	templateId: number
): Promise<TriviaTemplateQuestionRow[]> {
	const [rows] = await query<TriviaTemplateQuestionDbRow[]>(
		'SELECT * FROM trivia_template_questions WHERE template_id = ? ORDER BY position ASC',
		[templateId]
	);
	return rows.map(parseQuestionRow);
}

export async function replaceTemplateQuestions(
	templateId: number,
	questions: Array<{
		question_type: TriviaQuestionType;
		config: TriviaQuestionConfig;
		position: number;
	}>
): Promise<void> {
	await execute('DELETE FROM trivia_template_questions WHERE template_id = ?', [templateId]);

	if (questions.length === 0) return;

	const placeholders = questions.map(() => '(?, ?, ?, ?)').join(', ');
	const values = questions.flatMap((q) => [
		templateId,
		q.question_type,
		JSON.stringify(q.config),
		q.position
	]);

	await execute(
		`INSERT INTO trivia_template_questions (template_id, question_type, config, position) VALUES ${placeholders}`,
		values
	);
}
