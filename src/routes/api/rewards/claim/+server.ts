import { json, error } from '@sveltejs/kit';
import { initializeSchema } from '$lib/server/schema';
import { claimRandomItem } from '$lib/server/repositories/rewards.repository';
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
		const claimedItem = await claimRandomItem(locals.user.spotifyId, collectionId);

		if (!claimedItem) {
			return error(409, 'All items in this collection have already been claimed');
		}

		return json({ item: claimedItem });
	} catch (err) {
		console.error('Failed to claim item:', err);
		const message = err instanceof Error ? err.message : 'Unknown error';
		if (message === 'No unclaimed rewards available') {
			return error(400, message);
		}
		if (message === 'User does not own this collection') {
			return error(403, message);
		}
		return error(500, `Failed to claim item: ${message}`);
	}
};
