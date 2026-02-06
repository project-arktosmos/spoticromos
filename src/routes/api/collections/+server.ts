import { json, error } from '@sveltejs/kit';
import { initializeSchema } from '$lib/server/schema';
import { findAllCollections } from '$lib/server/repositories/collection.repository';
import { findUserOwnedCollectionIds } from '$lib/server/repositories/ownership.repository';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	try {
		await initializeSchema();
		const collections = await findAllCollections();

		let ownedCollectionIds: number[] = [];
		if (locals.user) {
			ownedCollectionIds = await findUserOwnedCollectionIds(locals.user.spotifyId);
		}

		return json({ collections, ownedCollectionIds });
	} catch (err) {
		console.error('Failed to fetch collections:', err);
		const message = err instanceof Error ? err.message : 'Unknown error';
		return error(500, `Failed to fetch collections: ${message}`);
	}
};
