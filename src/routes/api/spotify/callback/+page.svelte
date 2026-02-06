<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	onMount(() => {
		// The OAuth callback is now handled server-side at /api/auth/callback.
		// Redirect in case anyone lands here via an old bookmark or link.
		goto('/');
	});
</script>

<div class="flex min-h-[80vh] flex-col items-center justify-center gap-4 p-8">
	<span class="loading loading-lg loading-spinner"></span>
	<p class="text-base-content/70">Redirecting...</p>
</div>
