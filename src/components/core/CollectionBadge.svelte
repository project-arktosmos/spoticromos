<script lang="ts">
	import classNames from 'classnames';
	import type { CollectionRow } from '$lib/server/repositories/collection.repository';

	interface Props {
		collection: CollectionRow;
		owned?: boolean;
		classes?: string;
	}

	let { collection, owned = true, classes = '' }: Props = $props();

	let computedClasses = $derived(classNames(
		'flex w-full flex-col overflow-hidden rounded-lg border border-black bg-base-300',
		{ 'opacity-50': !owned },
		classes
	));

	let imageClasses = $derived(classNames(
		'aspect-square w-full object-cover',
		{ 'grayscale': !owned }
	));
</script>

<div class={computedClasses}>
	<!-- Collection name -->
	<div class="flex items-center justify-center p-2">
		<h3 class="truncate text-center text-2xl font-semibold">{collection.name}</h3>
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

	<!-- Creator name -->
	<div class="flex items-center justify-center p-2">
		<p class="text-base-content/70 line-clamp-2 text-center text-lg">By {collection.creator_display_name ?? '--'}</p>
	</div>
</div>
