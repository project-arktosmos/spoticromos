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

	let { collection, owned = true, classes = '', onUnlock, progress = 0, progressMax = 0, rarityColor = null }: Props = $props();

	let progressPercent = $derived(progressMax > 0 ? Math.round(progress / progressMax * 100) : 0);

	let cardStyle = $derived(() => {
		if (!rarityColor) return '';
		return `border-color: ${rarityColor}; box-shadow: 0 0 12px ${rarityColor}40; background-color: ${rarityColor}20;`;
	});

	let computedClasses = $derived(classNames(
		'relative flex w-full flex-col overflow-hidden rounded-lg border-2 transition-all duration-300',
		{ 'bg-base-300': !rarityColor },
		{ 'border-base-300': !rarityColor },
		classes
	));

	let contentClasses = $derived(classNames(
		'flex min-w-0 flex-1 flex-col justify-between',
		{ 'opacity-50': !owned }
	));

	let imageClasses = $derived(classNames(
		'aspect-square w-full object-cover',
		{ 'grayscale': !owned }
	));

</script>

<div class={computedClasses} style={cardStyle()}>
	<div class={contentClasses}>
		<!-- Collection name -->
		<div class="flex items-center justify-center p-2">
			<h3 class="truncate text-center text-lg font-semibold">{collection.name}</h3>
		</div>

		<!-- Collection image -->
		{#if collection.cover_image_url}
			<img
				src={collection.cover_image_url}
				alt={collection.name}
				class={imageClasses}
			/>
		{:else}
			<div class="bg-base-300 flex aspect-square w-full items-center justify-center">
				<span class="text-base-content/30 text-4xl">♫</span>
			</div>
		{/if}

		<!-- Progress bar -->
		<div class="px-2 py-1">
			<progress class="progress progress-primary h-3 w-full" value={progress} max={progressMax || 1}></progress>
		</div>

		<!-- Creator name -->
		<div class="flex items-center justify-center p-2">
			<p class="text-base-content/70 line-clamp-2 text-center text-md">By {collection.creator_display_name ?? '--'}</p>
		</div>
	</div>

	{#if !owned && onUnlock}
		<button
			class="btn btn-primary absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
			onclick={onUnlock}
		>
			Unlock
		</button>
	{/if}
</div>
