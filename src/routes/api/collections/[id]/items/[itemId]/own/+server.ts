import { json, error } from '@sveltejs/kit';
import { initializeSchema } from '$lib/server/schema';
import {
	addUserCollectionItem,
	removeUserCollectionItem
} from '$lib/server/repositories/ownership.repository';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) return error(401, 'Authentication required');

	const itemId = Number(params.itemId);
	if (!Number.isFinite(itemId) || itemId <= 0) return error(400, 'Invalid item ID');

	try {
		await initializeSchema();
		await addUserCollectionItem(locals.user.spotifyId, itemId);
		return json({ owned: true });
	} catch (err) {
		console.error('Failed to add item ownership:', err);
		const message = err instanceof Error ? err.message : 'Unknown error';
		return error(500, message);
	}
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) return error(401, 'Authentication required');

	const itemId = Number(params.itemId);
	if (!Number.isFinite(itemId) || itemId <= 0) return error(400, 'Invalid item ID');

	try {
		await initializeSchema();
		await removeUserCollectionItem(locals.user.spotifyId, itemId);
		return json({ owned: false });
	} catch (err) {
		console.error('Failed to remove item ownership:', err);
		const message = err instanceof Error ? err.message : 'Unknown error';
		return error(500, message);
	}
};
