import { json, error } from '@sveltejs/kit';
import { query } from '$lib/server/db';
import type { RowDataPacket } from 'mysql2/promise';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		const [rows] = await query<RowDataPacket[]>('SHOW TABLES');
		const tables = rows.map((row) => Object.values(row)[0] as string);

		return json({ tables });
	} catch (err) {
		console.error('Failed to list tables:', err);
		const message = err instanceof Error ? err.message : 'Unknown error';
		return error(500, `Failed to list tables: ${message}`);
	}
};
