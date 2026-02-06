/**
 * Fallback scraper for Spotify editorial playlists that return 404 via the
 * Web API.  The embed page at open.spotify.com/embed/playlist/{id} always
 * renders the full track list server-side inside __NEXT_DATA__ JSON.
 */

export interface EmbedTrack {
	uri: string;
	id: string;
	title: string;
	subtitle: string; // artist name(s), comma-separated
	duration: number; // ms
	isExplicit: boolean;
}

export interface EmbedPlaylist {
	id: string;
	name: string;
	coverImageUrl: string | null;
	ownerName: string | null;
	trackList: EmbedTrack[];
}

export async function fetchPlaylistFromEmbed(playlistId: string): Promise<EmbedPlaylist | null> {
	const url = `https://open.spotify.com/embed/playlist/${playlistId}`;

	const res = await fetch(url, {
		headers: {
			'User-Agent':
				'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)'
		}
	});

	if (!res.ok) return null;

	const html = await res.text();
	const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
	if (!match) return null;

	const data = JSON.parse(match[1]);
	const entity = data?.props?.pageProps?.state?.data?.entity;
	if (!entity || entity.type !== 'playlist') return null;

	const trackList: EmbedTrack[] = (entity.trackList ?? []).map(
		(t: { uri: string; title: string; subtitle: string; duration: number; isExplicit: boolean }) => {
			const id = t.uri.replace('spotify:track:', '');
			return {
				uri: t.uri,
				id,
				title: t.title,
				subtitle: t.subtitle,
				duration: t.duration,
				isExplicit: t.isExplicit ?? false
			};
		}
	);

	const coverImageUrl = entity.coverArt?.sources?.[0]?.url ?? null;

	return {
		id: entity.id ?? playlistId,
		name: entity.name ?? entity.title ?? 'Unknown Playlist',
		coverImageUrl,
		ownerName: entity.subtitle || null, // "Spotify" for editorial
		trackList
	};
}
