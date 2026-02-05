export interface SpotifyImage {
	url: string;
	height: number | null;
	width: number | null;
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

export interface SpotifyAlbum {
	id: string;
	name: string;
	uri: string;
	href: string;
	album_type: 'album' | 'single' | 'compilation';
	total_tracks: number;
	release_date: string;
	images: SpotifyImage[];
	artists: SpotifyArtist[];
	external_urls: {
		spotify: string;
	};
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
	preview_url: string | null;
	album: SpotifyAlbum;
	artists: SpotifyArtist[];
	external_urls: {
		spotify: string;
	};
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

export interface SpotifyPaginatedResponse<T> {
	items: T[];
	total: number;
	limit: number;
	offset: number;
	href: string;
	next: string | null;
	previous: string | null;
}
