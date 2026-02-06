import { ObjectServiceClass } from '$services/classes/object-service.class';
import { browser } from '$app/environment';
import type { ID } from '$types/core.type';
import type {
	SpotifyTrack,
	SpotifyAlbum,
	SpotifyFullArtist,
	SpotifyPlaylist,
	SpotifyPaginatedResponse
} from '$types/spotify.type';

export interface SpotifyAuth {
	id: ID;
	accessToken: string | null;
	expiresAt: number | null;
}

interface CacheEntry<T = unknown> {
	data: T;
	cachedAt: number;
}

const initialState: SpotifyAuth = {
	id: 'spotify-auth',
	accessToken: null,
	expiresAt: null
};

class SpotifyService extends ObjectServiceClass<SpotifyAuth> {
	private baseUrl = 'https://api.spotify.com/v1';
	private cacheTtlMs = 5 * 60 * 1000;
	private cachePrefix = 'spotify-cache:';

	constructor() {
		super('spotify', initialState);
	}

	setToken(accessToken: string, expiresAt: number): void {
		this.set({ id: 'spotify-auth', accessToken, expiresAt });
	}

	isAuthenticated(): boolean {
		const { accessToken, expiresAt } = this.get();
		return !!accessToken && !!expiresAt && Date.now() < expiresAt;
	}

	logout(): void {
		this.clearCache();
		this.set(initialState);
	}

	getAccessToken(): string | null {
		return this.get().accessToken;
	}

	private getCacheKey(endpoint: string): string {
		return `${this.cachePrefix}${endpoint}`;
	}

	private getCache<T>(endpoint: string): T | null {
		if (!browser) return null;

		const raw = localStorage.getItem(this.getCacheKey(endpoint));
		if (!raw) return null;

		try {
			const entry: CacheEntry<T> = JSON.parse(raw);
			if (Date.now() - entry.cachedAt > this.cacheTtlMs) {
				localStorage.removeItem(this.getCacheKey(endpoint));
				return null;
			}
			return entry.data;
		} catch {
			localStorage.removeItem(this.getCacheKey(endpoint));
			return null;
		}
	}

	private setCache<T>(endpoint: string, data: T): void {
		if (!browser) return;

		const entry: CacheEntry<T> = { data, cachedAt: Date.now() };
		localStorage.setItem(this.getCacheKey(endpoint), JSON.stringify(entry));
	}

	clearCache(): void {
		if (!browser) return;

		const keys = Object.keys(localStorage);
		for (const key of keys) {
			if (key.startsWith(this.cachePrefix)) {
				localStorage.removeItem(key);
			}
		}
	}

	private async fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T | null> {
		if (!browser) return null;

		const method = options.method?.toUpperCase() || 'GET';
		if (method === 'GET') {
			const cached = this.getCache<T>(endpoint);
			if (cached) return cached;
		}

		const token = this.getAccessToken();
		if (!token) return null;

		const response = await fetch(`${this.baseUrl}${endpoint}`, {
			...options,
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
				...options.headers
			}
		});

		if (response.status === 204) {
			return null;
		}

		if (!response.ok) {
			console.error(`Spotify API error: ${response.status}`, await response.text());
			return null;
		}

		const data: T = await response.json();

		if (method === 'GET') {
			this.setCache(endpoint, data);
		}

		return data;
	}

	async getPlaylists(
		limit: number = 20,
		offset: number = 0
	): Promise<SpotifyPaginatedResponse<SpotifyPlaylist> | null> {
		return this.fetchApi(`/me/playlists?limit=${limit}&offset=${offset}`);
	}

	async getPlaylistTracks(
		playlistId: string,
		limit: number = 100,
		offset: number = 0
	): Promise<SpotifyPaginatedResponse<{ added_at: string; track: SpotifyTrack }> | null> {
		return this.fetchApi(`/playlists/${playlistId}/tracks?limit=${limit}&offset=${offset}`);
	}

	async getTrack(trackId: string): Promise<SpotifyTrack | null> {
		return this.fetchApi(`/tracks/${trackId}`);
	}

	async getAlbum(albumId: string): Promise<SpotifyAlbum | null> {
		return this.fetchApi(`/albums/${albumId}`);
	}

	async getArtist(artistId: string): Promise<SpotifyFullArtist | null> {
		return this.fetchApi(`/artists/${artistId}`);
	}

	async searchPlaylists(
		query: string,
		limit: number = 20,
		offset: number = 0
	): Promise<SpotifyPaginatedResponse<SpotifyPlaylist> | null> {
		const q = encodeURIComponent(query);
		const response = await this.fetchApi<{ playlists: SpotifyPaginatedResponse<SpotifyPlaylist> }>(
			`/search?q=${q}&type=playlist&limit=${limit}&offset=${offset}`
		);
		return response?.playlists ?? null;
	}
}

export const spotifyService = new SpotifyService();
