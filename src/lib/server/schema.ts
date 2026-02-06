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
  creator_name        VARCHAR(500)  DEFAULT NULL,
  spotify_playlist_id VARCHAR(22)   NOT NULL,
  spotify_owner_id    VARCHAR(100)  DEFAULT NULL,
  created_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uk_collections_playlist (spotify_playlist_id)
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
	CREATE_COLLECTIONS,
	CREATE_COLLECTION_ARTISTS,
	CREATE_COLLECTION_ARTIST_IMAGES,
	CREATE_COLLECTION_ITEMS,
	CREATE_COLLECTION_ITEM_ARTISTS,
	CREATE_USERS,
	CREATE_SESSIONS,
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
	}
];

async function dropOldCollectionsIfNeeded(): Promise<void> {
	// If the old collections table exists with the track_spotify_id column, drop it
	if (await columnExists('collections', 'track_spotify_id')) {
		await execute('DROP TABLE IF EXISTS collections');
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

	initialized = true;
}
