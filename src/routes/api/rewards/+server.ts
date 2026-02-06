import { json, error } from '@sveltejs/kit';
import { initializeSchema } from '$lib/server/schema';
import { findUserCollectionsWithRewards } from '$lib/server/repositories/rewards.repository';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return error(401, 'Not authenticated');
	}

	try {
		await initializeSchema();
		const collections = await findUserCollectionsWithRewards(locals.user.spotifyId);
		return json({ collections });
	} catch (err) {
		console.error('Failed to fetch rewards:', err);
		const message = err instanceof Error ? err.message : 'Unknown error';
		return error(500, `Failed to fetch rewards: ${message}`);
	}
};
