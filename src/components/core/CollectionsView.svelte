<script lang="ts">
	import { onMount } from 'svelte';
	import type { SessionUser } from '$types/auth.type';
	import CollectionBadge from '$components/core/CollectionBadge.svelte';

	interface CollectionRow {
		id: number;
		name: string;
		cover_image_url: string | null;
		spotify_playlist_id: string;
		spotify_owner_id: string | null;
		created_at: string;
		creator_display_name: string | null;
		creator_avatar_url: string | null;
	}

	interface CollectionWithCount extends CollectionRow {
		track_count: number;
	}

	interface CollectionProgress {
		collection_id: number;
		completed_slots: number;
		total_slots: number;
		highest_completed_rarity_color: string | null;
	}

	interface Props {
		user: SessionUser | null;
	}

	let { user }: Props = $props();

	let collections = $state<CollectionWithCount[]>([]);
	let ownedIds = $state<Set<number>>(new Set());
	let progressMap = $state<Map<number, CollectionProgress>>(new Map());
	let loading = $state(true);
	let errorMsg = $state('');

	// Pagination
	let page = $state(1);
	let total = $state(0);
	let limit = $state(12);
	let totalPages = $derived(Math.ceil(total / limit));

	// Search
	let searchQuery = $state('');
	let activeSearch = $state('');

	async function fetchCollections() {
		loading = true;
		errorMsg = '';
		try {
			const params = new URLSearchParams({
				page: String(page),
				limit: String(limit)
			});
			if (activeSearch) {
				params.set('search', activeSearch);
			}
			const res = await fetch(`/api/collections?${params}`);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const json = await res.json();
			collections = json.collections;
			total = json.total;
			ownedIds = new Set(json.ownedCollectionIds ?? []);
			const pMap = new Map<number, CollectionProgress>();
			for (const cp of json.collectionProgress ?? []) {
				pMap.set(cp.collection_id, cp);
			}
			progressMap = pMap;
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to load collections';
		} finally {
			loading = false;
		}
	}

	function goToPage(p: number) {
		page = p;
		fetchCollections();
	}

	function handleSearch() {
		activeSearch = searchQuery.trim();
		page = 1;
		fetchCollections();
	}

	function clearSearch() {
		searchQuery = '';
		activeSearch = '';
		page = 1;
		fetchCollections();
	}

	onMount(() => {
		fetchCollections();
	});

	async function unlockCollection(e: Event, collectionId: number) {
		e.preventDefault();
		e.stopPropagation();
		if (!user) return;
		try {
			const res = await fetch(`/api/collections/${collectionId}/own`, { method: 'POST' });
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const next = new Set(ownedIds);
			next.add(collectionId);
			ownedIds = next;
		} catch (err) {
			console.error('Failed to unlock collection:', err);
		}
	}
</script>

<div class="flex min-h-screen w-full flex-col gap-6 p-4 tablet:p-8">
	<div class="flex items-center justify-between">
		<h1 class="text-2xl font-bold">Collections</h1>
		{#if user && !user.isAnonymous}
			<a href="/import" class="btn btn-sm btn-secondary">Create Collection</a>
		{/if}
	</div>

	<div class="join w-full">
		<input
			type="text"
			class="input-bordered input input-sm join-item flex-1"
			placeholder="Search collections..."
			bind:value={searchQuery}
			onkeydown={(e) => e.key === 'Enter' && handleSearch()}
		/>
		<button class="btn join-item btn-sm btn-primary" onclick={handleSearch} disabled={loading}>
			Search
		</button>
		{#if activeSearch}
			<button class="btn join-item btn-ghost btn-sm" onclick={clearSearch}> Clear </button>
		{/if}
	</div>

	{#if loading}
		<div class="flex flex-1 items-center justify-center">
			<span class="loading loading-lg loading-spinner"></span>
		</div>
	{:else if errorMsg}
		<div class="alert alert-error">
			<span>{errorMsg}</span>
		</div>
	{:else if collections.length === 0}
		{#if activeSearch}
			<p class="text-center text-base-content/70">No collections matching "{activeSearch}".</p>
		{:else}
			<p class="text-center text-base-content/70">No collections saved yet.</p>
		{/if}
	{:else}
		<p class="text-sm text-base-content/70">
			{total} collection{total !== 1 ? 's' : ''}
			{#if activeSearch}
				matching "{activeSearch}"
			{/if}
		</p>

		<div class="grid grid-cols-2 gap-4 tablet:grid-cols-3 large:grid-cols-4">
			{#each collections as collection (collection.id)}
				{@const cp = progressMap.get(collection.id)}
				<a href="/collections/{collection.id}">
					<CollectionBadge
						{collection}
						owned={!user || ownedIds.has(collection.id)}
						onUnlock={user && !ownedIds.has(collection.id)
							? (e) => unlockCollection(e, collection.id)
							: undefined}
						progress={cp?.completed_slots ?? 0}
						progressMax={cp?.total_slots ?? 0}
						rarityColor={cp?.highest_completed_rarity_color ?? null}
					/>
				</a>
			{/each}
		</div>

		{#if totalPages > 1}
			<div class="flex items-center justify-center gap-2">
				<button class="btn btn-sm" disabled={page <= 1} onclick={() => goToPage(page - 1)}>
					&laquo;
				</button>
				<span class="text-sm">Page {page} of {totalPages}</span>
				<button class="btn btn-sm" disabled={page >= totalPages} onclick={() => goToPage(page + 1)}>
					&raquo;
				</button>
			</div>
		{/if}
	{/if}
</div>
