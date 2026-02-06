import { json, error } from '@sveltejs/kit';
import { query } from '$lib/server/db';
import type { RowDataPacket } from 'mysql2/promise';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, url }) => {
	const { name } = params;

	// Validate table name against actual tables to prevent SQL injection
	const [tableRows] = await query<RowDataPacket[]>('SHOW TABLES');
	const validTables = tableRows.map((row) => Object.values(row)[0] as string);

	if (!validTables.includes(name)) {
		return error(404, `Table "${name}" not found`);
	}

	const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
	const limit = Math.min(
		100,
		Math.max(1, parseInt(url.searchParams.get('limit') || '25', 10) || 25)
	);
	const offset = (page - 1) * limit;

	try {
		const [countResult] = await query<RowDataPacket[]>(`SELECT COUNT(*) as total FROM \`${name}\``);
		const total = countResult[0].total as number;

		const [rows] = await query<RowDataPacket[]>(`SELECT * FROM \`${name}\` LIMIT ? OFFSET ?`, [
			limit,
			offset
		]);

		const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

		return json({ rows, columns, total, page, limit });
	} catch (err) {
		console.error(`Failed to query table ${name}:`, err);
		const message = err instanceof Error ? err.message : 'Unknown error';
		return error(500, `Failed to query table: ${message}`);
	}
};
