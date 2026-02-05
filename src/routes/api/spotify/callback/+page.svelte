<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { spotifyService } from '$services/spotify.service';

	let status: 'loading' | 'success' | 'error' = 'loading';
	let errorMessage = '';

	function goHome() {
		goto('/');
	}

	onMount(async () => {
		const params = new URLSearchParams(window.location.search);
		const code = params.get('code');
		const error = params.get('error');

		if (error) {
			status = 'error';
			errorMessage = error;
			return;
		}

		if (!code) {
			status = 'error';
			errorMessage = 'No authorization code received';
			return;
		}

		const success = await spotifyService.handleCallback(code);
		if (success) {
			status = 'success';
			setTimeout(() => goto('/'), 1500);
		} else {
			status = 'error';
			errorMessage = 'Failed to exchange authorization code';
		}
	});
</script>

<div class="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
	{#if status === 'loading'}
		<span class="loading loading-lg loading-spinner"></span>
		<p class="text-base-content/70">Connecting to Spotify...</p>
	{:else if status === 'success'}
		<p class="text-lg text-success">Successfully connected!</p>
		<p class="text-base-content/70">Redirecting...</p>
	{:else}
		<p class="text-lg text-error">Authentication Failed</p>
		<p class="text-base-content/70">{errorMessage}</p>
		<button class="btn mt-4 btn-primary" onclick={goHome}>Try Again</button>
	{/if}
</div>
