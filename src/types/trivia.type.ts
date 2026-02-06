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
	subject: 'song' | 'album';
}

export interface WhatYearReleasedConfig {
	subject: 'song' | 'album';
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WhatAlbumForSongConfig {}

export interface WhatArtistForTitleConfig {
	subject: 'song' | 'album';
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ArtistFirstAlbumConfig {}

export interface WhoSangLyricsConfig {
	fragmentLength: number;
}

export interface WhatLabelReleasedItConfig {
	subject: 'song' | 'album';
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface FinishTheLyricConfig {}

export interface WhatSongFromLyricsConfig {
	fragmentLength: number;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface NameTheAlbumFromCoverConfig {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface OddOneOutConfig {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WhatGenreForArtistConfig {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface MostFollowedArtistConfig {}

// ---------------------------------------------------------------------------
// Image display config (common to all question types)
// ---------------------------------------------------------------------------

export interface ImageDisplayConfig {
	/** Show an image for the question itself (album cover or artist photo) */
	showImage?: 'artist' | 'album';
	/** Show album/artist images on all answer options */
	showOptionImages?: 'artist' | 'album';
}

// ---------------------------------------------------------------------------
// Verification format config (common to all question types)
// ---------------------------------------------------------------------------

export interface VerificationConfig {
	/** Custom format string for the verification text shown after answering. Uses {placeholder} syntax. */
	verificationFormat?: string;
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
) & ImageDisplayConfig & VerificationConfig;

// ---------------------------------------------------------------------------
// Default configs per question type
// ---------------------------------------------------------------------------

export const DEFAULT_CONFIGS: Record<TriviaQuestionType, TriviaQuestionConfig> = {
	[TriviaQuestionType.WhichCameFirst]: { subject: 'song' },
	[TriviaQuestionType.WhatYearReleased]: { subject: 'song' },
	[TriviaQuestionType.WhatAlbumForSong]: {},
	[TriviaQuestionType.WhatArtistForTitle]: { subject: 'song' },
	[TriviaQuestionType.ArtistFirstAlbum]: {},
	[TriviaQuestionType.WhoSangLyrics]: { fragmentLength: 8 },
	[TriviaQuestionType.WhatLabelReleasedIt]: { subject: 'song' },
	[TriviaQuestionType.FinishTheLyric]: {},
	[TriviaQuestionType.WhatSongFromLyrics]: { fragmentLength: 8 },
	[TriviaQuestionType.NameTheAlbumFromCover]: {},
	[TriviaQuestionType.OddOneOut]: {},
	[TriviaQuestionType.WhatGenreForArtist]: {},
	[TriviaQuestionType.MostFollowedArtist]: {}
};

// ---------------------------------------------------------------------------
// Default verification formats and available placeholders per question type
// ---------------------------------------------------------------------------

export const DEFAULT_VERIFICATION_FORMATS: Record<TriviaQuestionType, string> = {
	[TriviaQuestionType.WhichCameFirst]: 'Released in {year}',
	[TriviaQuestionType.WhatYearReleased]: '"{track}" by {artist}',
	[TriviaQuestionType.WhatAlbumForSong]: '"{track}" is on "{album}" ({year})',
	[TriviaQuestionType.WhatArtistForTitle]: 'Performed "{track}"',
	[TriviaQuestionType.ArtistFirstAlbum]: 'Released in {year}',
	[TriviaQuestionType.WhoSangLyrics]: 'From "{track}"',
	[TriviaQuestionType.WhatLabelReleasedIt]: '"{track}" was released on {label}',
	[TriviaQuestionType.FinishTheLyric]: 'From "{track}" by {artist}',
	[TriviaQuestionType.WhatSongFromLyrics]: 'By {artist}',
	[TriviaQuestionType.NameTheAlbumFromCover]: 'By {artist}',
	[TriviaQuestionType.OddOneOut]: 'From "{oddAlbum}" (others from "{mainAlbum}")',
	[TriviaQuestionType.WhatGenreForArtist]: "{artist}'s genre",
	[TriviaQuestionType.MostFollowedArtist]: '{followers} followers'
};

export const VERIFICATION_PLACEHOLDERS: Record<TriviaQuestionType, string[]> = {
	[TriviaQuestionType.WhichCameFirst]: ['year'],
	[TriviaQuestionType.WhatYearReleased]: ['track', 'artist'],
	[TriviaQuestionType.WhatAlbumForSong]: ['track', 'album', 'year'],
	[TriviaQuestionType.WhatArtistForTitle]: ['track'],
	[TriviaQuestionType.ArtistFirstAlbum]: ['year'],
	[TriviaQuestionType.WhoSangLyrics]: ['track'],
	[TriviaQuestionType.WhatLabelReleasedIt]: ['track', 'label'],
	[TriviaQuestionType.FinishTheLyric]: ['track', 'artist'],
	[TriviaQuestionType.WhatSongFromLyrics]: ['artist'],
	[TriviaQuestionType.NameTheAlbumFromCover]: ['artist'],
	[TriviaQuestionType.OddOneOut]: ['oddAlbum', 'mainAlbum'],
	[TriviaQuestionType.WhatGenreForArtist]: ['artist'],
	[TriviaQuestionType.MostFollowedArtist]: ['followers']
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
