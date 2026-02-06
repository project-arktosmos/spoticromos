/**
 * Shared import logic used by both import-playlist.ts and import-user-playlists.ts.
 *
 * All heavy lifting is delegated to the existing server-side modules —
 * this file only provides the orchestration layer.
 */

import { getClientToken, refreshUserToken } from '$lib/server/spotify-token';
import { spotifyFetch } from '$lib/server/spotify-api';
import { fetchPlaylistFromEmbed, fetchAllTrackIdsFromSpclient } from '$lib/server/spotify-embed';
import { saveCollection, findCollectionTrackIds } from '$lib/server/repositories/collection.repository';
import { ensureUserExists, findUserBySpotifyId, updateUserTokens } from '$lib/server/repositories/user.repository';
import { enrichTrack } from '$lib/server/enrichment';
import type { SpotifyPlaylist, SpotifyTrack, SpotifyPaginatedResponse } from '$types/spotify.type';

// ---------------------------------------------------------------------------
// Token resolution
// ---------------------------------------------------------------------------

export interface TokenHandle {
	token: string;
	getToken: () => Promise<string>;
}

export async function resolveToken(userId: string | null): Promise<TokenHandle> {
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
// Playlist data fetching (Web API + embed fallback)
// ---------------------------------------------------------------------------

export interface PlaylistData {
	name: string;
	coverImageUrl: string | null;
	playlistId: string;
	ownerName: string | null;
	ownerId: string | null;
	tracks: SpotifyTrack[];
}

export async function fetchPlaylistViaApi(
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
		if (msg.includes('404')) return null;
		throw err;
	}
}

export async function fetchPlaylistViaEmbed(
	playlistId: string,
	token: string
): Promise<PlaylistData | null> {
	const embed = await fetchPlaylistFromEmbed(playlistId);
	if (!embed) return null;

	// Resolve the full track ID list.
	// The embed page itself only contains up to 100 tracks, but the anonymous
	// token lets us call spclient which returns *all* track URIs.
	let trackIds: string[];

	if (embed.anonymousToken) {
		console.log('  Fetching complete track list via spclient...');
		const spclientIds = await fetchAllTrackIdsFromSpclient(playlistId, embed.anonymousToken);

		if (spclientIds.length > 0) {
			trackIds = spclientIds;
			console.log(`  spclient returned ${trackIds.length} tracks`);
		} else {
			// spclient failed — fall back to the (possibly truncated) embed list
			console.warn('  spclient returned no tracks, falling back to embed trackList');
			trackIds = embed.trackList.map((t) => t.id);
		}
	} else {
		trackIds = embed.trackList.map((t) => t.id);
	}

	if (trackIds.length === 0) return null;

	// Use the anonymous embed token for batch track resolution when available,
	// otherwise fall back to the caller-supplied token.
	const resolveToken = embed.anonymousToken ?? token;

	// Batch-resolve track IDs via /v1/tracks?ids=... (max 50 per request)
	console.log(`  Resolving full track data for ${trackIds.length} tracks...`);
	const tracks: SpotifyTrack[] = [];
	const BATCH_SIZE = 50;

	for (let i = 0; i < trackIds.length; i += BATCH_SIZE) {
		const batch = trackIds.slice(i, i + BATCH_SIZE);
		try {
			const result = await spotifyFetch<{ tracks: (SpotifyTrack | null)[] }>(
				`/tracks?ids=${batch.join(',')}`,
				resolveToken
			);
			for (const track of result.tracks) {
				if (track) tracks.push(track);
			}
		} catch (err) {
			// If batch fails, try tracks individually
			console.warn(`  Batch ${i / BATCH_SIZE + 1} failed, trying individually: ${err instanceof Error ? err.message : err}`);
			for (const id of batch) {
				try {
					const track = await spotifyFetch<SpotifyTrack>(`/tracks/${id}`, resolveToken);
					tracks.push(track);
				} catch (innerErr) {
					console.error(`  Could not fetch track ${id}: ${innerErr instanceof Error ? innerErr.message : innerErr}`);
				}
			}
		}
	}

	return {
		name: embed.name,
		coverImageUrl: embed.coverImageUrl,
		playlistId: embed.id,
		ownerName: embed.ownerName,
		ownerId: 'spotify',
		tracks
	};
}

export async function fetchPlaylist(
	playlistId: string,
	token: string
): Promise<PlaylistData | null> {
	let data = await fetchPlaylistViaApi(playlistId, token);

	if (!data) {
		console.log('  Not accessible via Web API, trying embed fallback...');
		data = await fetchPlaylistViaEmbed(playlistId, token);
	}

	return data;
}

// ---------------------------------------------------------------------------
// Full import: fetch → save collection → enrich tracks
// ---------------------------------------------------------------------------

export interface ImportResult {
	collectionId: number;
	name: string;
	completed: number;
	skipped: number;
	failed: number;
	total: number;
}

/**
 * Import (or resume) a playlist.
 *
 * When `existingCollectionId` is provided the function skips collection
 * creation and only enriches tracks that are missing from `collection_items`.
 */
export async function importPlaylist(
	playlistId: string,
	handle: TokenHandle,
	existingCollectionId?: number
): Promise<ImportResult | null> {
	const { token, getToken } = handle;

	const data = await fetchPlaylist(playlistId, token);

	if (!data || data.tracks.length === 0) {
		console.error(`  Could not fetch playlist ${playlistId} from any source.`);
		return null;
	}

	console.log(`  Playlist : ${data.name}`);
	console.log(`  Owner    : ${data.ownerName ?? 'unknown'}`);
	console.log(`  Tracks   : ${data.tracks.length}`);

	let collectionId: number;

	if (existingCollectionId != null) {
		collectionId = existingCollectionId;
		console.log(`  Resuming existing collection (id: ${collectionId})`);
	} else {
		if (data.ownerId) {
			await ensureUserExists({
				spotifyId: data.ownerId,
				displayName: data.ownerName
			});
		}

		collectionId = await saveCollection({
			name: data.name,
			coverImageUrl: data.coverImageUrl,
			spotifyPlaylistId: data.playlistId,
			spotifyOwnerId: data.ownerId
		});

		console.log(`  Collection saved (id: ${collectionId})`);
	}

	// Determine which tracks are already enriched
	const existingTrackIds = await findCollectionTrackIds(collectionId);

	// Enrich tracks
	let completed = 0;
	let skipped = 0;
	let failed = 0;

	for (let i = 0; i < data.tracks.length; i++) {
		const track = data.tracks[i];

		if (existingTrackIds.has(track.id)) {
			skipped++;
			continue;
		}

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
				`  [${i + 1}/${data.tracks.length}] ✓ ${track.name} — ${track.artists.map((a) => a.name).join(', ')}`
			);
		} catch (err) {
			failed++;
			console.error(
				`  [${i + 1}/${data.tracks.length}] ✗ ${track.name}: ${err instanceof Error ? err.message : err}`
			);
		}
	}

	if (skipped > 0) {
		console.log(`  Skipped ${skipped} already-enriched tracks`);
	}

	return { collectionId, name: data.name, completed, skipped, failed, total: data.tracks.length };
}
