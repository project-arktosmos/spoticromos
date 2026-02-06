<script lang="ts">
	import classNames from 'classnames';
	import type { CollectionItemWithArtists } from '$lib/server/repositories/collection.repository';

	interface Props {
		item: CollectionItemWithArtists;
		classes?: string;
	}

	let { item, classes = '' }: Props = $props();

	let computedClasses = $derived(classNames(
		'grid grid-cols-2 w-72 shrink-0 overflow-hidden rounded-lg border border-black bg-base-300',
		classes
	));
</script>

<div class={computedClasses}>
	<!-- Row 1: Track name (colspan 2) -->
	<div class="col-span-2 flex items-center justify-center p-2">
		<h3 class="truncate text-center text-sm font-semibold">{item.track_name}</h3>
	</div>

	<!-- Row 2: Album image | Artist image -->
	<div>
		{#if item.album_cover_url}
			<img
				src={item.album_cover_url}
				alt={item.album_name ?? item.track_name}
				class="aspect-square w-full object-cover"
			/>
		{:else}
			<div class="bg-base-300 flex aspect-square w-full items-center justify-center">
				<span class="text-base-content/30 text-4xl">♫</span>
			</div>
		{/if}
	</div>
	<div>
		{#if item.artist_image_url}
			<img
				src={item.artist_image_url}
				alt={item.artists ?? ''}
				class="aspect-square w-full object-cover"
			/>
		{:else}
			<div class="bg-base-300 flex aspect-square w-full items-center justify-center">
				<span class="text-base-content/30 text-3xl">♪</span>
			</div>
		{/if}
	</div>

	<!-- Row 3: Album | Artist -->
	<div class="flex items-center justify-center p-2">
		<p class="text-base-content/60 line-clamp-2 text-center text-xs">{item.album_name ?? '--'}</p>
	</div>
	<div class="flex items-center justify-center  p-2">
		<p class="text-base-content/70 line-clamp-2 text-center text-xs">{item.artists ?? '--'}</p>
	</div>

</div>
