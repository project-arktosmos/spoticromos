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
	<dialog class="modal-open modal">
		<div class="modal-box md:h-[90vh] md:max-h-none md:w-[90vw] md:max-w-none">
			<div class="mb-4 flex items-center justify-between">
				<h3 class="text-lg font-bold">{collectionName}</h3>
				<span class="badge badge-primary">{unrevealedCount} remaining</span>
			</div>

			{#if errorMsg}
				<div class="mb-4 alert alert-error">
					<span>{errorMsg}</span>
				</div>
			{/if}

			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
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
								'flex min-h-48 w-full items-center justify-center overflow-hidden rounded-lg border-2 border-black bg-base-300',
								'cursor-pointer transition-all duration-300 hover:scale-105',
								{ 'pointer-events-none animate-pulse': card.loading }
							)}
							disabled={card.loading}
							onclick={() => claimCard(i)}
						>
							{#if card.loading}
								<span class="loading loading-lg loading-spinner"></span>
							{:else}
								<span class="text-7xl font-bold text-base-content/20">?</span>
							{/if}
						</button>
					{/if}
				{/each}
			</div>

			<div class="modal-action flex items-center justify-between">
				{#if unrevealedCount > 0}
					<button
						class={classNames('btn btn-sm btn-secondary', { loading: claimingAll })}
						disabled={claimingAll}
						onclick={claimAll}
					>
						{#if claimingAll}
							<span class="loading loading-xs loading-spinner"></span>
						{/if}
						Claim All ({unrevealedCount})
					</button>
				{:else}
					<div></div>
				{/if}
				<button class="btn btn-sm btn-primary" onclick={handleClose}>Close</button>
			</div>
		</div>
		<form method="dialog" class="modal-backdrop">
			<button onclick={handleClose}>close</button>
		</form>
	</dialog>
{/if}
