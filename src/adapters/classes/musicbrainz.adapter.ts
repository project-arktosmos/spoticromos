import { AdapterClass } from '$adapters/classes/adapter.class';
import type {
	MusicBrainzArtistCredit,
	MusicBrainzArtist,
	MusicBrainzRecording,
	MusicBrainzRelease,
	MusicBrainzReleaseGroup
} from '$types/musicbrainz.type';

export class MusicBrainzAdapter extends AdapterClass {
	constructor() {
		super('musicbrainz');
	}

	formatArtistCredits(credits: MusicBrainzArtistCredit[] | undefined): string {
		if (!credits || credits.length === 0) return 'Unknown Artist';
		return credits.map((c) => c.name || c.artist.name).join(', ');
	}

	getFirstArtistId(credits: MusicBrainzArtistCredit[] | undefined): string {
		if (!credits || credits.length === 0) return '';
		return credits[0].artist.id;
	}

	getCoverArtUrl(releaseId: string, size: 'small' | 'large' = 'small'): string {
		const sizeParam = size === 'small' ? '250' : '500';
		return `https://coverartarchive.org/release/${releaseId}/front-${sizeParam}`;
	}

	getReleaseGroupCoverArtUrl(releaseGroupId: string, size: 'small' | 'large' = 'small'): string {
		const sizeParam = size === 'small' ? '250' : '500';
		return `https://coverartarchive.org/release-group/${releaseGroupId}/front-${sizeParam}`;
	}

	formatRecordingDisplay(recording: MusicBrainzRecording): {
		title: string;
		artist: string;
		mbid: string;
		firstReleaseDate: string;
		releaseCount: number;
	} {
		return {
			title: recording.title,
			artist: this.formatArtistCredits(recording['artist-credit']),
			mbid: recording.id,
			firstReleaseDate: recording['first-release-date'] || '',
			releaseCount: recording.releases?.length || 0
		};
	}

	formatReleaseDisplay(release: MusicBrainzRelease): {
		title: string;
		artist: string;
		mbid: string;
		date: string;
		country: string;
		status: string;
		barcode: string;
		label: string;
		releaseGroupId: string;
		releaseGroupTitle: string;
		coverArtUrl: string;
		coverArtFallbackUrl: string;
	} {
		const label = release['label-info']?.[0]?.label?.name || '';
		return {
			title: release.title,
			artist: this.formatArtistCredits(release['artist-credit']),
			mbid: release.id,
			date: release.date || '',
			country: release.country || '',
			status: release.status || '',
			barcode: release.barcode || '',
			label,
			releaseGroupId: release['release-group']?.id || '',
			releaseGroupTitle: release['release-group']?.title || '',
			coverArtUrl: this.getCoverArtUrl(release.id),
			coverArtFallbackUrl: release['release-group']
				? this.getReleaseGroupCoverArtUrl(release['release-group'].id)
				: ''
		};
	}

	formatReleaseGroupDisplay(releaseGroup: MusicBrainzReleaseGroup): {
		title: string;
		artist: string;
		mbid: string;
		type: string;
		releaseYear: string;
		coverArtUrl: string;
	} {
		const releaseDate = releaseGroup['first-release-date'] || '';
		return {
			title: releaseGroup.title,
			artist: this.formatArtistCredits(releaseGroup['artist-credit']),
			mbid: releaseGroup.id,
			type: releaseGroup['primary-type'] || '',
			releaseYear: releaseDate ? releaseDate.split('-')[0] : '',
			coverArtUrl: this.getReleaseGroupCoverArtUrl(releaseGroup.id)
		};
	}

	formatArtistDisplay(artist: MusicBrainzArtist, imageUrl?: string | null): {
		name: string;
		mbid: string;
		type: string;
		country: string;
		disambiguation: string;
		beginYear: string;
		endYear: string;
		isActive: boolean;
		tags: string[];
		imageUrl: string | null;
	} {
		const lifeSpan = artist['life-span'];
		const beginYear = lifeSpan?.begin ? lifeSpan.begin.split('-')[0] : '';
		const endYear = lifeSpan?.end ? lifeSpan.end.split('-')[0] : '';
		const isActive = lifeSpan?.ended === false || (!lifeSpan?.ended && !lifeSpan?.end);

		const tags = [...(artist.tags || [])]
			.sort((a, b) => b.count - a.count)
			.slice(0, 5)
			.map((t) => t.name);

		return {
			name: artist.name,
			mbid: artist.id,
			type: artist.type || '',
			country: artist.country || '',
			disambiguation: artist.disambiguation || '',
			beginYear,
			endYear,
			isActive,
			tags,
			imageUrl: imageUrl || null
		};
	}
}

export const musicBrainzAdapter = new MusicBrainzAdapter();
