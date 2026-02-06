import { query, execute } from '$lib/server/db';
import type { RowDataPacket } from 'mysql2/promise';

// ---------------------------------------------------------------------------
// Row types
// ---------------------------------------------------------------------------

export interface CollectionRow {
	id: number;
	name: string;
	cover_image_url: string | null;
	spotify_playlist_id: string;
	spotify_owner_id: string | null;
	created_at: string;
	creator_display_name: string | null;
	creator_avatar_url: string | null;
}

interface CollectionDbRow extends RowDataPacket, CollectionRow {}

export interface CollectionItemRow {
	id: number;
	collection_id: number;
	track_name: string;
	track_spotify_id: string;
	album_name: string | null;
	album_cover_url: string | null;
	album_spotify_id: string | null;
	album_release_year: string | null;
	album_label: string | null;
	lyrics: string | null;
	position: number | null;
	created_at: string;
}

interface CollectionItemDbRow extends RowDataPacket, CollectionItemRow {}

export interface CollectionArtistRow {
	id: string;
	name: string;
	spotify_uri: string | null;
	spotify_url: string | null;
	popularity: number | null;
	followers: number | null;
	genres: string[] | null;
	created_at: string;
}

interface CollectionArtistDbRow extends RowDataPacket {
	id: string;
	name: string;
	spotify_uri: string | null;
	spotify_url: string | null;
	popularity: number | null;
	followers: number | null;
	genres: string | null;
	created_at: string;
}

export interface CollectionArtistImageRow {
	id: number;
	artist_id: string;
	url: string;
	height: number | null;
	width: number | null;
}

interface CollectionArtistImageDbRow extends RowDataPacket, CollectionArtistImageRow {}

// ---------------------------------------------------------------------------
// Collections (playlists)
// ---------------------------------------------------------------------------

export async function saveCollection(data: {
	name: string;
	coverImageUrl: string | null;
	spotifyPlaylistId: string;
	spotifyOwnerId: string | null;
}): Promise<number> {
	const [result] = await execute(
		`INSERT INTO collections (name, cover_image_url, spotify_playlist_id, spotify_owner_id)
		 VALUES (?, ?, ?, ?)
		 ON DUPLICATE KEY UPDATE
		   name = VALUES(name),
		   cover_image_url = VALUES(cover_image_url),
		   spotify_owner_id = VALUES(spotify_owner_id)`,
		[data.name, data.coverImageUrl, data.spotifyPlaylistId, data.spotifyOwnerId]
	);

	// If the row was inserted, result.insertId is the new ID.
	// If it was updated (duplicate key), insertId is 0 — look it up.
	if (result.insertId) return result.insertId;

	const [rows] = await query<CollectionDbRow[]>(
		'SELECT id FROM collections WHERE spotify_playlist_id = ?',
		[data.spotifyPlaylistId]
	);
	return rows[0].id;
}

export async function findCollectionsByIds(ids: number[]): Promise<(CollectionRow & { track_count: number })[]> {
	if (ids.length === 0) return [];
	const placeholders = ids.map(() => '?').join(', ');
	const [rows] = await query<(CollectionDbRow & { track_count: number })[]>(
		`SELECT c.*,
		        u.display_name AS creator_display_name,
		        u.avatar_url AS creator_avatar_url,
		        (SELECT COUNT(*) FROM collection_items ci WHERE ci.collection_id = c.id) AS track_count
		 FROM collections c
		 LEFT JOIN users u ON u.spotify_id = c.spotify_owner_id
		 WHERE c.id IN (${placeholders})
		 ORDER BY c.created_at DESC`,
		ids
	);
	return rows;
}

export async function findAllCollections(): Promise<(CollectionRow & { track_count: number })[]> {
	const [rows] = await query<(CollectionDbRow & { track_count: number })[]>(
		`SELECT c.*,
		        u.display_name AS creator_display_name,
		        u.avatar_url AS creator_avatar_url,
		        (SELECT COUNT(*) FROM collection_items ci WHERE ci.collection_id = c.id) AS track_count
		 FROM collections c
		 LEFT JOIN users u ON u.spotify_id = c.spotify_owner_id
		 ORDER BY c.created_at DESC`
	);
	return rows;
}

export interface PaginatedCollections {
	collections: (CollectionRow & { track_count: number })[];
	total: number;
	page: number;
	limit: number;
}

export async function findCollections(opts: {
	page?: number;
	limit?: number;
	search?: string;
}): Promise<PaginatedCollections> {
	const page = Math.max(1, opts.page ?? 1);
	const limit = Math.min(100, Math.max(1, opts.limit ?? 12));
	const offset = (page - 1) * limit;
	const searchPattern = opts.search?.trim() ? `%${opts.search.trim()}%` : '%';

	const [countRows] = await query<(RowDataPacket & { total: number })[]>(
		`SELECT COUNT(*) AS total FROM collections c WHERE c.name LIKE ?`,
		[searchPattern]
	);
	const total = countRows[0].total;

	const [rows] = await query<(CollectionDbRow & { track_count: number })[]>(
		`SELECT c.*,
		        u.display_name AS creator_display_name,
		        u.avatar_url AS creator_avatar_url,
		        (SELECT COUNT(*) FROM collection_items ci WHERE ci.collection_id = c.id) AS track_count
		 FROM collections c
		 LEFT JOIN users u ON u.spotify_id = c.spotify_owner_id
		 WHERE c.name LIKE ?
		 ORDER BY c.created_at DESC
		 LIMIT ? OFFSET ?`,
		[searchPattern, limit, offset]
	);

	return { collections: rows, total, page, limit };
}

export async function findCollectionById(id: number): Promise<CollectionRow | null> {
	const [rows] = await query<CollectionDbRow[]>(
		`SELECT c.*,
		        u.display_name AS creator_display_name,
		        u.avatar_url AS creator_avatar_url
		 FROM collections c
		 LEFT JOIN users u ON u.spotify_id = c.spotify_owner_id
		 WHERE c.id = ?`,
		[id]
	);
	return rows.length ? rows[0] : null;
}

export async function findCollectionByPlaylistId(
	spotifyPlaylistId: string
): Promise<CollectionRow | null> {
	const [rows] = await query<CollectionDbRow[]>(
		`SELECT c.*,
		        u.display_name AS creator_display_name,
		        u.avatar_url AS creator_avatar_url
		 FROM collections c
		 LEFT JOIN users u ON u.spotify_id = c.spotify_owner_id
		 WHERE c.spotify_playlist_id = ?`,
		[spotifyPlaylistId]
	);
	return rows.length ? rows[0] : null;
}

// ---------------------------------------------------------------------------
// Collection Artists
// ---------------------------------------------------------------------------

export async function saveCollectionArtist(data: {
	id: string;
	name: string;
	spotifyUri: string | null;
	spotifyUrl: string | null;
	popularity: number | null;
	followers: number | null;
	genres: string[] | null;
	images: Array<{ url: string; height: number | null; width: number | null }>;
}): Promise<void> {
	await execute(
		`INSERT INTO collection_artists (id, name, spotify_uri, spotify_url, popularity, followers, genres)
		 VALUES (?, ?, ?, ?, ?, ?, ?)
		 ON DUPLICATE KEY UPDATE
		   name = VALUES(name),
		   spotify_uri = VALUES(spotify_uri),
		   spotify_url = VALUES(spotify_url),
		   popularity = VALUES(popularity),
		   followers = VALUES(followers),
		   genres = VALUES(genres)`,
		[
			data.id,
			data.name,
			data.spotifyUri,
			data.spotifyUrl,
			data.popularity,
			data.followers,
			data.genres ? JSON.stringify(data.genres) : null
		]
	);

	// Replace images: delete existing, then bulk-insert
	await execute('DELETE FROM collection_artist_images WHERE artist_id = ?', [data.id]);

	if (data.images.length > 0) {
		const placeholders = data.images.map(() => '(?, ?, ?, ?)').join(', ');
		const values = data.images.flatMap((img) => [data.id, img.url, img.height, img.width]);
		await execute(
			`INSERT INTO collection_artist_images (artist_id, url, height, width) VALUES ${placeholders}`,
			values
		);
	}
}

export async function findCollectionArtistImages(
	artistId: string
): Promise<CollectionArtistImageRow[]> {
	const [rows] = await query<CollectionArtistImageDbRow[]>(
		'SELECT * FROM collection_artist_images WHERE artist_id = ?',
		[artistId]
	);
	return rows;
}

// ---------------------------------------------------------------------------
// Collection Items (tracks within a playlist)
// ---------------------------------------------------------------------------

export async function saveCollectionItem(data: {
	collectionId: number;
	trackName: string;
	trackSpotifyId: string;
	albumName: string | null;
	albumCoverUrl: string | null;
	albumSpotifyId: string | null;
	albumReleaseYear: string | null;
	albumLabel: string | null;
	lyrics: string | null;
	position: number | null;
	artistIds: string[];
}): Promise<number> {
	const [result] = await execute(
		`INSERT INTO collection_items
		   (collection_id, track_name, track_spotify_id, album_name, album_cover_url, album_spotify_id, album_release_year, album_label, lyrics, position)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		 ON DUPLICATE KEY UPDATE
		   track_name = VALUES(track_name),
		   album_name = VALUES(album_name),
		   album_cover_url = VALUES(album_cover_url),
		   album_spotify_id = VALUES(album_spotify_id),
		   album_release_year = VALUES(album_release_year),
		   album_label = VALUES(album_label),
		   lyrics = VALUES(lyrics),
		   position = VALUES(position)`,
		[
			data.collectionId,
			data.trackName,
			data.trackSpotifyId,
			data.albumName,
			data.albumCoverUrl,
			data.albumSpotifyId,
			data.albumReleaseYear,
			data.albumLabel,
			data.lyrics,
			data.position
		]
	);

	// Get the item ID (may be insert or update)
	let itemId = result.insertId;
	if (!itemId) {
		const [rows] = await query<(RowDataPacket & { id: number })[]>(
			'SELECT id FROM collection_items WHERE collection_id = ? AND track_spotify_id = ?',
			[data.collectionId, data.trackSpotifyId]
		);
		itemId = rows[0].id;
	}

	// Replace artist junction rows
	await execute('DELETE FROM collection_item_artists WHERE item_id = ?', [itemId]);

	if (data.artistIds.length > 0) {
		const placeholders = data.artistIds.map(() => '(?, ?, ?)').join(', ');
		const values = data.artistIds.flatMap((artistId, idx) => [itemId, artistId, idx]);
		await execute(
			`INSERT INTO collection_item_artists (item_id, artist_id, position) VALUES ${placeholders}`,
			values
		);
	}

	return itemId;
}

export async function findCollectionTrackIds(collectionId: number): Promise<Set<string>> {
	const [rows] = await query<(RowDataPacket & { track_spotify_id: string })[]>(
		'SELECT track_spotify_id FROM collection_items WHERE collection_id = ?',
		[collectionId]
	);
	return new Set(rows.map((r) => r.track_spotify_id));
}

export async function findCollectionItems(collectionId: number): Promise<CollectionItemRow[]> {
	const [rows] = await query<CollectionItemDbRow[]>(
		'SELECT * FROM collection_items WHERE collection_id = ? ORDER BY position ASC, created_at ASC',
		[collectionId]
	);
	return rows;
}

export interface CollectionItemWithArtists extends CollectionItemRow {
	artists: string;
	artist_image_url: string | null;
	rarity_id?: number;
	rarity_name?: string;
	rarity_color?: string;
	rarity_level?: number;
}

export async function findCollectionItemsWithArtists(
	collectionId: number
): Promise<CollectionItemWithArtists[]> {
	const [rows] = await query<(RowDataPacket & CollectionItemWithArtists)[]>(
		`SELECT ci.*,
		   GROUP_CONCAT(ca.name ORDER BY cia.position SEPARATOR ', ') AS artists,
		   (SELECT cai.url
		    FROM collection_artist_images cai
		    JOIN collection_item_artists cia2 ON cia2.artist_id = cai.artist_id
		    WHERE cia2.item_id = ci.id
		    ORDER BY cia2.position ASC, cai.height DESC
		    LIMIT 1) AS artist_image_url
		 FROM collection_items ci
		 LEFT JOIN collection_item_artists cia ON cia.item_id = ci.id
		 LEFT JOIN collection_artists ca ON ca.id = cia.artist_id
		 WHERE ci.collection_id = ?
		 GROUP BY ci.id
		 ORDER BY ci.position ASC, ci.created_at ASC`,
		[collectionId]
	);
	return rows;
}

// ---------------------------------------------------------------------------
// Artist metadata (for trivia generators that need genres/followers)
// ---------------------------------------------------------------------------

export interface CollectionArtistWithMetadata {
	id: string;
	name: string;
	popularity: number | null;
	followers: number | null;
	genres: string[] | null;
	image_url: string | null;
}

export async function findCollectionArtistsWithMetadata(
	collectionId: number
): Promise<CollectionArtistWithMetadata[]> {
	const [rows] = await query<
		(RowDataPacket & {
			id: string;
			name: string;
			popularity: number | null;
			followers: number | null;
			genres: string | null;
			image_url: string | null;
		})[]
	>(
		`SELECT DISTINCT ca.id, ca.name, ca.popularity, ca.followers, ca.genres,
		    (SELECT cai.url FROM collection_artist_images cai
		     WHERE cai.artist_id = ca.id ORDER BY cai.height DESC LIMIT 1) AS image_url
		 FROM collection_artists ca
		 INNER JOIN collection_item_artists cia ON cia.artist_id = ca.id
		 INNER JOIN collection_items ci ON ci.id = cia.item_id
		 WHERE ci.collection_id = ?`,
		[collectionId]
	);
	return rows.map((r) => ({
		id: r.id,
		name: r.name,
		popularity: r.popularity,
		followers: r.followers,
		genres: r.genres ? (typeof r.genres === 'string' ? JSON.parse(r.genres) : r.genres) : null,
		image_url: r.image_url
	}));
}
