<script lang="ts">
	import classNames from 'classnames';

	interface Props {
		classes?: string;
	}

	let { classes = '' }: Props = $props();
</script>

<div class={classNames('flex w-full flex-col overflow-hidden rounded-lg', classes)}>
	<div class="flex aspect-square w-full items-center justify-center bg-primary">
		<span class="text-4xl text-primary-content">&#9835;</span>
	</div>
	<div class="bg-primary/80 px-2 py-1">
		<p class="truncate text-xs font-medium text-transparent">&nbsp;</p>
	</div>
	<div class="bg-primary/80 px-2 py-1">
		<span class="invisible badge badge-xs">.</span>
	</div>
</div>
