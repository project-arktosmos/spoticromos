<script lang="ts">
	import classNames from 'classnames';
	import PairCardBack from './PairCardBack.svelte';
	import PairCardFront from './PairCardFront.svelte';

	interface Props {
		imageUrl: string;
		label: string;
		kind: 'album' | 'artist';
		flipped: boolean;
		matched: boolean;
		gameLost: boolean;
	}

	let { imageUrl, label, kind, flipped, matched, gameLost }: Props = $props();

	let outerClasses = $derived(
		classNames(
			'[perspective:800px] w-full',
			!flipped && 'hover:scale-105',
			'transition-transform duration-200'
		)
	);

	let innerClasses = $derived(
		classNames(
			'relative w-full [transform-style:preserve-3d] transition-transform duration-500',
			flipped && '[transform:rotateY(180deg)]'
		)
	);

	let ringClasses = $derived(
		classNames(
			'rounded-lg',
			matched && 'ring-2 ring-success ring-offset-2 ring-offset-base-100',
			gameLost && !matched && 'ring-2 ring-error/50'
		)
	);
</script>

<div class={outerClasses}>
	<div class={classNames(innerClasses, ringClasses)}>
		<div class="[backface-visibility:hidden]">
			<PairCardBack />
		</div>
		<div class="absolute inset-0 [transform:rotateY(180deg)] [backface-visibility:hidden]">
			<PairCardFront {imageUrl} {label} {kind} {matched} {gameLost} />
		</div>
	</div>
</div>
