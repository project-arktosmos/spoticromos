import { json, error } from '@sveltejs/kit';
import { initializeSchema } from '$lib/server/schema';
import { findTemplateById, findTemplateQuestions } from '$lib/server/repositories/trivia.repository';
import {
	findCollectionById,
	findCollectionItemsWithArtists
} from '$lib/server/repositories/collection.repository';
import type { CollectionItemWithArtists } from '$lib/server/repositories/collection.repository';
import { TriviaQuestionType } from '$types/trivia.type';
import type {
	TriviaTemplateQuestionRow,
	GeneratedTriviaQuestion,
	GeneratedTriviaSet,
	TriviaOption,
	WhichCameFirstConfig,
	WhatYearReleasedConfig,
	WhatAlbumForSongConfig,
	WhatArtistForTitleConfig,
	ArtistFirstAlbumConfig,
	WhoSangLyricsConfig
} from '$types/trivia.type';
import type { RequestHandler } from './$types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function shuffleArray<T>(arr: T[]): T[] {
	const a = [...arr];
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

function pickRandom<T>(arr: T[], count: number): T[] {
	return shuffleArray(arr).slice(0, count);
}

function primaryArtist(item: CollectionItemWithArtists): string {
	return (item.artists ?? '').split(',')[0].trim();
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

function generateWhichCameFirst(
	config: WhichCameFirstConfig,
	items: CollectionItemWithArtists[],
	questionId: number
): GeneratedTriviaQuestion[] {
	const withYear = items.filter((i) => i.album_release_year);
	if (withYear.length < config.optionCount) return [];

	const results: GeneratedTriviaQuestion[] = [];
	const usedSets = new Set<string>();

	for (let attempt = 0; attempt < config.count * 3 && results.length < config.count; attempt++) {
		const picked = pickRandom(withYear, config.optionCount);
		const key = picked
			.map((p) => p.id)
			.sort()
			.join(',');
		if (usedSets.has(key)) continue;
		usedSets.add(key);

		const sorted = [...picked].sort(
			(a, b) => Number(a.album_release_year) - Number(b.album_release_year)
		);
		const correct = sorted[0];

		const subject = config.subject === 'album' ? 'album' : 'song';
		const options: TriviaOption[] = picked.map((item) => ({
			label: subject === 'album' ? (item.album_name ?? item.track_name) : item.track_name,
			meta: item.album_release_year ?? undefined,
			imageUrl: item.album_cover_url
		}));

		const shuffled = shuffleArray(options);
		const correctLabel =
			subject === 'album' ? (correct.album_name ?? correct.track_name) : correct.track_name;
		const correctIndex = shuffled.findIndex((o) => o.label === correctLabel);

		results.push({
			templateQuestionId: questionId,
			questionType: TriviaQuestionType.WhichCameFirst,
			questionText: `Which ${subject} came out first?`,
			options: shuffled,
			correctIndex,
			imageUrl: null
		});
	}

	return results;
}

function generateWhatYearReleased(
	config: WhatYearReleasedConfig,
	items: CollectionItemWithArtists[],
	questionId: number
): GeneratedTriviaQuestion[] {
	const withYear = items.filter((i) => i.album_release_year);
	if (withYear.length === 0) return [];

	const results: GeneratedTriviaQuestion[] = [];
	const usedIds = new Set<number>();

	for (let attempt = 0; attempt < config.count * 3 && results.length < config.count; attempt++) {
		const item = pickRandom(withYear, 1)[0];
		if (usedIds.has(item.id)) continue;
		usedIds.add(item.id);

		const correctYear = Number(item.album_release_year);
		const offsets = [-3, -1, 1, 2, 3, -2, 4, -4];
		const yearOptions = new Set<number>([correctYear]);
		for (const offset of shuffleArray(offsets)) {
			if (yearOptions.size >= 4) break;
			const y = correctYear + offset;
			if (y >= 1900) yearOptions.add(y);
		}

		const options: TriviaOption[] = shuffleArray([...yearOptions]).map((y) => ({
			label: String(y)
		}));
		const correctIndex = options.findIndex((o) => o.label === String(correctYear));

		const subject = config.subject === 'album' ? 'album' : 'song';
		const name = subject === 'album' ? (item.album_name ?? item.track_name) : item.track_name;

		results.push({
			templateQuestionId: questionId,
			questionType: TriviaQuestionType.WhatYearReleased,
			questionText: `What year was "${name}" released?`,
			options,
			correctIndex,
			imageUrl: item.album_cover_url
		});
	}

	return results;
}

function generateWhatAlbumForSong(
	config: WhatAlbumForSongConfig,
	items: CollectionItemWithArtists[],
	questionId: number
): GeneratedTriviaQuestion[] {
	const withAlbum = items.filter((i) => i.album_name);
	if (withAlbum.length < 2) return [];

	const allAlbums = [...new Set(withAlbum.map((i) => i.album_name!))];
	if (allAlbums.length < config.optionCount) return [];

	const results: GeneratedTriviaQuestion[] = [];
	const usedIds = new Set<number>();

	for (let attempt = 0; attempt < config.count * 3 && results.length < config.count; attempt++) {
		const item = pickRandom(withAlbum, 1)[0];
		if (usedIds.has(item.id)) continue;
		usedIds.add(item.id);

		const correctAlbum = item.album_name!;
		const distractors = pickRandom(
			allAlbums.filter((a) => a !== correctAlbum),
			config.optionCount - 1
		);

		const options: TriviaOption[] = shuffleArray(
			[correctAlbum, ...distractors].map((a) => ({ label: a }))
		);
		const correctIndex = options.findIndex((o) => o.label === correctAlbum);

		results.push({
			templateQuestionId: questionId,
			questionType: TriviaQuestionType.WhatAlbumForSong,
			questionText: `What album was "${item.track_name}" on?`,
			options,
			correctIndex,
			imageUrl: item.album_cover_url
		});
	}

	return results;
}

function generateWhatArtistForTitle(
	config: WhatArtistForTitleConfig,
	items: CollectionItemWithArtists[],
	questionId: number
): GeneratedTriviaQuestion[] {
	const withArtist = items.filter((i) => i.artists);
	if (withArtist.length < 2) return [];

	const allArtists = [...new Set(withArtist.map((i) => primaryArtist(i)))];
	if (allArtists.length < config.optionCount) return [];

	const results: GeneratedTriviaQuestion[] = [];
	const usedIds = new Set<number>();

	for (let attempt = 0; attempt < config.count * 3 && results.length < config.count; attempt++) {
		const item = pickRandom(withArtist, 1)[0];
		if (usedIds.has(item.id)) continue;
		usedIds.add(item.id);

		const correctArtist = primaryArtist(item);
		const distractors = pickRandom(
			allArtists.filter((a) => a !== correctArtist),
			config.optionCount - 1
		);

		const options: TriviaOption[] = shuffleArray(
			[correctArtist, ...distractors].map((a) => ({ label: a }))
		);
		const correctIndex = options.findIndex((o) => o.label === correctArtist);

		const subject = config.subject === 'album' ? 'album' : 'song';
		const name = subject === 'album' ? (item.album_name ?? item.track_name) : item.track_name;
		const yearSuffix = item.album_release_year ? ` in ${item.album_release_year}` : '';

		results.push({
			templateQuestionId: questionId,
			questionType: TriviaQuestionType.WhatArtistForTitle,
			questionText: `What artist released "${name}"${yearSuffix}?`,
			options,
			correctIndex,
			imageUrl: item.album_cover_url
		});
	}

	return results;
}

function generateArtistFirstAlbum(
	config: ArtistFirstAlbumConfig,
	items: CollectionItemWithArtists[],
	questionId: number
): GeneratedTriviaQuestion[] {
	// Build artist -> distinct albums with years
	const artistAlbums = new Map<string, Map<string, string>>();
	for (const item of items) {
		if (!item.album_name || !item.album_release_year) continue;
		const artist = primaryArtist(item);
		if (!artist) continue;
		if (!artistAlbums.has(artist)) artistAlbums.set(artist, new Map());
		artistAlbums.get(artist)!.set(item.album_name, item.album_release_year);
	}

	// Filter to artists with enough distinct albums
	const eligible = [...artistAlbums.entries()].filter(
		([, albums]) => albums.size >= config.optionCount
	);
	if (eligible.length === 0) return [];

	const results: GeneratedTriviaQuestion[] = [];
	const usedArtists = new Set<string>();

	for (let attempt = 0; attempt < config.count * 3 && results.length < config.count; attempt++) {
		const [artistName, albumMap] = pickRandom(eligible, 1)[0];
		if (usedArtists.has(artistName)) continue;
		usedArtists.add(artistName);

		const albums = [...albumMap.entries()]
			.map(([name, year]) => ({ name, year }))
			.sort((a, b) => Number(a.year) - Number(b.year));

		const correct = albums[0];
		const selected = [correct, ...pickRandom(albums.slice(1), config.optionCount - 1)];

		const options: TriviaOption[] = shuffleArray(
			selected.map((a) => ({ label: a.name, meta: a.year }))
		);
		const correctIndex = options.findIndex((o) => o.label === correct.name);

		results.push({
			templateQuestionId: questionId,
			questionType: TriviaQuestionType.ArtistFirstAlbum,
			questionText: `Which was ${artistName}'s first album?`,
			options,
			correctIndex,
			imageUrl: null
		});
	}

	return results;
}

function generateWhoSangLyrics(
	config: WhoSangLyricsConfig,
	items: CollectionItemWithArtists[],
	questionId: number
): GeneratedTriviaQuestion[] {
	const withLyrics = items.filter((i) => i.lyrics && i.lyrics.trim().length > 0);
	if (withLyrics.length < 2) return [];

	const allArtists = [...new Set(withLyrics.map((i) => primaryArtist(i)))];
	if (allArtists.length < config.optionCount) return [];

	const results: GeneratedTriviaQuestion[] = [];
	const usedIds = new Set<number>();

	for (let attempt = 0; attempt < config.count * 5 && results.length < config.count; attempt++) {
		const item = pickRandom(withLyrics, 1)[0];
		if (usedIds.has(item.id)) continue;

		// Extract lyrics fragment
		const lines = item
			.lyrics!.split('\n')
			.map((l) => l.trim())
			.filter((l) => l.length > 0 && !l.startsWith('['));
		if (lines.length === 0) continue;

		const words = lines.join(' ').split(/\s+/);
		if (words.length < config.fragmentLength) continue;

		const startIdx = Math.floor(Math.random() * (words.length - config.fragmentLength));
		const fragment = words.slice(startIdx, startIdx + config.fragmentLength).join(' ');

		if (fragment.trim().length < 5) continue;
		usedIds.add(item.id);

		const correctArtist = primaryArtist(item);
		const distractors = pickRandom(
			allArtists.filter((a) => a !== correctArtist),
			config.optionCount - 1
		);

		const options: TriviaOption[] = shuffleArray(
			[correctArtist, ...distractors].map((a) => ({ label: a }))
		);
		const correctIndex = options.findIndex((o) => o.label === correctArtist);

		results.push({
			templateQuestionId: questionId,
			questionType: TriviaQuestionType.WhoSangLyrics,
			questionText: `Who sang: "${fragment}"?`,
			options,
			correctIndex,
			imageUrl: item.album_cover_url
		});
	}

	return results;
}

// ---------------------------------------------------------------------------
// Generator dispatcher
// ---------------------------------------------------------------------------

function generateForQuestion(
	question: TriviaTemplateQuestionRow,
	items: CollectionItemWithArtists[]
): GeneratedTriviaQuestion[] {
	switch (question.question_type) {
		case TriviaQuestionType.WhichCameFirst:
			return generateWhichCameFirst(
				question.config as WhichCameFirstConfig,
				items,
				question.id
			);
		case TriviaQuestionType.WhatYearReleased:
			return generateWhatYearReleased(
				question.config as WhatYearReleasedConfig,
				items,
				question.id
			);
		case TriviaQuestionType.WhatAlbumForSong:
			return generateWhatAlbumForSong(
				question.config as WhatAlbumForSongConfig,
				items,
				question.id
			);
		case TriviaQuestionType.WhatArtistForTitle:
			return generateWhatArtistForTitle(
				question.config as WhatArtistForTitleConfig,
				items,
				question.id
			);
		case TriviaQuestionType.ArtistFirstAlbum:
			return generateArtistFirstAlbum(
				question.config as ArtistFirstAlbumConfig,
				items,
				question.id
			);
		case TriviaQuestionType.WhoSangLyrics:
			return generateWhoSangLyrics(
				question.config as WhoSangLyricsConfig,
				items,
				question.id
			);
		default:
			return [];
	}
}

// ---------------------------------------------------------------------------
// Endpoint
// ---------------------------------------------------------------------------

export const POST: RequestHandler = async ({ params, request }) => {
	const templateId = Number(params.id);
	if (!Number.isFinite(templateId) || templateId <= 0) {
		return error(400, 'Invalid template ID');
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return error(400, 'Invalid JSON body');
	}

	const { collectionId } = body as { collectionId?: unknown };
	const colId = Number(collectionId);
	if (!Number.isFinite(colId) || colId <= 0) {
		return error(400, 'Missing or invalid collectionId');
	}

	try {
		await initializeSchema();

		const template = await findTemplateById(templateId);
		if (!template) {
			return error(404, 'Template not found');
		}

		const collection = await findCollectionById(colId);
		if (!collection) {
			return error(404, 'Collection not found');
		}

		const questions = await findTemplateQuestions(templateId);
		const items = await findCollectionItemsWithArtists(colId);

		let totalExpected = 0;
		const generated: GeneratedTriviaQuestion[] = [];

		for (const question of questions) {
			const config = question.config as { count?: number };
			totalExpected += config.count ?? 1;
			const results = generateForQuestion(question, items);
			generated.push(...results);
		}

		const trivia: GeneratedTriviaSet = {
			templateId: template.id,
			templateName: template.name,
			collectionId: collection.id,
			collectionName: collection.name,
			questions: generated,
			skippedCount: totalExpected - generated.length,
			generatedAt: new Date().toISOString()
		};

		return json({ trivia });
	} catch (err) {
		console.error('Failed to generate trivia:', err);
		const message = err instanceof Error ? err.message : 'Unknown error';
		return error(500, `Failed to generate trivia: ${message}`);
	}
};
