import { query } from '$lib/server/db';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

// ---------------------------------------------------------------------------
// Row types
// ---------------------------------------------------------------------------

export interface PairGameResultRow {
	id: number;
	user_spotify_id: string;
	collection_id: number;
	grid_size: number;
	moves: number;
	errors: number;
	won: boolean;
	created_at: string;
}

interface PairGameResultDbRow extends RowDataPacket, PairGameResultRow {}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function savePairGameResult(data: {
	userSpotifyId: string;
	collectionId: number;
	gridSize: number;
	moves: number;
	errors: number;
	won: boolean;
}): Promise<number> {
	const [result] = await query<ResultSetHeader>(
		`INSERT INTO pair_game_results (user_spotify_id, collection_id, grid_size, moves, errors, won)
		 VALUES (?, ?, ?, ?, ?, ?)`,
		[data.userSpotifyId, data.collectionId, data.gridSize, data.moves, data.errors, data.won]
	);
	return result.insertId;
}

export async function findHighestWinGridSize(
	userSpotifyId: string,
	collectionId: number
): Promise<number | null> {
	const [rows] = await query<(RowDataPacket & { max_grid: number | null })[]>(
		`SELECT MAX(grid_size) AS max_grid
		 FROM pair_game_results
		 WHERE user_spotify_id = ? AND collection_id = ? AND won = TRUE`,
		[userSpotifyId, collectionId]
	);
	return rows[0]?.max_grid ?? null;
}

export async function findPairGameHistory(
	userSpotifyId: string,
	collectionId: number
): Promise<PairGameResultRow[]> {
	const [rows] = await query<PairGameResultDbRow[]>(
		`SELECT * FROM pair_game_results
		 WHERE user_spotify_id = ? AND collection_id = ?
		 ORDER BY created_at DESC`,
		[userSpotifyId, collectionId]
	);
	return rows;
}
