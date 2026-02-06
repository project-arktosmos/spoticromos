<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import type { CollectionRow } from '$lib/server/repositories/collection.repository';
	import type { CollectionProgress } from '$lib/server/repositories/ownership.repository';
	import CollectionBadge from '$components/core/CollectionBadge.svelte';

	interface ProfileUser {
		spotify_id: string;
		display_name: string | null;
		avatar_url: string | null;
	}

	interface CollectionWithCount extends CollectionRow {
		track_count: number;
	}

	let { data } = $props();

	let profileUser = $state<ProfileUser | null>(null);
	let isOwnProfile = $derived(
		data.user && profileUser ? data.user.spotifyId === profileUser.spotify_id : false
	);
	let collections = $state<CollectionWithCount[]>([]);
	let progressMap = $state<Map<number, CollectionProgress>>(new Map());
	let loading = $state(true);
	let errorMsg = $state('');

	async function fetchProfile() {
		const id = $page.params.id!;
		loading = true;
		errorMsg = '';
		try {
			const res = await fetch(`/api/profile/${encodeURIComponent(id)}`);
			if (res.status === 404) {
				errorMsg = 'User not found';
				return;
			}
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const json = await res.json();
			profileUser = json.user;
			collections = json.collections;
			const pMap = new Map<number, CollectionProgress>();
			for (const cp of json.collectionProgress ?? []) {
				pMap.set(cp.collection_id, cp);
			}
			progressMap = pMap;
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to load profile';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		fetchProfile();
	});
</script>

<div class="flex min-h-screen w-full flex-col gap-6 p-4 tablet:p-8">
	{#if loading}
		<div class="flex flex-1 items-center justify-center">
			<span class="loading loading-lg loading-spinner"></span>
		</div>
	{:else if errorMsg}
		<div class="alert alert-error">
			<span>{errorMsg}</span>
		</div>
	{:else if profileUser}
		<div class="flex items-center gap-4">
			{#if profileUser.avatar_url}
				<img
					src={profileUser.avatar_url}
					alt={profileUser.display_name ?? 'User'}
					class="h-20 w-20 rounded-full object-cover"
				/>
			{:else}
				<div class="flex h-20 w-20 items-center justify-center rounded-full bg-base-300">
					<span class="text-3xl text-base-content/30">?</span>
				</div>
			{/if}
			<div>
				<h1 class="text-2xl font-bold">{profileUser.display_name ?? 'Unknown User'}</h1>
				<p class="text-sm text-base-content/70">
					{collections.length} collection{collections.length !== 1 ? 's' : ''}
				</p>
			</div>
			{#if isOwnProfile}
				<a href="/import" class="btn ml-auto btn-sm btn-primary">Add Collections</a>
			{/if}
		</div>

		{#if collections.length === 0}
			<p class="text-center text-base-content/70">This user has no collections yet.</p>
		{:else}
			<div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
				{#each collections as collection (collection.id)}
					{@const cp = progressMap.get(collection.id)}
					<a href="/profile/{profileUser.spotify_id}/collection/{collection.id}">
						<CollectionBadge
							{collection}
							owned={true}
							progress={cp?.completed_slots ?? 0}
							progressMax={cp?.total_slots ?? 0}
							rarityColor={cp?.highest_completed_rarity_color ?? null}
						/>
					</a>
				{/each}
			</div>
		{/if}
	{/if}
</div>
