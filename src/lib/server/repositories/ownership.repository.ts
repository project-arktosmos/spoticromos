import { query, execute } from '$lib/server/db';
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
		        COUNT(*) AS copy_count
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
		'DELETE FROM user_collection_items WHERE user_spotify_id = ? AND collection_item_id = ? LIMIT 1',
		[userSpotifyId, collectionItemId]
	);
}
