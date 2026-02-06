<script lang="ts">
	import classNames from 'classnames';

	interface Props {
		classes?: string;
	}

	let { classes = '' }: Props = $props();
</script>

<div class={classNames('flex w-full flex-col overflow-hidden rounded-lg', classes)}>
	<div class="bg-primary flex aspect-square w-full items-center justify-center">
		<span class="text-primary-content text-4xl">&#9835;</span>
	</div>
	<div class="bg-primary/80 px-2 py-1">
		<p class="truncate text-xs font-medium text-transparent">&nbsp;</p>
	</div>
	<div class="bg-primary/80 px-2 py-1">
		<span class="badge badge-xs invisible">.</span>
	</div>
</div>
