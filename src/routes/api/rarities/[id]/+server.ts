import { json, error } from '@sveltejs/kit';
import { initializeSchema } from '$lib/server/schema';
import { findRarityById, updateRarity, deleteRarity } from '$lib/server/repositories/rarity.repository';
import type { RequestHandler } from './$types';
import type { UpdateRarityPayload } from '$types/rarity.type';

export const GET: RequestHandler = async ({ params }) => {
	const id = Number(params.id);
	if (!Number.isFinite(id) || id <= 0) return error(400, 'Invalid rarity ID');

	try {
		await initializeSchema();
		const rarity = await findRarityById(id);
		if (!rarity) return error(404, 'Rarity not found');
		return json({ rarity });
	} catch (err) {
		console.error('Failed to fetch rarity:', err);
		const message = err instanceof Error ? err.message : 'Unknown error';
		return error(500, `Failed to fetch rarity: ${message}`);
	}
};

export const PUT: RequestHandler = async ({ params, request }) => {
	const id = Number(params.id);
	if (!Number.isFinite(id) || id <= 0) return error(400, 'Invalid rarity ID');

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return error(400, 'Invalid JSON body');
	}

	const { name, color, level } = body as Partial<UpdateRarityPayload>;

	if (color !== undefined && !/^#[0-9A-Fa-f]{6}$/.test(color))
		return error(400, 'Invalid color');
	if (level !== undefined && (typeof level !== 'number' || level < 1))
		return error(400, 'Invalid level');

	try {
		await initializeSchema();
		const existing = await findRarityById(id);
		if (!existing) return error(404, 'Rarity not found');

		await updateRarity(id, {
			name: typeof name === 'string' ? name.trim() : undefined,
			color,
			level
		});

		const rarity = await findRarityById(id);
		return json({ rarity });
	} catch (err) {
		console.error('Failed to update rarity:', err);
		const message = err instanceof Error ? err.message : 'Unknown error';
		return error(500, `Failed to update rarity: ${message}`);
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	const id = Number(params.id);
	if (!Number.isFinite(id) || id <= 0) return error(400, 'Invalid rarity ID');

	try {
		await initializeSchema();
		const existing = await findRarityById(id);
		if (!existing) return error(404, 'Rarity not found');
		await deleteRarity(id);
		return json({ success: true });
	} catch (err) {
		console.error('Failed to delete rarity:', err);
		const message = err instanceof Error ? err.message : 'Unknown error';
		return error(500, `Failed to delete rarity: ${message}`);
	}
};
