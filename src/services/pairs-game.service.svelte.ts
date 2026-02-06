import type { CollectionItemWithArtists } from '$lib/server/repositories/collection.repository';

export type CardState = 'faceDown' | 'faceUp' | 'matched';
export type CardKind = 'album' | 'artist';

export interface GameCard {
	id: number;
	imageUrl: string;
	label: string;
	kind: CardKind;
	pairKey: string;
	state: CardState;
}

export class PairsGameService {
	items = $state<CollectionItemWithArtists[]>([]);
	loading = $state(true);
	errorMsg = $state('');
	gameStarted = $state(false);
	cards = $state<GameCard[]>([]);
	moves = $state(0);
	matchedPairs = $state(0);
	totalPairs = $state(0);
	flippedIndices = $state<number[]>([]);
	isChecking = $state(false);
	errors = $state(0);
	gameWon = $state(false);
	gameLost = $state(false);
	gridSize = $state(3);
	rewardResult = $state<{ rewards: number; newHighscore: boolean } | null>(null);

	readonly MIN_GRID = 3;

	maxErrors = $derived(this.totalPairs);

	private collectionId: number;
	private user: any;

	constructor(collectionId: number, user: any) {
		this.collectionId = collectionId;
		this.user = user;
	}

	private getUniqueImages(): Array<{ imageUrl: string; label: string; kind: CardKind }> {
		const seen = new Set<string>();
		const result: Array<{ imageUrl: string; label: string; kind: CardKind }> = [];

		for (const item of this.items) {
			if (item.album_cover_url && !seen.has(item.album_cover_url)) {
				seen.add(item.album_cover_url);
				result.push({ imageUrl: item.album_cover_url, label: item.album_name ?? item.track_name, kind: 'album' });
			}
			if (item.artist_image_url && !seen.has(item.artist_image_url)) {
				seen.add(item.artist_image_url);
				result.push({ imageUrl: item.artist_image_url, label: item.artists ?? 'Unknown', kind: 'artist' });
			}
		}

		return result;
	}

	private shuffle<T>(arr: T[]): T[] {
		const a = [...arr];
		for (let i = a.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[a[i], a[j]] = [a[j], a[i]];
		}
		return a;
	}

	gridRows(cols: number): number {
		return cols % 2 === 0 ? cols : cols + 1;
	}

	startGame() {
		const unique = this.getUniqueImages();
		if (unique.length < 2) {
			this.errorMsg = 'Not enough unique images in this collection (need at least 2).';
			return;
		}

		const rows = this.gridRows(this.gridSize);
		const pairsForGrid = (this.gridSize * rows) / 2;
		const selected = this.shuffle(unique).slice(0, pairsForGrid);
		this.totalPairs = selected.length;
		this.matchedPairs = 0;
		this.moves = 0;
		this.errors = 0;
		this.flippedIndices = [];
		this.isChecking = false;
		this.gameWon = false;
		this.gameLost = false;
		this.rewardResult = null;
		this.gameStarted = true;

		const gameCards: GameCard[] = [];
		let cardId = 0;
		for (const img of selected) {
			const pairKey = img.imageUrl;
			gameCards.push({ id: cardId++, imageUrl: img.imageUrl, label: img.label, kind: img.kind, pairKey, state: 'faceDown' });
			gameCards.push({ id: cardId++, imageUrl: img.imageUrl, label: img.label, kind: img.kind, pairKey, state: 'faceDown' });
		}

		this.cards = this.shuffle(gameCards);
	}

	flipCard(index: number) {
		if (this.isChecking || this.gameWon || this.gameLost) return;
		if (this.cards[index].state !== 'faceDown') return;
		if (this.flippedIndices.length >= 2) return;

		this.cards[index].state = 'faceUp';
		this.flippedIndices = [...this.flippedIndices, index];

		if (this.flippedIndices.length === 2) {
			this.moves++;
			const [first, second] = this.flippedIndices;
			if (this.cards[first].pairKey === this.cards[second].pairKey) {
				this.cards[first].state = 'matched';
				this.cards[second].state = 'matched';
				this.matchedPairs++;
				this.flippedIndices = [];

				if (this.matchedPairs === this.totalPairs) {
					this.gameWon = true;
					this.submitGameResult(true);
				}
			} else {
				this.errors++;
				if (this.errors >= this.maxErrors) {
					this.isChecking = true;
					setTimeout(() => {
						for (const card of this.cards) {
							if (card.state === 'faceDown') card.state = 'faceUp';
						}
						this.flippedIndices = [];
						this.isChecking = false;
						this.gameLost = true;
						this.submitGameResult(false);
					}, 800);
				} else {
					this.isChecking = true;
					setTimeout(() => {
						this.cards[first].state = 'faceDown';
						this.cards[second].state = 'faceDown';
						this.flippedIndices = [];
						this.isChecking = false;
					}, 800);
				}
			}
		}
	}

	nextLevel() {
		this.gridSize++;
		this.startGame();
	}

	retryLevel() {
		this.gridSize = Math.max(this.MIN_GRID, this.gridSize - 1);
		this.startGame();
	}

	private async submitGameResult(won: boolean) {
		if (!this.user) return;
		try {
			const res = await fetch('/api/pairs/complete', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					collectionId: this.collectionId,
					gridSize: this.gridSize,
					moves: this.moves,
					errors: this.errors,
					won
				})
			});
			if (res.ok) {
				this.rewardResult = await res.json();
			}
		} catch { /* silent */ }
	}

	async init() {
		try {
			const res = await fetch(`/api/collections/${this.collectionId}`);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const json = await res.json();
			this.items = json.items;
			this.startGame();
		} catch (err) {
			this.errorMsg = err instanceof Error ? err.message : 'Failed to load collection';
		} finally {
			this.loading = false;
		}
	}
}
