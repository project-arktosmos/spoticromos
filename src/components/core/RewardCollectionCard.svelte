<script lang="ts">
	import classNames from 'classnames';
	import type { UserCollectionWithRewards } from '$lib/server/repositories/rewards.repository';

	interface Props {
		collection: UserCollectionWithRewards;
		addingRewards: boolean;
		onadd: () => void;
		onclaim: () => void;
		classes?: string;
	}

	let { collection, addingRewards, onadd, onclaim, classes = '' }: Props = $props();

	let allClaimed = $derived(collection.claimed_items >= collection.total_items);
	let claimDisabled = $derived(collection.unclaimed_rewards < 1 || allClaimed);
</script>

<div class={classNames('card bg-base-200 shadow-sm', classes)}>
	{#if collection.cover_image_url}
		<figure>
			<img
				src={collection.cover_image_url}
				alt={collection.collection_name}
				class="aspect-square w-full object-cover"
			/>
		</figure>
	{:else}
		<figure>
			<div class="bg-base-300 flex aspect-square w-full items-center justify-center">
				<span class="text-base-content/30 text-4xl">&#9835;</span>
			</div>
		</figure>
	{/if}
	<div class="card-body gap-2 p-4">
		<h2 class="card-title text-base">{collection.collection_name}</h2>

		<div class="flex items-center gap-2">
			<span class="badge badge-primary badge-sm">
				{collection.unclaimed_rewards} rewards
			</span>
			<span class="badge badge-ghost badge-sm">
				{collection.claimed_items}/{collection.total_items} claimed
			</span>
		</div>

		{#if allClaimed}
			<p class="text-success text-xs font-medium">All items collected!</p>
		{/if}

		<div class="card-actions mt-2 flex gap-2">
			<button
				class={classNames('btn btn-sm btn-outline btn-secondary flex-1', {
					loading: addingRewards
				})}
				disabled={addingRewards}
				onclick={onadd}
			>
				{#if addingRewards}
					<span class="loading loading-spinner loading-xs"></span>
				{/if}
				+10 Rewards
			</button>
			<button
				class="btn btn-sm btn-primary flex-1"
				disabled={claimDisabled}
				onclick={onclaim}
			>
				Claim Items
			</button>
		</div>
	</div>
</div>
