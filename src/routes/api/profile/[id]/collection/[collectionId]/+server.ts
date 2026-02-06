import { json, error } from '@sveltejs/kit';
import { initializeSchema } from '$lib/server/schema';
import { findUserBySpotifyId } from '$lib/server/repositories/user.repository';
import {
	findCollectionById,
	findCollectionItemsWithArtists
} from '$lib/server/repositories/collection.repository';
import {
	findUserOwnedItemIds,
	findUserOwnedItemsWithRarity,
	findStuckItemIds
} from '$lib/server/repositories/ownership.repository';
import { findAllRarities } from '$lib/server/repositories/rarity.repository';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const spotifyId = params.id;
	const collectionId = Number(params.collectionId);

	if (!spotifyId) {
		return error(400, 'Missing user ID');
	}
	if (!Number.isFinite(collectionId) || collectionId <= 0) {
		return error(400, 'Invalid collection ID');
	}

	try {
		await initializeSchema();

		const user = await findUserBySpotifyId(spotifyId);
		if (!user) {
			return error(404, 'User not found');
		}

		const collection = await findCollectionById(collectionId);
		if (!collection) {
			return error(404, 'Collection not found');
		}

		const items = await findCollectionItemsWithArtists(collectionId);
		const ownedItemIds = await findUserOwnedItemIds(spotifyId, collectionId);
		const ownedItemRarities = await findUserOwnedItemsWithRarity(spotifyId, collectionId);
		const stuckItemIds = await findStuckItemIds(spotifyId, collectionId);
		const rarities = await findAllRarities();

		return json({
			user: {
				spotify_id: user.spotify_id,
				display_name: user.display_name,
				avatar_url: user.avatar_url
			},
			collection,
			items,
			ownedItemIds,
			ownedItemRarities,
			stuckItemIds,
			rarities
		});
	} catch (err) {
		console.error('Failed to fetch profile collection:', err);
		const message = err instanceof Error ? err.message : 'Unknown error';
		return error(500, `Failed to fetch profile collection: ${message}`);
	}
};
