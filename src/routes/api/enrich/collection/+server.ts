import { json, error } from '@sveltejs/kit';
import { getClientToken } from '$lib/server/spotify-token';
import { startJob, getJob } from '$lib/server/enrichment-jobs';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return error(400, 'Invalid JSON body');
	}

	const { collectionId, tracks } = body as {
		collectionId?: unknown;
		tracks?: unknown;
	};

	if (typeof collectionId !== 'number' || !Number.isFinite(collectionId)) {
		return error(400, 'Missing or invalid collectionId');
	}

	if (!Array.isArray(tracks) || tracks.length === 0) {
		return error(400, 'Missing or empty tracks array');
	}

	const userToken = request.headers.get('X-Spotify-Token');
	const token = userToken || (await getClientToken());

	const job = startJob(collectionId, tracks, token);

	return json({
		status: job.status,
		total: job.total,
		completed: job.completed,
		failed: job.failed
	});
};

export const GET: RequestHandler = async ({ url }) => {
	const collectionId = Number(url.searchParams.get('collectionId'));
	if (!Number.isFinite(collectionId) || collectionId <= 0) {
		return error(400, 'Invalid collectionId');
	}

	const job = getJob(collectionId);
	if (!job) {
		return json({ status: 'idle' });
	}

	return json({
		status: job.status,
		total: job.total,
		completed: job.completed,
		failed: job.failed,
		currentTrackName: job.currentTrackName,
		currentTrackId: job.currentTrackId,
		currentPosition: job.currentPosition,
		items: job.items
	});
};
