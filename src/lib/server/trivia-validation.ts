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
		default:
			return false;
	}
}

export function validateQuestions(questions: unknown[]): string | null {
	for (let i = 0; i < questions.length; i++) {
		const q = questions[i] as Record<string, unknown>;
		if (!q || typeof q !== 'object') {
			return `Question ${i + 1}: invalid object`;
		}
		if (!validateQuestionType(q.question_type)) {
			return `Question ${i + 1}: invalid question_type "${q.question_type}"`;
		}
		if (!validateConfig(q.question_type, q.config)) {
			return `Question ${i + 1}: invalid config for type "${q.question_type}"`;
		}
	}
	return null;
}
