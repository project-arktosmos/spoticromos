<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { spotifyService } from '$services/spotify.service';
	import type { SpotifyPlaylist } from '$types/spotify.type';

	let query = $state('');
	let playlists = $state<SpotifyPlaylist[]>([]);
	let loading = $state(false);
	let total = $state(0);
	let offset = $state(0);
	let searched = $state(false);
	const limit = 20;

	let debounceTimer: ReturnType<typeof setTimeout> | undefined;

	onMount(() => {
		if (!spotifyService.isAuthenticated()) {
			goto('/profile');
		}
	});

	function handleInput() {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			if (query.trim().length >= 2) {
				resetAndSearch();
			}
		}, 400);
	}

	function handleSubmit(e: Event) {
		e.preventDefault();
		clearTimeout(debounceTimer);
		if (query.trim()) {
			resetAndSearch();
		}
	}

	function resetAndSearch() {
		playlists = [];
		total = 0;
		offset = 0;
		searched = true;
		searchPlaylists();
	}

	async function searchPlaylists() {
		if (!query.trim()) return;
		loading = true;
		const response = await spotifyService.searchPlaylists(query.trim(), limit, offset);
		if (response) {
			const validItems = response.items.filter((item): item is SpotifyPlaylist => item != null);
			playlists = [...playlists, ...validItems];
			total = response.total;
			offset += response.items.length;
		}
		loading = false;
	}
</script>

<div class="flex min-h-screen w-full flex-col gap-6 p-4 tablet:p-8">
	<h1 class="text-2xl font-bold">Search Playlists</h1>

	<form onsubmit={handleSubmit} class="flex gap-2">
		<input
			type="text"
			placeholder="Search Spotify playlists..."
			class="input-bordered input flex-1"
			bind:value={query}
			oninput={handleInput}
		/>
		<button type="submit" class="btn btn-primary" disabled={loading || !query.trim()}>
			{#if loading && playlists.length === 0}
				<span class="loading loading-sm loading-spinner"></span>
			{/if}
			Search
		</button>
	</form>

	{#if playlists.length > 0}
		<p class="text-sm text-base-content/70">{total} results</p>

		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each playlists as playlist (playlist.id)}
				<a
					href={playlist.external_urls.spotify}
					target="_blank"
					rel="noopener noreferrer"
					class="card bg-base-200 shadow-sm transition-shadow hover:shadow-md"
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
						<h2 class="card-title text-base">{playlist.name}</h2>
						<p class="text-sm text-base-content/60">
							{playlist.tracks.total} tracks
						</p>
						{#if playlist.owner?.display_name}
							<p class="text-xs text-base-content/50">
								by {playlist.owner.display_name}
							</p>
						{/if}
						{#if playlist.description}
							<p class="line-clamp-2 text-xs text-base-content/50">
								{@html playlist.description}
							</p>
						{/if}
					</div>
				</a>
			{/each}
		</div>

		{#if playlists.length < total}
			<div class="flex justify-center py-4">
				<button class="btn btn-sm btn-primary" onclick={searchPlaylists} disabled={loading}>
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
	{:else if searched}
		<p class="text-center text-base-content/70">No playlists found.</p>
	{/if}
</div>
