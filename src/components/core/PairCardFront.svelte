<script lang="ts">
	import classNames from 'classnames';

	interface Props {
		imageUrl: string;
		label: string;
		kind: 'album' | 'artist';
		matched?: boolean;
		gameLost?: boolean;
		classes?: string;
	}

	let { imageUrl, label, kind, matched = false, gameLost = false, classes = '' }: Props = $props();

	let containerClasses = $derived(classNames(
		'flex w-full flex-col overflow-hidden rounded-lg',
		'transition-transform duration-200',
		matched && 'ring-2 ring-success ring-offset-2 ring-offset-base-100',
		gameLost && !matched && 'ring-2 ring-error/50',
		classes
	));

	let imageClasses = $derived(classNames(
		'aspect-square w-full object-cover',
		matched && 'opacity-80'
	));

	let kindBadgeClasses = $derived(classNames(
		'badge badge-xs',
		kind === 'album' ? 'badge-primary' : 'badge-secondary'
	));
</script>

<div class={containerClasses}>
	<img
		src={imageUrl}
		alt={label}
		class={imageClasses}
	/>
	<div class="bg-base-200 px-2 py-1">
		<p class="truncate text-xs font-medium">{label}</p>
	</div>
	<div class="bg-base-200 px-2 py-1">
		<span class={kindBadgeClasses}>
			{kind}
		</span>
	</div>
</div>
