import { getPool } from '$lib/server/db';

/**
 * Merges all data from an anonymous user into a Spotify-authenticated user.
 * Runs as a single transaction to ensure atomicity.
 */
export async function mergeAnonymousUser(anonId: string, spotifyId: string): Promise<void> {
	const conn = await getPool().getConnection();
	try {
		await conn.beginTransaction();

		// 1. user_collections: merge overlapping rows (sum rewards, keep latest free claim)
		await conn.execute(
			`UPDATE user_collections uc_spotify
			 JOIN user_collections uc_anon
			   ON uc_anon.collection_id = uc_spotify.collection_id
			   AND uc_anon.user_spotify_id = ?
			 SET uc_spotify.unclaimed_rewards = uc_spotify.unclaimed_rewards + uc_anon.unclaimed_rewards,
			     uc_spotify.last_free_claim = GREATEST(
			       COALESCE(uc_spotify.last_free_claim, '1970-01-01'),
			       COALESCE(uc_anon.last_free_claim, '1970-01-01')
			     )
			 WHERE uc_spotify.user_spotify_id = ?`,
			[anonId, spotifyId]
		);

		// Delete the anon's overlapping collection rows (now merged)
		await conn.execute(
			`DELETE uc_anon FROM user_collections uc_anon
			 INNER JOIN user_collections uc_spotify
			   ON uc_spotify.collection_id = uc_anon.collection_id
			   AND uc_spotify.user_spotify_id = ?
			 WHERE uc_anon.user_spotify_id = ?`,
			[spotifyId, anonId]
		);

		// Move remaining non-overlapping anon collection rows
		await conn.execute(
			'UPDATE user_collections SET user_spotify_id = ? WHERE user_spotify_id = ?',
			[spotifyId, anonId]
		);

		// 2. user_collection_items: simple move (auto-increment PK, no conflicts)
		await conn.execute(
			'UPDATE user_collection_items SET user_spotify_id = ? WHERE user_spotify_id = ?',
			[spotifyId, anonId]
		);

		// 3. pair_game_results: simple move
		await conn.execute(
			'UPDATE pair_game_results SET user_spotify_id = ? WHERE user_spotify_id = ?',
			[spotifyId, anonId]
		);

		// 4. trivia_game_results: simple move
		await conn.execute(
			'UPDATE trivia_game_results SET user_spotify_id = ? WHERE user_spotify_id = ?',
			[spotifyId, anonId]
		);

		// 5. Delete anon sessions
		await conn.execute('DELETE FROM sessions WHERE user_spotify_id = ?', [anonId]);

		// 6. Delete anon user record
		await conn.execute('DELETE FROM users WHERE spotify_id = ?', [anonId]);

		await conn.commit();
	} catch (e) {
		await conn.rollback();
		throw e;
	} finally {
		conn.release();
	}
}
