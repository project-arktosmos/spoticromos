<script lang="ts">
	import classNames from 'classnames';
	import type { CollectionItemWithArtists } from '$lib/server/repositories/collection.repository';
	import type { OwnedItemRarity } from '$lib/server/repositories/ownership.repository';

	interface Props {
		item: CollectionItemWithArtists;
		owned?: boolean;
		stuck?: boolean;
		showToggle?: boolean;
		onToggleOwnership?: () => void;
		onToggleStick?: () => void;
		onOpenDetail?: () => void;
		showStickInHeader?: boolean;
		classes?: string;
		rarityColor?: string | null;
		rarityName?: string | null;
		rarityCounts?: OwnedItemRarity[];
	}

	let { item, owned = true, stuck = false, showToggle = false, onToggleOwnership, onToggleStick, onOpenDetail, showStickInHeader = false, classes = '', rarityColor = null, rarityName = null, rarityCounts = [] }: Props = $props();

	let cardStyle = $derived(() => {
		const bg = rarityColor ? `background-color: ${rarityColor}20;` : '';
		if (stuck && rarityColor) {
			return `border-color: ${rarityColor}; box-shadow: 0 0 12px ${rarityColor}40; ${bg}`;
		}
		if (owned && !stuck && rarityColor) {
			return `border-color: ${rarityColor}40; ${bg}`;
		}
		return bg;
	});

	let computedClasses = $derived(classNames(
		'grid grid-cols-2 w-full overflow-hidden rounded-lg border-2 relative transition-all duration-300',
		{ 'bg-base-300': !rarityColor },
		{
			'opacity-50 border-base-content/20': !owned,
			'opacity-80 border-dashed border-base-content/40': owned && !stuck,
			'opacity-100 shadow-lg': owned && stuck,
			'border-black': !rarityColor && owned && !stuck
		},
		classes
	));

	let imageClasses = $derived(classNames(
		'aspect-square w-full object-cover transition-all duration-300',
		{
			'grayscale opacity-60': !owned,
			'grayscale-[50%] opacity-80': owned && !stuck
		}
	));

	let innerBorderStyle = $derived(() => {
		if (!rarityColor) return '';
		if (stuck) return `border-color: ${rarityColor};`;
		if (owned) return `border-color: ${rarityColor}40;`;
		return `border-color: ${rarityColor}20;`;
	});

	let innerBorderClasses = $derived(classNames(
		{ 'border-dashed': owned && !stuck },
		{
			'border-base-content/20': !rarityColor && !owned,
			'border-base-content/40': !rarityColor && owned && !stuck,
			'border-base-content': !rarityColor && owned && stuck
		}
	));

	let artistCellBgStyle = $derived(() => {
		if (!rarityColor) return '';
		if (stuck) return `background-color: ${rarityColor}80;`;
		if (owned) return `background-color: ${rarityColor}80;`;
		return `background-color: ${rarityColor}80;`;
	});

	let albumCellStyle = $derived(() => {
		const border = innerBorderStyle();
		if (!rarityColor) return border;
		if (stuck) return `${border} background-color: ${rarityColor};`;
		if (owned) return `${border} background-color: ${rarityColor}40;`;
		return `${border} background-color: ${rarityColor}20;`;
	});
</script>

<div class={computedClasses} style={cardStyle()}>
	<!-- Row 1: Track name (colspan 2) -->
	<div class="col-span-2 flex items-center justify-center bg-base-300 p-2">
		<h3 class="truncate text-center text-sm font-semibold">{item.track_name}</h3>
	</div>

	<!-- Divider top -->
	<div class={classNames("col-span-2 border-t-2", innerBorderClasses)} style={innerBorderStyle()}></div>

	<!-- Row 2: Album image | Artist image -->
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div
		class={classNames('col-span-2 grid grid-cols-2', { 'cursor-pointer': onToggleStick && owned })}
		onclick={() => { if (onToggleStick && owned) onToggleStick(); }}
	>
		<div class={classNames("border-r-2 aspect-square overflow-hidden flex items-center justify-center bg-base-300", innerBorderClasses)} style={albumCellStyle()}>
			{#if item.album_cover_url}
				<img
					src={item.album_cover_url}
					alt={item.album_name ?? item.track_name}
					class={imageClasses}
				/>
			{:else}
				<div class="bg-base-300 flex aspect-square w-full items-center justify-center">
					<span class="text-base-content/30 text-4xl">&#9835;</span>
				</div>
			{/if}
		</div>
		<div class="flex w-full items-center justify-center overflow-hidden p-3" style={artistCellBgStyle()}>
			{#if item.artist_image_url}
				<img
					src={item.artist_image_url}
					alt={item.artists ?? ''}
					class={classNames(imageClasses, 'rounded-full border-2 object-cover', innerBorderClasses)}
					style={innerBorderStyle()}
				/>
			{:else}
				<div
					class={classNames("bg-base-300 flex aspect-square w-full items-center justify-center rounded-full border-2", innerBorderClasses)}
					style={innerBorderStyle()}
				>
					<span class="text-base-content/30 text-3xl">&#9834;</span>
				</div>
			{/if}
		</div>
	</div>

	<!-- Divider bottom -->
	<div class={classNames("col-span-2 border-t-2", innerBorderClasses)} style={innerBorderStyle()}></div>

	<!-- Row 3: Album | Artist -->
	<div class="flex min-h-12 items-center justify-center bg-base-300 p-2">
		<p class="text-base-content/60 line-clamp-2 text-center text-xs">{item.album_name ?? '--'}</p>
	</div>
	<div class="flex min-h-12 items-center justify-center bg-base-300 p-2">
		<p class="text-base-content/70 line-clamp-2 text-center text-xs">{item.artists ?? '--'}</p>
	</div>

	{#if rarityCounts.length > 0 && owned}
		<div class="absolute top-1 left-1 flex flex-col gap-0.5">
			{#each rarityCounts as rc}
				<span
					class={classNames(
						'rounded px-1 py-0.5 text-[10px] font-bold leading-none text-white shadow',
						{ 'ring-2 ring-white ring-offset-1': rc.is_stuck }
					)}
					style="background-color: {rc.rarity_color}"
				>
					{rc.copy_count}x {rc.rarity_name}
					{#if rc.is_stuck}
						<span class="ml-0.5">&#9733;</span>
					{/if}
				</span>
			{/each}
		</div>
	{/if}

	{#if onOpenDetail}
		<button
			class="btn btn-circle btn-xs btn-ghost absolute top-1 right-1"
			onclick={onOpenDetail}
			title="View details"
		>
			<i class="fa-solid fa-arrow-up text-[10px]"></i>
		</button>
	{/if}

	{#if showToggle}
		<div class="absolute top-1 right-1 flex flex-col gap-1"
			class:top-7={!!onOpenDetail}
		>
			<button
				class={classNames(
					'btn btn-circle btn-xs',
					{ 'btn-primary btn-outline': owned, 'btn-ghost': !owned }
				)}
				onclick={onToggleOwnership}
				title={owned ? 'Remove from owned' : 'Add to owned'}
			>
				{#if owned}&#10003;{:else}+{/if}
			</button>
		</div>
	{/if}
</div>
