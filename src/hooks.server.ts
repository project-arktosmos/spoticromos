import type { Handle } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { initializeSchema } from '$lib/server/schema';
import '$services/i18n';
import { findSession } from '$lib/server/repositories/session.repository';
import { findUserBySpotifyId, updateUserTokens } from '$lib/server/repositories/user.repository';

let schemaInitialized = false;

async function refreshSpotifyToken(
	refreshToken: string
): Promise<{ accessToken: string; refreshToken: string; expiresAt: number } | null> {
	const clientId = env.SPOTIFY_CLIENT_ID;
	const clientSecret = env.SPOTIFY_CLIENT_SECRET;
	if (!clientId || !clientSecret) return null;

	const response = await fetch('https://accounts.spotify.com/api/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			client_id: clientId,
			client_secret: clientSecret,
			grant_type: 'refresh_token',
			refresh_token: refreshToken
		})
	});

	if (!response.ok) return null;

	const data = await response.json();
	return {
		accessToken: data.access_token,
		refreshToken: data.refresh_token || refreshToken,
		expiresAt: Date.now() + data.expires_in * 1000
	};
}

export const handle: Handle = async ({ event, resolve }) => {
	// Initialize DB schema once
	if (!schemaInitialized) {
		await initializeSchema();
		schemaInitialized = true;
	}

	// Default to unauthenticated
	event.locals.user = null;
	event.locals.accessToken = null;

	const sessionId = event.cookies.get('session');
	if (sessionId) {
		const session = await findSession(sessionId);
		if (session) {
			const user = await findUserBySpotifyId(session.user_spotify_id);
			if (user) {
				event.locals.user = {
					spotifyId: user.spotify_id,
					displayName: user.display_name,
					email: user.email,
					avatarUrl: user.avatar_url
				};

				let accessToken = user.access_token;

				// Refresh token if expired or about to expire (within 60s)
				if (
					user.token_expires_at &&
					user.refresh_token &&
					Date.now() >= user.token_expires_at - 60_000
				) {
					const refreshed = await refreshSpotifyToken(user.refresh_token);
					if (refreshed) {
						await updateUserTokens(
							user.spotify_id,
							refreshed.accessToken,
							refreshed.refreshToken,
							refreshed.expiresAt
						);
						accessToken = refreshed.accessToken;
					}
				}

				event.locals.accessToken = accessToken;
			}
		}
	}

	return resolve(event);
};
