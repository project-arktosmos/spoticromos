<script lang="ts">
	import { onMount } from 'svelte';
	import type { CollectionRow } from '$lib/server/repositories/collection.repository';
	import type { CollectionProgress } from '$lib/server/repositories/ownership.repository';
	import CollectionBadge from '$components/core/CollectionBadge.svelte';

	interface CollectionWithCount extends CollectionRow {
		track_count: number;
	}

	let { data } = $props();

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

	async function toggleOwnership(e: Event, collectionId: number) {
		e.preventDefault();
		e.stopPropagation();
		if (!data.user) return;
		const isOwned = ownedIds.has(collectionId);
		const method = isOwned ? 'DELETE' : 'POST';
		try {
			const res = await fetch(`/api/collections/${collectionId}/own`, { method });
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const next = new Set(ownedIds);
			if (isOwned) {
				next.delete(collectionId);
			} else {
				next.add(collectionId);
			}
			ownedIds = next;
		} catch (err) {
			console.error('Failed to toggle ownership:', err);
		}
	}

	async function unlockCollection(e: Event, collectionId: number) {
		e.preventDefault();
		e.stopPropagation();
		if (!data.user) return;
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

<div class="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 p-8">
	<h1 class="text-2xl font-bold">Collections</h1>

	<div class="join w-full">
		<input
			type="text"
			class="input input-bordered input-sm join-item flex-1"
			placeholder="Search collections..."
			bind:value={searchQuery}
			onkeydown={(e) => e.key === 'Enter' && handleSearch()}
		/>
		<button
			class="btn btn-primary btn-sm join-item"
			onclick={handleSearch}
			disabled={loading}
		>
			Search
		</button>
		{#if activeSearch}
			<button
				class="btn btn-ghost btn-sm join-item"
				onclick={clearSearch}
			>
				Clear
			</button>
		{/if}
	</div>

	{#if loading}
		<div class="flex flex-1 items-center justify-center">
			<span class="loading loading-spinner loading-lg"></span>
		</div>
	{:else if errorMsg}
		<div class="alert alert-error">
			<span>{errorMsg}</span>
		</div>
	{:else if collections.length === 0}
		{#if activeSearch}
			<p class="text-base-content/70 text-center">No collections matching "{activeSearch}".</p>
		{:else}
			<p class="text-base-content/70 text-center">No collections saved yet.</p>
		{/if}
	{:else}
		<p class="text-base-content/70 text-sm">
			{total} collection{total !== 1 ? 's' : ''}
			{#if activeSearch}
				matching "{activeSearch}"
			{/if}
		</p>

		<div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
			{#each collections as collection (collection.id)}
				{@const cp = progressMap.get(collection.id)}
				<a href="/collections/{collection.id}">
					<CollectionBadge
						{collection}
						owned={!data.user || ownedIds.has(collection.id)}
						onUnlock={data.user && !ownedIds.has(collection.id) ? (e) => unlockCollection(e, collection.id) : undefined}
						progress={cp?.completed_slots ?? 0}
						progressMax={cp?.total_slots ?? 0}
						rarityColor={cp?.highest_completed_rarity_color ?? null}
					/>
				</a>
			{/each}
		</div>

		{#if totalPages > 1}
			<div class="flex items-center justify-center gap-2">
				<button
					class="btn btn-sm"
					disabled={page <= 1}
					onclick={() => goToPage(page - 1)}
				>
					&laquo;
				</button>
				<span class="text-sm">Page {page} of {totalPages}</span>
				<button
					class="btn btn-sm"
					disabled={page >= totalPages}
					onclick={() => goToPage(page + 1)}
				>
					&raquo;
				</button>
			</div>
		{/if}
	{/if}
</div>
