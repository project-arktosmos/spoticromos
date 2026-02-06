<script lang="ts">
	import { onMount } from 'svelte';
	import type {
		CollectionRow,
		CollectionItemWithArtists
	} from '$lib/server/repositories/collection.repository';
	import CollectionItem from '$components/core/CollectionItem.svelte';
	import CollectionBadge from '$components/core/CollectionBadge.svelte';

	interface CollectionWithCount extends CollectionRow {
		track_count: number;
	}

	let collections = $state<CollectionWithCount[]>([]);
	let items = $state<CollectionItemWithArtists[]>([]);
	let selectedCollectionId = $state<number | null>(null);
	let loading = $state(true);
	let errorMsg = $state('');

	onMount(async () => {
		try {
			const res = await fetch('/api/collections');
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = await res.json();
			collections = data.collections;

			if (collections.length > 0) {
				await loadCollection(collections[0].id);
			}
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to load collections';
		} finally {
			loading = false;
		}
	});

	async function loadCollection(id: number) {
		selectedCollectionId = id;
		try {
			const res = await fetch(`/api/collections/${id}`);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = await res.json();
			items = data.items;
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to load items';
		}
	}
</script>

<div class="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 p-8">
	<div class="flex flex-col gap-1">
		<h1 class="text-2xl font-bold">Component Showcase</h1>
		<p class="text-base-content/60 text-sm">Preview of reusable UI components with live data.</p>
	</div>

	{#if loading}
		<div class="flex flex-1 items-center justify-center">
			<span class="loading loading-spinner loading-lg"></span>
		</div>
	{:else if errorMsg}
		<div class="alert alert-error">
			<span>{errorMsg}</span>
		</div>
	{:else}
		<section class="flex flex-col gap-4">
			<div class="flex items-center justify-between">
				<h2 class="text-lg font-semibold">CollectionItem</h2>
				{#if collections.length > 1}
					<select
						class="select select-bordered select-sm"
						value={selectedCollectionId}
						onchange={(e) => {
							const id = Number((e.target as HTMLSelectElement).value);
							loadCollection(id);
						}}
					>
						{#each collections as col (col.id)}
							<option value={col.id}>{col.name} ({col.track_count} tracks)</option>
						{/each}
					</select>
				{/if}
			</div>

			{#if items.length > 0}
				<div class="flex flex-wrap gap-4">
					{#each items as item (item.id)}
						<CollectionItem {item} />
					{/each}
				</div>
			{:else}
				<p class="text-base-content/70 text-center">No items in this collection.</p>
			{/if}
		</section>

		<section class="flex flex-col gap-4">
			<h2 class="text-lg font-semibold">CollectionBadge</h2>

			{#if collections.length > 0}
				<div class="flex flex-wrap gap-4">
					{#each collections as collection (collection.id)}
						<CollectionBadge {collection} />
					{/each}
				</div>
			{:else}
				<p class="text-base-content/70 text-center">No collections available.</p>
			{/if}
		</section>
	{/if}
</div>
