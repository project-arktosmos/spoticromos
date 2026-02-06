<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { spotifyService } from '$services/spotify.service';
	import type { SpotifyPlaylist } from '$types/spotify.type';

	let playlists = $state<SpotifyPlaylist[]>([]);
	let loading = $state(false);
	let total = $state(0);
	let offset = $state(0);
	const limit = 20;

	onMount(() => {
		if (!spotifyService.isAuthenticated()) {
			goto('/spotify');
			return;
		}
		fetchPlaylists();
	});

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

	function handleLogout() {
		spotifyService.logout();
		goto('/spotify');
	}
</script>

<div class="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 p-8">
	<div class="flex items-center justify-between">
		<h1 class="text-2xl font-bold">Your Playlists</h1>
		<button class="btn btn-outline btn-sm" onclick={handleLogout}>Logout</button>
	</div>

	{#if playlists.length > 0}
		<p class="text-base-content/70 text-sm">{total} playlists</p>

		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each playlists as playlist (playlist.id)}
				<a href="/playlists/{playlist.id}" class="card bg-base-200 shadow-sm transition-shadow hover:shadow-md">
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
							<div class="bg-base-300 flex aspect-square w-full items-center justify-center">
								<span class="text-base-content/30 text-4xl">♫</span>
							</div>
						</figure>
					{/if}
					<div class="card-body p-4">
						<h2 class="card-title text-base">{playlist.name}</h2>
						<p class="text-base-content/60 text-sm">
							{playlist.tracks.total} tracks
						</p>
						{#if playlist.description}
							<p class="text-base-content/50 line-clamp-2 text-xs">
								{playlist.description}
							</p>
						{/if}
					</div>
				</a>
			{/each}
		</div>

		{#if playlists.length < total}
			<div class="flex justify-center py-4">
				<button
					class="btn btn-primary btn-sm"
					onclick={fetchPlaylists}
					disabled={loading}
				>
					{#if loading}
						<span class="loading loading-spinner loading-sm"></span>
					{/if}
					Load More
				</button>
			</div>
		{/if}
	{:else if loading}
		<div class="flex flex-1 items-center justify-center">
			<span class="loading loading-spinner loading-lg"></span>
		</div>
	{:else}
		<p class="text-base-content/70 text-center">No playlists found.</p>
	{/if}
</div>
