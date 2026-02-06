import type { SpotifyTrack, SpotifyAlbum, SpotifyFullArtist } from '$types/spotify.type';

const SPOTIFY_API = 'https://api.spotify.com/v1';

export async function spotifyFetch<T>(endpoint: string, token: string): Promise<T> {
	const response = await fetch(`${SPOTIFY_API}${endpoint}`, {
		headers: { Authorization: `Bearer ${token}` }
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`${response.status}: ${text}`);
	}

	return response.json();
}

export async function fetchSpotifyTrack(trackId: string, token: string): Promise<SpotifyTrack> {
	return spotifyFetch<SpotifyTrack>(`/tracks/${trackId}`, token);
}

export async function fetchSpotifyAlbum(albumId: string, token: string): Promise<SpotifyAlbum> {
	return spotifyFetch<SpotifyAlbum>(`/albums/${albumId}`, token);
}

export async function fetchSpotifyArtist(artistId: string, token: string): Promise<SpotifyFullArtist> {
	return spotifyFetch<SpotifyFullArtist>(`/artists/${artistId}`, token);
}
