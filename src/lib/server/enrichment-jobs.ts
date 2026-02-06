import type { SpotifyTrack } from '$types/spotify.type';
import type { CollectionItemWithArtists } from '$lib/server/repositories/collection.repository';
import { enrichTrack } from '$lib/server/enrichment';
import { getClientToken } from '$lib/server/spotify-token';
import { initializeSchema } from '$lib/server/schema';
import { addUserCollection } from '$lib/server/repositories/ownership.repository';
import { addRewards } from '$lib/server/repositories/rewards.repository';

export interface EnrichmentJob {
	collectionId: number;
	total: number;
	completed: number;
	failed: number;
	currentTrackName: string | null;
	currentTrackId: string | null;
	currentPosition: number;
	status: 'running' | 'done';
	items: CollectionItemWithArtists[];
}

interface TrackEntry {
	basic: SpotifyTrack;
	position: number;
}

const jobs = new Map<number, EnrichmentJob>();

export function getJob(collectionId: number): EnrichmentJob | null {
	return jobs.get(collectionId) ?? null;
}

export function startJob(
	collectionId: number,
	tracks: TrackEntry[],
	token: string,
	userSpotifyId?: string
): EnrichmentJob {
	const existing = jobs.get(collectionId);
	if (existing && existing.status === 'running') return existing;

	const job: EnrichmentJob = {
		collectionId,
		total: tracks.length,
		completed: 0,
		failed: 0,
		currentTrackName: null,
		currentTrackId: null,
		currentPosition: -1,
		status: 'running',
		items: []
	};

	jobs.set(collectionId, job);

	// Fire-and-forget — runs independently of the HTTP request
	processJob(job, tracks, token, userSpotifyId).catch((err) => {
		console.error(`Enrichment job for collection ${collectionId} crashed:`, err);
		job.status = 'done';
	});

	return job;
}

async function processJob(
	job: EnrichmentJob,
	tracks: TrackEntry[],
	initialToken: string,
	userSpotifyId?: string
) {
	await initializeSchema();

	for (let i = 0; i < tracks.length; i++) {
		const { basic, position } = tracks[i];
		job.currentTrackName = basic.name;
		job.currentTrackId = basic.id;
		job.currentPosition = position;

		try {
			// Refresh token if needed (client credentials rotate automatically)
			let token: string;
			try {
				token = await getClientToken();
			} catch {
				token = initialToken;
			}

			const result = await enrichTrack(basic, token, job.collectionId, position);

			job.items.push({
				id: 0,
				collection_id: job.collectionId,
				track_name: result.full?.name ?? basic.name,
				track_spotify_id: basic.id,
				album_name: result.album?.name ?? basic.album?.name ?? null,
				album_cover_url: result.album?.images?.[0]?.url ?? null,
				album_spotify_id: result.album?.id ?? basic.album?.id ?? null,
				album_release_year: result.album?.release_date?.split('-')[0] ?? null,
				album_label: result.album?.label ?? null,
				lyrics: result.lyrics?.plainLyrics ?? null,
				position,
				created_at: '',
				artists: result.artists?.length
					? result.artists.map((a) => a.name).join(', ')
					: basic.artists.map((a) => a.name).join(', '),
				artist_image_url: result.artists?.[0]?.images?.[0]?.url ?? null
			});

			job.completed++;
		} catch (err) {
			console.error(`Failed to enrich track ${basic.id} (${basic.name}):`, err);
			job.failed++;
		}
	}

	job.currentTrackName = null;
	job.currentTrackId = null;
	job.currentPosition = -1;
	job.status = 'done';

	// Grant +10 claimable rewards for completing the import
	if (userSpotifyId && job.completed > 0) {
		try {
			await addUserCollection(userSpotifyId, job.collectionId);
			await addRewards(userSpotifyId, job.collectionId, 10);
		} catch (err) {
			console.error(`Failed to grant rewards for collection ${job.collectionId}:`, err);
		}
	}
}
