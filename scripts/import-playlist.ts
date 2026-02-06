/**
 * CLI script to import a Spotify playlist as a full in-app collection.
 *
 * Usage:
 *   pnpm import:playlist <spotify-playlist-url-or-id>
 *   pnpm import:playlist <spotify-playlist-url-or-id> --user <spotify-user-id>
 */

import { initializeSchema } from '$lib/server/schema';
import { resolveToken, importPlaylist } from './lib/import-core';

function extractPlaylistId(input: string): string | null {
	const urlMatch = input.match(/playlist\/([a-zA-Z0-9]{22})/);
	if (urlMatch) return urlMatch[1];

	const uriMatch = input.match(/spotify:playlist:([a-zA-Z0-9]{22})/);
	if (uriMatch) return uriMatch[1];

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

async function main() {
	const { playlistInput, userId } = parseArgs();

	const playlistId = extractPlaylistId(playlistInput);
	if (!playlistId) {
		console.error('Could not extract a valid playlist ID from:', playlistInput);
		process.exit(1);
	}

	await initializeSchema();
	const handle = await resolveToken(userId);

	console.log();
	const result = await importPlaylist(playlistId, handle);

	if (!result) {
		console.error('\nImport failed.');
		process.exit(1);
	}

	console.log(`\nDone! ${result.completed} enriched, ${result.failed} failed.`);
	process.exit(0);
}

main().catch((err) => {
	console.error('Fatal error:', err);
	process.exit(1);
});
