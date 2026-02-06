import { query, execute } from '$lib/server/db';
import type { RowDataPacket } from 'mysql2/promise';

export interface UserRow {
	spotify_id: string;
	display_name: string | null;
	email: string | null;
	avatar_url: string | null;
	access_token: string | null;
	refresh_token: string | null;
	token_expires_at: number | null;
	created_at: string;
	updated_at: string;
}

interface UserDbRow extends RowDataPacket, UserRow {}

export async function upsertUser(data: {
	spotifyId: string;
	displayName: string | null;
	email: string | null;
	avatarUrl: string | null;
	accessToken: string;
	refreshToken: string;
	tokenExpiresAt: number;
}): Promise<void> {
	await execute(
		`INSERT INTO users (spotify_id, display_name, email, avatar_url, access_token, refresh_token, token_expires_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?)
		 ON DUPLICATE KEY UPDATE
		   display_name = VALUES(display_name),
		   email = VALUES(email),
		   avatar_url = VALUES(avatar_url),
		   access_token = VALUES(access_token),
		   refresh_token = VALUES(refresh_token),
		   token_expires_at = VALUES(token_expires_at)`,
		[
			data.spotifyId,
			data.displayName,
			data.email,
			data.avatarUrl,
			data.accessToken,
			data.refreshToken,
			data.tokenExpiresAt
		]
	);
}

export async function ensureUserExists(data: {
	spotifyId: string;
	displayName: string | null;
}): Promise<void> {
	await execute(
		`INSERT INTO users (spotify_id, display_name)
		 VALUES (?, ?)
		 ON DUPLICATE KEY UPDATE
		   display_name = COALESCE(VALUES(display_name), display_name)`,
		[data.spotifyId, data.displayName]
	);
}

export async function findUserBySpotifyId(spotifyId: string): Promise<UserRow | null> {
	const [rows] = await query<UserDbRow[]>('SELECT * FROM users WHERE spotify_id = ?', [
		spotifyId
	]);
	return rows.length ? rows[0] : null;
}

export async function createAnonymousUser(anonId: string): Promise<void> {
	await execute(
		`INSERT INTO users (spotify_id, display_name)
		 VALUES (?, 'Anonymous Player')`,
		[anonId]
	);
}

export async function deleteUser(spotifyId: string): Promise<void> {
	await execute('DELETE FROM users WHERE spotify_id = ?', [spotifyId]);
}

export async function updateUserTokens(
	spotifyId: string,
	accessToken: string,
	refreshToken: string,
	tokenExpiresAt: number
): Promise<void> {
	await execute(
		'UPDATE users SET access_token = ?, refresh_token = ?, token_expires_at = ? WHERE spotify_id = ?',
		[accessToken, refreshToken, tokenExpiresAt, spotifyId]
	);
}
