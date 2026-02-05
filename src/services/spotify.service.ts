import { ObjectServiceClass } from '$services/classes/object-service.class';
import { browser } from '$app/environment';
import type { ID } from '$types/core.type';
import type {
	SpotifyTrack,
	SpotifyPlaylist,
	SpotifyPaginatedResponse
} from '$types/spotify.type';

export interface SpotifyAuth {
	id: ID;
	accessToken: string | null;
	refreshToken: string | null;
	expiresAt: number | null;
	codeVerifier: string | null;
}

const initialState: SpotifyAuth = {
	id: 'spotify-auth',
	accessToken: null,
	refreshToken: null,
	expiresAt: null,
	codeVerifier: null
};

class SpotifyService extends ObjectServiceClass<SpotifyAuth> {
	private clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID || '';
	private baseUrl = 'https://api.spotify.com/v1';

	private get redirectUri(): string {
		if (import.meta.env.VITE_SPOTIFY_REDIRECT_URI) {
			return import.meta.env.VITE_SPOTIFY_REDIRECT_URI;
		}
		if (browser) {
			const basePath = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
			return `${window.location.origin}${basePath}/api/spotify/callback`;
		}
		return 'http://127.0.0.1:1998/api/spotify/callback';
	}

	private scopes = ['playlist-read-private', 'playlist-read-collaborative'];

	constructor() {
		super('spotify', initialState);
	}

	private generateRandomString(length: number): string {
		const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		const values = crypto.getRandomValues(new Uint8Array(length));
		return values.reduce((acc, x) => acc + possible[x % possible.length], '');
	}

	private async sha256(plain: string): Promise<ArrayBuffer> {
		const encoder = new TextEncoder();
		const data = encoder.encode(plain);
		return crypto.subtle.digest('SHA-256', data);
	}

	private base64encode(input: ArrayBuffer): string {
		return btoa(String.fromCharCode(...new Uint8Array(input)))
			.replace(/=/g, '')
			.replace(/\+/g, '-')
			.replace(/\//g, '_');
	}

	async login(): Promise<void> {
		if (!browser) return;

		const codeVerifier = this.generateRandomString(64);
		const hashed = await this.sha256(codeVerifier);
		const codeChallenge = this.base64encode(hashed);

		this.set({ ...this.get(), codeVerifier });

		const params = new URLSearchParams({
			response_type: 'code',
			client_id: this.clientId,
			scope: this.scopes.join(' '),
			code_challenge_method: 'S256',
			code_challenge: codeChallenge,
			redirect_uri: this.redirectUri
		});

		window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
	}

	async handleCallback(code: string): Promise<boolean> {
		if (!browser) return false;

		const { codeVerifier } = this.get();
		if (!codeVerifier) {
			console.error('No code verifier found');
			return false;
		}

		try {
			const response = await fetch('https://accounts.spotify.com/api/token', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded'
				},
				body: new URLSearchParams({
					client_id: this.clientId,
					grant_type: 'authorization_code',
					code,
					redirect_uri: this.redirectUri,
					code_verifier: codeVerifier
				})
			});

			if (!response.ok) {
				console.error('Token exchange failed:', await response.text());
				return false;
			}

			const data = await response.json();
			this.set({
				id: 'spotify-auth',
				accessToken: data.access_token,
				refreshToken: data.refresh_token,
				expiresAt: Date.now() + data.expires_in * 1000,
				codeVerifier: null
			});

			return true;
		} catch (error) {
			console.error('Token exchange error:', error);
			return false;
		}
	}

	async refreshAccessToken(): Promise<boolean> {
		if (!browser) return false;

		const { refreshToken } = this.get();
		if (!refreshToken) return false;

		try {
			const response = await fetch('https://accounts.spotify.com/api/token', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded'
				},
				body: new URLSearchParams({
					client_id: this.clientId,
					grant_type: 'refresh_token',
					refresh_token: refreshToken
				})
			});

			if (!response.ok) return false;

			const data = await response.json();
			this.set({
				...this.get(),
				accessToken: data.access_token,
				refreshToken: data.refresh_token || refreshToken,
				expiresAt: Date.now() + data.expires_in * 1000
			});

			return true;
		} catch {
			return false;
		}
	}

	isAuthenticated(): boolean {
		const { accessToken, expiresAt } = this.get();
		return !!accessToken && !!expiresAt && Date.now() < expiresAt;
	}

	logout(): void {
		this.set(initialState);
	}

	getAccessToken(): string | null {
		return this.get().accessToken;
	}

	private async fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T | null> {
		if (!browser) return null;

		const token = this.getAccessToken();
		if (!token) return null;

		const { expiresAt } = this.get();
		if (expiresAt && Date.now() >= expiresAt - 60000) {
			const refreshed = await this.refreshAccessToken();
			if (!refreshed) return null;
		}

		const response = await fetch(`${this.baseUrl}${endpoint}`, {
			...options,
			headers: {
				Authorization: `Bearer ${this.getAccessToken()}`,
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

		return response.json();
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
}

export const spotifyService = new SpotifyService();
