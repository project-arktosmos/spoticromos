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

	if (typeof c.count !== 'number' || c.count < 1) return false;

	switch (type) {
		case TriviaQuestionType.WhichCameFirst:
			return (
				typeof c.optionCount === 'number' &&
				c.optionCount >= 2 &&
				(c.subject === 'song' || c.subject === 'album')
			);
		case TriviaQuestionType.WhatYearReleased:
			return c.subject === 'song' || c.subject === 'album';
		case TriviaQuestionType.WhatAlbumForSong:
			return typeof c.optionCount === 'number' && c.optionCount >= 2;
		case TriviaQuestionType.WhatArtistForTitle:
			return (
				typeof c.optionCount === 'number' &&
				c.optionCount >= 2 &&
				(c.subject === 'song' || c.subject === 'album')
			);
		case TriviaQuestionType.ArtistFirstAlbum:
			return typeof c.optionCount === 'number' && c.optionCount >= 2;
		case TriviaQuestionType.WhoSangLyrics:
			return (
				typeof c.optionCount === 'number' &&
				c.optionCount >= 2 &&
				typeof c.fragmentLength === 'number' &&
				c.fragmentLength >= 3
			);
		case TriviaQuestionType.WhatLabelReleasedIt:
			return (
				typeof c.optionCount === 'number' &&
				c.optionCount >= 2 &&
				(c.subject === 'song' || c.subject === 'album')
			);
		case TriviaQuestionType.FinishTheLyric:
			return typeof c.optionCount === 'number' && c.optionCount >= 2;
		case TriviaQuestionType.WhatSongFromLyrics:
			return (
				typeof c.optionCount === 'number' &&
				c.optionCount >= 2 &&
				typeof c.fragmentLength === 'number' &&
				c.fragmentLength >= 3
			);
		case TriviaQuestionType.NameTheAlbumFromCover:
			return typeof c.optionCount === 'number' && c.optionCount >= 2;
		case TriviaQuestionType.OddOneOut:
			return true;
		case TriviaQuestionType.WhatGenreForArtist:
			return typeof c.optionCount === 'number' && c.optionCount >= 2;
		case TriviaQuestionType.MostFollowedArtist:
			return typeof c.optionCount === 'number' && c.optionCount >= 2;
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
