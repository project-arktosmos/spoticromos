<script lang="ts">
	import { onMount } from 'svelte';
	import type { UserCollectionWithRewards } from '$lib/server/repositories/rewards.repository';
	import TriviaGame from '$components/core/TriviaGame.svelte';

	let { data } = $props();

	// ---------------------------------------------------------------------------
	// Phase 1: Collection selection
	// ---------------------------------------------------------------------------

	let collections = $state<UserCollectionWithRewards[]>([]);
	let loadingCollections = $state(true);
	let errorMsg = $state('');

	let selectedCollection = $state<UserCollectionWithRewards | null>(null);

	// ---------------------------------------------------------------------------
	// Data fetching
	// ---------------------------------------------------------------------------

	onMount(async () => {
		try {
			const res = await fetch('/api/rewards');
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = await res.json();
			collections = data.collections;
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to load collections';
		} finally {
			loadingCollections = false;
		}
	});

	function selectCollection(collection: UserCollectionWithRewards) {
		selectedCollection = collection;
	}

	function backToCollections() {
		selectedCollection = null;
	}
</script>

<div class="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-8">

	{#if !selectedCollection}
		<!-- PHASE 1: Collection selection -->
		<h1 class="text-2xl font-bold">Trivia</h1>
		<p class="text-base-content/70 text-sm">Pick a collection to play trivia with</p>

		{#if loadingCollections}
			<div class="flex flex-1 items-center justify-center">
				<span class="loading loading-spinner loading-lg"></span>
			</div>
		{:else if errorMsg}
			<div class="alert alert-error"><span>{errorMsg}</span></div>
		{:else if collections.length === 0}
			<p class="text-base-content/70 text-center">No owned collections. Add collections from the Rewards page first.</p>
		{:else}
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each collections as collection (collection.collection_id)}
					<button
						class="card bg-base-200 text-left shadow-sm transition-shadow hover:shadow-md"
						onclick={() => selectCollection(collection)}
					>
						{#if collection.cover_image_url}
							<figure>
								<img
									src={collection.cover_image_url}
									alt={collection.collection_name}
									class="aspect-square w-full object-cover"
								/>
							</figure>
						{:else}
							<figure>
								<div class="bg-base-300 flex aspect-square w-full items-center justify-center">
									<span class="text-base-content/30 text-4xl">&#9835;</span>
								</div>
							</figure>
						{/if}
						<div class="card-body p-4">
							<h2 class="card-title text-base">{collection.collection_name}</h2>
							<p class="text-base-content/60 text-sm">{collection.total_items} tracks</p>
						</div>
					</button>
				{/each}
			</div>
		{/if}

	{:else}
		{#key selectedCollection.collection_id}
			<TriviaGame
				collectionId={selectedCollection.collection_id}
				collectionName={selectedCollection.collection_name}
				user={data.user}
				onBack={backToCollections}
			/>
		{/key}
	{/if}
</div>
