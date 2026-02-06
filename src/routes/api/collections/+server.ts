import { json, error } from '@sveltejs/kit';
import { initializeSchema } from '$lib/server/schema';
import { findAllCollections } from '$lib/server/repositories/collection.repository';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		await initializeSchema();
		const collections = await findAllCollections();
		return json({ collections });
	} catch (err) {
		console.error('Failed to fetch collections:', err);
		const message = err instanceof Error ? err.message : 'Unknown error';
		return error(500, `Failed to fetch collections: ${message}`);
	}
};
