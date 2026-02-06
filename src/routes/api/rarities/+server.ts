import { json, error } from '@sveltejs/kit';
import { initializeSchema } from '$lib/server/schema';
import {
	findAllRarities,
	createRarity,
	findRarityById
} from '$lib/server/repositories/rarity.repository';
import type { RequestHandler } from './$types';
import type { CreateRarityPayload } from '$types/rarity.type';

export const GET: RequestHandler = async () => {
	try {
		await initializeSchema();
		const rarities = await findAllRarities();
		return json({ rarities });
	} catch (err) {
		console.error('Failed to fetch rarities:', err);
		const message = err instanceof Error ? err.message : 'Unknown error';
		return error(500, `Failed to fetch rarities: ${message}`);
	}
};

export const POST: RequestHandler = async ({ request }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return error(400, 'Invalid JSON body');
	}

	const { name, color, level } = body as Partial<CreateRarityPayload>;

	if (typeof name !== 'string' || !name.trim()) return error(400, 'Missing or invalid name');
	if (typeof color !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(color))
		return error(400, 'Invalid color (must be hex like #AABBCC)');
	if (typeof level !== 'number' || !Number.isFinite(level) || level < 1)
		return error(400, 'Invalid level');

	try {
		await initializeSchema();
		const id = await createRarity({ name: name.trim(), color, level });
		const rarity = await findRarityById(id);
		return json({ rarity });
	} catch (err) {
		console.error('Failed to create rarity:', err);
		const message = err instanceof Error ? err.message : 'Unknown error';
		return error(500, `Failed to create rarity: ${message}`);
	}
};
