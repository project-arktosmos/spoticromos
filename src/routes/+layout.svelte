<script lang="ts">
	import '../css/app.css';
	import '$services/i18n';
	import { onMount } from 'svelte';
	import { spotifyService } from '$services/spotify.service';
	import AppMenu from '$components/core/AppMenu.svelte';
	import TopNavbar from '$components/core/TopNavbar.svelte';
	import ThemeToggle from '$components/core/ThemeToggle.svelte';

	let { data, children } = $props();

	onMount(() => {
		if (data.accessToken) {
			// Hydrate the client-side service with the server-provided token.
			// Set expiry to 50 minutes from now — the server refreshes tokens
			// transparently, so a fresh token arrives on each full page load.
			spotifyService.setToken(data.accessToken, Date.now() + 50 * 60 * 1000);
		}
	});
</script>

<div class="flex min-h-screen flex-col">
	<TopNavbar user={data.user} />
	<div class="flex flex-1">
		<AppMenu />
		<main class="flex-1">
			{@render children?.()}
		</main>
	</div>
</div>
<ThemeToggle />
