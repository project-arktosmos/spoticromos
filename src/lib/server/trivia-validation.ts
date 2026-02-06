import { TriviaQuestionType } from '$types/trivia.type';
import type { TriviaQuestionConfig } from '$types/trivia.type';

const VALID_QUESTION_TYPES = new Set(Object.values(TriviaQuestionType));

export function validateQuestionType(type: unknown): type is TriviaQuestionType {
	return typeof type === 'string' && VALID_QUESTION_TYPES.has(type as TriviaQuestionType);
}

export function validateConfig(
	type: TriviaQuestionType,
	config: unknown
): config is TriviaQuestionConfig {
	if (!config || typeof config !== 'object') return false;
	const c = config as Record<string, unknown>;

	if (c.verificationFormat !== undefined && typeof c.verificationFormat !== 'string') return false;

	switch (type) {
		case TriviaQuestionType.WhichCameFirst:
		case TriviaQuestionType.WhatYearReleased:
			return c.subject === 'song' || c.subject === 'album';
		case TriviaQuestionType.WhatArtistForTitle:
		case TriviaQuestionType.WhatLabelReleasedIt:
			return c.subject === 'song' || c.subject === 'album';
		case TriviaQuestionType.WhoSangLyrics:
		case TriviaQuestionType.WhatSongFromLyrics:
			return typeof c.fragmentLength === 'number' && c.fragmentLength >= 3;
		case TriviaQuestionType.WhatAlbumForSong:
		case TriviaQuestionType.ArtistFirstAlbum:
		case TriviaQuestionType.FinishTheLyric:
		case TriviaQuestionType.NameTheAlbumFromCover:
		case TriviaQuestionType.OddOneOut:
		case TriviaQuestionType.WhatGenreForArtist:
		case TriviaQuestionType.MostFollowedArtist:
			return true;
		default:
			return false;
	}
}

export function validateQuestion(q: unknown): string | null {
	if (!q || typeof q !== 'object') return 'Invalid question object';
	const obj = q as Record<string, unknown>;
	if (!validateQuestionType(obj.question_type)) {
		return `Invalid question_type "${obj.question_type}"`;
	}
	if (!validateConfig(obj.question_type, obj.config)) {
		return `Invalid config for type "${obj.question_type}"`;
	}
	return null;
}
