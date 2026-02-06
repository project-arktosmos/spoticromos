import { browser } from '$app/environment';
import type {
	MusicBrainzRecording,
	MusicBrainzArtist,
	MusicBrainzRelease,
	MusicBrainzReleaseGroup,
	MusicBrainzISRCResponse,
	MusicBrainzSearchResponse
} from '$types/musicbrainz.type';

interface CacheEntry<T = unknown> {
	data: T;
	cachedAt: number;
}

class MusicBrainzService {
	private baseUrl = 'https://musicbrainz.org/ws/2';
	private userAgent = 'Spoticromos/1.0.0';
	private cacheTtlMs = 5 * 60 * 1000;
	private cachePrefix = 'musicbrainz-cache:';
	private lastRequestAt = 0;
	private minRequestInterval = 1100;

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

	private async rateLimit(): Promise<void> {
		const now = Date.now();
		const elapsed = now - this.lastRequestAt;
		if (elapsed < this.minRequestInterval) {
			await new Promise((resolve) => setTimeout(resolve, this.minRequestInterval - elapsed));
		}
		this.lastRequestAt = Date.now();
	}

	private async fetchApi<T>(
		endpoint: string,
		params: Record<string, string> = {}
	): Promise<T | null> {
		if (!browser) return null;

		const searchParams = new URLSearchParams({ ...params, fmt: 'json' });
		const cacheKey = `${endpoint}?${searchParams.toString()}`;

		const cached = this.getCache<T>(cacheKey);
		if (cached) return cached;

		await this.rateLimit();

		try {
			const url = `${this.baseUrl}${endpoint}?${searchParams.toString()}`;
			const response = await fetch(url, {
				headers: {
					'User-Agent': this.userAgent,
					Accept: 'application/json'
				}
			});

			if (response.status === 404) return null;

			if (response.status === 503) {
				console.warn('MusicBrainz rate limited (503), skipping');
				return null;
			}

			if (!response.ok) {
				console.error(`MusicBrainz API error: ${response.status} ${response.statusText}`);
				return null;
			}

			const data: T = await response.json();
			this.setCache(cacheKey, data);
			return data;
		} catch (error) {
			console.error('MusicBrainz fetch error:', error);
			return null;
		}
	}

	/**
	 * Lookup recording by ISRC (from Spotify track's external_ids.isrc)
	 */
	async lookupByISRC(isrc: string): Promise<MusicBrainzRecording | null> {
		const response = await this.fetchApi<MusicBrainzISRCResponse>(`/isrc/${isrc}`, {
			inc: 'artist-credits+releases'
		});

		if (response?.recordings?.length) {
			return response.recordings[0];
		}

		return null;
	}

	/**
	 * Lookup release by barcode (UPC/EAN from Spotify album's external_ids)
	 */
	async lookupByBarcode(barcode: string): Promise<MusicBrainzRelease | null> {
		const response = await this.fetchApi<MusicBrainzSearchResponse<MusicBrainzRelease>>(
			'/release',
			{
				query: `barcode:${barcode}`,
				limit: '1'
			}
		);

		if (response?.releases?.length) {
			return response.releases[0];
		}

		return null;
	}

	/**
	 * Search for a release group (album) by name and artist
	 * Fallback when barcode lookup fails
	 */
	async searchReleaseGroup(
		albumName: string,
		artistName: string
	): Promise<MusicBrainzReleaseGroup | null> {
		const escapedAlbum = this.escapeQuery(albumName);
		const escapedArtist = this.escapeQuery(artistName);

		const response = await this.fetchApi<MusicBrainzSearchResponse<MusicBrainzReleaseGroup>>(
			'/release-group',
			{
				query: `releasegroup:"${escapedAlbum}" AND artist:"${escapedArtist}"`,
				limit: '1'
			}
		);

		const groups = response?.['release-groups'];
		if (groups?.length) {
			return groups[0];
		}

		return null;
	}

	/**
	 * Search for a recording by track name and artist
	 * Fallback when ISRC lookup fails
	 */
	async searchRecording(
		trackName: string,
		artistName: string
	): Promise<MusicBrainzRecording | null> {
		const escapedTrack = this.escapeQuery(trackName);
		const escapedArtist = this.escapeQuery(artistName);

		const response = await this.fetchApi<MusicBrainzSearchResponse<MusicBrainzRecording>>(
			'/recording',
			{
				query: `recording:"${escapedTrack}" AND artist:"${escapedArtist}"`,
				limit: '1'
			}
		);

		if (response?.recordings?.length) {
			return response.recordings[0];
		}

		return null;
	}

	/**
	 * Search for an artist by name
	 */
	async searchArtist(artistName: string): Promise<MusicBrainzArtist | null> {
		const escaped = this.escapeQuery(artistName);

		const response = await this.fetchApi<MusicBrainzSearchResponse<MusicBrainzArtist>>(
			'/artist',
			{
				query: `artist:"${escaped}"`,
				limit: '1'
			}
		);

		if (response?.artists?.length) {
			return response.artists[0];
		}

		return null;
	}

	/**
	 * Fetch full artist details by MusicBrainz ID
	 */
	async getArtist(id: string): Promise<MusicBrainzArtist | null> {
		return this.fetchApi<MusicBrainzArtist>(`/artist/${id}`, {
			inc: 'tags+url-rels'
		});
	}

	/**
	 * Fetch artist image from TheAudioDB using MusicBrainz ID
	 */
	async getArtistImage(musicBrainzId: string): Promise<string | null> {
		if (!browser) return null;

		const cacheKey = `theaudiodb:artist-image:${musicBrainzId}`;
		const cached = this.getCache<string>(cacheKey);
		if (cached) return cached;

		try {
			const response = await fetch(
				`https://www.theaudiodb.com/api/v1/json/2/artist-mb.php?i=${musicBrainzId}`
			);

			if (!response.ok) return null;

			const data = await response.json();

			if (data.artists?.length) {
				const artist = data.artists[0];
				const imageUrl = artist.strArtistThumb || artist.strArtistFanart || null;
				if (imageUrl) {
					this.setCache(cacheKey, imageUrl);
				}
				return imageUrl;
			}

			return null;
		} catch {
			return null;
		}
	}

	private escapeQuery(query: string): string {
		return query.replace(/([+\-&|!(){}[\]^"~*?:\\/])/g, '\\$1');
	}
}

export const musicBrainzService = new MusicBrainzService();
