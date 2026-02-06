<script lang="ts">
	import { onMount } from 'svelte';
	import type { CollectionRow } from '$lib/server/repositories/collection.repository';

	interface CollectionWithCount extends CollectionRow {
		track_count: number;
	}

	let collections = $state<CollectionWithCount[]>([]);
	let loading = $state(true);
	let errorMsg = $state('');

	onMount(async () => {
		try {
			const res = await fetch('/api/collections');
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = await res.json();
			collections = data.collections;
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to load collections';
		} finally {
			loading = false;
		}
	});
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

		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each collections as collection (collection.id)}
				<a href="/collections/{collection.id}" class="card bg-base-200 shadow-sm transition-shadow hover:shadow-md">
					{#if collection.cover_image_url}
						<figure>
							<img
								src={collection.cover_image_url}
								alt={collection.name}
								class="aspect-square w-full object-cover"
							/>
						</figure>
					{:else}
						<figure>
							<div
								class="bg-base-300 flex aspect-square w-full items-center justify-center"
							>
								<span class="text-base-content/30 text-4xl">♫</span>
							</div>
						</figure>
					{/if}
					<div class="card-body p-4">
						<h2 class="card-title text-base">{collection.name}</h2>
						<p class="text-base-content/60 text-sm">
							{collection.track_count} tracks
						</p>
						{#if collection.creator_name}
							<p class="text-base-content/50 text-xs">
								by {collection.creator_name}
							</p>
						{/if}
					</div>
				</a>
			{/each}
		</div>
	{/if}
</div>
