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
	GeneratedTriviaQuestion,
	GeneratedTriviaSet,
	TriviaOption,
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

		// Correct answer is at index 0 before shuffle
		const opts: TriviaOption[] = selected.map((a) => ({
			label: a.name,
			meta: a.year,
			verification: `Released in ${a.year}`
		}));
		const { options, correctIndex } = shuffleWithCorrect(opts, 0);

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
			imageUrl: item.album_cover_url
		});
	}

	return results;
}

function generateWhatLabelReleasedIt(
	config: WhatLabelReleasedItConfig,
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
			imageUrl: item.album_cover_url
		});
	}

	return results;
}

function generateFinishTheLyric(
	config: FinishTheLyricConfig,
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
			imageUrl: pair.item.album_cover_url
		});
	}

	return results;
}

function generateWhatSongFromLyrics(
	config: WhatSongFromLyricsConfig,
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
			imageUrl: item.album_cover_url
		});
	}

	return results;
}

function generateNameTheAlbumFromCover(
	config: NameTheAlbumFromCoverConfig,
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
			imageUrl: item.album_cover_url
		});
	}

	return results;
}

function generateOddOneOut(
	config: OddOneOutConfig,
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
			imageUrl: null
		});
	}

	return results;
}

function generateWhatGenreForArtist(
	config: WhatGenreForArtistConfig,
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

		results.push({
			templateQuestionId: questionId,
			questionType: TriviaQuestionType.WhatGenreForArtist,
			questionText: `What genre is ${artist.name} associated with?`,
			options,
			correctIndex,
			imageUrl: artist.image_url
		});
	}

	return results;
}

function generateMostFollowedArtist(
	config: MostFollowedArtistConfig,
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

		results.push({
			templateQuestionId: questionId,
			questionType: TriviaQuestionType.MostFollowedArtist,
			questionText: 'Which of these artists has the most Spotify followers?',
			options,
			correctIndex,
			imageUrl: null
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
	artistsMeta: CollectionArtistWithMetadata[] | null
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
		case TriviaQuestionType.WhatLabelReleasedIt:
			return generateWhatLabelReleasedIt(
				question.config as WhatLabelReleasedItConfig,
				items,
				question.id
			);
		case TriviaQuestionType.FinishTheLyric:
			return generateFinishTheLyric(
				question.config as FinishTheLyricConfig,
				items,
				question.id
			);
		case TriviaQuestionType.WhatSongFromLyrics:
			return generateWhatSongFromLyrics(
				question.config as WhatSongFromLyricsConfig,
				items,
				question.id
			);
		case TriviaQuestionType.NameTheAlbumFromCover:
			return generateNameTheAlbumFromCover(
				question.config as NameTheAlbumFromCoverConfig,
				items,
				question.id
			);
		case TriviaQuestionType.OddOneOut:
			return generateOddOneOut(
				question.config as OddOneOutConfig,
				items,
				question.id
			);
		case TriviaQuestionType.WhatGenreForArtist:
			return generateWhatGenreForArtist(
				question.config as WhatGenreForArtistConfig,
				artistsMeta ?? [],
				question.id
			);
		case TriviaQuestionType.MostFollowedArtist:
			return generateMostFollowedArtist(
				question.config as MostFollowedArtistConfig,
				artistsMeta ?? [],
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

		let totalExpected = 0;
		const generated: GeneratedTriviaQuestion[] = [];

		for (const question of questions) {
			const config = question.config as { count?: number };
			totalExpected += config.count ?? 1;
			const results = generateForQuestion(question, items, artistsMeta);
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
