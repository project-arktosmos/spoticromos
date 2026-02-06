// ---------------------------------------------------------------------------
// DB row types
// ---------------------------------------------------------------------------

export interface RarityRow {
	id: number;
	name: string;
	color: string;
	level: number;
	created_at: string;
}

// ---------------------------------------------------------------------------
// API payload types
// ---------------------------------------------------------------------------

export interface CreateRarityPayload {
	name: string;
	color: string;
	level: number;
}

export interface UpdateRarityPayload {
	name?: string;
	color?: string;
	level?: number;
}
