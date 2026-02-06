/**
 * Fallback scraper for Spotify editorial playlists that return 404 via the
 * Web API.  The embed page at open.spotify.com/embed/playlist/{id} renders
 * up to 100 tracks server-side inside __NEXT_DATA__ JSON **and** exposes an
 * anonymous access token we can use with Spotify's internal spclient API to
 * fetch the complete track list (no 100-track cap).
 */

const EMBED_UA =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)';

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
	/** Anonymous token from the embed page — can call spclient & /v1/tracks. */
	anonymousToken: string | null;
}

/**
 * Scrape the embed page for playlist metadata, up to 100 tracks, and the
 * anonymous access token.
 */
export async function fetchPlaylistFromEmbed(playlistId: string): Promise<EmbedPlaylist | null> {
	const url = `https://open.spotify.com/embed/playlist/${playlistId}`;

	const res = await fetch(url, { headers: { 'User-Agent': EMBED_UA } });
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
	const anonymousToken: string | null =
		data?.props?.pageProps?.state?.settings?.session?.accessToken ?? null;

	return {
		id: entity.id ?? playlistId,
		name: entity.name ?? entity.title ?? 'Unknown Playlist',
		coverImageUrl,
		ownerName: entity.subtitle || null, // "Spotify" for editorial
		trackList,
		anonymousToken
	};
}

/**
 * Fetch the **complete** list of track URIs for a playlist via Spotify's
 * internal spclient API.  Returns an array of track IDs (not full URIs).
 *
 * The spclient endpoint returns protobuf, but track URIs appear as plain
 * ASCII strings (`spotify:track:{id}`) that we can extract via regex.
 */
export async function fetchAllTrackIdsFromSpclient(
	playlistId: string,
	anonymousToken: string
): Promise<string[]> {
	const url = `https://spclient.wg.spotify.com/playlist/v2/playlist/${playlistId}`;

	const res = await fetch(url, {
		headers: {
			Authorization: `Bearer ${anonymousToken}`,
			'User-Agent': EMBED_UA
		}
	});

	if (!res.ok) return [];

	const buf = Buffer.from(await res.arrayBuffer());
	const text = buf.toString('binary');

	// Track URIs appear as plain ASCII inside the protobuf payload.
	const uriPattern = /spotify:track:([A-Za-z0-9]{22})/g;
	const ids = new Set<string>();
	let m: RegExpExecArray | null;
	while ((m = uriPattern.exec(text)) !== null) {
		ids.add(m[1]);
	}

	return [...ids];
}
