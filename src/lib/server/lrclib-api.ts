import type { LrcLibResponse, Lyrics, SyncedLyricLine } from '$types/lyrics.type';

const LRCLIB_API_BASE = 'https://lrclib.net/api';
const USER_AGENT = 'Spoticromos/1.0.0 (https://github.com/arktosmos)';

function parseSyncedLyrics(lrc: string): SyncedLyricLine[] {
	const lines: SyncedLyricLine[] = [];
	const regex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/g;
	let match;

	while ((match = regex.exec(lrc)) !== null) {
		const minutes = parseInt(match[1], 10);
		const seconds = parseInt(match[2], 10);
		const milliseconds = parseInt(match[3].padEnd(3, '0'), 10);
		const text = match[4].trim();

		const time = minutes * 60 + seconds + milliseconds / 1000;
		lines.push({ time, text });
	}

	lines.sort((a, b) => a.time - b.time);
	return lines;
}

export interface LrcLibResult {
	parsed: Lyrics | null;
	rawSyncedLrc: string | null;
}

export async function fetchLrcLibLyrics(
	trackName: string,
	artistName: string | null,
	albumName: string | null,
	durationSeconds: number | undefined
): Promise<LrcLibResult> {
	const params = new URLSearchParams();
	params.set('track_name', trackName);
	if (artistName) params.set('artist_name', artistName);
	if (albumName) params.set('album_name', albumName);
	if (durationSeconds && durationSeconds > 0) {
		params.set('duration', Math.round(durationSeconds).toString());
	}

	try {
		const response = await fetch(`${LRCLIB_API_BASE}/get?${params.toString()}`, {
			headers: { 'Lrclib-Client': USER_AGENT }
		});

		if (response.status === 404) {
			return { parsed: null, rawSyncedLrc: null };
		}

		if (!response.ok) {
			console.error(`LRCLIB API error: ${response.status}`);
			return { parsed: null, rawSyncedLrc: null };
		}

		const data: LrcLibResponse = await response.json();
		const rawSyncedLrc = data.syncedLyrics;

		const parsed: Lyrics = {
			id: data.id,
			trackName: data.trackName,
			artistName: data.artistName,
			albumName: data.albumName,
			duration: data.duration,
			instrumental: data.instrumental,
			plainLyrics: data.plainLyrics,
			syncedLyrics: data.syncedLyrics ? parseSyncedLyrics(data.syncedLyrics) : null
		};

		return { parsed, rawSyncedLrc };
	} catch (error) {
		console.error('LRCLIB fetch error:', error);
		return { parsed: null, rawSyncedLrc: null };
	}
}
