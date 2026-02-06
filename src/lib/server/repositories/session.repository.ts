import { query, execute } from '$lib/server/db';
import type { RowDataPacket } from 'mysql2/promise';

export interface SessionRow {
	id: string;
	user_spotify_id: string;
	created_at: string;
	expires_at: string;
}

interface SessionDbRow extends RowDataPacket, SessionRow {}

const SESSION_DURATION_DAYS = 30;

export async function createSession(userSpotifyId: string): Promise<string> {
	const id = crypto.randomUUID();
	await execute(
		`INSERT INTO sessions (id, user_spotify_id, expires_at)
		 VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))`,
		[id, userSpotifyId, SESSION_DURATION_DAYS]
	);
	return id;
}

export async function findSession(sessionId: string): Promise<SessionRow | null> {
	const [rows] = await query<SessionDbRow[]>(
		'SELECT * FROM sessions WHERE id = ? AND expires_at > NOW()',
		[sessionId]
	);
	return rows.length ? rows[0] : null;
}

export async function deleteSession(sessionId: string): Promise<void> {
	await execute('DELETE FROM sessions WHERE id = ?', [sessionId]);
}

export async function deleteUserSessions(userSpotifyId: string): Promise<void> {
	await execute('DELETE FROM sessions WHERE user_spotify_id = ?', [userSpotifyId]);
}
