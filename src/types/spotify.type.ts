export interface SpotifyImage {
	url: string;
	height: number | null;
	width: number | null;
}

export interface SpotifyExternalIds {
	isrc?: string;
	ean?: string;
	upc?: string;
}

export interface SpotifyCopyright {
	text: string;
	type: 'C' | 'P';
}

export interface SpotifyArtist {
	id: string;
	name: string;
	uri: string;
	href: string;
	external_urls: {
		spotify: string;
	};
}

export interface SpotifyFullArtist extends SpotifyArtist {
	images: SpotifyImage[];
	genres: string[];
	popularity: number;
	followers: {
		total: number;
	};
}

export interface SpotifyAlbum {
	id: string;
	name: string;
	uri: string;
	href: string;
	album_type: 'album' | 'single' | 'compilation';
	total_tracks: number;
	release_date: string;
	release_date_precision: 'year' | 'month' | 'day';
	images: SpotifyImage[];
	artists: SpotifyArtist[];
	external_urls: {
		spotify: string;
	};
	external_ids?: SpotifyExternalIds;
	genres: string[];
	label?: string;
	popularity?: number;
	copyrights?: SpotifyCopyright[];
	tracks?: {
		items: SpotifyTrack[];
		total: number;
	};
	available_markets?: string[];
}

export interface SpotifyTrack {
	id: string;
	name: string;
	uri: string;
	href: string;
	duration_ms: number;
	track_number: number;
	disc_number: number;
	explicit: boolean;
	is_local: boolean;
	popularity?: number;
	preview_url: string | null;
	album: SpotifyAlbum;
	artists: SpotifyArtist[];
	external_urls: {
		spotify: string;
	};
	external_ids?: SpotifyExternalIds;
	available_markets?: string[];
}

export interface SpotifyPlaylist {
	id: string;
	name: string;
	uri: string;
	href: string;
	description: string | null;
	public: boolean;
	collaborative: boolean;
	images: SpotifyImage[];
	owner: {
		id: string;
		display_name: string;
		uri: string;
	};
	tracks: {
		total: number;
		href: string;
		items?: Array<{
			added_at: string;
			track: SpotifyTrack;
		}>;
	};
	external_urls: {
		spotify: string;
	};
}

export interface EnrichedTrack {
	addedAt: string;
	basic: SpotifyTrack;
	full: SpotifyTrack | null;
	album: SpotifyAlbum | null;
	artists: SpotifyFullArtist[];
	lyrics: import('$types/lyrics.type').Lyrics | null;
	status: 'pending' | 'fetching' | 'done' | 'error';
}

export interface SpotifyPaginatedResponse<T> {
	items: T[];
	total: number;
	limit: number;
	offset: number;
	href: string;
	next: string | null;
	previous: string | null;
}

export interface EnrichTrackResult {
	full: SpotifyTrack | null;
	album: SpotifyAlbum | null;
	artists: SpotifyFullArtist[];
	lyrics: import('$types/lyrics.type').Lyrics | null;
}
