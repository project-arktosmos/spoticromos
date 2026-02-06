/**
 * CLI script to import all public playlists from a Spotify user profile.
 *
 * Usage:
 *   pnpm import:user <spotify-user-url-or-id>
 *   pnpm import:user <spotify-user-url-or-id> --user <db-user-id>
 *
 * Fetches every public playlist from the given profile, then imports each
 * one using the same pipeline as import-playlist (Web API + embed fallback).
 */

import { initializeSchema } from '$lib/server/schema';
import { spotifyFetch } from '$lib/server/spotify-api';
import { findCollectionByPlaylistId } from '$lib/server/repositories/collection.repository';
import { resolveToken, importPlaylist, type ImportResult } from './lib/import-core';
import type { SpotifyPlaylist, SpotifyPaginatedResponse } from '$types/spotify.type';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractUserId(input: string): string | null {
	// Full URL: https://open.spotify.com/user/spotify?si=...
	const urlMatch = input.match(/user\/([^/?#]+)/);
	if (urlMatch) return decodeURIComponent(urlMatch[1]);

	// Spotify URI: spotify:user:spotify
	const uriMatch = input.match(/spotify:user:([^:]+)/);
	if (uriMatch) return uriMatch[1];

	// Raw ID (no slashes or colons)
	if (/^[^/:]+$/.test(input)) return input;

	return null;
}

function parseArgs(): { userInput: string; dbUserId: string | null } {
	const args = process.argv.slice(2);
	let userInput: string | null = null;
	let dbUserId: string | null = null;

	for (let i = 0; i < args.length; i++) {
		if (args[i] === '--user' && i + 1 < args.length) {
			dbUserId = args[++i];
		} else if (!userInput) {
			userInput = args[i];
		}
	}

	if (!userInput) {
		console.error('Usage: pnpm import:user <spotify-user-url-or-id> [--user <db-user-id>]');
		process.exit(1);
	}

	return { userInput, dbUserId };
}

// ---------------------------------------------------------------------------
// Fetch all public playlists for a user
// ---------------------------------------------------------------------------

interface PlaylistSummary {
	id: string;
	name: string;
	trackCount: number;
	ownerName: string;
}

async function fetchUserPlaylists(
	spotifyUserId: string,
	token: string
): Promise<PlaylistSummary[]> {
	const playlists: PlaylistSummary[] = [];
	let offset = 0;
	const limit = 50;

	while (true) {
		const page = await spotifyFetch<SpotifyPaginatedResponse<SpotifyPlaylist>>(
			`/users/${encodeURIComponent(spotifyUserId)}/playlists?limit=${limit}&offset=${offset}`,
			token
		);

		for (const pl of page.items) {
			playlists.push({
				id: pl.id,
				name: pl.name,
				trackCount: pl.tracks?.total ?? 0,
				ownerName: pl.owner?.display_name ?? spotifyUserId
			});
		}

		offset += page.items.length;
		if (!page.next || offset >= page.total) break;
	}

	return playlists;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
	const { userInput, dbUserId } = parseArgs();

	const spotifyUserId = extractUserId(userInput);
	if (!spotifyUserId) {
		console.error('Could not extract a valid Spotify user ID from:', userInput);
		process.exit(1);
	}

	await initializeSchema();
	const handle = await resolveToken(dbUserId);

	// Fetch all playlists
	console.log(`\nFetching playlists for user: ${spotifyUserId}`);
	const playlists = await fetchUserPlaylists(spotifyUserId, handle.token);

	if (playlists.length === 0) {
		console.error('No public playlists found.');
		process.exit(1);
	}

	console.log(`Found ${playlists.length} playlists:\n`);
	for (let i = 0; i < playlists.length; i++) {
		console.log(`  ${i + 1}. ${playlists[i].name} (${playlists[i].trackCount} tracks)`);
	}

	// Check which playlists already exist in the DB
	const existing = new Set<string>();
	for (const pl of playlists) {
		const row = await findCollectionByPlaylistId(pl.id);
		if (row) existing.add(pl.id);
	}

	const toImport = playlists.filter((pl) => !existing.has(pl.id));

	if (existing.size > 0) {
		console.log(`\nSkipping ${existing.size} already-imported playlists.`);
	}

	if (toImport.length === 0) {
		console.log('All playlists already imported — nothing to do.');
		process.exit(0);
	}

	console.log(`Importing ${toImport.length} new playlists...\n`);

	// Import each new playlist
	const results: (ImportResult | null)[] = [];
	let totalEnriched = 0;
	let totalFailed = 0;

	for (let i = 0; i < toImport.length; i++) {
		const pl = toImport[i];
		console.log(`${'='.repeat(60)}`);
		console.log(`[${i + 1}/${toImport.length}] Importing: ${pl.name}`);
		console.log('='.repeat(60));

		const result = await importPlaylist(pl.id, handle);
		results.push(result);

		if (result) {
			totalEnriched += result.completed;
			totalFailed += result.failed;
		}
	}

	// Summary
	const succeeded = results.filter((r) => r !== null).length;
	const failed = results.filter((r) => r === null).length;

	console.log(`\n${'='.repeat(60)}`);
	console.log('SUMMARY');
	console.log('='.repeat(60));
	console.log(`Playlists  : ${succeeded} imported, ${failed} failed, ${existing.size} skipped`);
	console.log(`Tracks     : ${totalEnriched} enriched, ${totalFailed} failed`);
	console.log('='.repeat(60));

	process.exit(0);
}

main().catch((err) => {
	console.error('Fatal error:', err);
	process.exit(1);
});
