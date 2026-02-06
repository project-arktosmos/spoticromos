import { json, error } from '@sveltejs/kit';
import { initializeSchema } from '$lib/server/schema';
import { findCollections } from '$lib/server/repositories/collection.repository';
import {
	findUserOwnedCollectionIds,
	findUserCollectionProgress
} from '$lib/server/repositories/ownership.repository';
import type { CollectionProgress } from '$lib/server/repositories/ownership.repository';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	try {
		await initializeSchema();

		const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
		const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '12', 10) || 12));
		const search = url.searchParams.get('search') || '';

		const result = await findCollections({ page, limit, search });

		let ownedCollectionIds: number[] = [];
		let collectionProgress: CollectionProgress[] = [];
		if (locals.user) {
			ownedCollectionIds = await findUserOwnedCollectionIds(locals.user.spotifyId);
			collectionProgress = await findUserCollectionProgress(locals.user.spotifyId);
		}

		return json({
			collections: result.collections,
			total: result.total,
			page: result.page,
			limit: result.limit,
			ownedCollectionIds,
			collectionProgress
		});
	} catch (err) {
		console.error('Failed to fetch collections:', err);
		const message = err instanceof Error ? err.message : 'Unknown error';
		return error(500, `Failed to fetch collections: ${message}`);
	}
};
