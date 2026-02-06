import { query, execute, getPool } from '$lib/server/db';
import type { RowDataPacket } from 'mysql2/promise';

// ---------------------------------------------------------------------------
// User Collections
// ---------------------------------------------------------------------------

export async function findUserOwnedCollectionIds(userSpotifyId: string): Promise<number[]> {
	const [rows] = await query<(RowDataPacket & { collection_id: number })[]>(
		'SELECT collection_id FROM user_collections WHERE user_spotify_id = ?',
		[userSpotifyId]
	);
	return rows.map((r) => r.collection_id);
}

export async function addUserCollection(
	userSpotifyId: string,
	collectionId: number
): Promise<void> {
	await execute(
		'INSERT IGNORE INTO user_collections (user_spotify_id, collection_id) VALUES (?, ?)',
		[userSpotifyId, collectionId]
	);
}

export async function removeUserCollection(
	userSpotifyId: string,
	collectionId: number
): Promise<void> {
	await execute(
		'DELETE FROM user_collections WHERE user_spotify_id = ? AND collection_id = ?',
		[userSpotifyId, collectionId]
	);
}

// ---------------------------------------------------------------------------
// User Collection Items
// ---------------------------------------------------------------------------

export async function findUserOwnedItemIds(
	userSpotifyId: string,
	collectionId: number
): Promise<number[]> {
	const [rows] = await query<(RowDataPacket & { collection_item_id: number })[]>(
		`SELECT DISTINCT uci.collection_item_id
		 FROM user_collection_items uci
		 JOIN collection_items ci ON ci.id = uci.collection_item_id
		 WHERE uci.user_spotify_id = ? AND ci.collection_id = ?`,
		[userSpotifyId, collectionId]
	);
	return rows.map((r) => r.collection_item_id);
}

export interface OwnedItemRarity {
	collection_item_id: number;
	rarity_id: number;
	rarity_name: string;
	rarity_color: string;
	rarity_level: number;
	copy_count: number;
	is_stuck: boolean;
}

export async function findUserOwnedItemsWithRarity(
	userSpotifyId: string,
	collectionId: number
): Promise<OwnedItemRarity[]> {
	// Returns one row per item+rarity combination with copy count, ordered by level DESC
	const [rows] = await query<(RowDataPacket & OwnedItemRarity)[]>(
		`SELECT uci.collection_item_id,
		        r.id AS rarity_id,
		        r.name AS rarity_name,
		        r.color AS rarity_color,
		        r.level AS rarity_level,
		        COUNT(*) AS copy_count,
		        MAX(uci.is_stuck) AS is_stuck
		 FROM user_collection_items uci
		 JOIN collection_items ci ON ci.id = uci.collection_item_id
		 JOIN rarities r ON r.id = uci.rarity_id
		 WHERE uci.user_spotify_id = ? AND ci.collection_id = ?
		 GROUP BY uci.collection_item_id, r.id, r.name, r.color, r.level
		 ORDER BY uci.collection_item_id, r.level DESC`,
		[userSpotifyId, collectionId]
	);
	return rows;
}

export async function addUserCollectionItem(
	userSpotifyId: string,
	collectionItemId: number,
	rarityId?: number
): Promise<void> {
	if (rarityId !== undefined) {
		await execute(
			'INSERT INTO user_collection_items (user_spotify_id, collection_item_id, rarity_id) VALUES (?, ?, ?)',
			[userSpotifyId, collectionItemId, rarityId]
		);
	} else {
		await execute(
			'INSERT INTO user_collection_items (user_spotify_id, collection_item_id) VALUES (?, ?)',
			[userSpotifyId, collectionItemId]
		);
	}
}

export async function removeUserCollectionItem(
	userSpotifyId: string,
	collectionItemId: number
): Promise<void> {
	await execute(
		'DELETE FROM user_collection_items WHERE user_spotify_id = ? AND collection_item_id = ? ORDER BY is_stuck ASC LIMIT 1',
		[userSpotifyId, collectionItemId]
	);
}

// ---------------------------------------------------------------------------
// Stuck Items (Sticker Album)
// ---------------------------------------------------------------------------

export async function findStuckItemIds(
	userSpotifyId: string,
	collectionId: number
): Promise<number[]> {
	const [rows] = await query<(RowDataPacket & { collection_item_id: number })[]>(
		`SELECT DISTINCT uci.collection_item_id
		 FROM user_collection_items uci
		 JOIN collection_items ci ON ci.id = uci.collection_item_id
		 WHERE uci.user_spotify_id = ? AND ci.collection_id = ? AND uci.is_stuck = TRUE`,
		[userSpotifyId, collectionId]
	);
	return rows.map((r) => r.collection_item_id);
}

export interface StickResult {
	rarity_id: number;
	rarity_name: string;
	rarity_color: string;
	rarity_level: number;
}

export async function stickItem(
	userSpotifyId: string,
	collectionItemId: number,
	rarityId?: number
): Promise<StickResult> {
	const conn = await getPool().getConnection();
	try {
		await conn.beginTransaction();

		// Unstick any currently stuck copy for this item
		await conn.execute(
			`UPDATE user_collection_items
			 SET is_stuck = FALSE
			 WHERE user_spotify_id = ? AND collection_item_id = ? AND is_stuck = TRUE`,
			[userSpotifyId, collectionItemId]
		);

		// Find the copy to stick
		let targetQuery: string;
		let targetParams: unknown[];

		if (rarityId !== undefined) {
			targetQuery = `SELECT uci.id, r.id AS rarity_id, r.name AS rarity_name, r.color AS rarity_color, r.level AS rarity_level
			               FROM user_collection_items uci
			               JOIN rarities r ON r.id = uci.rarity_id
			               WHERE uci.user_spotify_id = ? AND uci.collection_item_id = ? AND uci.rarity_id = ?
			               ORDER BY uci.created_at ASC
			               LIMIT 1`;
			targetParams = [userSpotifyId, collectionItemId, rarityId];
		} else {
			targetQuery = `SELECT uci.id, r.id AS rarity_id, r.name AS rarity_name, r.color AS rarity_color, r.level AS rarity_level
			               FROM user_collection_items uci
			               JOIN rarities r ON r.id = uci.rarity_id
			               WHERE uci.user_spotify_id = ? AND uci.collection_item_id = ?
			               ORDER BY r.level DESC, uci.created_at ASC
			               LIMIT 1`;
			targetParams = [userSpotifyId, collectionItemId];
		}

		const [candidates] = await conn.query<
			(RowDataPacket & { id: number; rarity_id: number; rarity_name: string; rarity_color: string; rarity_level: number })[]
		>(targetQuery, targetParams);

		if (candidates.length === 0) {
			await conn.rollback();
			throw new Error('User does not own this item');
		}

		const target = candidates[0];

		await conn.execute(
			'UPDATE user_collection_items SET is_stuck = TRUE WHERE id = ?',
			[target.id]
		);

		await conn.commit();
		return {
			rarity_id: target.rarity_id,
			rarity_name: target.rarity_name,
			rarity_color: target.rarity_color,
			rarity_level: target.rarity_level
		};
	} catch (err) {
		await conn.rollback();
		throw err;
	} finally {
		conn.release();
	}
}

export async function unstickItem(
	userSpotifyId: string,
	collectionItemId: number
): Promise<void> {
	await execute(
		`UPDATE user_collection_items
		 SET is_stuck = FALSE
		 WHERE user_spotify_id = ? AND collection_item_id = ? AND is_stuck = TRUE`,
		[userSpotifyId, collectionItemId]
	);
}
