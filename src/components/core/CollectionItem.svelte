<script lang="ts">
	import classNames from 'classnames';
	import type { CollectionItemWithArtists } from '$lib/server/repositories/collection.repository';

	interface Props {
		item: CollectionItemWithArtists;
		owned?: boolean;
		showToggle?: boolean;
		onToggleOwnership?: () => void;
		classes?: string;
		rarityColor?: string | null;
		rarityName?: string | null;
	}

	let { item, owned = true, showToggle = false, onToggleOwnership, classes = '', rarityColor = null, rarityName = null }: Props = $props();

	let borderStyle = $derived(
		owned && rarityColor ? `border-color: ${rarityColor}` : ''
	);

	let computedClasses = $derived(classNames(
		'grid grid-cols-2 w-72 shrink-0 overflow-hidden rounded-lg border-2 bg-base-300 relative',
		{ 'opacity-70': !owned, 'border-black': !rarityColor || !owned },
		classes
	));

	let imageClasses = $derived(classNames(
		'aspect-square w-full object-cover',
		{ 'grayscale': !owned }
	));
</script>

<div class={computedClasses} style={borderStyle}>
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
				class={imageClasses}
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
				class={imageClasses}
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

	{#if rarityName && owned}
		<div class="col-span-2 flex items-center justify-center py-1">
			<span
				class="text-xs font-bold uppercase tracking-wider"
				style="color: {rarityColor}"
			>
				{rarityName}
			</span>
		</div>
	{/if}

	{#if showToggle}
		<button
			class={classNames(
				'btn btn-circle btn-xs absolute top-1 right-1',
				{ 'btn-primary': owned, 'btn-ghost': !owned }
			)}
			onclick={onToggleOwnership}
			title={owned ? 'Remove from owned' : 'Add to owned'}
		>
			{owned ? '✓' : '+'}
		</button>
	{/if}
</div>
