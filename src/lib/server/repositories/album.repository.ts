import { query, execute } from '$lib/server/db';
import type { RowDataPacket } from 'mysql2/promise';
import type { SpotifyAlbum, SpotifyImage } from '$types/spotify.type';

interface AlbumRow extends RowDataPacket {
	raw_json: string;
}

function getLargestImageUrl(images: SpotifyImage[]): string | null {
	if (!images || images.length === 0) return null;
	return images.reduce((largest, img) => {
		const area = (img.width ?? 0) * (img.height ?? 0);
		const largestArea = (largest.width ?? 0) * (largest.height ?? 0);
		return area > largestArea ? img : largest;
	}).url;
}

export async function findAlbumById(spotifyId: string): Promise<SpotifyAlbum | null> {
	const [rows] = await query<AlbumRow[]>(
		'SELECT raw_json FROM albums WHERE spotify_id = ?',
		[spotifyId]
	);
	if (rows.length === 0) return null;
	const raw = rows[0].raw_json;
	return (typeof raw === 'string' ? JSON.parse(raw) : raw) as SpotifyAlbum;
}

export async function saveAlbum(album: SpotifyAlbum): Promise<void> {
	const imageUrl = getLargestImageUrl(album.images);

	await execute(
		`INSERT INTO albums (spotify_id, name, album_type, total_tracks, release_date, release_date_precision, label, popularity, image_url, spotify_uri, spotify_url, raw_json)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		 ON DUPLICATE KEY UPDATE
		   name = VALUES(name),
		   album_type = VALUES(album_type),
		   total_tracks = VALUES(total_tracks),
		   label = VALUES(label),
		   popularity = VALUES(popularity),
		   image_url = VALUES(image_url),
		   raw_json = VALUES(raw_json),
		   fetched_at = CURRENT_TIMESTAMP`,
		[
			album.id,
			album.name,
			album.album_type,
			album.total_tracks,
			album.release_date,
			album.release_date_precision,
			album.label ?? null,
			album.popularity ?? null,
			imageUrl,
			album.uri,
			album.external_urls.spotify,
			JSON.stringify(album)
		]
	);

	// Upsert album_artists junction
	for (let i = 0; i < album.artists.length; i++) {
		await execute(
			`INSERT INTO album_artists (album_id, artist_id, position)
			 VALUES (?, ?, ?)
			 ON DUPLICATE KEY UPDATE position = VALUES(position)`,
			[album.id, album.artists[i].id, i]
		);
	}
}
