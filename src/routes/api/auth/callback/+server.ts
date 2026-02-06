import { redirect, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { upsertUser } from '$lib/server/repositories/user.repository';
import { createSession, findSession } from '$lib/server/repositories/session.repository';
import { mergeAnonymousUser } from '$lib/server/repositories/merge.repository';
import type { RequestHandler } from './$types';

interface SpotifyTokenResponse {
	access_token: string;
	token_type: string;
	scope: string;
	expires_in: number;
	refresh_token: string;
}

interface SpotifyProfile {
	id: string;
	display_name: string | null;
	email: string;
	images: Array<{ url: string; height: number | null; width: number | null }>;
}

export const GET: RequestHandler = async ({ url, cookies }) => {
	const code = url.searchParams.get('code');
	const authError = url.searchParams.get('error');

	if (authError) {
		redirect(302, `/?error=${encodeURIComponent(authError)}`);
	}

	if (!code) {
		error(400, 'No authorization code received');
	}

	const codeVerifier = cookies.get('spotify_cv');
	if (!codeVerifier) {
		error(400, 'Missing code verifier. Please try logging in again.');
	}

	const clientId = env.SPOTIFY_CLIENT_ID;
	const clientSecret = env.SPOTIFY_CLIENT_SECRET;
	if (!clientId || !clientSecret) {
		error(500, 'Spotify credentials not configured');
	}

	const redirectUri = `${url.origin}/api/auth/callback`;

	// Exchange authorization code for tokens
	const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			client_id: clientId,
			client_secret: clientSecret,
			grant_type: 'authorization_code',
			code,
			redirect_uri: redirectUri,
			code_verifier: codeVerifier
		})
	});

	if (!tokenResponse.ok) {
		const text = await tokenResponse.text();
		console.error('Spotify token exchange failed:', text);
		error(502, 'Failed to exchange authorization code with Spotify');
	}

	const tokens: SpotifyTokenResponse = await tokenResponse.json();
	const tokenExpiresAt = Date.now() + tokens.expires_in * 1000;

	// Fetch the user's Spotify profile
	const profileResponse = await fetch('https://api.spotify.com/v1/me', {
		headers: { Authorization: `Bearer ${tokens.access_token}` }
	});

	if (!profileResponse.ok) {
		console.error('Failed to fetch Spotify profile:', await profileResponse.text());
		error(502, 'Failed to fetch Spotify profile');
	}

	const profile: SpotifyProfile = await profileResponse.json();
	const avatarUrl = profile.images?.length > 0 ? profile.images[0].url : null;

	// Upsert user in database
	await upsertUser({
		spotifyId: profile.id,
		displayName: profile.display_name,
		email: profile.email,
		avatarUrl,
		accessToken: tokens.access_token,
		refreshToken: tokens.refresh_token,
		tokenExpiresAt
	});

	// Merge anonymous user data if the current session belongs to an anon user
	const existingSessionId = cookies.get('session');
	if (existingSessionId) {
		const existingSession = await findSession(existingSessionId);
		if (existingSession && existingSession.user_spotify_id.startsWith('anon-')) {
			await mergeAnonymousUser(existingSession.user_spotify_id, profile.id);
		}
	}

	// Create session
	const sessionId = await createSession(profile.id);

	// Set session cookie
	cookies.set('session', sessionId, {
		path: '/',
		httpOnly: true,
		secure: url.protocol === 'https:',
		sameSite: 'lax',
		maxAge: 60 * 60 * 24 * 30 // 30 days
	});

	// Clear the code verifier cookie
	cookies.delete('spotify_cv', { path: '/' });

	redirect(302, '/');
};
