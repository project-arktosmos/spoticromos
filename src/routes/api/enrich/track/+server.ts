import { json, error } from '@sveltejs/kit';
import { getClientToken } from '$lib/server/spotify-token';
import { initializeSchema } from '$lib/server/schema';
import { enrichTrack } from '$lib/server/enrichment';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return error(400, 'Invalid JSON body');
	}

	const { track, collectionId, position } = body as {
		track?: unknown;
		collectionId?: unknown;
		position?: unknown;
	};

	if (
		!track ||
		typeof track !== 'object' ||
		!('id' in track) ||
		!('album' in track) ||
		typeof (track as { id: unknown }).id !== 'string' ||
		typeof (track as { album: unknown }).album !== 'object' ||
		!(track as { album: { id?: unknown } }).album ||
		typeof (track as { album: { id: unknown } }).album.id !== 'string'
	) {
		return error(400, 'Missing or invalid track data. Required: track.id and track.album.id');
	}

	if (typeof collectionId !== 'number') {
		return error(400, 'Missing or invalid collectionId. Required: number');
	}

	try {
		const userToken = request.headers.get('X-Spotify-Token');
		const token = userToken || (await getClientToken());

		await initializeSchema();

		const result = await enrichTrack(
			track as import('$types/spotify.type').SpotifyTrack,
			token,
			collectionId,
			typeof position === 'number' ? position : null
		);

		return json(result);
	} catch (err) {
		console.error('Enrichment error:', err);
		const message = err instanceof Error ? err.message : 'Unknown error';
		return error(500, `Enrichment failed: ${message}`);
	}
};
