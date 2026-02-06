import { browser } from '$app/environment';
import type { LrcLibResponse, Lyrics, SyncedLyricLine } from '$types/lyrics.type';

interface CacheEntry<T = unknown> {
	data: T;
	cachedAt: number;
}

const LRCLIB_API_BASE = 'https://lrclib.net/api';
const USER_AGENT = 'Spoticromos/1.0.0 (https://github.com/arktosmos)';

class LyricsService {
	private cacheTtlMs = 5 * 60 * 1000;
	private cachePrefix = 'lyrics-cache:';

	private getCacheKey(endpoint: string): string {
		return `${this.cachePrefix}${endpoint}`;
	}

	private getCache<T>(endpoint: string): T | null {
		if (!browser) return null;

		const raw = localStorage.getItem(this.getCacheKey(endpoint));
		if (!raw) return null;

		try {
			const entry: CacheEntry<T> = JSON.parse(raw);
			if (Date.now() - entry.cachedAt > this.cacheTtlMs) {
				localStorage.removeItem(this.getCacheKey(endpoint));
				return null;
			}
			return entry.data;
		} catch {
			localStorage.removeItem(this.getCacheKey(endpoint));
			return null;
		}
	}

	private setCache<T>(endpoint: string, data: T): void {
		if (!browser) return;

		const entry: CacheEntry<T> = { data, cachedAt: Date.now() };
		localStorage.setItem(this.getCacheKey(endpoint), JSON.stringify(entry));
	}

	clearCache(): void {
		if (!browser) return;

		const keys = Object.keys(localStorage);
		for (const key of keys) {
			if (key.startsWith(this.cachePrefix)) {
				localStorage.removeItem(key);
			}
		}
	}

	/**
	 * Fetch lyrics for a track from LRCLIB API
	 */
	async fetchLyrics(
		trackName: string,
		artistName: string | null,
		albumName?: string | null,
		durationSeconds?: number
	): Promise<Lyrics | null> {
		if (!browser) return null;

		const params = new URLSearchParams();
		params.set('track_name', trackName);
		if (artistName) params.set('artist_name', artistName);
		if (albumName) params.set('album_name', albumName);
		if (durationSeconds && durationSeconds > 0) {
			params.set('duration', Math.round(durationSeconds).toString());
		}

		const cacheKey = `get?${params.toString()}`;

		const cached = this.getCache<Lyrics>(cacheKey);
		if (cached) return cached;

		try {
			const response = await fetch(`${LRCLIB_API_BASE}/get?${params.toString()}`, {
				headers: {
					'Lrclib-Client': USER_AGENT
				}
			});

			if (response.status === 404) return null;

			if (!response.ok) {
				console.error(`LRCLIB API error: ${response.status}`);
				return null;
			}

			const data: LrcLibResponse = await response.json();
			const lyrics = this.parseResponse(data);

			this.setCache(cacheKey, lyrics);
			return lyrics;
		} catch (error) {
			console.error('Lyrics fetch error:', error);
			return null;
		}
	}

	private parseResponse(data: LrcLibResponse): Lyrics {
		return {
			id: data.id,
			trackName: data.trackName,
			artistName: data.artistName,
			albumName: data.albumName,
			duration: data.duration,
			instrumental: data.instrumental,
			plainLyrics: data.plainLyrics,
			syncedLyrics: data.syncedLyrics ? this.parseSyncedLyrics(data.syncedLyrics) : null
		};
	}

	/**
	 * Parse LRC format synced lyrics into structured array
	 * LRC format: [mm:ss.xx] Line text
	 */
	private parseSyncedLyrics(lrc: string): SyncedLyricLine[] {
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
}

export const lyricsService = new LyricsService();
