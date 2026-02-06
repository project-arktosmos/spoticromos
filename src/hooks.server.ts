import type { Handle } from '@sveltejs/kit';
import { initializeSchema } from '$lib/server/schema';
import { refreshUserToken } from '$lib/server/spotify-token';
import '$services/i18n';
import { createSession, findSession } from '$lib/server/repositories/session.repository';
import {
	createAnonymousUser,
	findUserBySpotifyId,
	updateUserTokens
} from '$lib/server/repositories/user.repository';

let schemaInitialized = false;

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
				const isAnonymous = user.spotify_id.startsWith('anon-');

				event.locals.user = {
					spotifyId: user.spotify_id,
					displayName: user.display_name,
					email: user.email,
					avatarUrl: user.avatar_url,
					isAnonymous
				};

				let accessToken = user.access_token;

				// Refresh Spotify token if expired or about to expire (within 60s)
				// Only for Spotify-authenticated users (anon users have no tokens)
				if (
					!isAnonymous &&
					user.token_expires_at &&
					user.refresh_token &&
					Date.now() >= user.token_expires_at - 60_000
				) {
					const refreshed = await refreshUserToken(user.refresh_token);
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

	// Auto-create anonymous user for page navigations without a session
	if (
		!event.locals.user &&
		!event.url.pathname.startsWith('/api/') &&
		event.request.headers.get('accept')?.includes('text/html')
	) {
		const anonId = `anon-${crypto.randomUUID()}`;
		await createAnonymousUser(anonId);
		const newSessionId = await createSession(anonId);

		event.cookies.set('session', newSessionId, {
			path: '/',
			httpOnly: true,
			secure: event.url.protocol === 'https:',
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 30
		});

		event.locals.user = {
			spotifyId: anonId,
			displayName: 'Anonymous Player',
			email: null,
			avatarUrl: null,
			isAnonymous: true
		};
		event.locals.accessToken = null;
	}

	return resolve(event);
};
