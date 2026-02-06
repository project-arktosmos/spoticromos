import { json, error } from '@sveltejs/kit';
import { initializeSchema } from '$lib/server/schema';
import { findTemplateById, findTemplateQuestions } from '$lib/server/repositories/trivia.repository';
import {
	findCollectionById,
	findCollectionItemsWithArtists,
	findCollectionArtistsWithMetadata
} from '$lib/server/repositories/collection.repository';
import type {
	CollectionItemWithArtists,
	CollectionArtistWithMetadata
} from '$lib/server/repositories/collection.repository';
import { TriviaQuestionType } from '$types/trivia.type';
import type {
	TriviaTemplateQuestionRow,
	TriviaQuestionConfig,
	GeneratedTriviaQuestion,
	GeneratedTriviaSet,
	TriviaOption,
	ImageDisplayConfig,
	WhichCameFirstConfig,
	WhatYearReleasedConfig,
	WhatAlbumForSongConfig,
	WhatArtistForTitleConfig,
	ArtistFirstAlbumConfig,
	WhoSangLyricsConfig,
	WhatLabelReleasedItConfig,
	FinishTheLyricConfig,
	WhatSongFromLyricsConfig,
	NameTheAlbumFromCoverConfig,
	OddOneOutConfig,
	WhatGenreForArtistConfig,
	MostFollowedArtistConfig
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

/**
 * Shuffle options and return { options, correctIndex } using object reference
 * tracking (safe even when labels are duplicated).
 */
function shuffleWithCorrect(
	opts: TriviaOption[],
	correctIdx: number
): { options: TriviaOption[]; correctIndex: number } {
	const correctRef = opts[correctIdx];
	const shuffled = shuffleArray(opts);
	return { options: shuffled, correctIndex: shuffled.indexOf(correctRef) };
}

/**
 * Resolve the question-level image based on the showImage config.
 * Falls back to defaultImage when showImage is not set.
 */
function resolveQuestionImage(
	config: ImageDisplayConfig,
	item: CollectionItemWithArtists | null,
	defaultImage: string | null
): string | null {
	if (!config.showImage || !item) return defaultImage;
	if (config.showImage === 'artist') return item.artist_image_url ?? null;
	return item.album_cover_url ?? null;
}

/**
 * Build lookup maps for resolving option images by label.
 */
function buildImageLookups(
	items: CollectionItemWithArtists[],
	artistsMeta: CollectionArtistWithMetadata[] | null
): { albumMap: Map<string, string>; artistMap: Map<string, string> } {
	const albumMap = new Map<string, string>();
	const artistMap = new Map<string, string>();

	for (const item of items) {
		const artist = primaryArtist(item);
		if (item.album_name && item.album_cover_url) {
			albumMap.set(item.album_name, item.album_cover_url);
		}
		if (item.track_name && item.album_cover_url) {
			albumMap.set(item.track_name, item.album_cover_url);
		}
		if (artist && item.artist_image_url) {
			artistMap.set(artist, item.artist_image_url);
		}
		if (item.track_name && item.artist_image_url) {
			artistMap.set(item.track_name, item.artist_image_url);
		}
	}

	if (artistsMeta) {
		for (const a of artistsMeta) {
			if (a.image_url) {
				artistMap.set(a.name, a.image_url);
			}
		}
	}

	return { albumMap, artistMap };
}

/**
 * Post-process generated questions to apply showOptionImages config.
 * Looks up images for each option label using the provided maps.
 */
function applyOptionImages(
	questions: GeneratedTriviaQuestion[],
	config: ImageDisplayConfig,
	albumMap: Map<string, string>,
	artistMap: Map<string, string>
): GeneratedTriviaQuestion[] {
	if (!config.showOptionImages) return questions;

	const map = config.showOptionImages === 'album' ? albumMap : artistMap;

	return questions.map((q) => ({
		...q,
		options: q.options.map((opt) => ({
			...opt,
			imageUrl: map.get(opt.label) ?? opt.imageUrl ?? null
		}))
	}));
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

function generateWhichCameFirst(
	config: WhichCameFirstConfig & ImageDisplayConfig,
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
		const correctItem = sorted[0];

		const subject = config.subject === 'album' ? 'album' : 'song';
		const opts: TriviaOption[] = picked.map((item) => ({
			label: subject === 'album'
				? (item.album_name ?? item.track_name)
				: `${item.track_name} by ${primaryArtist(item)}`,
			meta: item.album_release_year ?? undefined,
			imageUrl: item.album_cover_url,
			verification: `Released in ${item.album_release_year}`
		}));

		const correctIdx = picked.indexOf(correctItem);
		const { options, correctIndex } = shuffleWithCorrect(opts, correctIdx);

		results.push({
			templateQuestionId: questionId,
			questionType: TriviaQuestionType.WhichCameFirst,
			questionText: `Which ${subject} came out first?`,
			options,
			correctIndex,
			imageUrl: resolveQuestionImage(config, correctItem, null)
		});
	}

	return results;
}

function generateWhatYearReleased(
	config: WhatYearReleasedConfig & ImageDisplayConfig,
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
		const yearSet = new Set<number>([correctYear]);
		for (const offset of shuffleArray(offsets)) {
			if (yearSet.size >= 4) break;
			const y = correctYear + offset;
			if (y >= 1900) yearSet.add(y);
		}

		// Build options with correct answer at index 0, then shuffle with tracking
		const yearArr = [...yearSet];
		const artist = primaryArtist(item);
		const opts: TriviaOption[] = yearArr.map((y) => ({
			label: String(y),
			verification: y === correctYear ? `"${item.track_name}" by ${artist}` : undefined
		}));
		const correctIdx = yearArr.indexOf(correctYear);
		const { options, correctIndex } = shuffleWithCorrect(opts, correctIdx);

		const subject = config.subject === 'album' ? 'album' : 'song';
		const name = subject === 'album' ? (item.album_name ?? item.track_name) : item.track_name;

		results.push({
			templateQuestionId: questionId,
			questionType: TriviaQuestionType.WhatYearReleased,
			questionText: `What year was "${name}" released?`,
			options,
			correctIndex,
			imageUrl: resolveQuestionImage(config, item, item.album_cover_url)
		});
	}

	return results;
}

function generateWhatAlbumForSong(
	config: WhatAlbumForSongConfig & ImageDisplayConfig,
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

		// Correct answer is always at index 0 before shuffle
		const yearStr = item.album_release_year ? ` (${item.album_release_year})` : '';
		const opts: TriviaOption[] = [correctAlbum, ...distractors].map((a, idx) => ({
			label: a,
			verification: idx === 0 ? `"${item.track_name}" is on "${correctAlbum}"${yearStr}` : undefined
		}));
		const { options, correctIndex } = shuffleWithCorrect(opts, 0);

		results.push({
			templateQuestionId: questionId,
			questionType: TriviaQuestionType.WhatAlbumForSong,
			questionText: `What album was "${item.track_name}" on?`,
			options,
			correctIndex,
			imageUrl: resolveQuestionImage(config, item, item.album_cover_url)
		});
	}

	return results;
}

function generateWhatArtistForTitle(
	config: WhatArtistForTitleConfig & ImageDisplayConfig,
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

		const opts: TriviaOption[] = [correctArtist, ...distractors].map((a, idx) => ({
			label: a,
			verification: idx === 0 ? `Performed "${item.track_name}"` : undefined
		}));
		const { options, correctIndex } = shuffleWithCorrect(opts, 0);

		const subject = config.subject === 'album' ? 'album' : 'song';
		const name = subject === 'album' ? (item.album_name ?? item.track_name) : item.track_name;
		const yearSuffix = item.album_release_year ? ` in ${item.album_release_year}` : '';

		results.push({
			templateQuestionId: questionId,
			questionType: TriviaQuestionType.WhatArtistForTitle,
			questionText: `What artist released "${name}"${yearSuffix}?`,
			options,
			correctIndex,
			imageUrl: resolveQuestionImage(config, item, item.album_cover_url)
		});
	}

	return results;
}

function generateArtistFirstAlbum(
	config: ArtistFirstAlbumConfig & ImageDisplayConfig,
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

		// Correct answer is at index 0 before shuffle
		const opts: TriviaOption[] = selected.map((a) => ({
			label: a.name,
			meta: a.year,
			verification: `Released in ${a.year}`
		}));
		const { options, correctIndex } = shuffleWithCorrect(opts, 0);

		// Find an item for this artist to get image URLs
		const artistItem = items.find((i) => primaryArtist(i) === artistName) ?? null;

		results.push({
			templateQuestionId: questionId,
			questionType: TriviaQuestionType.ArtistFirstAlbum,
			questionText: `Which was ${artistName}'s first album?`,
			options,
			correctIndex,
			imageUrl: resolveQuestionImage(config, artistItem, null)
		});
	}

	return results;
}

function generateWhoSangLyrics(
	config: WhoSangLyricsConfig & ImageDisplayConfig,
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

		// Pick a whole paragraph (verse/chorus) from the lyrics
		const paragraphs = item
			.lyrics!.split(/\n\s*\n/)
			.map((p) =>
				p.split('\n')
					.map((l) => l.trim())
					.filter((l) => l.length > 0 && !l.startsWith('['))
					.join(' / ')
			)
			.filter((p) => p.length >= 10);
		if (paragraphs.length === 0) continue;

		const fragment = paragraphs[Math.floor(Math.random() * paragraphs.length)];

		if (fragment.trim().length < 10) continue;
		usedIds.add(item.id);

		const correctArtist = primaryArtist(item);
		const distractors = pickRandom(
			allArtists.filter((a) => a !== correctArtist),
			config.optionCount - 1
		);

		const opts: TriviaOption[] = [correctArtist, ...distractors].map((a, idx) => ({
			label: a,
			verification: idx === 0 ? `From "${item.track_name}"` : undefined
		}));
		const { options, correctIndex } = shuffleWithCorrect(opts, 0);

		results.push({
			templateQuestionId: questionId,
			questionType: TriviaQuestionType.WhoSangLyrics,
			questionText: `Who sang: "${fragment}"?`,
			options,
			correctIndex,
			imageUrl: resolveQuestionImage(config, item, item.album_cover_url)
		});
	}

	return results;
}

function generateWhatLabelReleasedIt(
	config: WhatLabelReleasedItConfig & ImageDisplayConfig,
	items: CollectionItemWithArtists[],
	questionId: number
): GeneratedTriviaQuestion[] {
	const withLabel = items.filter((i) => i.album_label && i.album_label.trim().length > 0);
	if (withLabel.length < 2) return [];

	const allLabels = [...new Set(withLabel.map((i) => i.album_label!.trim()))];
	if (allLabels.length < config.optionCount) return [];

	const results: GeneratedTriviaQuestion[] = [];
	const usedIds = new Set<number>();

	for (let attempt = 0; attempt < config.count * 3 && results.length < config.count; attempt++) {
		const item = pickRandom(withLabel, 1)[0];
		if (usedIds.has(item.id)) continue;
		usedIds.add(item.id);

		const correctLabel = item.album_label!.trim();
		const distractors = pickRandom(
			allLabels.filter((l) => l !== correctLabel),
			config.optionCount - 1
		);

		const opts: TriviaOption[] = [correctLabel, ...distractors].map((l, idx) => ({
			label: l,
			verification:
				idx === 0
					? `"${item.track_name}" was released on ${correctLabel}`
					: undefined
		}));
		const { options, correctIndex } = shuffleWithCorrect(opts, 0);

		const subject = config.subject === 'album' ? 'album' : 'song';
		const name =
			subject === 'album' ? (item.album_name ?? item.track_name) : item.track_name;

		results.push({
			templateQuestionId: questionId,
			questionType: TriviaQuestionType.WhatLabelReleasedIt,
			questionText: `What record label released "${name}"?`,
			options,
			correctIndex,
			imageUrl: resolveQuestionImage(config, item, item.album_cover_url)
		});
	}

	return results;
}

function generateFinishTheLyric(
	config: FinishTheLyricConfig & ImageDisplayConfig,
	items: CollectionItemWithArtists[],
	questionId: number
): GeneratedTriviaQuestion[] {
	const withLyrics = items.filter((i) => i.lyrics && i.lyrics.trim().length > 0);
	if (withLyrics.length < 2) return [];

	interface LinePair {
		firstLine: string;
		nextLine: string;
		item: CollectionItemWithArtists;
	}

	const allPairs: LinePair[] = [];
	for (const item of withLyrics) {
		const lines = item
			.lyrics!.split('\n')
			.map((l) => l.trim())
			.filter((l) => l.length > 0 && !l.startsWith('['));
		for (let i = 0; i < lines.length - 1; i++) {
			if (lines[i].length >= 10 && lines[i + 1].length >= 10) {
				allPairs.push({ firstLine: lines[i], nextLine: lines[i + 1], item });
			}
		}
	}

	if (allPairs.length < config.optionCount) return [];

	const results: GeneratedTriviaQuestion[] = [];
	const usedFirstLines = new Set<string>();

	for (let attempt = 0; attempt < config.count * 5 && results.length < config.count; attempt++) {
		const pair = pickRandom(allPairs, 1)[0];
		if (usedFirstLines.has(pair.firstLine)) continue;
		usedFirstLines.add(pair.firstLine);

		const distractorPairs = allPairs.filter(
			(p) => p.item.id !== pair.item.id && p.nextLine !== pair.nextLine
		);
		if (distractorPairs.length < config.optionCount - 1) continue;

		const distractorLines = pickRandom(
			[...new Set(distractorPairs.map((p) => p.nextLine))],
			config.optionCount - 1
		);
		if (distractorLines.length < config.optionCount - 1) continue;

		const opts: TriviaOption[] = [pair.nextLine, ...distractorLines].map((line, idx) => ({
			label: line,
			verification:
				idx === 0
					? `From "${pair.item.track_name}" by ${primaryArtist(pair.item)}`
					: undefined
		}));
		const { options, correctIndex } = shuffleWithCorrect(opts, 0);

		results.push({
			templateQuestionId: questionId,
			questionType: TriviaQuestionType.FinishTheLyric,
			questionText: `Finish the lyric: "${pair.firstLine}..."`,
			options,
			correctIndex,
			imageUrl: resolveQuestionImage(config, pair.item, pair.item.album_cover_url)
		});
	}

	return results;
}

function generateWhatSongFromLyrics(
	config: WhatSongFromLyricsConfig & ImageDisplayConfig,
	items: CollectionItemWithArtists[],
	questionId: number
): GeneratedTriviaQuestion[] {
	const withLyrics = items.filter((i) => i.lyrics && i.lyrics.trim().length > 0);
	if (withLyrics.length < 2) return [];

	const allTitles = [...new Set(withLyrics.map((i) => i.track_name))];
	if (allTitles.length < config.optionCount) return [];

	const results: GeneratedTriviaQuestion[] = [];
	const usedIds = new Set<number>();

	for (let attempt = 0; attempt < config.count * 5 && results.length < config.count; attempt++) {
		const item = pickRandom(withLyrics, 1)[0];
		if (usedIds.has(item.id)) continue;

		const paragraphs = item
			.lyrics!.split(/\n\s*\n/)
			.map((p) =>
				p
					.split('\n')
					.map((l) => l.trim())
					.filter((l) => l.length > 0 && !l.startsWith('['))
					.join(' / ')
			)
			.filter((p) => p.length >= 10);
		if (paragraphs.length === 0) continue;

		const fragment = paragraphs[Math.floor(Math.random() * paragraphs.length)];
		if (fragment.trim().length < 10) continue;
		usedIds.add(item.id);

		const correctTitle = item.track_name;
		const distractors = pickRandom(
			allTitles.filter((t) => t !== correctTitle),
			config.optionCount - 1
		);

		const opts: TriviaOption[] = [correctTitle, ...distractors].map((t, idx) => ({
			label: t,
			verification: idx === 0 ? `By ${primaryArtist(item)}` : undefined
		}));
		const { options, correctIndex } = shuffleWithCorrect(opts, 0);

		results.push({
			templateQuestionId: questionId,
			questionType: TriviaQuestionType.WhatSongFromLyrics,
			questionText: `Which song contains: "${fragment}"?`,
			options,
			correctIndex,
			imageUrl: resolveQuestionImage(config, item, item.album_cover_url)
		});
	}

	return results;
}

function generateNameTheAlbumFromCover(
	config: NameTheAlbumFromCoverConfig & ImageDisplayConfig,
	items: CollectionItemWithArtists[],
	questionId: number
): GeneratedTriviaQuestion[] {
	const withCoverAndAlbum = items.filter((i) => i.album_cover_url && i.album_name);
	if (withCoverAndAlbum.length < 2) return [];

	const allAlbums = [...new Set(withCoverAndAlbum.map((i) => i.album_name!))];
	if (allAlbums.length < config.optionCount) return [];

	const results: GeneratedTriviaQuestion[] = [];
	const usedAlbums = new Set<string>();

	for (let attempt = 0; attempt < config.count * 3 && results.length < config.count; attempt++) {
		const item = pickRandom(withCoverAndAlbum, 1)[0];
		const correctAlbum = item.album_name!;
		if (usedAlbums.has(correctAlbum)) continue;
		usedAlbums.add(correctAlbum);

		const distractors = pickRandom(
			allAlbums.filter((a) => a !== correctAlbum),
			config.optionCount - 1
		);

		const opts: TriviaOption[] = [correctAlbum, ...distractors].map((a, idx) => ({
			label: a,
			verification: idx === 0 ? `By ${primaryArtist(item)}` : undefined
		}));
		const { options, correctIndex } = shuffleWithCorrect(opts, 0);

		results.push({
			templateQuestionId: questionId,
			questionType: TriviaQuestionType.NameTheAlbumFromCover,
			questionText: 'What album is this?',
			options,
			correctIndex,
			imageUrl: resolveQuestionImage(config, item, item.album_cover_url)
		});
	}

	return results;
}

function generateOddOneOut(
	config: OddOneOutConfig & ImageDisplayConfig,
	items: CollectionItemWithArtists[],
	questionId: number
): GeneratedTriviaQuestion[] {
	const albumGroups = new Map<string, CollectionItemWithArtists[]>();
	for (const item of items) {
		if (!item.album_name) continue;
		const list = albumGroups.get(item.album_name) ?? [];
		list.push(item);
		albumGroups.set(item.album_name, list);
	}

	const bigAlbums = [...albumGroups.entries()].filter(([, songs]) => songs.length >= 3);
	const allAlbumNames = [...albumGroups.keys()];
	if (bigAlbums.length === 0 || allAlbumNames.length < 2) return [];

	const results: GeneratedTriviaQuestion[] = [];
	const usedAlbums = new Set<string>();

	for (let attempt = 0; attempt < config.count * 3 && results.length < config.count; attempt++) {
		const [mainAlbum, mainSongs] = pickRandom(bigAlbums, 1)[0];
		if (usedAlbums.has(mainAlbum)) continue;
		usedAlbums.add(mainAlbum);

		const threeSongs = pickRandom(mainSongs, 3);

		const otherAlbums = [...albumGroups.entries()].filter(
			([name]) => name !== mainAlbum
		);
		if (otherAlbums.length === 0) continue;
		const [oddAlbum, oddSongs] = pickRandom(otherAlbums, 1)[0];
		const oddSong = pickRandom(oddSongs, 1)[0];

		const allOptions = [...threeSongs, oddSong];
		const opts: TriviaOption[] = allOptions.map((item, idx) => ({
			label: item.track_name,
			verification:
				idx === 3
					? `From "${oddAlbum}" (others are from "${mainAlbum}")`
					: undefined
		}));
		const { options, correctIndex } = shuffleWithCorrect(opts, 3);

		results.push({
			templateQuestionId: questionId,
			questionType: TriviaQuestionType.OddOneOut,
			questionText: 'Which song is from a different album than the others?',
			options,
			correctIndex,
			imageUrl: resolveQuestionImage(config, oddSong, null)
		});
	}

	return results;
}

function generateWhatGenreForArtist(
	config: WhatGenreForArtistConfig & ImageDisplayConfig,
	artistsMeta: CollectionArtistWithMetadata[],
	questionId: number
): GeneratedTriviaQuestion[] {
	const withGenres = artistsMeta.filter((a) => a.genres && a.genres.length > 0);
	if (withGenres.length < 2) return [];

	const allGenres = [...new Set(withGenres.flatMap((a) => a.genres!))];
	if (allGenres.length < config.optionCount) return [];

	const results: GeneratedTriviaQuestion[] = [];
	const usedArtists = new Set<string>();

	for (let attempt = 0; attempt < config.count * 3 && results.length < config.count; attempt++) {
		const artist = pickRandom(withGenres, 1)[0];
		if (usedArtists.has(artist.id)) continue;
		usedArtists.add(artist.id);

		const correctGenre = pickRandom(artist.genres!, 1)[0];
		const distractors = pickRandom(
			allGenres.filter((g) => !artist.genres!.includes(g)),
			config.optionCount - 1
		);
		if (distractors.length < config.optionCount - 1) continue;

		const opts: TriviaOption[] = [correctGenre, ...distractors].map((g, idx) => ({
			label: g,
			verification: idx === 0 ? `${artist.name}'s genre` : undefined
		}));
		const { options, correctIndex } = shuffleWithCorrect(opts, 0);

		const defaultImg = artist.image_url ?? null;
		const questionImage = config.showImage === 'album' ? null : (config.showImage === 'artist' ? defaultImg : defaultImg);

		results.push({
			templateQuestionId: questionId,
			questionType: TriviaQuestionType.WhatGenreForArtist,
			questionText: `What genre is ${artist.name} associated with?`,
			options,
			correctIndex,
			imageUrl: questionImage
		});
	}

	return results;
}

function generateMostFollowedArtist(
	config: MostFollowedArtistConfig & ImageDisplayConfig,
	artistsMeta: CollectionArtistWithMetadata[],
	questionId: number
): GeneratedTriviaQuestion[] {
	const withFollowers = artistsMeta.filter(
		(a) => a.followers != null && a.followers > 0
	);
	if (withFollowers.length < config.optionCount) return [];

	const results: GeneratedTriviaQuestion[] = [];
	const usedSets = new Set<string>();

	for (let attempt = 0; attempt < config.count * 3 && results.length < config.count; attempt++) {
		const picked = pickRandom(withFollowers, config.optionCount);
		const key = picked
			.map((p) => p.id)
			.sort()
			.join(',');
		if (usedSets.has(key)) continue;
		usedSets.add(key);

		const sorted = [...picked].sort((a, b) => (b.followers ?? 0) - (a.followers ?? 0));
		const correctArtist = sorted[0];

		const opts: TriviaOption[] = picked.map((a) => ({
			label: a.name,
			verification:
				a.id === correctArtist.id
					? `${(a.followers ?? 0).toLocaleString()} followers`
					: undefined,
			imageUrl: a.image_url
		}));

		const correctIdx = picked.indexOf(correctArtist);
		const { options, correctIndex } = shuffleWithCorrect(opts, correctIdx);

		const mostFollowedImg = config.showImage === 'artist' ? (correctArtist.image_url ?? null) : null;

		results.push({
			templateQuestionId: questionId,
			questionType: TriviaQuestionType.MostFollowedArtist,
			questionText: 'Which of these artists has the most Spotify followers?',
			options,
			correctIndex,
			imageUrl: mostFollowedImg
		});
	}

	return results;
}

// ---------------------------------------------------------------------------
// Generator dispatcher
// ---------------------------------------------------------------------------

function generateForQuestion(
	question: TriviaTemplateQuestionRow,
	items: CollectionItemWithArtists[],
	artistsMeta: CollectionArtistWithMetadata[] | null,
	albumMap: Map<string, string>,
	artistMap: Map<string, string>
): GeneratedTriviaQuestion[] {
	const config = question.config as TriviaQuestionConfig;
	let results: GeneratedTriviaQuestion[];

	switch (question.question_type) {
		case TriviaQuestionType.WhichCameFirst:
			results = generateWhichCameFirst(
				config as WhichCameFirstConfig & ImageDisplayConfig,
				items,
				question.id
			);
			break;
		case TriviaQuestionType.WhatYearReleased:
			results = generateWhatYearReleased(
				config as WhatYearReleasedConfig & ImageDisplayConfig,
				items,
				question.id
			);
			break;
		case TriviaQuestionType.WhatAlbumForSong:
			results = generateWhatAlbumForSong(
				config as WhatAlbumForSongConfig & ImageDisplayConfig,
				items,
				question.id
			);
			break;
		case TriviaQuestionType.WhatArtistForTitle:
			results = generateWhatArtistForTitle(
				config as WhatArtistForTitleConfig & ImageDisplayConfig,
				items,
				question.id
			);
			break;
		case TriviaQuestionType.ArtistFirstAlbum:
			results = generateArtistFirstAlbum(
				config as ArtistFirstAlbumConfig & ImageDisplayConfig,
				items,
				question.id
			);
			break;
		case TriviaQuestionType.WhoSangLyrics:
			results = generateWhoSangLyrics(
				config as WhoSangLyricsConfig & ImageDisplayConfig,
				items,
				question.id
			);
			break;
		case TriviaQuestionType.WhatLabelReleasedIt:
			results = generateWhatLabelReleasedIt(
				config as WhatLabelReleasedItConfig & ImageDisplayConfig,
				items,
				question.id
			);
			break;
		case TriviaQuestionType.FinishTheLyric:
			results = generateFinishTheLyric(
				config as FinishTheLyricConfig & ImageDisplayConfig,
				items,
				question.id
			);
			break;
		case TriviaQuestionType.WhatSongFromLyrics:
			results = generateWhatSongFromLyrics(
				config as WhatSongFromLyricsConfig & ImageDisplayConfig,
				items,
				question.id
			);
			break;
		case TriviaQuestionType.NameTheAlbumFromCover:
			results = generateNameTheAlbumFromCover(
				config as NameTheAlbumFromCoverConfig & ImageDisplayConfig,
				items,
				question.id
			);
			break;
		case TriviaQuestionType.OddOneOut:
			results = generateOddOneOut(
				config as OddOneOutConfig & ImageDisplayConfig,
				items,
				question.id
			);
			break;
		case TriviaQuestionType.WhatGenreForArtist:
			results = generateWhatGenreForArtist(
				config as WhatGenreForArtistConfig & ImageDisplayConfig,
				artistsMeta ?? [],
				question.id
			);
			break;
		case TriviaQuestionType.MostFollowedArtist:
			results = generateMostFollowedArtist(
				config as MostFollowedArtistConfig & ImageDisplayConfig,
				artistsMeta ?? [],
				question.id
			);
			break;
		default:
			results = [];
	}

	// Apply option images post-processing
	return applyOptionImages(results, config, albumMap, artistMap);
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

	const { collectionId, questionId } = body as { collectionId?: unknown; questionId?: unknown };
	const colId = Number(collectionId);
	if (!Number.isFinite(colId) || colId <= 0) {
		return error(400, 'Missing or invalid collectionId');
	}
	const filterQuestionId = questionId != null ? Number(questionId) : null;

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

		let questions = await findTemplateQuestions(templateId);
		if (filterQuestionId != null) {
			questions = questions.filter((q) => q.id === filterQuestionId);
			if (questions.length === 0) {
				return error(404, 'Question not found in this template');
			}
		}
		const items = await findCollectionItemsWithArtists(colId);

		// Lazily fetch artist metadata only if needed by genre/follower question types
		const needsArtistMeta = questions.some(
			(q) =>
				q.question_type === TriviaQuestionType.WhatGenreForArtist ||
				q.question_type === TriviaQuestionType.MostFollowedArtist
		);
		const artistsMeta = needsArtistMeta
			? await findCollectionArtistsWithMetadata(colId)
			: null;

		// Build image lookup maps for option image post-processing
		const { albumMap, artistMap } = buildImageLookups(items, artistsMeta);

		let totalExpected = 0;
		const generated: GeneratedTriviaQuestion[] = [];

		for (const question of questions) {
			const config = question.config as { count?: number };
			totalExpected += config.count ?? 1;
			const results = generateForQuestion(question, items, artistsMeta, albumMap, artistMap);
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
