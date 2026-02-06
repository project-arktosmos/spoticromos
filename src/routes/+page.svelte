<script lang="ts">
	let { data } = $props();
</script>

{#if data.user}
	<div class="flex min-h-[80vh] flex-col items-center justify-center gap-4 p-8">
		<h1 class="text-3xl font-bold">Welcome back, {data.user.displayName}!</h1>
		<p class="text-base-content/70">What would you like to do?</p>
		<div class="flex gap-3">
			<a href="/import" class="btn btn-primary">Import Playlists</a>
			<a href="/collections" class="btn btn-outline">My Collections</a>
		</div>
	</div>
{:else}
	<div class="flex min-h-[80vh] flex-col items-center justify-center gap-4 p-8">
		<h1 class="text-3xl font-bold">Spoticromos</h1>
		<p class="text-base-content/70">Connect your Spotify account to import your playlists.</p>
		<a href="/api/auth/login" class="btn btn-primary btn-lg">Login with Spotify</a>
	</div>
{/if}
