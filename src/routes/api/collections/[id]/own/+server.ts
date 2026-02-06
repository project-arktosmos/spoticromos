import { json, error } from '@sveltejs/kit';
import { initializeSchema } from '$lib/server/schema';
import { findCollectionById } from '$lib/server/repositories/collection.repository';
import {
	addUserCollection,
	removeUserCollection
} from '$lib/server/repositories/ownership.repository';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) return error(401, 'Authentication required');

	const id = Number(params.id);
	if (!Number.isFinite(id) || id <= 0) return error(400, 'Invalid collection ID');

	try {
		await initializeSchema();

		const collection = await findCollectionById(id);
		if (!collection) return error(404, 'Collection not found');

		await addUserCollection(locals.user.spotifyId, id);
		return json({ owned: true });
	} catch (err) {
		console.error('Failed to add collection ownership:', err);
		const message = err instanceof Error ? err.message : 'Unknown error';
		return error(500, message);
	}
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) return error(401, 'Authentication required');

	const id = Number(params.id);
	if (!Number.isFinite(id) || id <= 0) return error(400, 'Invalid collection ID');

	try {
		await initializeSchema();
		await removeUserCollection(locals.user.spotifyId, id);
		return json({ owned: false });
	} catch (err) {
		console.error('Failed to remove collection ownership:', err);
		const message = err instanceof Error ? err.message : 'Unknown error';
		return error(500, message);
	}
};
