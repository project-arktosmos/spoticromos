<script lang="ts">
	import '../css/app.css';
	import { onMount } from 'svelte';
	import { spotifyService } from '$services/spotify.service';

	import TopNavbar from '$components/core/TopNavbar.svelte';
	import ThemeToggle from '$components/core/ThemeToggle.svelte';
	import AppFooter from '$components/core/AppFooter.svelte';
	import CookieBanner from '$components/core/CookieBanner.svelte';
	import ToastContainer from '$components/core/ToastContainer.svelte';

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
	<main class="mx-auto flex w-full flex-1 flex-col large:max-w-[1200px]">
		{@render children?.()}
		<AppFooter />
	</main>
</div>
<ThemeToggle />
<CookieBanner />
<ToastContainer />
