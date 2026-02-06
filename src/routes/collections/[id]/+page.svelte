<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import type { CollectionRow, CollectionItemWithArtists } from '$lib/server/repositories/collection.repository';
	import type { OwnedItemRarity } from '$lib/server/repositories/ownership.repository';
	import CollectionItem from '$components/core/CollectionItem.svelte';

	let { data } = $props();

	let collection = $state<CollectionRow | null>(null);
	let items = $state<CollectionItemWithArtists[]>([]);
	let ownedItemIds = $state<Set<number>>(new Set());
	let ownedItemRarities = $state<Map<number, OwnedItemRarity>>(new Map());
	let loading = $state(true);
	let errorMsg = $state('');

	onMount(async () => {
		const id = $page.params.id;
		if (!id) return;

		try {
			const res = await fetch(`/api/collections/${id}`);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const json = await res.json();
			collection = json.collection;
			items = json.items;
			ownedItemIds = new Set(json.ownedItemIds ?? []);
			const rarityMap = new Map<number, OwnedItemRarity>();
			for (const r of json.ownedItemRarities ?? []) {
				rarityMap.set(r.collection_item_id, r);
			}
			ownedItemRarities = rarityMap;
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to load collection';
		} finally {
			loading = false;
		}
	});

	async function toggleItemOwnership(itemId: number) {
		if (!data.user || !collection) return;
		const isOwned = ownedItemIds.has(itemId);
		const method = isOwned ? 'DELETE' : 'POST';
		try {
			const res = await fetch(
				`/api/collections/${collection.id}/items/${itemId}/own`,
				{ method }
			);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const next = new Set(ownedItemIds);
			if (isOwned) {
				next.delete(itemId);
			} else {
				next.add(itemId);
			}
			ownedItemIds = next;
		} catch (err) {
			console.error('Failed to toggle item ownership:', err);
		}
	}
</script>

<div class="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 p-8">
	<div class="flex items-center gap-2">
		<a href="/collections" class="btn btn-ghost btn-sm">&larr; Back</a>
	</div>

	{#if loading}
		<div class="flex flex-1 items-center justify-center">
			<span class="loading loading-spinner loading-lg"></span>
		</div>
	{:else if errorMsg}
		<div class="alert alert-error">
			<span>{errorMsg}</span>
		</div>
	{:else if collection}
		<div class="flex items-center gap-6">
			{#if collection.cover_image_url}
				<img
					src={collection.cover_image_url}
					alt={collection.name}
					class="h-32 w-32 rounded-lg object-cover shadow"
				/>
			{/if}
			<div class="flex flex-col gap-1">
				<h1 class="text-2xl font-bold">{collection.name}</h1>
				{#if collection.creator_display_name}
					<p class="text-base-content/60 text-sm">by {collection.creator_display_name}</p>
				{/if}
				<p class="text-base-content/50 text-sm">{items.length} tracks</p>
			</div>
		</div>

		{#if items.length > 0}
			<div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
				{#each items as item (item.id)}
					{@const rarity = ownedItemRarities.get(item.id)}
					<CollectionItem
						{item}
						owned={!data.user || ownedItemIds.has(item.id)}
						showToggle={!!data.user}
						onToggleOwnership={() => toggleItemOwnership(item.id)}
						rarityColor={rarity?.rarity_color ?? null}
						rarityName={rarity?.rarity_name ?? null}
					/>
				{/each}
			</div>
		{:else}
			<p class="text-base-content/70 text-center">No tracks in this collection yet.</p>
		{/if}
	{/if}
</div>
