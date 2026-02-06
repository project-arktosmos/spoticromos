import { query, execute } from '$lib/server/db';
import type { RowDataPacket } from 'mysql2/promise';
import type { RarityRow } from '$types/rarity.type';

// ---------------------------------------------------------------------------
// Row types
// ---------------------------------------------------------------------------

interface RarityDbRow extends RowDataPacket, RarityRow {}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function findAllRarities(): Promise<RarityRow[]> {
	const [rows] = await query<RarityDbRow[]>('SELECT * FROM rarities ORDER BY level ASC');
	return rows;
}

export async function findRarityById(id: number): Promise<RarityRow | null> {
	const [rows] = await query<RarityDbRow[]>('SELECT * FROM rarities WHERE id = ?', [id]);
	return rows.length ? rows[0] : null;
}

export async function findLowestRarity(): Promise<RarityRow | null> {
	const [rows] = await query<RarityDbRow[]>('SELECT * FROM rarities ORDER BY level ASC LIMIT 1');
	return rows.length ? rows[0] : null;
}

export async function createRarity(data: {
	name: string;
	color: string;
	level: number;
}): Promise<number> {
	const [result] = await execute('INSERT INTO rarities (name, color, level) VALUES (?, ?, ?)', [
		data.name,
		data.color,
		data.level
	]);
	return result.insertId;
}

export async function updateRarity(
	id: number,
	data: { name?: string; color?: string; level?: number }
): Promise<void> {
	const sets: string[] = [];
	const values: unknown[] = [];

	if (data.name !== undefined) {
		sets.push('name = ?');
		values.push(data.name);
	}
	if (data.color !== undefined) {
		sets.push('color = ?');
		values.push(data.color);
	}
	if (data.level !== undefined) {
		sets.push('level = ?');
		values.push(data.level);
	}

	if (sets.length === 0) return;
	values.push(id);
	await execute(`UPDATE rarities SET ${sets.join(', ')} WHERE id = ?`, values);
}

export async function deleteRarity(id: number): Promise<void> {
	// Check if any owned items reference this rarity
	const [refs] = await query<(RowDataPacket & { cnt: number })[]>(
		'SELECT COUNT(*) AS cnt FROM user_collection_items WHERE rarity_id = ?',
		[id]
	);
	if (refs[0].cnt > 0) {
		throw new Error('Cannot delete rarity that is in use by owned items');
	}

	await execute('DELETE FROM rarities WHERE id = ?', [id]);
}
