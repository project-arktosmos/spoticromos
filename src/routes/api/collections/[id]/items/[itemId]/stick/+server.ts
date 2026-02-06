import { json, error } from '@sveltejs/kit';
import { initializeSchema } from '$lib/server/schema';
import { stickItem, unstickItem } from '$lib/server/repositories/ownership.repository';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, locals, request }) => {
	if (!locals.user) return error(401, 'Authentication required');

	const itemId = Number(params.itemId);
	if (!Number.isFinite(itemId) || itemId <= 0) return error(400, 'Invalid item ID');

	let rarityId: number | undefined;
	try {
		const body = await request.json();
		if (body.rarityId !== undefined) {
			rarityId = Number(body.rarityId);
			if (!Number.isFinite(rarityId) || rarityId <= 0) {
				return error(400, 'Invalid rarity ID');
			}
		}
	} catch {
		// No body or invalid JSON — use default (highest rarity)
	}

	try {
		await initializeSchema();
		const result = await stickItem(locals.user.spotifyId, itemId, rarityId);
		return json({ stuck: true, ...result });
	} catch (err) {
		console.error('Failed to stick item:', err);
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
		await unstickItem(locals.user.spotifyId, itemId);
		return json({ stuck: false });
	} catch (err) {
		console.error('Failed to unstick item:', err);
		const message = err instanceof Error ? err.message : 'Unknown error';
		return error(500, message);
	}
};
