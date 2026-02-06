import { query, execute } from '$lib/server/db';
import type { RowDataPacket } from 'mysql2/promise';
import type {
	TriviaQuestionRow,
	TriviaQuestionType,
	TriviaQuestionConfig
} from '$types/trivia.type';

// ---------------------------------------------------------------------------
// Row types
// ---------------------------------------------------------------------------

interface TriviaQuestionDbRow extends RowDataPacket {
	id: number;
	question_type: string;
	config: string;
	position: number;
	created_at: string;
	updated_at: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseQuestionRow(row: TriviaQuestionDbRow): TriviaQuestionRow {
	return {
		id: row.id,
		question_type: row.question_type as TriviaQuestionType,
		config: typeof row.config === 'string' ? JSON.parse(row.config) : row.config,
		position: row.position,
		created_at: row.created_at,
		updated_at: row.updated_at
	};
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function findAllQuestions(): Promise<TriviaQuestionRow[]> {
	const [rows] = await query<TriviaQuestionDbRow[]>(
		'SELECT * FROM trivia_questions ORDER BY position ASC, id ASC'
	);
	return rows.map(parseQuestionRow);
}

export async function findQuestionById(id: number): Promise<TriviaQuestionRow | null> {
	const [rows] = await query<TriviaQuestionDbRow[]>('SELECT * FROM trivia_questions WHERE id = ?', [
		id
	]);
	return rows.length ? parseQuestionRow(rows[0]) : null;
}

export async function createQuestion(data: {
	question_type: TriviaQuestionType;
	config: TriviaQuestionConfig;
	position?: number;
}): Promise<number> {
	const [result] = await execute(
		'INSERT INTO trivia_questions (question_type, config, position) VALUES (?, ?, ?)',
		[data.question_type, JSON.stringify(data.config), data.position ?? 0]
	);
	return result.insertId;
}

export async function updateQuestion(
	id: number,
	data: { question_type?: TriviaQuestionType; config?: TriviaQuestionConfig; position?: number }
): Promise<void> {
	const sets: string[] = [];
	const values: unknown[] = [];

	if (data.question_type !== undefined) {
		sets.push('question_type = ?');
		values.push(data.question_type);
	}
	if (data.config !== undefined) {
		sets.push('config = ?');
		values.push(JSON.stringify(data.config));
	}
	if (data.position !== undefined) {
		sets.push('position = ?');
		values.push(data.position);
	}

	if (sets.length === 0) return;

	values.push(id);
	await execute(`UPDATE trivia_questions SET ${sets.join(', ')} WHERE id = ?`, values);
}

export async function deleteQuestion(id: number): Promise<void> {
	await execute('DELETE FROM trivia_questions WHERE id = ?', [id]);
}

export async function bulkCreateQuestions(
	questions: Array<{
		question_type: TriviaQuestionType;
		config: TriviaQuestionConfig;
		position: number;
	}>
): Promise<void> {
	if (questions.length === 0) return;

	const placeholders = questions.map(() => '(?, ?, ?)').join(', ');
	const values = questions.flatMap((q) => [q.question_type, JSON.stringify(q.config), q.position]);

	await execute(
		`INSERT INTO trivia_questions (question_type, config, position) VALUES ${placeholders}`,
		values
	);
}
