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
// Collection Progress (per-collection completion stats)
// ---------------------------------------------------------------------------

export interface CollectionProgress {
	collection_id: number;
	completed_slots: number;
	total_slots: number;
	highest_completed_rarity_color: string | null;
}

export async function findUserCollectionProgress(
	userSpotifyId: string
): Promise<CollectionProgress[]> {
	const [rows] = await query<(RowDataPacket & {
		collection_id: number;
		completed_slots: number;
		total_slots: number;
	})[]>(
		`SELECT
		   c.id AS collection_id,
		   (SELECT COUNT(*) FROM collection_items ci WHERE ci.collection_id = c.id)
		     * (SELECT COUNT(*) FROM rarities) AS total_slots,
		   (
		     SELECT COUNT(DISTINCT CONCAT(uci.collection_item_id, '-', uci.rarity_id))
		     FROM user_collection_items uci
		     JOIN collection_items ci ON ci.id = uci.collection_item_id
		     WHERE uci.user_spotify_id = ? AND ci.collection_id = c.id
		   ) AS completed_slots
		 FROM collections c`,
		[userSpotifyId]
	);

	// Find highest fully-completed rarity color per collection
	const [rarityRows] = await query<(RowDataPacket & {
		collection_id: number;
		rarity_color: string;
		rarity_level: number;
		owned_count: number;
		item_count: number;
	})[]>(
		`SELECT
		   ci.collection_id,
		   r.color AS rarity_color,
		   r.level AS rarity_level,
		   COUNT(DISTINCT uci.collection_item_id) AS owned_count,
		   (SELECT COUNT(*) FROM collection_items ci2 WHERE ci2.collection_id = ci.collection_id) AS item_count
		 FROM collection_items ci
		 JOIN user_collection_items uci ON uci.collection_item_id = ci.id AND uci.user_spotify_id = ?
		 JOIN rarities r ON r.id = uci.rarity_id
		 GROUP BY ci.collection_id, r.id, r.color, r.level
		 HAVING owned_count >= item_count AND item_count > 0
		 ORDER BY ci.collection_id, r.level DESC`,
		[userSpotifyId]
	);

	// Build a map: collection_id -> highest completed rarity color
	const colorMap = new Map<number, string>();
	for (const r of rarityRows) {
		if (!colorMap.has(r.collection_id)) {
			colorMap.set(r.collection_id, r.rarity_color);
		}
	}

	return rows.map(row => ({
		collection_id: row.collection_id,
		completed_slots: row.completed_slots,
		total_slots: row.total_slots,
		highest_completed_rarity_color: colorMap.get(row.collection_id) ?? null
	}));
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

// ---------------------------------------------------------------------------
// Merge Items (Rarity Upgrade)
// ---------------------------------------------------------------------------

export interface MergeResult {
	next_rarity_id: number;
	next_rarity_name: string;
	next_rarity_color: string;
	next_rarity_level: number;
}

export async function mergeItems(
	userSpotifyId: string,
	collectionItemId: number,
	rarityId: number
): Promise<MergeResult> {
	const conn = await getPool().getConnection();
	try {
		await conn.beginTransaction();

		// Find the current rarity
		const [currentRows] = await conn.query<(RowDataPacket & { id: number; level: number })[]>(
			'SELECT id, level FROM rarities WHERE id = ?',
			[rarityId]
		);
		if (currentRows.length === 0) {
			await conn.rollback();
			throw new Error('Rarity not found');
		}
		const currentLevel = currentRows[0].level;

		// Find the next rarity tier
		const [nextRows] = await conn.query<
			(RowDataPacket & { id: number; name: string; color: string; level: number })[]
		>(
			'SELECT id, name, color, level FROM rarities WHERE level = ?',
			[currentLevel + 1]
		);
		if (nextRows.length === 0) {
			await conn.rollback();
			throw new Error('Already at maximum rarity tier');
		}
		const nextRarity = nextRows[0];

		// Count non-stuck copies at this rarity
		const [countRows] = await conn.query<(RowDataPacket & { cnt: number })[]>(
			`SELECT COUNT(*) AS cnt
			 FROM user_collection_items
			 WHERE user_spotify_id = ? AND collection_item_id = ? AND rarity_id = ? AND is_stuck = FALSE`,
			[userSpotifyId, collectionItemId, rarityId]
		);
		if (countRows[0].cnt < 2) {
			await conn.rollback();
			throw new Error('Not enough copies to merge (need 2 non-stuck)');
		}

		// Delete 2 non-stuck copies (oldest first)
		await conn.execute(
			`DELETE FROM user_collection_items
			 WHERE user_spotify_id = ? AND collection_item_id = ? AND rarity_id = ? AND is_stuck = FALSE
			 ORDER BY created_at ASC
			 LIMIT 2`,
			[userSpotifyId, collectionItemId, rarityId]
		);

		// Insert 1 copy at next rarity
		await conn.execute(
			'INSERT INTO user_collection_items (user_spotify_id, collection_item_id, rarity_id) VALUES (?, ?, ?)',
			[userSpotifyId, collectionItemId, nextRarity.id]
		);

		await conn.commit();
		return {
			next_rarity_id: nextRarity.id,
			next_rarity_name: nextRarity.name,
			next_rarity_color: nextRarity.color,
			next_rarity_level: nextRarity.level
		};
	} catch (err) {
		await conn.rollback();
		throw err;
	} finally {
		conn.release();
	}
}

// ---------------------------------------------------------------------------
// Recycle Items (Destroy 3 copies → gain rarity.level rewards)
// ---------------------------------------------------------------------------

export interface RecycleResult {
	rewards_granted: number;
	rarity_name: string;
	rarity_level: number;
}

export async function recycleItems(
	userSpotifyId: string,
	collectionId: number,
	collectionItemId: number,
	rarityId: number
): Promise<RecycleResult> {
	const conn = await getPool().getConnection();
	try {
		await conn.beginTransaction();

		// Find the rarity and its level
		const [rarityRows] = await conn.query<
			(RowDataPacket & { id: number; name: string; level: number })[]
		>(
			'SELECT id, name, level FROM rarities WHERE id = ?',
			[rarityId]
		);
		if (rarityRows.length === 0) {
			await conn.rollback();
			throw new Error('Rarity not found');
		}
		const rarity = rarityRows[0];

		// Count non-stuck copies at this rarity
		const [countRows] = await conn.query<(RowDataPacket & { cnt: number })[]>(
			`SELECT COUNT(*) AS cnt
			 FROM user_collection_items
			 WHERE user_spotify_id = ? AND collection_item_id = ? AND rarity_id = ? AND is_stuck = FALSE`,
			[userSpotifyId, collectionItemId, rarityId]
		);
		if (countRows[0].cnt < 3) {
			await conn.rollback();
			throw new Error('Not enough copies to recycle (need 3 non-stuck)');
		}

		// Delete 3 non-stuck copies (oldest first)
		await conn.execute(
			`DELETE FROM user_collection_items
			 WHERE user_spotify_id = ? AND collection_item_id = ? AND rarity_id = ? AND is_stuck = FALSE
			 ORDER BY created_at ASC
			 LIMIT 3`,
			[userSpotifyId, collectionItemId, rarityId]
		);

		// Grant rewards equal to the rarity level
		const rewardsGranted = rarity.level;
		await conn.execute(
			`UPDATE user_collections
			 SET unclaimed_rewards = unclaimed_rewards + ?
			 WHERE user_spotify_id = ? AND collection_id = ?`,
			[rewardsGranted, userSpotifyId, collectionId]
		);

		await conn.commit();
		return {
			rewards_granted: rewardsGranted,
			rarity_name: rarity.name,
			rarity_level: rarity.level
		};
	} catch (err) {
		await conn.rollback();
		throw err;
	} finally {
		conn.release();
	}
}
