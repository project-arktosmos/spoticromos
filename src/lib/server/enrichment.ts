import type { SpotifyTrack, SpotifyAlbum, SpotifyFullArtist, EnrichTrackResult } from '$types/spotify.type';
import type { Lyrics } from '$types/lyrics.type';
import { fetchSpotifyTrack, fetchSpotifyAlbum, fetchSpotifyArtist } from '$lib/server/spotify-api';
import { fetchLrcLibLyrics } from '$lib/server/lrclib-api';
import * as trackRepo from '$lib/server/repositories/track.repository';
import * as albumRepo from '$lib/server/repositories/album.repository';
import * as artistRepo from '$lib/server/repositories/artist.repository';
import * as lyricsRepo from '$lib/server/repositories/lyrics.repository';
import {
	saveCollectionArtist,
	saveCollectionItem
} from '$lib/server/repositories/collection.repository';

async function resolveTrack(trackId: string, token: string): Promise<SpotifyTrack | null> {
	const cached = await trackRepo.findTrackById(trackId);
	if (cached) return cached;

	try {
		const track = await fetchSpotifyTrack(trackId, token);
		await trackRepo.saveTrack(track);
		return track;
	} catch (err) {
		console.error(`Failed to fetch track ${trackId}:`, err);
		return null;
	}
}

async function resolveAlbum(albumId: string, token: string): Promise<SpotifyAlbum | null> {
	const cached = await albumRepo.findAlbumById(albumId);
	if (cached) return cached;

	try {
		const album = await fetchSpotifyAlbum(albumId, token);
		await albumRepo.saveAlbum(album);
		return album;
	} catch (err) {
		console.error(`Failed to fetch album ${albumId}:`, err);
		return null;
	}
}

async function resolveArtist(artistId: string, token: string): Promise<SpotifyFullArtist | null> {
	const cached = await artistRepo.findArtistById(artistId);
	if (cached) return cached;

	try {
		const artist = await fetchSpotifyArtist(artistId, token);
		await artistRepo.saveArtist(artist);
		return artist;
	} catch (err) {
		console.error(`Failed to fetch artist ${artistId}:`, err);
		return null;
	}
}

async function resolveLyrics(basicTrack: SpotifyTrack): Promise<Lyrics | null> {
	// Check by Spotify track ID first
	const byTrackId = await lyricsRepo.findLyricsByTrackId(basicTrack.id);
	if (byTrackId) return byTrackId;

	// Check by lookup key (name + artist + duration)
	const artistName = basicTrack.artists[0]?.name || null;
	const durationSeconds = Math.round(basicTrack.duration_ms / 1000);
	const byKey = await lyricsRepo.findLyricsByKey(
		basicTrack.name,
		artistName ?? '',
		durationSeconds
	);
	if (byKey) return byKey;

	// Fetch from LRCLIB
	const { parsed, rawSyncedLrc } = await fetchLrcLibLyrics(
		basicTrack.name,
		artistName,
		basicTrack.album?.name || null,
		durationSeconds
	);

	if (parsed) {
		await lyricsRepo.saveLyrics(parsed, basicTrack.id, rawSyncedLrc);
	}

	return parsed;
}

export async function enrichTrack(
	basicTrack: SpotifyTrack,
	token: string,
	collectionId: number,
	position: number | null
): Promise<EnrichTrackResult> {
	// Fetch track, album, and all artists concurrently
	const [fullTrack, album, ...artists] = await Promise.all([
		resolveTrack(basicTrack.id, token),
		resolveAlbum(basicTrack.album.id, token),
		...basicTrack.artists.map((a) => resolveArtist(a.id, token))
	]);

	const filteredArtists = artists.filter((a): a is SpotifyFullArtist => a !== null);

	// Fetch lyrics sequentially (after we have track data)
	const lyrics = await resolveLyrics(basicTrack);

	const result: EnrichTrackResult = {
		full: fullTrack,
		album,
		artists: filteredArtists,
		lyrics
	};

	// Persist to collection tables
	try {
		// Upsert each artist + their images
		for (const artist of filteredArtists) {
			await saveCollectionArtist({
				id: artist.id,
				name: artist.name,
				spotifyUri: artist.uri ?? null,
				spotifyUrl: artist.external_urls?.spotify ?? null,
				popularity: artist.popularity ?? null,
				followers: artist.followers?.total ?? null,
				genres: artist.genres?.length ? artist.genres : null,
				images: (artist.images ?? []).map((img) => ({
					url: img.url,
					height: img.height,
					width: img.width
				}))
			});
		}

		// Upsert the collection item (track in this playlist)
		const artistIds = filteredArtists.length
			? filteredArtists.map((a) => a.id)
			: basicTrack.artists.map((a) => a.id);

		await saveCollectionItem({
			collectionId,
			trackName: fullTrack?.name ?? basicTrack.name,
			trackSpotifyId: basicTrack.id,
			albumName: album?.name ?? basicTrack.album?.name ?? null,
			albumCoverUrl: album?.images?.[0]?.url ?? null,
			albumSpotifyId: album?.id ?? basicTrack.album?.id ?? null,
			albumReleaseYear: album?.release_date?.split('-')[0] ?? null,
			albumLabel: album?.label ?? null,
			lyrics: lyrics?.instrumental ? null : lyrics?.plainLyrics ?? null,
			position,
			artistIds
		});
	} catch (err) {
		console.error('Failed to save to collection tables:', err);
	}

	return result;
}
