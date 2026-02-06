import { createHash } from 'node:crypto';
import { query, execute } from '$lib/server/db';
import type { RowDataPacket } from 'mysql2/promise';
import type { Lyrics, SyncedLyricLine } from '$types/lyrics.type';

interface LyricsRow extends RowDataPacket {
	id: string;
	lrclib_id: number | null;
	track_name: string;
	artist_name: string;
	album_name: string | null;
	duration: number | null;
	instrumental: boolean;
	plain_lyrics: string | null;
	synced_lyrics: string | null;
	spotify_track_id: string | null;
}

function generateLyricsId(trackName: string, artistName: string, duration: number | undefined): string {
	const key = `${trackName}|${artistName}|${duration ?? 0}`;
	return createHash('sha256').update(key).digest('hex');
}

function rowToLyrics(row: LyricsRow): Lyrics {
	let syncedLyrics: SyncedLyricLine[] | null = null;
	if (row.synced_lyrics) {
		try {
			syncedLyrics = (typeof row.synced_lyrics === 'string'
				? JSON.parse(row.synced_lyrics)
				: row.synced_lyrics) as SyncedLyricLine[];
		} catch {
			syncedLyrics = null;
		}
	}

	return {
		id: row.lrclib_id ?? 0,
		trackName: row.track_name,
		artistName: row.artist_name,
		albumName: row.album_name ?? '',
		duration: row.duration ?? 0,
		instrumental: row.instrumental,
		plainLyrics: row.plain_lyrics,
		syncedLyrics
	};
}

export async function findLyricsByTrackId(spotifyTrackId: string): Promise<Lyrics | null> {
	const [rows] = await query<LyricsRow[]>(
		'SELECT * FROM lyrics WHERE spotify_track_id = ? LIMIT 1',
		[spotifyTrackId]
	);
	if (rows.length === 0) return null;
	return rowToLyrics(rows[0]);
}

export async function findLyricsByKey(
	trackName: string,
	artistName: string,
	duration: number | undefined
): Promise<Lyrics | null> {
	const id = generateLyricsId(trackName, artistName, duration);
	const [rows] = await query<LyricsRow[]>(
		'SELECT * FROM lyrics WHERE id = ? LIMIT 1',
		[id]
	);
	if (rows.length === 0) return null;
	return rowToLyrics(rows[0]);
}

export async function saveLyrics(
	lyrics: Lyrics,
	spotifyTrackId: string,
	rawSyncedLrc: string | null
): Promise<void> {
	const id = generateLyricsId(lyrics.trackName, lyrics.artistName, lyrics.duration);

	await execute(
		`INSERT INTO lyrics (id, lrclib_id, track_name, artist_name, album_name, duration, instrumental, plain_lyrics, synced_lyrics_raw, synced_lyrics, spotify_track_id)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		 ON DUPLICATE KEY UPDATE
		   plain_lyrics = VALUES(plain_lyrics),
		   synced_lyrics_raw = VALUES(synced_lyrics_raw),
		   synced_lyrics = VALUES(synced_lyrics),
		   spotify_track_id = COALESCE(VALUES(spotify_track_id), spotify_track_id),
		   fetched_at = CURRENT_TIMESTAMP`,
		[
			id,
			lyrics.id || null,
			lyrics.trackName,
			lyrics.artistName,
			lyrics.albumName || null,
			lyrics.duration || null,
			lyrics.instrumental,
			lyrics.plainLyrics,
			rawSyncedLrc,
			lyrics.syncedLyrics ? JSON.stringify(lyrics.syncedLyrics) : null,
			spotifyTrackId
		]
	);
}
