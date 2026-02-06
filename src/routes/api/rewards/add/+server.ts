import { json, error } from '@sveltejs/kit';
import { initializeSchema } from '$lib/server/schema';
import { addRewards } from '$lib/server/repositories/rewards.repository';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return error(401, 'Not authenticated');
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return error(400, 'Invalid JSON body');
	}

	const { collectionId } = body as { collectionId?: unknown };

	if (typeof collectionId !== 'number' || !Number.isFinite(collectionId) || collectionId <= 0) {
		return error(400, 'Missing or invalid collectionId');
	}

	try {
		await initializeSchema();
		await addRewards(locals.user.spotifyId, collectionId, 10);
		return json({ success: true, added: 10 });
	} catch (err) {
		console.error('Failed to add rewards:', err);
		const message = err instanceof Error ? err.message : 'Unknown error';
		return error(500, `Failed to add rewards: ${message}`);
	}
};
