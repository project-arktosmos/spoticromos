import { json, error } from '@sveltejs/kit';
import { initializeSchema } from '$lib/server/schema';
import { bulkCreateQuestions, findAllQuestions } from '$lib/server/repositories/trivia.repository';
import { TriviaQuestionType, DEFAULT_CONFIGS } from '$types/trivia.type';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async () => {
	try {
		await initializeSchema();

		const questionDefs = [
			// Subject-based types get separate song + album entries
			{
				question_type: TriviaQuestionType.WhichCameFirst,
				config: { ...DEFAULT_CONFIGS[TriviaQuestionType.WhichCameFirst], count: 1, subject: 'song' },
				position: 0
			},
			{
				question_type: TriviaQuestionType.WhichCameFirst,
				config: { ...DEFAULT_CONFIGS[TriviaQuestionType.WhichCameFirst], count: 1, subject: 'album' },
				position: 1
			},
			{
				question_type: TriviaQuestionType.WhatYearReleased,
				config: { ...DEFAULT_CONFIGS[TriviaQuestionType.WhatYearReleased], count: 1, subject: 'song' },
				position: 2
			},
			{
				question_type: TriviaQuestionType.WhatYearReleased,
				config: { ...DEFAULT_CONFIGS[TriviaQuestionType.WhatYearReleased], count: 1, subject: 'album' },
				position: 3
			},
			{
				question_type: TriviaQuestionType.WhatAlbumForSong,
				config: { ...DEFAULT_CONFIGS[TriviaQuestionType.WhatAlbumForSong], count: 1 },
				position: 4
			},
			{
				question_type: TriviaQuestionType.WhatArtistForTitle,
				config: { ...DEFAULT_CONFIGS[TriviaQuestionType.WhatArtistForTitle], count: 1, subject: 'song' },
				position: 5
			},
			{
				question_type: TriviaQuestionType.WhatArtistForTitle,
				config: { ...DEFAULT_CONFIGS[TriviaQuestionType.WhatArtistForTitle], count: 1, subject: 'album' },
				position: 6
			},
			{
				question_type: TriviaQuestionType.ArtistFirstAlbum,
				config: { ...DEFAULT_CONFIGS[TriviaQuestionType.ArtistFirstAlbum], count: 1 },
				position: 7
			},
			{
				question_type: TriviaQuestionType.WhoSangLyrics,
				config: { ...DEFAULT_CONFIGS[TriviaQuestionType.WhoSangLyrics], count: 1 },
				position: 8
			},
			{
				question_type: TriviaQuestionType.WhatLabelReleasedIt,
				config: { ...DEFAULT_CONFIGS[TriviaQuestionType.WhatLabelReleasedIt], count: 1, subject: 'song' },
				position: 9
			},
			{
				question_type: TriviaQuestionType.WhatLabelReleasedIt,
				config: { ...DEFAULT_CONFIGS[TriviaQuestionType.WhatLabelReleasedIt], count: 1, subject: 'album' },
				position: 10
			},
			{
				question_type: TriviaQuestionType.FinishTheLyric,
				config: { ...DEFAULT_CONFIGS[TriviaQuestionType.FinishTheLyric], count: 1 },
				position: 11
			},
			{
				question_type: TriviaQuestionType.WhatSongFromLyrics,
				config: { ...DEFAULT_CONFIGS[TriviaQuestionType.WhatSongFromLyrics], count: 1 },
				position: 12
			},
			{
				question_type: TriviaQuestionType.NameTheAlbumFromCover,
				config: { ...DEFAULT_CONFIGS[TriviaQuestionType.NameTheAlbumFromCover], count: 1 },
				position: 13
			},
			{
				question_type: TriviaQuestionType.OddOneOut,
				config: { ...DEFAULT_CONFIGS[TriviaQuestionType.OddOneOut], count: 1 },
				position: 14
			},
			{
				question_type: TriviaQuestionType.WhatGenreForArtist,
				config: { ...DEFAULT_CONFIGS[TriviaQuestionType.WhatGenreForArtist], count: 1 },
				position: 15
			},
			{
				question_type: TriviaQuestionType.MostFollowedArtist,
				config: { ...DEFAULT_CONFIGS[TriviaQuestionType.MostFollowedArtist], count: 1 },
				position: 16
			}
		];

		await bulkCreateQuestions(questionDefs);

		const questions = await findAllQuestions();
		return json({ questions });
	} catch (err) {
		console.error('Failed to seed trivia questions:', err);
		const message = err instanceof Error ? err.message : 'Unknown error';
		return error(500, `Failed to seed trivia questions: ${message}`);
	}
};
