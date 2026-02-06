import { json, error } from '@sveltejs/kit';
import { getClientToken } from '$lib/server/spotify-token';
import { spotifyFetch } from '$lib/server/spotify-api';
import type { RequestHandler } from './$types';
import type { SpotifyPlaylist, SpotifyTrack, SpotifyPaginatedResponse } from '$types/spotify.type';

export const GET: RequestHandler = async ({ url, request }) => {
	const playlistId = url.searchParams.get('id');

	if (!playlistId) {
		return error(400, 'Missing playlist id parameter');
	}

	if (!/^[a-zA-Z0-9]{22}$/.test(playlistId)) {
		return error(400, 'Invalid playlist ID format');
	}

	try {
		// Use user token if provided, otherwise fall back to Client Credentials
		const userToken = request.headers.get('X-Spotify-Token');
		const token = userToken || (await getClientToken());

		const playlist = await spotifyFetch<SpotifyPlaylist>(`/playlists/${playlistId}`, token);

		const allItems: Array<{ added_at: string; track: SpotifyTrack }> = [];
		let offset = 0;
		const limit = 100;

		while (true) {
			const page = await spotifyFetch<
				SpotifyPaginatedResponse<{ added_at: string; track: SpotifyTrack }>
			>(`/playlists/${playlistId}/tracks?limit=${limit}&offset=${offset}`, token);

			allItems.push(...page.items.filter((item) => item.track && !item.track.is_local));
			offset += page.items.length;

			if (!page.next || offset >= page.total) break;
		}

		return json({
			playlist: {
				...playlist,
				tracks: {
					...playlist.tracks,
					items: allItems
				}
			},
			total: allItems.length
		});
	} catch (err) {
		console.error('Playlist fetch error:', err);
		const message = err instanceof Error ? err.message : 'Unknown error';

		if (message.includes('404')) {
			return error(404, 'Playlist not found. It may be private or not exist.');
		}
		if (message.includes('401') || message.includes('403')) {
			return error(403, 'Cannot access this playlist. It may be private.');
		}

		return error(500, 'Failed to fetch playlist data');
	}
};
