import { query } from '$lib/server/db';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

// ---------------------------------------------------------------------------
// Row types
// ---------------------------------------------------------------------------

export interface TriviaGameResultRow {
	id: number;
	user_spotify_id: string;
	collection_id: number;
	score: number;
	total_questions: number;
	created_at: string;
}

interface TriviaGameResultDbRow extends RowDataPacket, TriviaGameResultRow {}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function saveTriviaGameResult(data: {
	userSpotifyId: string;
	collectionId: number;
	score: number;
	totalQuestions: number;
}): Promise<number> {
	const [result] = await query<ResultSetHeader>(
		`INSERT INTO trivia_game_results (user_spotify_id, collection_id, score, total_questions)
		 VALUES (?, ?, ?, ?)`,
		[data.userSpotifyId, data.collectionId, data.score, data.totalQuestions]
	);
	return result.insertId;
}

export async function findBestTriviaScore(
	userSpotifyId: string,
	collectionId: number
): Promise<number | null> {
	const [rows] = await query<(RowDataPacket & { best_score: number | null })[]>(
		`SELECT MAX(score) AS best_score
		 FROM trivia_game_results
		 WHERE user_spotify_id = ? AND collection_id = ?`,
		[userSpotifyId, collectionId]
	);
	return rows[0]?.best_score ?? null;
}

export async function findTriviaGameHistory(
	userSpotifyId: string,
	collectionId: number
): Promise<TriviaGameResultRow[]> {
	const [rows] = await query<TriviaGameResultDbRow[]>(
		`SELECT * FROM trivia_game_results
		 WHERE user_spotify_id = ? AND collection_id = ?
		 ORDER BY created_at DESC`,
		[userSpotifyId, collectionId]
	);
	return rows;
}
