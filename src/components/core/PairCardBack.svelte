<script lang="ts">
	import classNames from 'classnames';

	interface Props {
		matched?: boolean;
		gameLost?: boolean;
		classes?: string;
	}

	let { matched = false, gameLost = false, classes = '' }: Props = $props();

	let containerClasses = $derived(classNames(
		'flex w-full flex-col overflow-hidden rounded-lg',
		'transition-transform duration-200',
		matched && 'ring-2 ring-success ring-offset-2 ring-offset-base-100',
		!matched && 'hover:scale-105',
		gameLost && !matched && 'ring-2 ring-error/50',
		classes
	));
</script>

<div class={containerClasses}>
	<div class="bg-primary flex aspect-square w-full items-center justify-center">
		<span class="text-primary-content text-4xl">&#9835;</span>
	</div>
	<div class="bg-primary/80 px-2 py-1">
		<p class="truncate text-xs text-transparent">&nbsp;</p>
	</div>
	<div class="bg-primary/80 px-2 py-1">
		<p class="text-xs text-transparent">&nbsp;</p>
	</div>
</div>
