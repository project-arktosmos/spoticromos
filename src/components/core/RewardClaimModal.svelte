<script lang="ts">
	import classNames from 'classnames';
	import type { CollectionItemWithArtists } from '$lib/server/repositories/collection.repository';
	import CollectionItem from '$components/core/CollectionItem.svelte';

	interface Props {
		collectionId: number;
		collectionName: string;
		unclaimedRewards: number;
		open: boolean;
		onclose: (claimedCount: number) => void;
	}

	let { collectionId, collectionName, unclaimedRewards, open, onclose }: Props = $props();

	interface RewardCard {
		revealed: boolean;
		item: CollectionItemWithArtists | null;
		loading: boolean;
	}

	let cards = $state<RewardCard[]>([]);
	let claimingAll = $state(false);
	let errorMsg = $state('');
	let totalClaimed = $state(0);

	// Reset cards when modal opens with new rewards
	$effect(() => {
		if (open) {
			cards = Array.from({ length: unclaimedRewards }, () => ({
				revealed: false,
				item: null,
				loading: false
			}));
			totalClaimed = 0;
			claimingAll = false;
			errorMsg = '';
		}
	});

	let unrevealedCount = $derived(cards.filter((c) => !c.revealed && !c.loading).length);

	async function claimCard(index: number) {
		if (cards[index].revealed || cards[index].loading) return;
		cards[index].loading = true;
		errorMsg = '';
		try {
			const res = await fetch('/api/rewards/claim', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ collectionId })
			});
			if (!res.ok) {
				const data = await res.json().catch(() => null);
				throw new Error(data?.message ?? `HTTP ${res.status}`);
			}
			const data = await res.json();
			cards[index].item = data.item;
			cards[index].revealed = true;
			totalClaimed++;
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to claim';
		} finally {
			cards[index].loading = false;
		}
	}

	async function claimAll() {
		claimingAll = true;
		for (let i = 0; i < cards.length; i++) {
			if (!cards[i].revealed && !cards[i].loading) {
				await claimCard(i);
				if (errorMsg) break;
			}
		}
		claimingAll = false;
	}

	function handleClose() {
		onclose(totalClaimed);
	}
</script>

{#if open}
	<dialog class="modal modal-open">
		<div class="modal-box max-w-4xl">
			<div class="mb-4 flex items-center justify-between">
				<h3 class="text-lg font-bold">{collectionName}</h3>
				<span class="badge badge-primary">{unrevealedCount} remaining</span>
			</div>

			{#if errorMsg}
				<div class="alert alert-error mb-4">
					<span>{errorMsg}</span>
				</div>
			{/if}

			<div class="flex flex-wrap justify-center gap-4">
				{#each cards as card, i}
					{#if card.revealed && card.item}
						<CollectionItem
							item={card.item}
							rarityColor={card.item.rarity_color ?? null}
							rarityName={card.item.rarity_name ?? null}
						/>
					{:else}
						<button
							class={classNames(
								'grid w-72 shrink-0 grid-cols-2 overflow-hidden rounded-lg border border-black bg-base-300',
								'cursor-pointer transition-transform hover:scale-105',
								{ 'animate-pulse pointer-events-none': card.loading }
							)}
							disabled={card.loading}
							onclick={() => claimCard(i)}
						>
							<!-- Row 1: matches CollectionItem track name row -->
							<div class="col-span-2 flex items-center justify-center p-2">
								<h3 class="text-sm font-semibold">???</h3>
							</div>
							<!-- Row 2: two square cells -->
							<div class="bg-base-300 flex aspect-square w-full items-center justify-center">
								{#if card.loading}
									<span class="loading loading-spinner loading-md"></span>
								{:else}
									<span class="text-base-content/20 text-5xl">?</span>
								{/if}
							</div>
							<div class="bg-base-300 flex aspect-square w-full items-center justify-center">
								{#if card.loading}
									<span class="loading loading-spinner loading-md"></span>
								{:else}
									<span class="text-base-content/20 text-5xl">?</span>
								{/if}
							</div>
							<!-- Row 3: matches CollectionItem label rows -->
							<div class="flex items-center justify-center p-2">
								<p class="text-base-content/40 text-xs">???</p>
							</div>
							<div class="flex items-center justify-center p-2">
								<p class="text-base-content/40 text-xs">???</p>
							</div>
						</button>
					{/if}
				{/each}
			</div>

			<div class="modal-action flex items-center justify-between">
				{#if unrevealedCount > 0}
					<button
						class={classNames('btn btn-secondary btn-sm', { loading: claimingAll })}
						disabled={claimingAll}
						onclick={claimAll}
					>
						{#if claimingAll}
							<span class="loading loading-spinner loading-xs"></span>
						{/if}
						Claim All ({unrevealedCount})
					</button>
				{:else}
					<div></div>
				{/if}
				<button class="btn btn-primary btn-sm" onclick={handleClose}>Close</button>
			</div>
		</div>
		<form method="dialog" class="modal-backdrop">
			<button onclick={handleClose}>close</button>
		</form>
	</dialog>
{/if}
