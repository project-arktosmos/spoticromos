/**
 * Response from LRCLIB API /get endpoint
 */
export interface LrcLibResponse {
	id: number;
	trackName: string;
	artistName: string;
	albumName: string;
	duration: number;
	instrumental: boolean;
	plainLyrics: string | null;
	syncedLyrics: string | null;
}

/**
 * A single line of synced lyrics with timestamp
 */
export interface SyncedLyricLine {
	time: number;
	text: string;
}

/**
 * Parsed lyrics with both plain and synced versions
 */
export interface Lyrics {
	id: number;
	trackName: string;
	artistName: string;
	albumName: string;
	duration: number;
	instrumental: boolean;
	plainLyrics: string | null;
	syncedLyrics: SyncedLyricLine[] | null;
}
