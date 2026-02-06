<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import classNames from 'classnames';
	import { spotifyService } from '$services/spotify.service';
	import type { SpotifyPlaylist } from '$types/spotify.type';

	let playlists = $state<SpotifyPlaylist[]>([]);
	let loading = $state(false);
	let total = $state(0);
	let offset = $state(0);
	let importedIds = $state<Set<string>>(new Set());
	const limit = 20;

	onMount(() => {
		if (!spotifyService.isAuthenticated()) {
			goto('/profile');
			return;
		}
		fetchPlaylists();
		fetchImportedCollections();
	});

	async function fetchImportedCollections() {
		try {
			const res = await fetch('/api/collections?limit=100');
			if (res.ok) {
				const data = await res.json();
				importedIds = new Set(
					data.collections.map((c: { spotify_playlist_id: string }) => c.spotify_playlist_id)
				);
			}
		} catch {
			// Non-critical
		}
	}

	async function fetchPlaylists() {
		loading = true;
		const response = await spotifyService.getPlaylists(limit, offset);
		if (response) {
			playlists = [...playlists, ...response.items];
			total = response.total;
			offset += response.items.length;
		}
		loading = false;
	}

	async function refetchPlaylists() {
		spotifyService.clearCache();
		playlists = [];
		total = 0;
		offset = 0;
		await fetchPlaylists();
	}
</script>

<div class="flex min-h-screen w-full flex-col gap-6 p-4 tablet:p-8">
	<div class="flex items-center justify-between">
		<h1 class="text-2xl font-bold">Import</h1>
		<button class="btn btn-outline btn-sm" onclick={refetchPlaylists} disabled={loading}>
			{#if loading}
				<span class="loading loading-xs loading-spinner"></span>
			{/if}
			Refresh
		</button>
	</div>

	{#if playlists.length > 0}
		<p class="text-sm text-base-content/70">{total} playlists</p>

		<div class="grid grid-cols-2 gap-4 tablet:grid-cols-3 large:grid-cols-4">
			{#each playlists as playlist (playlist.id)}
				{@const imported = importedIds.has(playlist.id)}
				<a
					href={imported ? undefined : `/import/${playlist.id}`}
					class={classNames(
						'card bg-base-200 shadow-sm',
						imported ? 'cursor-default opacity-50' : 'transition-shadow hover:shadow-md'
					)}
					aria-disabled={imported}
					onclick={imported ? (e) => e.preventDefault() : undefined}
				>
					{#if playlist.images?.[0]?.url}
						<figure>
							<img
								src={playlist.images[0].url}
								alt={playlist.name}
								class="aspect-square w-full object-cover"
							/>
						</figure>
					{:else}
						<figure>
							<div class="flex aspect-square w-full items-center justify-center bg-base-300">
								<span class="text-4xl text-base-content/30">♫</span>
							</div>
						</figure>
					{/if}
					<div class="card-body p-4">
						<div class="flex items-center justify-between">
							<h2 class="card-title text-base">{playlist.name}</h2>
							{#if imported}
								<span class="badge badge-sm badge-success">Imported</span>
							{/if}
						</div>
						<p class="text-sm text-base-content/60">
							{playlist.tracks.total} tracks
						</p>
						{#if playlist.description}
							<p class="line-clamp-2 text-xs text-base-content/50">
								{playlist.description}
							</p>
						{/if}
					</div>
				</a>
			{/each}
		</div>

		{#if playlists.length < total}
			<div class="flex justify-center py-4">
				<button class="btn btn-sm btn-primary" onclick={fetchPlaylists} disabled={loading}>
					{#if loading}
						<span class="loading loading-sm loading-spinner"></span>
					{/if}
					Load More
				</button>
			</div>
		{/if}
	{:else if loading}
		<div class="flex flex-1 items-center justify-center">
			<span class="loading loading-lg loading-spinner"></span>
		</div>
	{:else}
		<p class="text-center text-base-content/70">No playlists found.</p>
	{/if}
</div>
