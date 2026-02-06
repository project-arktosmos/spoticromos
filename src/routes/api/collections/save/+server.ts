import { json, error } from '@sveltejs/kit';
import { initializeSchema } from '$lib/server/schema';
import { saveCollection } from '$lib/server/repositories/collection.repository';
import { ensureUserExists } from '$lib/server/repositories/user.repository';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return error(400, 'Invalid JSON body');
	}

	const { playlistId, name, coverImageUrl, creatorName, ownerId } = body as {
		playlistId?: unknown;
		name?: unknown;
		coverImageUrl?: unknown;
		creatorName?: unknown;
		ownerId?: unknown;
	};

	if (typeof playlistId !== 'string' || !playlistId) {
		return error(400, 'Missing or invalid playlistId');
	}

	if (typeof name !== 'string' || !name) {
		return error(400, 'Missing or invalid name');
	}

	try {
		await initializeSchema();

		if (typeof ownerId === 'string' && ownerId) {
			await ensureUserExists({
				spotifyId: ownerId,
				displayName: typeof creatorName === 'string' ? creatorName : null
			});
		}

		const collectionId = await saveCollection({
			name,
			coverImageUrl: typeof coverImageUrl === 'string' ? coverImageUrl : null,
			spotifyPlaylistId: playlistId,
			spotifyOwnerId: typeof ownerId === 'string' ? ownerId : null
		});

		return json({ collectionId });
	} catch (err) {
		console.error('Collection save error:', err);
		const message = err instanceof Error ? err.message : 'Unknown error';
		return error(500, `Failed to save collection: ${message}`);
	}
};
