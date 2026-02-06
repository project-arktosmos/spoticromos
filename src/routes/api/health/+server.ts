import { json } from '@sveltejs/kit';
import { getPool } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		const pool = getPool();
		const connection = await pool.getConnection();
		await connection.ping();
		connection.release();

		return json({ status: 'ok', database: 'connected' });
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		return json({ status: 'error', database: 'disconnected', error: message }, { status: 503 });
	}
};
