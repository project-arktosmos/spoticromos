import { query, execute, getPool } from '$lib/server/db';
import type { RowDataPacket } from 'mysql2/promise';
import type { CollectionItemWithArtists } from './collection.repository';
import type { RarityRow } from '$types/rarity.type';
import { findAllRarities } from './rarity.repository';

// ---------------------------------------------------------------------------
// Row types
// ---------------------------------------------------------------------------

export interface UserCollectionWithRewards {
	collection_id: number;
	collection_name: string;
	cover_image_url: string | null;
	unclaimed_rewards: number;
	total_items: number;
	claimed_items: number;
}

interface UserCollectionWithRewardsDbRow extends RowDataPacket, UserCollectionWithRewards {}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function findUserCollectionsWithRewards(
	userSpotifyId: string
): Promise<UserCollectionWithRewards[]> {
	const [rows] = await query<UserCollectionWithRewardsDbRow[]>(
		`SELECT
			uc.collection_id,
			c.name AS collection_name,
			c.cover_image_url,
			uc.unclaimed_rewards,
			COUNT(DISTINCT ci.id) AS total_items,
			COUNT(DISTINCT uci.collection_item_id) AS claimed_items
		 FROM user_collections uc
		 JOIN collections c ON c.id = uc.collection_id
		 LEFT JOIN collection_items ci ON ci.collection_id = uc.collection_id
		 LEFT JOIN user_collection_items uci
			 ON uci.collection_item_id = ci.id
			AND uci.user_spotify_id = uc.user_spotify_id
		 WHERE uc.user_spotify_id = ?
		 GROUP BY uc.collection_id, c.name, c.cover_image_url, uc.unclaimed_rewards
		 ORDER BY c.name ASC`,
		[userSpotifyId]
	);
	return rows;
}

export async function addRewards(
	userSpotifyId: string,
	collectionId: number,
	amount: number
): Promise<void> {
	const [result] = await execute(
		`UPDATE user_collections
		 SET unclaimed_rewards = unclaimed_rewards + ?
		 WHERE user_spotify_id = ? AND collection_id = ?`,
		[amount, userSpotifyId, collectionId]
	);
	if (result.affectedRows === 0) {
		throw new Error('User does not own this collection');
	}
}

/**
 * Weighted rarity selection: each tier is ~3x rarer than the one below.
 * weight = 3^(maxLevel - level)
 *
 * For default 5 tiers: Common 67%, Uncommon 22%, Rare 7.4%, Epic 2.5%, Legendary 0.8%
 */
function pickWeightedRarity(rarities: RarityRow[]): RarityRow {
	const maxLevel = Math.max(...rarities.map((r) => r.level));
	const weights = rarities.map((r) => Math.pow(3, maxLevel - r.level));
	const totalWeight = weights.reduce((sum, w) => sum + w, 0);

	let roll = Math.random() * totalWeight;
	for (let i = 0; i < rarities.length; i++) {
		roll -= weights[i];
		if (roll <= 0) return rarities[i];
	}
	return rarities[0];
}

export async function claimRandomItem(
	userSpotifyId: string,
	collectionId: number
): Promise<CollectionItemWithArtists | null> {
	const rarities = await findAllRarities();
	if (!rarities.length) throw new Error('No rarities configured');
	const selectedRarity = pickWeightedRarity(rarities);

	const conn = await getPool().getConnection();
	try {
		await conn.beginTransaction();

		// Lock the user_collections row and check rewards
		const [rewardRows] = await conn.query<(RowDataPacket & { unclaimed_rewards: number })[]>(
			`SELECT unclaimed_rewards
			 FROM user_collections
			 WHERE user_spotify_id = ? AND collection_id = ?
			 FOR UPDATE`,
			[userSpotifyId, collectionId]
		);

		if (rewardRows.length === 0) {
			await conn.rollback();
			throw new Error('User does not own this collection');
		}

		if (rewardRows[0].unclaimed_rewards < 1) {
			await conn.rollback();
			throw new Error('No unclaimed rewards available');
		}

		// Pick a random item from the collection (duplicates allowed)
		const [candidateRows] = await conn.query<(RowDataPacket & { id: number })[]>(
			`SELECT ci.id
			 FROM collection_items ci
			 WHERE ci.collection_id = ?
			 ORDER BY RAND()
			 LIMIT 1`,
			[collectionId]
		);

		if (candidateRows.length === 0) {
			await conn.rollback();
			return null; // collection has no items
		}

		const claimedItemId = candidateRows[0].id;

		// Decrement unclaimed_rewards
		await conn.execute(
			`UPDATE user_collections
			 SET unclaimed_rewards = unclaimed_rewards - 1
			 WHERE user_spotify_id = ? AND collection_id = ?`,
			[userSpotifyId, collectionId]
		);

		// Insert ownership with rarity (allows multiple copies)
		await conn.execute(
			`INSERT INTO user_collection_items (user_spotify_id, collection_item_id, rarity_id)
			 VALUES (?, ?, ?)`,
			[userSpotifyId, claimedItemId, selectedRarity.id]
		);

		await conn.commit();

		// Fetch full item details (same shape as findCollectionItemsWithArtists)
		const [itemRows] = await query<(RowDataPacket & CollectionItemWithArtists)[]>(
			`SELECT ci.*,
				GROUP_CONCAT(ca.name ORDER BY cia.position SEPARATOR ', ') AS artists,
				(SELECT cai.url
				 FROM collection_artist_images cai
				 JOIN collection_item_artists cia2 ON cia2.artist_id = cai.artist_id
				 WHERE cia2.item_id = ci.id
				 ORDER BY cia2.position ASC, cai.height DESC
				 LIMIT 1) AS artist_image_url
			 FROM collection_items ci
			 LEFT JOIN collection_item_artists cia ON cia.item_id = ci.id
			 LEFT JOIN collection_artists ca ON ca.id = cia.artist_id
			 WHERE ci.id = ?
			 GROUP BY ci.id`,
			[claimedItemId]
		);

		if (!itemRows.length) return null;

		// Attach the rarity we just assigned (avoids complex JOIN with multi-copy table)
		const item = itemRows[0];
		item.rarity_id = selectedRarity.id;
		item.rarity_name = selectedRarity.name;
		item.rarity_color = selectedRarity.color;
		item.rarity_level = selectedRarity.level;

		return item;
	} catch (err) {
		await conn.rollback();
		throw err;
	} finally {
		conn.release();
	}
}
