// ---------------------------------------------------------------------------
// Question type enum
// ---------------------------------------------------------------------------

export enum TriviaQuestionType {
	WhichCameFirst = 'which_came_first',
	WhatYearReleased = 'what_year_released',
	WhatAlbumForSong = 'what_album_for_song',
	WhatArtistForTitle = 'what_artist_for_title',
	ArtistFirstAlbum = 'artist_first_album',
	WhoSangLyrics = 'who_sang_lyrics'
}

export const TRIVIA_QUESTION_TYPE_LABELS: Record<TriviaQuestionType, string> = {
	[TriviaQuestionType.WhichCameFirst]: 'Which came out first?',
	[TriviaQuestionType.WhatYearReleased]: 'What year was it released?',
	[TriviaQuestionType.WhatAlbumForSong]: 'What album was the song in?',
	[TriviaQuestionType.WhatArtistForTitle]: 'What artist released it?',
	[TriviaQuestionType.ArtistFirstAlbum]: "Which was the artist's first album?",
	[TriviaQuestionType.WhoSangLyrics]: 'Who sang these lyrics?'
};

// ---------------------------------------------------------------------------
// Per-question-type config shapes
// ---------------------------------------------------------------------------

export interface WhichCameFirstConfig {
	count: number;
	optionCount: number;
	subject: 'song' | 'album';
}

export interface WhatYearReleasedConfig {
	count: number;
	subject: 'song' | 'album';
}

export interface WhatAlbumForSongConfig {
	count: number;
	optionCount: number;
}

export interface WhatArtistForTitleConfig {
	count: number;
	subject: 'song' | 'album';
	optionCount: number;
}

export interface ArtistFirstAlbumConfig {
	count: number;
	optionCount: number;
}

export interface WhoSangLyricsConfig {
	count: number;
	fragmentLength: number;
	optionCount: number;
}

export type TriviaQuestionConfig =
	| WhichCameFirstConfig
	| WhatYearReleasedConfig
	| WhatAlbumForSongConfig
	| WhatArtistForTitleConfig
	| ArtistFirstAlbumConfig
	| WhoSangLyricsConfig;

// ---------------------------------------------------------------------------
// Default configs per question type
// ---------------------------------------------------------------------------

export const DEFAULT_CONFIGS: Record<TriviaQuestionType, TriviaQuestionConfig> = {
	[TriviaQuestionType.WhichCameFirst]: { count: 1, optionCount: 4, subject: 'song' },
	[TriviaQuestionType.WhatYearReleased]: { count: 1, subject: 'song' },
	[TriviaQuestionType.WhatAlbumForSong]: { count: 1, optionCount: 4 },
	[TriviaQuestionType.WhatArtistForTitle]: { count: 1, subject: 'song', optionCount: 4 },
	[TriviaQuestionType.ArtistFirstAlbum]: { count: 1, optionCount: 4 },
	[TriviaQuestionType.WhoSangLyrics]: { count: 1, fragmentLength: 8, optionCount: 4 }
};

// ---------------------------------------------------------------------------
// DB row types
// ---------------------------------------------------------------------------

export interface TriviaTemplateRow {
	id: number;
	name: string;
	description: string | null;
	created_at: string;
	updated_at: string;
}

export interface TriviaTemplateQuestionRow {
	id: number;
	template_id: number;
	question_type: TriviaQuestionType;
	config: TriviaQuestionConfig;
	position: number;
	created_at: string;
}

// ---------------------------------------------------------------------------
// Expanded template (with full questions)
// ---------------------------------------------------------------------------

export interface TriviaTemplateWithQuestions extends TriviaTemplateRow {
	questions: TriviaTemplateQuestionRow[];
}

// ---------------------------------------------------------------------------
// Collection summary (for selectors)
// ---------------------------------------------------------------------------

export interface CollectionSummary {
	id: number;
	name: string;
	cover_image_url: string | null;
	track_count: number;
}

// ---------------------------------------------------------------------------
// API payload types
// ---------------------------------------------------------------------------

export interface CreateTriviaTemplatePayload {
	name: string;
	description?: string;
	questions: Array<{
		question_type: TriviaQuestionType;
		config: TriviaQuestionConfig;
		position: number;
	}>;
}

export interface UpdateTriviaTemplatePayload {
	name?: string;
	description?: string;
	questions?: Array<{
		question_type: TriviaQuestionType;
		config: TriviaQuestionConfig;
		position: number;
	}>;
}

// ---------------------------------------------------------------------------
// Generated trivia (runtime only, not persisted)
// ---------------------------------------------------------------------------

export interface TriviaOption {
	label: string;
	meta?: string;
	imageUrl?: string | null;
	verification?: string;
}

export interface GeneratedTriviaQuestion {
	templateQuestionId: number;
	questionType: TriviaQuestionType;
	questionText: string;
	options: TriviaOption[];
	correctIndex: number;
	imageUrl: string | null;
}

export interface GeneratedTriviaSet {
	templateId: number;
	templateName: string;
	collectionId: number;
	collectionName: string;
	questions: GeneratedTriviaQuestion[];
	skippedCount: number;
	generatedAt: string;
}
