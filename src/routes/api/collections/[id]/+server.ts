import { json, error } from '@sveltejs/kit';
import { initializeSchema } from '$lib/server/schema';
import {
	findCollectionById,
	findCollectionItemsWithArtists
} from '$lib/server/repositories/collection.repository';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
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

		return json({ collection, items });
	} catch (err) {
		console.error('Failed to fetch collection:', err);
		const message = err instanceof Error ? err.message : 'Unknown error';
		return error(500, `Failed to fetch collection: ${message}`);
	}
};
