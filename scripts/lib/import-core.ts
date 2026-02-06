/**
 * Shared import logic used by both import-playlist.ts and import-user-playlists.ts.
 *
 * All heavy lifting is delegated to the existing server-side modules —
 * this file only provides the orchestration layer.
 */

import { getClientToken, refreshUserToken } from '$lib/server/spotify-token';
import { spotifyFetch } from '$lib/server/spotify-api';
import { fetchPlaylistFromEmbed, fetchAllTrackIdsFromSpclient } from '$lib/server/spotify-embed';
import {
	saveCollection,
	findCollectionTrackIds
} from '$lib/server/repositories/collection.repository';
import {
	ensureUserExists,
	findUserBySpotifyId,
	updateUserTokens
} from '$lib/server/repositories/user.repository';
import { enrichTrack } from '$lib/server/enrichment';
import type { SpotifyPlaylist, SpotifyTrack, SpotifyPaginatedResponse } from '$types/spotify.type';

// ---------------------------------------------------------------------------
// Token resolution
// ---------------------------------------------------------------------------

export interface TokenHandle {
	token: string;
	getToken: (force?: boolean) => Promise<string>;
}

/**
 * Wrapper around `spotifyFetch` that automatically refreshes the token on 401
 * and retries the request once.
 */
export async function tokenFetch<T>(endpoint: string, handle: TokenHandle): Promise<T> {
	try {
		return await spotifyFetch<T>(endpoint, handle.token);
	} catch (err) {
		const msg = err instanceof Error ? err.message : '';
		if (msg.startsWith('401')) {
			console.log('  Token expired, refreshing...');
			handle.token = await handle.getToken(true);
			return spotifyFetch<T>(endpoint, handle.token);
		}
		throw err;
	}
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

	// Mutable state — properly chains refresh tokens across multiple refreshes
	let currentRefreshToken = user.refresh_token;
	let expiresAt = user.token_expires_at ?? 0;

	async function refresh(): Promise<string> {
		const refreshed = await refreshUserToken(currentRefreshToken);
		if (!refreshed) throw new Error('Failed to refresh user token');
		currentRefreshToken = refreshed.refreshToken;
		expiresAt = refreshed.expiresAt;
		await updateUserTokens(
			userId!,
			refreshed.accessToken,
			refreshed.refreshToken,
			refreshed.expiresAt
		);
		return refreshed.accessToken;
	}

	// Determine initial token
	let initialToken: string;
	if (user.access_token && Date.now() < expiresAt - 60_000) {
		console.log(`Using stored token for user: ${user.display_name ?? userId}`);
		initialToken = user.access_token;
	} else {
		console.log(`Refreshing token for user: ${user.display_name ?? userId}`);
		initialToken = await refresh();
	}

	const handle: TokenHandle = {
		token: initialToken,
		getToken: async (force = false) => {
			if (!force && Date.now() < expiresAt - 120_000) return handle.token;
			console.log('  Refreshing Spotify token...');
			handle.token = await refresh();
			return handle.token;
		}
	};

	return handle;
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
	handle: TokenHandle
): Promise<PlaylistData | null> {
	try {
		const playlist = await tokenFetch<SpotifyPlaylist>(`/playlists/${playlistId}`, handle);

		const allItems: Array<{ added_at: string; track: SpotifyTrack }> = [];
		let offset = 0;
		const limit = 100;

		while (true) {
			const page = await tokenFetch<
				SpotifyPaginatedResponse<{ added_at: string; track: SpotifyTrack }>
			>(`/playlists/${playlistId}/tracks?limit=${limit}&offset=${offset}`, handle);

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
	handle: TokenHandle
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
	const useAnonymousToken = !!embed.anonymousToken;
	const batchToken = embed.anonymousToken ?? handle.token;

	// Batch-resolve track IDs via /v1/tracks?ids=... (max 50 per request)
	console.log(`  Resolving full track data for ${trackIds.length} tracks...`);
	const tracks: SpotifyTrack[] = [];
	const BATCH_SIZE = 50;

	for (let i = 0; i < trackIds.length; i += BATCH_SIZE) {
		const batch = trackIds.slice(i, i + BATCH_SIZE);
		try {
			const result = useAnonymousToken
				? await spotifyFetch<{ tracks: (SpotifyTrack | null)[] }>(
						`/tracks?ids=${batch.join(',')}`,
						batchToken
					)
				: await tokenFetch<{ tracks: (SpotifyTrack | null)[] }>(
						`/tracks?ids=${batch.join(',')}`,
						handle
					);
			for (const track of result.tracks) {
				if (track) tracks.push(track);
			}
		} catch (err) {
			// If batch fails, try tracks individually
			console.warn(
				`  Batch ${i / BATCH_SIZE + 1} failed, trying individually: ${err instanceof Error ? err.message : err}`
			);
			for (const id of batch) {
				try {
					const track = useAnonymousToken
						? await spotifyFetch<SpotifyTrack>(`/tracks/${id}`, batchToken)
						: await tokenFetch<SpotifyTrack>(`/tracks/${id}`, handle);
					tracks.push(track);
				} catch (innerErr) {
					console.error(
						`  Could not fetch track ${id}: ${innerErr instanceof Error ? innerErr.message : innerErr}`
					);
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
	handle: TokenHandle
): Promise<PlaylistData | null> {
	let data = await fetchPlaylistViaApi(playlistId, handle);

	if (!data) {
		console.log('  Not accessible via Web API, trying embed fallback...');
		data = await fetchPlaylistViaEmbed(playlistId, handle);
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
	const data = await fetchPlaylist(playlistId, handle);

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
			// Proactively refresh if close to expiry (no-op when still fresh)
			await handle.getToken();
			await enrichTrack(track, handle.token, collectionId, i);
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
