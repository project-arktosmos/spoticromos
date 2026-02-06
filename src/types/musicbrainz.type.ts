export interface MusicBrainzArtistCredit {
	name: string;
	artist: {
		id: string;
		name: string;
		'sort-name': string;
		disambiguation?: string;
	};
	joinphrase?: string;
}

export interface MusicBrainzUrlRelation {
	type: string;
	'type-id': string;
	url: {
		id: string;
		resource: string;
	};
}

export interface MusicBrainzReleaseGroup {
	id: string;
	title: string;
	'primary-type'?: string;
	'secondary-types'?: string[];
	'first-release-date'?: string;
	'artist-credit'?: MusicBrainzArtistCredit[];
}

export interface MusicBrainzRelease {
	id: string;
	title: string;
	status?: string;
	date?: string;
	country?: string;
	barcode?: string;
	'release-group'?: MusicBrainzReleaseGroup;
	'artist-credit'?: MusicBrainzArtistCredit[];
	'track-count'?: number;
	'label-info'?: Array<{
		'catalog-number'?: string;
		label?: {
			id: string;
			name: string;
		};
	}>;
}

export interface MusicBrainzRecording {
	id: string;
	title: string;
	length?: number;
	disambiguation?: string;
	'artist-credit'?: MusicBrainzArtistCredit[];
	'first-release-date'?: string;
	isrcs?: string[];
	releases?: MusicBrainzRelease[];
}

export interface MusicBrainzArtist {
	id: string;
	name: string;
	'sort-name': string;
	type?: string;
	country?: string;
	disambiguation?: string;
	'life-span'?: {
		begin?: string;
		end?: string;
		ended?: boolean;
	};
	tags?: Array<{
		count: number;
		name: string;
	}>;
	'release-groups'?: MusicBrainzReleaseGroup[];
	relations?: MusicBrainzUrlRelation[];
}

export interface MusicBrainzISRCResponse {
	isrc: string;
	recordings: MusicBrainzRecording[];
}

export interface MusicBrainzSearchResponse<T> {
	created: string;
	count: number;
	offset: number;
	releases?: T[];
	'release-groups'?: T[];
	artists?: T[];
	recordings?: T[];
}
