import { env } from '$env/dynamic/private';

interface TokenCache {
	accessToken: string;
	expiresAt: number;
}

let tokenCache: TokenCache | null = null;

export async function getClientToken(): Promise<string> {
	if (tokenCache && Date.now() < tokenCache.expiresAt - 60_000) {
		return tokenCache.accessToken;
	}

	const clientId = env.SPOTIFY_CLIENT_ID;
	const clientSecret = env.SPOTIFY_CLIENT_SECRET;

	if (!clientId || !clientSecret) {
		throw new Error('Missing Spotify client credentials (SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET)');
	}

	const response = await fetch('https://accounts.spotify.com/api/token', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`
		},
		body: new URLSearchParams({ grant_type: 'client_credentials' })
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`Spotify token request failed: ${response.status} ${text}`);
	}

	const data = await response.json();
	tokenCache = {
		accessToken: data.access_token,
		expiresAt: Date.now() + data.expires_in * 1000
	};

	return tokenCache.accessToken;
}
