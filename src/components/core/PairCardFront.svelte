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

	let { imageUrl, label, kind, matched = false, classes = '' }: Props = $props();

	let imageClasses = $derived(
		classNames('aspect-square w-full object-cover', matched && 'opacity-80')
	);

	let kindBadgeClasses = $derived(
		classNames('badge badge-xs', kind === 'album' ? 'badge-primary' : 'badge-secondary')
	);
</script>

<div class={classNames('flex w-full flex-col overflow-hidden rounded-lg', classes)}>
	<img src={imageUrl} alt={label} class={imageClasses} />
	<div class="bg-base-200 px-2 py-1">
		<p class="truncate text-xs font-medium">{label}</p>
	</div>
	<div class="bg-base-200 px-2 py-1">
		<span class={kindBadgeClasses}>
			{kind}
		</span>
	</div>
</div>
