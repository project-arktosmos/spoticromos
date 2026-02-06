import { json, error } from '@sveltejs/kit';
import { initializeSchema } from '$lib/server/schema';
import {
	findCollectionById,
	findCollectionItemsWithArtists
} from '$lib/server/repositories/collection.repository';
import {
	findUserOwnedItemIds,
	findUserOwnedItemsWithRarity
} from '$lib/server/repositories/ownership.repository';
import type { OwnedItemRarity } from '$lib/server/repositories/ownership.repository';
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
		if (locals.user) {
			ownedItemIds = await findUserOwnedItemIds(locals.user.spotifyId, id);
			ownedItemRarities = await findUserOwnedItemsWithRarity(locals.user.spotifyId, id);
		}

		return json({ collection, items, ownedItemIds, ownedItemRarities });
	} catch (err) {
		console.error('Failed to fetch collection:', err);
		const message = err instanceof Error ? err.message : 'Unknown error';
		return error(500, `Failed to fetch collection: ${message}`);
	}
};
