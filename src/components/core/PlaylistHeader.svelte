<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		name: string;
		image?: string;
		description?: string;
		trackCount: number;
		children?: Snippet;
	}

	let { name, image = '', description = '', trackCount, children }: Props = $props();
</script>

<div class="flex flex-col gap-4 sm:flex-row sm:items-end">
	{#if image}
		<img src={image} alt={name} class="aspect-square w-48 rounded-lg object-cover shadow-md" />
	{/if}
	<div class="flex flex-col gap-1">
		<h1 class="text-3xl font-bold">{name}</h1>
		{#if description}
			<p class="text-sm text-base-content/60">{description}</p>
		{/if}
		<p class="text-sm text-base-content/50">{trackCount} tracks</p>
		{#if children}
			{@render children()}
		{/if}
	</div>
</div>
