import { json, error } from '@sveltejs/kit';
import { initializeSchema } from '$lib/server/schema';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		await initializeSchema();
		return json({
			status: 'ok',
			tables: [
				'artists',
				'albums',
				'tracks',
				'track_artists',
				'album_artists',
				'lyrics',
				'collections',
				'collection_artists',
				'collection_artist_images',
				'collection_items',
				'collection_item_artists',
				'trivia_templates',
				'trivia_template_questions'
			]
		});
	} catch (err) {
		console.error('Schema init error:', err);
		const message = err instanceof Error ? err.message : 'Unknown error';
		return error(500, `Schema initialization failed: ${message}`);
	}
};
