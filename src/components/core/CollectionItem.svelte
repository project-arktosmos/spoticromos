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

	let computedClasses = $derived(classNames(
		'grid grid-cols-2 w-full overflow-hidden rounded-lg border-2 relative transition-all duration-300',
		{ 'bg-base-300': !rarityColor },
		{
			'opacity-50': !owned,
			'opacity-80 border-dashed': owned && !stuck,
			'opacity-100 shadow-lg': owned && stuck,
		},
		{
			'border-base-content/20': !owned && !rarityColor,
			'border-base-content/40': owned && !stuck && !rarityColor,
			'border-black': owned && !stuck && !rarityColor,
		},
		{
			'[border-color:var(--rc)] [box-shadow:0_0_12px_var(--rc-40)] [background-color:var(--rc-20)]': stuck && !!rarityColor,
			'[border-color:var(--rc-40)] [background-color:var(--rc-20)]': owned && !stuck && !!rarityColor,
			'[background-color:var(--rc-20)]': !owned && !!rarityColor,
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

	let innerBorderClasses = $derived(classNames(
		{ 'border-dashed': owned && !stuck },
		{
			'border-base-content/20': !rarityColor && !owned,
			'border-base-content/40': !rarityColor && owned && !stuck,
			'border-base-content': !rarityColor && owned && stuck
		},
		{
			'[border-color:var(--rc)]': !!rarityColor && stuck,
			'[border-color:var(--rc-40)]': !!rarityColor && owned && !stuck,
			'[border-color:var(--rc-20)]': !!rarityColor && !owned,
		}
	));

	let albumCellClasses = $derived(classNames(
		'border-r-2 aspect-square overflow-hidden flex items-center justify-center bg-base-300',
		innerBorderClasses,
		{
			'[background-color:var(--rc)] [border-color:var(--rc)]': !!rarityColor && stuck,
			'[background-color:var(--rc-40)] [border-color:var(--rc-40)]': !!rarityColor && owned && !stuck,
			'[background-color:var(--rc-20)] [border-color:var(--rc-20)]': !!rarityColor && !owned,
		}
	));

	let artistCellClasses = $derived(classNames(
		'flex w-full items-center justify-center overflow-hidden p-3',
		{ '[background-color:var(--rc-80)]': !!rarityColor }
	));
</script>

<div
	class={computedClasses}
	style:--rc={rarityColor ?? undefined}
	style:--rc-20={rarityColor ? `${rarityColor}20` : undefined}
	style:--rc-40={rarityColor ? `${rarityColor}40` : undefined}
	style:--rc-80={rarityColor ? `${rarityColor}80` : undefined}
>
	<!-- Row 1: Track name (colspan 2) -->
	<div class="col-span-2 flex items-center justify-center bg-base-300 p-2">
		<h3 class="truncate text-center text-sm font-semibold">{item.track_name}</h3>
	</div>

	<!-- Divider top -->
	<div class={classNames("col-span-2 border-t-2", innerBorderClasses)}></div>

	<!-- Row 2: Album image | Artist image -->
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div
		class={classNames('col-span-2 grid grid-cols-2', { 'cursor-pointer': onToggleStick && owned })}
		onclick={() => { if (onToggleStick && owned) onToggleStick(); }}
	>
		<div class={albumCellClasses}>
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
		<div class={artistCellClasses}>
			{#if item.artist_image_url}
				<img
					src={item.artist_image_url}
					alt={item.artists ?? ''}
					class={classNames(imageClasses, 'rounded-full border-2 object-cover', innerBorderClasses)}
				/>
			{:else}
				<div
					class={classNames("bg-base-300 flex aspect-square w-full items-center justify-center rounded-full border-2", innerBorderClasses)}
				>
					<span class="text-base-content/30 text-3xl">&#9834;</span>
				</div>
			{/if}
		</div>
	</div>

	<!-- Divider bottom -->
	<div class={classNames("col-span-2 border-t-2", innerBorderClasses)}></div>

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
						'rounded px-1 py-0.5 text-[10px] font-bold leading-none text-white shadow [background-color:var(--badge-color)]',
						{ 'ring-2 ring-white ring-offset-1': rc.is_stuck }
					)}
					style:--badge-color={rc.rarity_color}
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
