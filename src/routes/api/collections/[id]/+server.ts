import { json, error } from '@sveltejs/kit';
import { initializeSchema } from '$lib/server/schema';
import {
	findCollectionById,
	findCollectionItemsWithArtists
} from '$lib/server/repositories/collection.repository';
import {
	findUserOwnedItemIds,
	findUserOwnedItemsWithRarity,
	findStuckItemIds
} from '$lib/server/repositories/ownership.repository';
import type { OwnedItemRarity } from '$lib/server/repositories/ownership.repository';
import { findAllRarities } from '$lib/server/repositories/rarity.repository';
import { getFreeclaimInfo } from '$lib/server/repositories/rewards.repository';
import { query } from '$lib/server/db';
import type { RowDataPacket } from 'mysql2/promise';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	const id = Number(params.id);
	if (!Number.isFinite(id) || id <= 0) {
		return error(400, 'Invalid collection ID');
	}

	try {
		await initializeSchema();

		const collection = await findCollectionById(id);
		if (!collection) {
			return error(404, 'Collection not found');
		}

		const items = await findCollectionItemsWithArtists(id);

		let ownedItemIds: number[] = [];
		let ownedItemRarities: OwnedItemRarity[] = [];
		let stuckItemIds: number[] = [];
		let unclaimedRewards = 0;
		let freeClaimable = 0;
		let freeClaimCountdown = 0;
		if (locals.user) {
			ownedItemIds = await findUserOwnedItemIds(locals.user.spotifyId, id);
			ownedItemRarities = await findUserOwnedItemsWithRarity(locals.user.spotifyId, id);
			stuckItemIds = await findStuckItemIds(locals.user.spotifyId, id);
			const [rewardRows] = await query<(RowDataPacket & { unclaimed_rewards: number })[]>(
				`SELECT unclaimed_rewards FROM user_collections WHERE user_spotify_id = ? AND collection_id = ?`,
				[locals.user.spotifyId, id]
			);
			if (rewardRows.length > 0) {
				unclaimedRewards = rewardRows[0].unclaimed_rewards;
			}
			const freeclaimInfo = await getFreeclaimInfo(locals.user.spotifyId, id);
			freeClaimable = freeclaimInfo.freeClaimable;
			freeClaimCountdown = freeclaimInfo.freeClaimCountdown;
		}

		const rarities = await findAllRarities();

		return json({ collection, items, ownedItemIds, ownedItemRarities, stuckItemIds, rarities, unclaimedRewards, freeClaimable, freeClaimCountdown });
	} catch (err) {
		console.error('Failed to fetch collection:', err);
		const message = err instanceof Error ? err.message : 'Unknown error';
		return error(500, `Failed to fetch collection: ${message}`);
	}
};
