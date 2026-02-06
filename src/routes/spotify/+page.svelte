<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let { data } = $props();

	onMount(() => {
		if (data.user) {
			goto('/playlists');
		}
	});
</script>

{#if !data.user}
	<div class="flex min-h-[80vh] flex-col items-center justify-center gap-4 p-8">
		<h1 class="text-3xl font-bold">Spoticromos</h1>
		<p class="text-base-content/70">Connect your Spotify account to view your playlists.</p>
		<a href="/api/auth/login" class="btn btn-primary btn-lg">Connect to Spotify</a>
	</div>
{/if}
