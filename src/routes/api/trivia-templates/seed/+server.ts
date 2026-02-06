import { json, error } from '@sveltejs/kit';
import { initializeSchema } from '$lib/server/schema';
import {
	createTemplate,
	findTemplateById,
	findTemplateQuestions,
	replaceTemplateQuestions
} from '$lib/server/repositories/trivia.repository';
import { TriviaQuestionType, DEFAULT_CONFIGS } from '$types/trivia.type';
import type { RequestHandler } from './$types';

/**
 * POST /api/trivia-templates/seed
 *
 * Creates a default "All Question Types" template containing one question
 * definition for each of the 6 supported types. Useful for bootstrapping
 * and verifying the system works end-to-end.
 */
export const POST: RequestHandler = async () => {
	try {
		await initializeSchema();

		const templateId = await createTemplate({
			name: 'Complete Music Trivia',
			description:
				'Default template covering all 13 question types: chronology, release years, albums, artists, discography, lyrics, labels, covers, genres, and more.'
		});

		const questionDefs = [
			{
				question_type: TriviaQuestionType.WhichCameFirst,
				config: { ...DEFAULT_CONFIGS[TriviaQuestionType.WhichCameFirst], count: 2 },
				position: 0
			},
			{
				question_type: TriviaQuestionType.WhatYearReleased,
				config: { ...DEFAULT_CONFIGS[TriviaQuestionType.WhatYearReleased], count: 2 },
				position: 1
			},
			{
				question_type: TriviaQuestionType.WhatAlbumForSong,
				config: { ...DEFAULT_CONFIGS[TriviaQuestionType.WhatAlbumForSong], count: 2 },
				position: 2
			},
			{
				question_type: TriviaQuestionType.WhatArtistForTitle,
				config: { ...DEFAULT_CONFIGS[TriviaQuestionType.WhatArtistForTitle], count: 2 },
				position: 3
			},
			{
				question_type: TriviaQuestionType.ArtistFirstAlbum,
				config: { ...DEFAULT_CONFIGS[TriviaQuestionType.ArtistFirstAlbum], count: 1 },
				position: 4
			},
			{
				question_type: TriviaQuestionType.WhoSangLyrics,
				config: { ...DEFAULT_CONFIGS[TriviaQuestionType.WhoSangLyrics], count: 2 },
				position: 5
			},
			{
				question_type: TriviaQuestionType.WhatLabelReleasedIt,
				config: { ...DEFAULT_CONFIGS[TriviaQuestionType.WhatLabelReleasedIt], count: 1 },
				position: 6
			},
			{
				question_type: TriviaQuestionType.FinishTheLyric,
				config: { ...DEFAULT_CONFIGS[TriviaQuestionType.FinishTheLyric], count: 2 },
				position: 7
			},
			{
				question_type: TriviaQuestionType.WhatSongFromLyrics,
				config: { ...DEFAULT_CONFIGS[TriviaQuestionType.WhatSongFromLyrics], count: 1 },
				position: 8
			},
			{
				question_type: TriviaQuestionType.NameTheAlbumFromCover,
				config: { ...DEFAULT_CONFIGS[TriviaQuestionType.NameTheAlbumFromCover], count: 2 },
				position: 9
			},
			{
				question_type: TriviaQuestionType.OddOneOut,
				config: { ...DEFAULT_CONFIGS[TriviaQuestionType.OddOneOut], count: 1 },
				position: 10
			},
			{
				question_type: TriviaQuestionType.WhatGenreForArtist,
				config: { ...DEFAULT_CONFIGS[TriviaQuestionType.WhatGenreForArtist], count: 1 },
				position: 11
			},
			{
				question_type: TriviaQuestionType.MostFollowedArtist,
				config: { ...DEFAULT_CONFIGS[TriviaQuestionType.MostFollowedArtist], count: 1 },
				position: 12
			}
		];

		await replaceTemplateQuestions(templateId, questionDefs);

		const template = await findTemplateById(templateId);
		const questions = await findTemplateQuestions(templateId);

		return json({ template, questions });
	} catch (err) {
		console.error('Failed to seed trivia template:', err);
		const message = err instanceof Error ? err.message : 'Unknown error';
		return error(500, `Failed to seed trivia template: ${message}`);
	}
};
