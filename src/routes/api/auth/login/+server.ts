import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

function generateRandomString(length: number): string {
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	const values = crypto.getRandomValues(new Uint8Array(length));
	return values.reduce((acc, x) => acc + possible[x % possible.length], '');
}

async function sha256(plain: string): Promise<ArrayBuffer> {
	const encoder = new TextEncoder();
	const data = encoder.encode(plain);
	return crypto.subtle.digest('SHA-256', data);
}

function base64encode(input: ArrayBuffer): string {
	return btoa(String.fromCharCode(...new Uint8Array(input)))
		.replace(/=/g, '')
		.replace(/\+/g, '-')
		.replace(/\//g, '_');
}

export const GET: RequestHandler = async ({ url, cookies }) => {
	const clientId = env.SPOTIFY_CLIENT_ID;
	if (!clientId) {
		throw new Error('SPOTIFY_CLIENT_ID is not configured');
	}

	const redirectUri = `${url.origin}/api/auth/callback`;

	const codeVerifier = generateRandomString(64);
	const hashed = await sha256(codeVerifier);
	const codeChallenge = base64encode(hashed);

	cookies.set('spotify_cv', codeVerifier, {
		path: '/',
		httpOnly: true,
		secure: url.protocol === 'https:',
		sameSite: 'lax',
		maxAge: 600 // 10 minutes
	});

	const scopes = [
		'playlist-read-private',
		'playlist-read-collaborative',
		'user-read-email',
		'user-read-private'
	];

	const params = new URLSearchParams({
		response_type: 'code',
		client_id: clientId,
		scope: scopes.join(' '),
		code_challenge_method: 'S256',
		code_challenge: codeChallenge,
		redirect_uri: redirectUri
	});

	redirect(302, `https://accounts.spotify.com/authorize?${params.toString()}`);
};
