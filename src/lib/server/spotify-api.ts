import type { SpotifyTrack, SpotifyAlbum, SpotifyFullArtist } from '$types/spotify.type';

const SPOTIFY_API = 'https://api.spotify.com/v1';
const MAX_429_RETRIES = 5;

export async function spotifyFetch<T>(endpoint: string, token: string): Promise<T> {
	for (let attempt = 0; ; attempt++) {
		const response = await fetch(`${SPOTIFY_API}${endpoint}`, {
			headers: { Authorization: `Bearer ${token}` }
		});

		if (response.status === 429 && attempt < MAX_429_RETRIES) {
			const retryAfter = Number(response.headers.get('Retry-After')) || 2 ** attempt;
			console.warn(`  Rate limited, waiting ${retryAfter}s before retry...`);
			await new Promise((r) => setTimeout(r, retryAfter * 1000));
			continue;
		}

		if (!response.ok) {
			const text = await response.text();
			throw new Error(`${response.status}: ${text}`);
		}

		return response.json();
	}
}

export async function fetchSpotifyTrack(trackId: string, token: string): Promise<SpotifyTrack> {
	return spotifyFetch<SpotifyTrack>(`/tracks/${trackId}`, token);
}

export async function fetchSpotifyAlbum(albumId: string, token: string): Promise<SpotifyAlbum> {
	return spotifyFetch<SpotifyAlbum>(`/albums/${albumId}`, token);
}

export async function fetchSpotifyArtist(
	artistId: string,
	token: string
): Promise<SpotifyFullArtist> {
	return spotifyFetch<SpotifyFullArtist>(`/artists/${artistId}`, token);
}
