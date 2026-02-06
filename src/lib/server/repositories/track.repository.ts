import { query, execute } from '$lib/server/db';
import type { RowDataPacket } from 'mysql2/promise';
import type { SpotifyTrack } from '$types/spotify.type';

interface TrackRow extends RowDataPacket {
	raw_json: string;
}

export async function findTrackById(spotifyId: string): Promise<SpotifyTrack | null> {
	const [rows] = await query<TrackRow[]>(
		'SELECT raw_json FROM tracks WHERE spotify_id = ?',
		[spotifyId]
	);
	if (rows.length === 0) return null;
	const raw = rows[0].raw_json;
	return (typeof raw === 'string' ? JSON.parse(raw) : raw) as SpotifyTrack;
}

export async function saveTrack(track: SpotifyTrack): Promise<void> {
	await execute(
		`INSERT INTO tracks (spotify_id, name, duration_ms, track_number, disc_number, explicit, is_local, popularity, preview_url, isrc, album_id, spotify_uri, spotify_url, raw_json)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		 ON DUPLICATE KEY UPDATE
		   name = VALUES(name),
		   popularity = VALUES(popularity),
		   preview_url = VALUES(preview_url),
		   raw_json = VALUES(raw_json),
		   fetched_at = CURRENT_TIMESTAMP`,
		[
			track.id,
			track.name,
			track.duration_ms,
			track.track_number,
			track.disc_number,
			track.explicit,
			track.is_local,
			track.popularity ?? null,
			track.preview_url,
			track.external_ids?.isrc ?? null,
			track.album?.id ?? null,
			track.uri,
			track.external_urls.spotify,
			JSON.stringify(track)
		]
	);

	// Upsert track_artists junction
	for (let i = 0; i < track.artists.length; i++) {
		await execute(
			`INSERT INTO track_artists (track_id, artist_id, position)
			 VALUES (?, ?, ?)
			 ON DUPLICATE KEY UPDATE position = VALUES(position)`,
			[track.id, track.artists[i].id, i]
		);
	}
}
