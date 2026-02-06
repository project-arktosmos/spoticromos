import { json, error } from '@sveltejs/kit';
import { initializeSchema } from '$lib/server/schema';
import { mergeItems } from '$lib/server/repositories/ownership.repository';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, locals, request }) => {
	if (!locals.user) return error(401, 'Authentication required');

	const itemId = Number(params.itemId);
	if (!Number.isFinite(itemId) || itemId <= 0) return error(400, 'Invalid item ID');

	let rarityId: number;
	try {
		const body = await request.json();
		rarityId = Number(body.rarityId);
		if (!Number.isFinite(rarityId) || rarityId <= 0) {
			return error(400, 'Invalid or missing rarityId');
		}
	} catch {
		return error(400, 'Request body must be JSON with { rarityId }');
	}

	try {
		await initializeSchema();
		const result = await mergeItems(locals.user.spotifyId, itemId, rarityId);
		return json({ merged: true, ...result });
	} catch (err) {
		console.error('Failed to merge items:', err);
		const message = err instanceof Error ? err.message : 'Unknown error';
		if (message.includes('Not enough copies') || message.includes('maximum rarity')) {
			return error(409, message);
		}
		return error(500, message);
	}
};
