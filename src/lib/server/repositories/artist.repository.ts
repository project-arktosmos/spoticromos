import { query, execute } from '$lib/server/db';
import type { RowDataPacket } from 'mysql2/promise';
import type { SpotifyFullArtist, SpotifyImage } from '$types/spotify.type';

interface ArtistRow extends RowDataPacket {
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

export async function findArtistById(spotifyId: string): Promise<SpotifyFullArtist | null> {
	const [rows] = await query<ArtistRow[]>(
		'SELECT raw_json FROM artists WHERE spotify_id = ?',
		[spotifyId]
	);
	if (rows.length === 0) return null;
	const raw = rows[0].raw_json;
	return (typeof raw === 'string' ? JSON.parse(raw) : raw) as SpotifyFullArtist;
}

export async function saveArtist(artist: SpotifyFullArtist): Promise<void> {
	const imageUrl = getLargestImageUrl(artist.images);

	await execute(
		`INSERT INTO artists (spotify_id, name, popularity, followers, image_url, spotify_uri, spotify_url, raw_json)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		 ON DUPLICATE KEY UPDATE
		   name = VALUES(name),
		   popularity = VALUES(popularity),
		   followers = VALUES(followers),
		   image_url = VALUES(image_url),
		   raw_json = VALUES(raw_json),
		   fetched_at = CURRENT_TIMESTAMP`,
		[
			artist.id,
			artist.name,
			artist.popularity ?? null,
			artist.followers?.total ?? null,
			imageUrl,
			artist.uri,
			artist.external_urls.spotify,
			JSON.stringify(artist)
		]
	);
}
