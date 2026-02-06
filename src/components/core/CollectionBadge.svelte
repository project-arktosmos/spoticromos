<script lang="ts">
	import classNames from 'classnames';
	import type { CollectionRow } from '$lib/server/repositories/collection.repository';

	interface Props {
		collection: CollectionRow;
		owned?: boolean;
		classes?: string;
		onUnlock?: (e: MouseEvent) => void;
		progress?: number;
		progressMax?: number;
		rarityColor?: string | null;
	}

	let {
		collection,
		owned = true,
		classes = '',
		onUnlock,
		progress = 0,
		progressMax = 0,
		rarityColor = null
	}: Props = $props();

	let computedClasses = $derived(
		classNames(
			'relative flex w-full flex-col overflow-hidden rounded-lg border-2 transition-all duration-300',
			{ 'bg-base-300': !rarityColor },
			{ 'border-base-300': !rarityColor },
			{
				'[border-color:var(--rc)] [box-shadow:0_0_12px_var(--rc-40)] [background-color:var(--rc-20)]':
					!!rarityColor
			},
			classes
		)
	);

	let contentClasses = $derived(
		classNames('flex min-w-0 flex-1 flex-col justify-between', { 'opacity-50': !owned })
	);

	let imageClasses = $derived(
		classNames('aspect-square w-full object-cover', { grayscale: !owned })
	);
</script>

<div
	class={computedClasses}
	style:--rc={rarityColor ?? undefined}
	style:--rc-20={rarityColor ? `${rarityColor}20` : undefined}
	style:--rc-40={rarityColor ? `${rarityColor}40` : undefined}
>
	<div class={contentClasses}>
		<!-- Collection name -->
		<div class="flex items-center justify-center p-2">
			<h3 class="truncate text-center text-lg font-semibold">{collection.name}</h3>
		</div>

		<!-- Collection image -->
		{#if collection.cover_image_url}
			<img src={collection.cover_image_url} alt={collection.name} class={imageClasses} />
		{:else}
			<div class="flex aspect-square w-full items-center justify-center bg-base-300">
				<span class="text-4xl text-base-content/30">♫</span>
			</div>
		{/if}

		<!-- Progress bar -->
		<div class="px-2 py-1">
			<progress class="progress h-3 w-full progress-primary" value={progress} max={progressMax || 1}
			></progress>
		</div>

		<!-- Creator name -->
		<div class="flex items-center justify-center p-2">
			<p class="text-md line-clamp-2 text-center text-base-content/70">
				By {collection.creator_display_name ?? '--'}
			</p>
		</div>
	</div>

	{#if !owned && onUnlock}
		<button
			class="btn absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 btn-primary"
			onclick={onUnlock}
		>
			Unlock
		</button>
	{/if}
</div>
