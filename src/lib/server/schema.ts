import { query, execute } from '$lib/server/db';
import type { RowDataPacket } from 'mysql2/promise';

let initialized = false;

const CREATE_ARTISTS = `
CREATE TABLE IF NOT EXISTS artists (
  spotify_id   VARCHAR(22)   NOT NULL PRIMARY KEY,
  name         VARCHAR(500)  NOT NULL,
  popularity   SMALLINT      DEFAULT NULL,
  followers    INT           DEFAULT NULL,
  image_url    TEXT          DEFAULT NULL,
  spotify_uri  VARCHAR(100)  NOT NULL,
  spotify_url  TEXT          NOT NULL,
  raw_json     JSON          NOT NULL,
  fetched_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_artists_name (name(100))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const CREATE_ALBUMS = `
CREATE TABLE IF NOT EXISTS albums (
  spotify_id             VARCHAR(22)   NOT NULL PRIMARY KEY,
  name                   VARCHAR(500)  NOT NULL,
  album_type             VARCHAR(20)   NOT NULL,
  total_tracks           SMALLINT      NOT NULL DEFAULT 0,
  release_date           VARCHAR(10)   NOT NULL,
  release_date_precision VARCHAR(5)    NOT NULL,
  label                  VARCHAR(500)  DEFAULT NULL,
  popularity             SMALLINT      DEFAULT NULL,
  image_url              TEXT          DEFAULT NULL,
  spotify_uri            VARCHAR(100)  NOT NULL,
  spotify_url            TEXT          NOT NULL,
  raw_json               JSON          NOT NULL,
  fetched_at             TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_albums_name (name(100))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const CREATE_TRACKS = `
CREATE TABLE IF NOT EXISTS tracks (
  spotify_id   VARCHAR(22)   NOT NULL PRIMARY KEY,
  name         VARCHAR(500)  NOT NULL,
  duration_ms  INT           NOT NULL,
  track_number SMALLINT      NOT NULL DEFAULT 0,
  disc_number  SMALLINT      NOT NULL DEFAULT 0,
  explicit     BOOLEAN       NOT NULL DEFAULT FALSE,
  is_local     BOOLEAN       NOT NULL DEFAULT FALSE,
  popularity   SMALLINT      DEFAULT NULL,
  preview_url  TEXT          DEFAULT NULL,
  isrc         VARCHAR(12)   DEFAULT NULL,
  album_id     VARCHAR(22)   DEFAULT NULL,
  spotify_uri  VARCHAR(100)  NOT NULL,
  spotify_url  TEXT          NOT NULL,
  raw_json     JSON          NOT NULL,
  fetched_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_tracks_album_id (album_id),
  INDEX idx_tracks_isrc (isrc),
  INDEX idx_tracks_name (name(100))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const CREATE_TRACK_ARTISTS = `
CREATE TABLE IF NOT EXISTS track_artists (
  track_id   VARCHAR(22) NOT NULL,
  artist_id  VARCHAR(22) NOT NULL,
  position   SMALLINT    NOT NULL DEFAULT 0,

  PRIMARY KEY (track_id, artist_id),
  INDEX idx_ta_artist (artist_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const CREATE_ALBUM_ARTISTS = `
CREATE TABLE IF NOT EXISTS album_artists (
  album_id   VARCHAR(22) NOT NULL,
  artist_id  VARCHAR(22) NOT NULL,
  position   SMALLINT    NOT NULL DEFAULT 0,

  PRIMARY KEY (album_id, artist_id),
  INDEX idx_aa_artist (artist_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const CREATE_LYRICS = `
CREATE TABLE IF NOT EXISTS lyrics (
  id                VARCHAR(64)   NOT NULL PRIMARY KEY,
  lrclib_id         INT           DEFAULT NULL,
  track_name        VARCHAR(500)  NOT NULL,
  artist_name       VARCHAR(500)  NOT NULL,
  album_name        VARCHAR(500)  DEFAULT NULL,
  duration          INT           DEFAULT NULL,
  instrumental      BOOLEAN       NOT NULL DEFAULT FALSE,
  plain_lyrics      MEDIUMTEXT    DEFAULT NULL,
  synced_lyrics_raw TEXT          DEFAULT NULL,
  synced_lyrics     JSON          DEFAULT NULL,
  spotify_track_id  VARCHAR(22)   DEFAULT NULL,
  fetched_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_lyrics_track_name (track_name(100)),
  INDEX idx_lyrics_spotify_track (spotify_track_id),
  INDEX idx_lyrics_lrclib_id (lrclib_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const CREATE_COLLECTIONS = `
CREATE TABLE IF NOT EXISTS collections (
  id                  INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name                VARCHAR(500)  NOT NULL,
  cover_image_url     TEXT          DEFAULT NULL,
  spotify_playlist_id VARCHAR(22)   NOT NULL,
  spotify_owner_id    VARCHAR(100)  DEFAULT NULL,
  created_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uk_collections_playlist (spotify_playlist_id),
  INDEX idx_collections_owner (spotify_owner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const CREATE_COLLECTION_ARTISTS = `
CREATE TABLE IF NOT EXISTS collection_artists (
  id                VARCHAR(22)   NOT NULL PRIMARY KEY,
  name              VARCHAR(500)  NOT NULL,
  spotify_uri       VARCHAR(100)  DEFAULT NULL,
  spotify_url       TEXT          DEFAULT NULL,
  popularity        SMALLINT      DEFAULT NULL,
  followers         INT           DEFAULT NULL,
  genres            JSON          DEFAULT NULL,
  created_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_ca_name (name(100))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const CREATE_COLLECTION_ARTIST_IMAGES = `
CREATE TABLE IF NOT EXISTS collection_artist_images (
  id          INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
  artist_id   VARCHAR(22)   NOT NULL,
  url         TEXT          NOT NULL,
  height      INT           DEFAULT NULL,
  width       INT           DEFAULT NULL,

  INDEX idx_cai_artist (artist_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const CREATE_COLLECTION_ITEMS = `
CREATE TABLE IF NOT EXISTS collection_items (
  id                  INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
  collection_id       INT           NOT NULL,
  track_name          VARCHAR(500)  NOT NULL,
  track_spotify_id    VARCHAR(22)   NOT NULL,
  album_name          VARCHAR(500)  DEFAULT NULL,
  album_cover_url     TEXT          DEFAULT NULL,
  album_spotify_id    VARCHAR(22)   DEFAULT NULL,
  album_release_year  VARCHAR(4)    DEFAULT NULL,
  album_label         VARCHAR(500)  DEFAULT NULL,
  lyrics              MEDIUMTEXT    DEFAULT NULL,
  position            SMALLINT      DEFAULT NULL,
  created_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uk_ci_collection_track (collection_id, track_spotify_id),
  INDEX idx_ci_track (track_spotify_id),
  INDEX idx_ci_album (album_spotify_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const CREATE_COLLECTION_ITEM_ARTISTS = `
CREATE TABLE IF NOT EXISTS collection_item_artists (
  item_id    INT          NOT NULL,
  artist_id  VARCHAR(22)  NOT NULL,
  position   SMALLINT     NOT NULL DEFAULT 0,

  PRIMARY KEY (item_id, artist_id),
  INDEX idx_cia_artist (artist_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const CREATE_USERS = `
CREATE TABLE IF NOT EXISTS users (
  spotify_id       VARCHAR(100)  NOT NULL PRIMARY KEY,
  display_name     VARCHAR(500)  DEFAULT NULL,
  email            VARCHAR(500)  DEFAULT NULL,
  avatar_url       TEXT          DEFAULT NULL,
  access_token     TEXT          DEFAULT NULL,
  refresh_token    TEXT          DEFAULT NULL,
  token_expires_at BIGINT        DEFAULT NULL,
  created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const CREATE_SESSIONS = `
CREATE TABLE IF NOT EXISTS sessions (
  id               VARCHAR(36)   NOT NULL PRIMARY KEY,
  user_spotify_id  VARCHAR(100)  NOT NULL,
  created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at       TIMESTAMP     NOT NULL,

  INDEX idx_sessions_user (user_spotify_id),
  INDEX idx_sessions_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const CREATE_USER_COLLECTIONS = `
CREATE TABLE IF NOT EXISTS user_collections (
  user_spotify_id  VARCHAR(100)  NOT NULL,
  collection_id    INT           NOT NULL,
  created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (user_spotify_id, collection_id),
  INDEX idx_uc_collection (collection_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const CREATE_RARITIES = `
CREATE TABLE IF NOT EXISTS rarities (
  id         INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100)  NOT NULL,
  color      VARCHAR(7)    NOT NULL DEFAULT '#6B7280',
  level      SMALLINT      NOT NULL DEFAULT 1,
  created_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uk_rarities_name (name),
  UNIQUE KEY uk_rarities_level (level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const CREATE_USER_COLLECTION_ITEMS = `
CREATE TABLE IF NOT EXISTS user_collection_items (
  id                 INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_spotify_id    VARCHAR(100)  NOT NULL,
  collection_item_id INT           NOT NULL,
  rarity_id          INT           NOT NULL DEFAULT 1,
  created_at         TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_uci_user_item (user_spotify_id, collection_item_id),
  INDEX idx_uci_item (collection_item_id),
  INDEX idx_uci_rarity (rarity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const CREATE_TRIVIA_TEMPLATES = `
CREATE TABLE IF NOT EXISTS trivia_templates (
  id          INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(500)  NOT NULL,
  description TEXT          DEFAULT NULL,
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const CREATE_TRIVIA_TEMPLATE_QUESTIONS = `
CREATE TABLE IF NOT EXISTS trivia_template_questions (
  id            INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
  template_id   INT           NOT NULL,
  question_type VARCHAR(50)   NOT NULL,
  config        JSON          NOT NULL,
  position      SMALLINT      NOT NULL DEFAULT 0,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_ttq_template (template_id),
  INDEX idx_ttq_type (question_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const TABLES = [
	CREATE_ARTISTS,
	CREATE_ALBUMS,
	CREATE_TRACKS,
	CREATE_TRACK_ARTISTS,
	CREATE_ALBUM_ARTISTS,
	CREATE_LYRICS,
	CREATE_USERS,
	CREATE_SESSIONS,
	CREATE_COLLECTIONS,
	CREATE_COLLECTION_ARTISTS,
	CREATE_COLLECTION_ARTIST_IMAGES,
	CREATE_COLLECTION_ITEMS,
	CREATE_COLLECTION_ITEM_ARTISTS,
	CREATE_USER_COLLECTIONS,
	CREATE_RARITIES,
	CREATE_USER_COLLECTION_ITEMS,
	CREATE_TRIVIA_TEMPLATES,
	CREATE_TRIVIA_TEMPLATE_QUESTIONS
];

interface ColumnRow extends RowDataPacket {
	COLUMN_NAME: string;
}

async function columnExists(table: string, column: string): Promise<boolean> {
	const [rows] = await query<ColumnRow[]>(
		'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
		[table, column]
	);
	return rows.length > 0;
}

const MIGRATIONS: Array<{ table: string; column: string; sql: string }> = [
	{
		table: 'artists',
		column: 'image_url',
		sql: 'ALTER TABLE artists ADD COLUMN image_url TEXT DEFAULT NULL AFTER followers'
	},
	{
		table: 'albums',
		column: 'image_url',
		sql: 'ALTER TABLE albums ADD COLUMN image_url TEXT DEFAULT NULL AFTER popularity'
	},
	{
		table: 'user_collections',
		column: 'unclaimed_rewards',
		sql: 'ALTER TABLE user_collections ADD COLUMN unclaimed_rewards INT NOT NULL DEFAULT 0'
	}
];

interface IndexRow extends RowDataPacket {
	INDEX_NAME: string;
}

async function indexExists(table: string, indexName: string): Promise<boolean> {
	const [rows] = await query<IndexRow[]>(
		'SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?',
		[table, indexName]
	);
	return rows.length > 0;
}

async function migrateCollectionCreators(): Promise<void> {
	// 1. Copy orphan spotify_owner_id values to users table as stub records
	if (await columnExists('collections', 'creator_name')) {
		await execute(
			`INSERT IGNORE INTO users (spotify_id, display_name)
			 SELECT DISTINCT c.spotify_owner_id, c.creator_name
			 FROM collections c
			 LEFT JOIN users u ON u.spotify_id = c.spotify_owner_id
			 WHERE c.spotify_owner_id IS NOT NULL AND u.spotify_id IS NULL`
		);

		// 2. Drop creator_name column
		await execute('ALTER TABLE collections DROP COLUMN creator_name');
	}

	// 3. Add index on spotify_owner_id if missing
	if (!(await indexExists('collections', 'idx_collections_owner'))) {
		await execute('ALTER TABLE collections ADD INDEX idx_collections_owner (spotify_owner_id)');
	}
}

async function dropOldCollectionsIfNeeded(): Promise<void> {
	// If the old collections table exists with the track_spotify_id column, drop it
	if (await columnExists('collections', 'track_spotify_id')) {
		await execute('DROP TABLE IF EXISTS collections');
	}
}

async function migrateRarities(): Promise<void> {
	// 1. Seed default rarities if table is empty
	const [existing] = await query<(RowDataPacket & { cnt: number })[]>(
		'SELECT COUNT(*) AS cnt FROM rarities'
	);
	if (existing[0].cnt === 0) {
		await execute(
			`INSERT INTO rarities (name, color, level) VALUES
				('Common',    '#6B7280', 1),
				('Uncommon',  '#22C55E', 2),
				('Rare',      '#3B82F6', 3),
				('Epic',      '#A855F7', 4),
				('Legendary', '#EF4444', 5)`
		);
	}

	// 2. Add rarity_id column to user_collection_items if missing
	if (!(await columnExists('user_collection_items', 'rarity_id'))) {
		const [lowest] = await query<(RowDataPacket & { id: number })[]>(
			'SELECT id FROM rarities ORDER BY level ASC LIMIT 1'
		);
		const lowestRarityId = lowest[0]?.id ?? 1;

		await execute(
			`ALTER TABLE user_collection_items ADD COLUMN rarity_id INT NOT NULL DEFAULT ${lowestRarityId} AFTER collection_item_id`
		);

		await execute('UPDATE user_collection_items SET rarity_id = ? WHERE rarity_id = 0', [
			lowestRarityId
		]);

		if (!(await indexExists('user_collection_items', 'idx_uci_rarity'))) {
			await execute(
				'ALTER TABLE user_collection_items ADD INDEX idx_uci_rarity (rarity_id)'
			);
		}
	}

	// 3. Migrate user_collection_items from composite PK to auto-increment id PK
	//    (allows multiple copies of the same item per user)
	if (!(await columnExists('user_collection_items', 'id'))) {
		await execute(
			`ALTER TABLE user_collection_items
			 DROP PRIMARY KEY,
			 ADD COLUMN id INT NOT NULL AUTO_INCREMENT PRIMARY KEY FIRST,
			 ADD INDEX idx_uci_user_item (user_spotify_id, collection_item_id)`
		);
	}
}

export async function initializeSchema(): Promise<void> {
	if (initialized) return;

	// Nuke old collections table (had per-track schema) before creating new per-playlist one
	await dropOldCollectionsIfNeeded();

	for (const sql of TABLES) {
		await execute(sql);
	}

	for (const migration of MIGRATIONS) {
		if (!(await columnExists(migration.table, migration.column))) {
			await execute(migration.sql);
		}
	}

	await migrateCollectionCreators();
	await migrateRarities();

	initialized = true;
}
