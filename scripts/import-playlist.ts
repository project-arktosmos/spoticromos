/**
 * CLI script to import a Spotify playlist as a full in-app collection.
 *
 * Usage:
 *   pnpm import:playlist <spotify-playlist-url-or-id>
 *   pnpm import:playlist <spotify-playlist-url-or-id> --user <spotify-user-id>
 *
 * The --user flag looks up a stored refresh token from the DB (from a previous
 * UI login) and uses it to get a user-scoped access token. This is required for
 * private playlists that are inaccessible with client credentials.
 *
 * Editorial playlists that are blocked by the Web API are automatically fetched
 * via the Spotify embed page as a fallback.
 *
 * Reuses the same server-side modules as the /import UI page:
 *   - spotify-api      → fetch playlist & track data
 *   - spotify-token     → client-credentials & user-token auth
 *   - spotify-embed     → fallback for API-blocked playlists
 *   - schema            → DB table initialisation
 *   - collection repo   → persist collection + items
 *   - user repo         → ensure playlist owner exists
 *   - enrichment        → full track/album/artist/lyrics enrichment
 */

import { initializeSchema } from '$lib/server/schema';
import { getClientToken, refreshUserToken } from '$lib/server/spotify-token';
import { spotifyFetch } from '$lib/server/spotify-api';
import { fetchPlaylistFromEmbed } from '$lib/server/spotify-embed';
import { saveCollection } from '$lib/server/repositories/collection.repository';
import {
	ensureUserExists,
	findUserBySpotifyId,
	updateUserTokens
} from '$lib/server/repositories/user.repository';
import { enrichTrack } from '$lib/server/enrichment';
import type {
	SpotifyPlaylist,
	SpotifyTrack,
	SpotifyPaginatedResponse
} from '$types/spotify.type';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractPlaylistId(input: string): string | null {
	// Full URL: https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=...
	const urlMatch = input.match(/playlist\/([a-zA-Z0-9]{22})/);
	if (urlMatch) return urlMatch[1];

	// Spotify URI: spotify:playlist:37i9dQZF1DXcBWIGoYBM5M
	const uriMatch = input.match(/spotify:playlist:([a-zA-Z0-9]{22})/);
	if (uriMatch) return uriMatch[1];

	// Raw ID
	if (/^[a-zA-Z0-9]{22}$/.test(input)) return input;

	return null;
}

function parseArgs(): { playlistInput: string; userId: string | null } {
	const args = process.argv.slice(2);
	let playlistInput: string | null = null;
	let userId: string | null = null;

	for (let i = 0; i < args.length; i++) {
		if (args[i] === '--user' && i + 1 < args.length) {
			userId = args[++i];
		} else if (!playlistInput) {
			playlistInput = args[i];
		}
	}

	if (!playlistInput) {
		console.error(
			'Usage: pnpm import:playlist <spotify-playlist-url-or-id> [--user <spotify-user-id>]'
		);
		process.exit(1);
	}

	return { playlistInput, userId };
}

async function resolveToken(userId: string | null): Promise<{
	token: string;
	getToken: () => Promise<string>;
}> {
	if (!userId) {
		const token = await getClientToken();
		return { token, getToken: () => getClientToken() };
	}

	const user = await findUserBySpotifyId(userId);
	if (!user) {
		console.error(`User "${userId}" not found in the database.`);
		console.error('Log in through the UI first so a refresh token gets stored.');
		process.exit(1);
	}

	if (!user.refresh_token) {
		console.error(`User "${userId}" has no stored refresh token.`);
		console.error('Log in through the UI first via Spotify OAuth.');
		process.exit(1);
	}

	// If token is still valid, use it
	if (user.access_token && user.token_expires_at && Date.now() < user.token_expires_at - 60_000) {
		console.log(`Using stored token for user: ${user.display_name ?? userId}`);
		return {
			token: user.access_token,
			getToken: async () => {
				const refreshed = await refreshUserToken(user.refresh_token!);
				if (!refreshed) throw new Error('Failed to refresh user token');
				await updateUserTokens(userId, refreshed.accessToken, refreshed.refreshToken, refreshed.expiresAt);
				return refreshed.accessToken;
			}
		};
	}

	// Token expired — refresh it
	console.log(`Refreshing token for user: ${user.display_name ?? userId}`);
	const refreshed = await refreshUserToken(user.refresh_token);
	if (!refreshed) {
		console.error('Failed to refresh Spotify token. The user may need to log in again via the UI.');
		process.exit(1);
	}

	await updateUserTokens(userId, refreshed.accessToken, refreshed.refreshToken, refreshed.expiresAt);

	return {
		token: refreshed.accessToken,
		getToken: async () => {
			const r = await refreshUserToken(refreshed.refreshToken);
			if (!r) throw new Error('Failed to refresh user token');
			await updateUserTokens(userId, r.accessToken, r.refreshToken, r.expiresAt);
			return r.accessToken;
		}
	};
}

// ---------------------------------------------------------------------------
// Playlist fetching: Web API with embed fallback
// ---------------------------------------------------------------------------

interface PlaylistData {
	name: string;
	coverImageUrl: string | null;
	playlistId: string;
	ownerName: string | null;
	ownerId: string | null;
	tracks: SpotifyTrack[];
}

async function fetchPlaylistViaApi(
	playlistId: string,
	token: string
): Promise<PlaylistData | null> {
	try {
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

		return {
			name: playlist.name,
			coverImageUrl: playlist.images?.[0]?.url || null,
			playlistId: playlist.id,
			ownerName: playlist.owner?.display_name || null,
			ownerId: playlist.owner?.id || null,
			tracks: allItems.map((item) => item.track)
		};
	} catch (err) {
		const msg = err instanceof Error ? err.message : '';
		if (msg.includes('404')) return null; // playlist not accessible via API
		throw err; // re-throw other errors
	}
}

async function fetchPlaylistViaEmbed(
	playlistId: string,
	token: string
): Promise<PlaylistData | null> {
	const embed = await fetchPlaylistFromEmbed(playlistId);
	if (!embed || embed.trackList.length === 0) return null;

	console.log(`Fetching full track data for ${embed.trackList.length} tracks...`);

	// Hydrate each track via /tracks/{id} (works with client credentials)
	const tracks: SpotifyTrack[] = [];
	for (let i = 0; i < embed.trackList.length; i++) {
		const et = embed.trackList[i];
		try {
			const track = await spotifyFetch<SpotifyTrack>(`/tracks/${et.id}`, token);
			tracks.push(track);
		} catch (err) {
			console.error(`  Could not fetch track ${et.id} (${et.title}): ${err instanceof Error ? err.message : err}`);
		}
	}

	return {
		name: embed.name,
		coverImageUrl: embed.coverImageUrl,
		playlistId: embed.id,
		ownerName: embed.ownerName,
		ownerId: 'spotify', // stub user — can't be logged into
		tracks
	};
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
	const { playlistInput, userId } = parseArgs();

	const playlistId = extractPlaylistId(playlistInput);
	if (!playlistId) {
		console.error('Could not extract a valid playlist ID from:', playlistInput);
		process.exit(1);
	}

	// ---- Bootstrap ----
	await initializeSchema();
	const { token, getToken } = await resolveToken(userId);

	// ---- Fetch playlist (API first, embed fallback) ----
	let data = await fetchPlaylistViaApi(playlistId, token);

	if (!data) {
		console.log('Playlist not accessible via Web API, trying embed fallback...');
		data = await fetchPlaylistViaEmbed(playlistId, token);
	}

	if (!data || data.tracks.length === 0) {
		console.error('Could not fetch playlist from any source.');
		process.exit(1);
	}

	console.log(`\nPlaylist : ${data.name}`);
	console.log(`Owner    : ${data.ownerName ?? 'unknown'}`);
	console.log(`Tracks   : ${data.tracks.length}\n`);

	// ---- Save collection ----
	if (data.ownerId) {
		await ensureUserExists({
			spotifyId: data.ownerId,
			displayName: data.ownerName
		});
	}

	const collectionId = await saveCollection({
		name: data.name,
		coverImageUrl: data.coverImageUrl,
		spotifyPlaylistId: data.playlistId,
		spotifyOwnerId: data.ownerId
	});

	console.log(`Collection saved (id: ${collectionId})\n`);

	// ---- Enrich every track ----
	let completed = 0;
	let failed = 0;

	for (let i = 0; i < data.tracks.length; i++) {
		const track = data.tracks[i];

		try {
			let currentToken: string;
			try {
				currentToken = await getToken();
			} catch {
				currentToken = token;
			}

			await enrichTrack(track, currentToken, collectionId, i);
			completed++;
			console.log(
				`[${i + 1}/${data.tracks.length}] ✓ ${track.name} — ${track.artists.map((a) => a.name).join(', ')}`
			);
		} catch (err) {
			failed++;
			console.error(
				`[${i + 1}/${data.tracks.length}] ✗ ${track.name}: ${err instanceof Error ? err.message : err}`
			);
		}
	}

	console.log(`\nDone! ${completed} enriched, ${failed} failed.`);
	process.exit(0);
}

main().catch((err) => {
	console.error('Fatal error:', err);
	process.exit(1);
});
