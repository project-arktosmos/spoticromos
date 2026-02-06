<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { spotifyService } from '$services/spotify.service';
	import type { SpotifyPlaylist, EnrichedTrack } from '$types/spotify.type';
	import type { CollectionItemWithArtists } from '$lib/server/repositories/collection.repository';
	import PlaylistHeader from '$components/core/PlaylistHeader.svelte';
	import TrackTable from '$components/core/TrackTable.svelte';
	import EnrichmentPanel from '$components/core/EnrichmentPanel.svelte';
	import CollectionItem from '$components/core/CollectionItem.svelte';
	import type { TrackTableItem } from '$components/core/TrackTable.svelte';

	let playlist = $state<SpotifyPlaylist | null>(null);
	let tracks = $state<EnrichedTrack[]>([]);
	let loading = $state(false);
	let collectionId = $state<number | null>(null);
	let collectionItems = $state<CollectionItemWithArtists[]>([]);

	// Job polling state
	let jobStatus = $state<'idle' | 'running' | 'done'>('idle');
	let jobCompleted = $state(0);
	let jobFailed = $state(0);
	let jobTotal = $state(0);
	let currentTrackName = $state<string | null>(null);
	let currentPosition = $state(-1);
	let latestItem = $state<CollectionItemWithArtists | null>(null);
	let pollTimer: ReturnType<typeof setInterval> | null = null;

	$effect(() => {
		$page;
	});

	onMount(() => {
		if (!spotifyService.isAuthenticated()) {
			goto('/profile');
			return;
		}
		fetchPlaylist();
		return () => stopPolling();
	});

	async function fetchPlaylist() {
		const id = $page.params.id;
		if (!id) return;

		loading = true;

		try {
			const headers: Record<string, string> = {};
			const userToken = spotifyService.getAccessToken();
			if (userToken) {
				headers['X-Spotify-Token'] = userToken;
			}

			const response = await fetch(`/api/spotify/playlist?id=${id}`, { headers });

			if (!response.ok) return;

			const data = await response.json();
			playlist = data.playlist;

			const rawTracks = data.playlist.tracks.items || [];
			tracks = rawTracks
				.filter((item: { track: unknown }) => item.track)
				.map((item: { added_at: string; track: import('$types/spotify.type').SpotifyTrack }) => ({
					addedAt: item.added_at,
					basic: item.track,
					full: null,
					album: null,
					artists: [],
					lyrics: null,
					status: 'pending' as const
				}));

			// Upsert this playlist as a collection in the DB
			try {
				const pl = data.playlist as SpotifyPlaylist;
				const saveRes = await fetch('/api/collections/save', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						playlistId: pl.id,
						name: pl.name,
						coverImageUrl: pl.images?.[0]?.url || null,
						creatorName: pl.owner?.display_name || null,
						ownerId: pl.owner?.id || null
					})
				});
				if (saveRes.ok) {
					const saveData = await saveRes.json();
					collectionId = saveData.collectionId;

					// Fetch existing collection items and mark their tracks as done
					try {
						const itemsRes = await fetch(`/api/collections/${saveData.collectionId}`);
						if (itemsRes.ok) {
							const itemsData = await itemsRes.json();
							collectionItems = itemsData.items ?? [];

							const enrichedIds = new Set(
								collectionItems.map((ci: CollectionItemWithArtists) => ci.track_spotify_id)
							);
							tracks = tracks.map((t) =>
								enrichedIds.has(t.basic.id) ? { ...t, status: 'done' as const } : t
							);
						}
					} catch {
						// Non-critical — grid just stays empty
					}

					// Check if there's already a running job for this collection
					await pollStatus();
					if (jobStatus === 'running') {
						startPolling();
					}
				}
			} catch {
				// Non-critical — enrichment still works, just won't persist to collection tables
			}
		} finally {
			loading = false;
		}
	}

	async function startEnrichment() {
		if (collectionId === null) return;

		const pendingTracks = tracks
			.map((t, i) => ({ basic: t.basic, position: i }))
			.filter((_, i) => tracks[i].status !== 'done');

		if (pendingTracks.length === 0) return;

		const headers: Record<string, string> = { 'Content-Type': 'application/json' };
		const userToken = spotifyService.getAccessToken();
		if (userToken) headers['X-Spotify-Token'] = userToken;

		try {
			const res = await fetch('/api/enrich/collection', {
				method: 'POST',
				headers,
				body: JSON.stringify({ collectionId, tracks: pendingTracks })
			});

			if (!res.ok) return;

			const data = await res.json();
			jobStatus = data.status;
			jobTotal = data.total;
			jobCompleted = data.completed;
			jobFailed = data.failed;

			// Mark all pending tracks as part of the job
			tracks = tracks.map((t) =>
				t.status === 'pending' ? { ...t, status: 'fetching' as const } : t
			);

			startPolling();
		} catch (err) {
			console.error('Failed to start enrichment:', err);
		}
	}

	function startPolling() {
		if (pollTimer) return;
		pollTimer = setInterval(pollStatus, 1500);
	}

	function stopPolling() {
		if (pollTimer) {
			clearInterval(pollTimer);
			pollTimer = null;
		}
	}

	async function pollStatus() {
		if (collectionId === null) return;

		try {
			const res = await fetch(`/api/enrich/collection?collectionId=${collectionId}`);
			if (!res.ok) return;

			const data = await res.json();

			if (data.status === 'idle') return;

			jobStatus = data.status;
			jobTotal = data.total;
			jobCompleted = data.completed ?? 0;
			jobFailed = data.failed ?? 0;
			currentTrackName = data.currentTrackName;
			currentPosition = data.currentPosition ?? -1;

			// Merge new items into collectionItems
			if (data.items?.length) {
				const existingIds = new Set(collectionItems.map((ci) => ci.track_spotify_id));
				const newItems = (data.items as CollectionItemWithArtists[]).filter(
					(ci) => !existingIds.has(ci.track_spotify_id)
				);

				if (newItems.length > 0) {
					collectionItems = [...collectionItems, ...newItems];
					latestItem = newItems[newItems.length - 1];

					// Mark corresponding tracks as done
					const newIds = new Set(newItems.map((ci) => ci.track_spotify_id));
					tracks = tracks.map((t) =>
						newIds.has(t.basic.id) ? { ...t, status: 'done' as const } : t
					);
				}
			}

			// Mark currently enriching track as fetching
			if (data.currentTrackId) {
				tracks = tracks.map((t) =>
					t.basic.id === data.currentTrackId && t.status !== 'done'
						? { ...t, status: 'fetching' as const }
						: t
				);
			}

			if (data.status === 'done') {
				// Mark any remaining fetching tracks back to pending (they failed)
				tracks = tracks.map((t) =>
					t.status === 'fetching' ? { ...t, status: 'error' as const } : t
				);
				stopPolling();
			}
		} catch {
			// Polling failure is non-critical — will retry next interval
		}
	}

	let enrichedCount = $derived(tracks.filter((t) => t.status === 'done').length);
	let trackTableItems: TrackTableItem[] = $derived(
		tracks.map((t) => ({ track: t.basic, status: t.status }))
	);
</script>

<div class="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 p-8">
	<div class="flex items-center gap-2">
		<a href="/import" class="btn btn-ghost btn-sm">&larr; Back</a>
	</div>

	{#if playlist}
		<PlaylistHeader
			name={playlist.name}
			image={playlist.images?.[0]?.url || ''}
			description={playlist.description || ''}
			trackCount={tracks.length}
		/>
	{/if}

	{#if tracks.length > 0}
		<EnrichmentPanel
			totalTracks={tracks.length}
			{enrichedCount}
			status={jobStatus}
			{jobTotal}
			{jobCompleted}
			{jobFailed}
			{currentTrackName}
			{latestItem}
			onstart={startEnrichment}
		/>
	{/if}

	{#if collectionItems.length > 0}
		<div class="flex flex-wrap gap-4">
			{#each collectionItems as ci (ci.track_spotify_id)}
				<CollectionItem item={ci} />
			{/each}
		</div>
	{/if}

	{#if tracks.length > 0}
		<TrackTable items={trackTableItems} highlightIndex={currentPosition} />
	{:else if loading}
		<div class="flex flex-1 items-center justify-center">
			<span class="loading loading-spinner loading-lg"></span>
		</div>
	{:else}
		<p class="text-base-content/70 text-center">No tracks found.</p>
	{/if}
</div>
