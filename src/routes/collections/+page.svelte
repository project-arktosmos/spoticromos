<script lang="ts">
	import { onMount } from 'svelte';
	import type { CollectionRow } from '$lib/server/repositories/collection.repository';
	import CollectionBadge from '$components/core/CollectionBadge.svelte';

	interface CollectionWithCount extends CollectionRow {
		track_count: number;
	}

	let { data } = $props();

	let collections = $state<CollectionWithCount[]>([]);
	let ownedIds = $state<Set<number>>(new Set());
	let loading = $state(true);
	let errorMsg = $state('');

	onMount(async () => {
		try {
			const res = await fetch('/api/collections');
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const json = await res.json();
			collections = json.collections;
			ownedIds = new Set(json.ownedCollectionIds ?? []);
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to load collections';
		} finally {
			loading = false;
		}
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
</script>

<div class="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 p-8">
	<h1 class="text-2xl font-bold">Collections</h1>

	{#if loading}
		<div class="flex flex-1 items-center justify-center">
			<span class="loading loading-spinner loading-lg"></span>
		</div>
	{:else if errorMsg}
		<div class="alert alert-error">
			<span>{errorMsg}</span>
		</div>
	{:else if collections.length === 0}
		<p class="text-base-content/70 text-center">No collections saved yet.</p>
	{:else}
		<p class="text-base-content/70 text-sm">{collections.length} collections</p>

		<div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
			{#each collections as collection (collection.id)}
				<a href="/collections/{collection.id}">
					<CollectionBadge {collection} owned={!data.user || ownedIds.has(collection.id)} />
				</a>
			{/each}
		</div>
	{/if}
</div>
