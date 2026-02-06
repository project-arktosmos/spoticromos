// ---------------------------------------------------------------------------
// Question type enum
// ---------------------------------------------------------------------------

export enum TriviaQuestionType {
	WhichCameFirst = 'which_came_first',
	WhatYearReleased = 'what_year_released',
	WhatAlbumForSong = 'what_album_for_song',
	WhatArtistForTitle = 'what_artist_for_title',
	ArtistFirstAlbum = 'artist_first_album',
	WhoSangLyrics = 'who_sang_lyrics',
	WhatLabelReleasedIt = 'what_label_released_it',
	FinishTheLyric = 'finish_the_lyric',
	WhatSongFromLyrics = 'what_song_from_lyrics',
	NameTheAlbumFromCover = 'name_the_album_from_cover',
	OddOneOut = 'odd_one_out',
	WhatGenreForArtist = 'what_genre_for_artist',
	MostFollowedArtist = 'most_followed_artist'
}

export const TRIVIA_QUESTION_TYPE_LABELS: Record<TriviaQuestionType, string> = {
	[TriviaQuestionType.WhichCameFirst]: 'Which came out first?',
	[TriviaQuestionType.WhatYearReleased]: 'What year was it released?',
	[TriviaQuestionType.WhatAlbumForSong]: 'What album was the song in?',
	[TriviaQuestionType.WhatArtistForTitle]: 'What artist released it?',
	[TriviaQuestionType.ArtistFirstAlbum]: "Which was the artist's first album?",
	[TriviaQuestionType.WhoSangLyrics]: 'Who sang these lyrics?',
	[TriviaQuestionType.WhatLabelReleasedIt]: 'What record label released it?',
	[TriviaQuestionType.FinishTheLyric]: 'Finish the lyric',
	[TriviaQuestionType.WhatSongFromLyrics]: 'Which song contains these lyrics?',
	[TriviaQuestionType.NameTheAlbumFromCover]: 'Name the album from its cover',
	[TriviaQuestionType.OddOneOut]: 'Which song is the odd one out?',
	[TriviaQuestionType.WhatGenreForArtist]: 'What genre is the artist?',
	[TriviaQuestionType.MostFollowedArtist]: 'Which artist has the most followers?'
};

/**
 * Returns the question template text for a given type + config.
 * Incorporates subject (song/album) into the text where applicable.
 */
export function getQuestionTemplateText(
	type: TriviaQuestionType,
	config: TriviaQuestionConfig
): string {
	const subject = (config as unknown as Record<string, unknown>).subject as string | undefined;

	switch (type) {
		case TriviaQuestionType.WhichCameFirst:
			return `Which ${subject ?? 'song'} came out first?`;
		case TriviaQuestionType.WhatYearReleased:
			return `What year was the ${subject ?? 'song'} released?`;
		case TriviaQuestionType.WhatAlbumForSong:
			return 'What album was the song on?';
		case TriviaQuestionType.WhatArtistForTitle:
			return `What artist released the ${subject ?? 'song'}?`;
		case TriviaQuestionType.ArtistFirstAlbum:
			return "Which was the artist's first album?";
		case TriviaQuestionType.WhoSangLyrics:
			return 'Who sang these lyrics?';
		case TriviaQuestionType.WhatLabelReleasedIt:
			return `What record label released the ${subject ?? 'song'}?`;
		case TriviaQuestionType.FinishTheLyric:
			return 'Finish the lyric';
		case TriviaQuestionType.WhatSongFromLyrics:
			return 'Which song contains these lyrics?';
		case TriviaQuestionType.NameTheAlbumFromCover:
			return 'Name the album from its cover';
		case TriviaQuestionType.OddOneOut:
			return 'Which song is the odd one out?';
		case TriviaQuestionType.WhatGenreForArtist:
			return 'What genre is the artist?';
		case TriviaQuestionType.MostFollowedArtist:
			return 'Which artist has the most followers?';
		default:
			return TRIVIA_QUESTION_TYPE_LABELS[type] ?? type;
	}
}

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

export interface WhatLabelReleasedItConfig {
	count: number;
	optionCount: number;
	subject: 'song' | 'album';
}

export interface FinishTheLyricConfig {
	count: number;
	optionCount: number;
}

export interface WhatSongFromLyricsConfig {
	count: number;
	optionCount: number;
	fragmentLength: number;
}

export interface NameTheAlbumFromCoverConfig {
	count: number;
	optionCount: number;
}

export interface OddOneOutConfig {
	count: number;
}

export interface WhatGenreForArtistConfig {
	count: number;
	optionCount: number;
}

export interface MostFollowedArtistConfig {
	count: number;
	optionCount: number;
}

// ---------------------------------------------------------------------------
// Image display config (common to all question types)
// ---------------------------------------------------------------------------

export interface ImageDisplayConfig {
	/** Show an image for the question itself (album cover or artist photo) */
	showImage?: 'artist' | 'album';
	/** Show album/artist images on all answer options */
	showOptionImages?: 'artist' | 'album';
}

export type TriviaQuestionConfig = (
	| WhichCameFirstConfig
	| WhatYearReleasedConfig
	| WhatAlbumForSongConfig
	| WhatArtistForTitleConfig
	| ArtistFirstAlbumConfig
	| WhoSangLyricsConfig
	| WhatLabelReleasedItConfig
	| FinishTheLyricConfig
	| WhatSongFromLyricsConfig
	| NameTheAlbumFromCoverConfig
	| OddOneOutConfig
	| WhatGenreForArtistConfig
	| MostFollowedArtistConfig
) & ImageDisplayConfig;

// ---------------------------------------------------------------------------
// Default configs per question type
// ---------------------------------------------------------------------------

export const DEFAULT_CONFIGS: Record<TriviaQuestionType, TriviaQuestionConfig> = {
	[TriviaQuestionType.WhichCameFirst]: { count: 1, optionCount: 4, subject: 'song' },
	[TriviaQuestionType.WhatYearReleased]: { count: 1, subject: 'song' },
	[TriviaQuestionType.WhatAlbumForSong]: { count: 1, optionCount: 4 },
	[TriviaQuestionType.WhatArtistForTitle]: { count: 1, subject: 'song', optionCount: 4 },
	[TriviaQuestionType.ArtistFirstAlbum]: { count: 1, optionCount: 4 },
	[TriviaQuestionType.WhoSangLyrics]: { count: 1, fragmentLength: 8, optionCount: 4 },
	[TriviaQuestionType.WhatLabelReleasedIt]: { count: 1, optionCount: 4, subject: 'song' },
	[TriviaQuestionType.FinishTheLyric]: { count: 1, optionCount: 4 },
	[TriviaQuestionType.WhatSongFromLyrics]: { count: 1, optionCount: 4, fragmentLength: 8 },
	[TriviaQuestionType.NameTheAlbumFromCover]: { count: 1, optionCount: 4 },
	[TriviaQuestionType.OddOneOut]: { count: 1 },
	[TriviaQuestionType.WhatGenreForArtist]: { count: 1, optionCount: 4 },
	[TriviaQuestionType.MostFollowedArtist]: { count: 1, optionCount: 4 }
};

// ---------------------------------------------------------------------------
// DB row type
// ---------------------------------------------------------------------------

export interface TriviaQuestionRow {
	id: number;
	question_type: TriviaQuestionType;
	config: TriviaQuestionConfig;
	position: number;
	created_at: string;
	updated_at: string;
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

export interface CreateTriviaQuestionPayload {
	question_type: TriviaQuestionType;
	config: TriviaQuestionConfig;
}

export interface UpdateTriviaQuestionPayload {
	question_type?: TriviaQuestionType;
	config?: TriviaQuestionConfig;
	position?: number;
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
	questionId: number;
	questionType: TriviaQuestionType;
	questionText: string;
	options: TriviaOption[];
	correctIndex: number;
	imageUrl: string | null;
}

export interface GeneratedTriviaSet {
	collectionId: number;
	collectionName: string;
	questions: GeneratedTriviaQuestion[];
	skippedCount: number;
	generatedAt: string;
}

// ---------------------------------------------------------------------------
// Client-safe types (no answer data sent to browser)
// ---------------------------------------------------------------------------

export interface ClientTriviaOption {
	label: string;
	imageUrl?: string | null;
}

export interface ClientTriviaQuestion {
	questionId: number;
	questionType: TriviaQuestionType;
	questionText: string;
	options: ClientTriviaOption[];
	imageUrl: string | null;
	/** Position in the server session's question list */
	sessionIndex: number;
}
