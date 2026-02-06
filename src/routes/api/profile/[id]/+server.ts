import { json, error } from '@sveltejs/kit';
import { initializeSchema } from '$lib/server/schema';
import { findUserBySpotifyId } from '$lib/server/repositories/user.repository';
import { findCollectionsByIds } from '$lib/server/repositories/collection.repository';
import {
	findUserOwnedCollectionIds,
	findUserCollectionProgress
} from '$lib/server/repositories/ownership.repository';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const spotifyId = params.id;
	if (!spotifyId) {
		return error(400, 'Missing user ID');
	}

	try {
		await initializeSchema();

		const user = await findUserBySpotifyId(spotifyId);
		if (!user) {
			return error(404, 'User not found');
		}

		const ownedCollectionIds = await findUserOwnedCollectionIds(spotifyId);
		const collections = await findCollectionsByIds(ownedCollectionIds);
		const collectionProgress = await findUserCollectionProgress(spotifyId);

		return json({
			user: {
				spotify_id: user.spotify_id,
				display_name: user.display_name,
				avatar_url: user.avatar_url
			},
			collections,
			collectionProgress
		});
	} catch (err) {
		console.error('Failed to fetch profile:', err);
		const message = err instanceof Error ? err.message : 'Unknown error';
		return error(500, `Failed to fetch profile: ${message}`);
	}
};
