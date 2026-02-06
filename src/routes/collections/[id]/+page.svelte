<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import type { CollectionRow, CollectionItemWithArtists } from '$lib/server/repositories/collection.repository';
	import type { OwnedItemRarity } from '$lib/server/repositories/ownership.repository';
	import type { RarityRow } from '$types/rarity.type';
	import CollectionBadge from '$components/core/CollectionBadge.svelte';
	import CollectionItem from '$components/core/CollectionItem.svelte';
	import TriviaGame from '$components/core/TriviaGame.svelte';
	import PairsGame from '$components/core/PairsGame.svelte';
	import RewardClaimModal from '$components/core/RewardClaimModal.svelte';

	let { data } = $props();

	let collection = $state<CollectionRow | null>(null);
	let items = $state<CollectionItemWithArtists[]>([]);
	let ownedItemIds = $state<Set<number>>(new Set());
	let ownedItemRarities = $state<Map<number, OwnedItemRarity[]>>(new Map());
	let stuckItemIds = $state<Set<number>>(new Set());
	let allRarities = $state<RarityRow[]>([]);
	let loading = $state(true);
	let errorMsg = $state('');

	let showTriviaModal = $state(false);
	let showPairsModal = $state(false);
	let showClaimModal = $state(false);
	let unclaimedRewards = $state(0);

	// Free claim state
	const FREE_CLAIM_INTERVAL = 600; // 10 minutes in seconds
	let lastFreeClaim = $state<string | null>(null);
	let nowSeconds = $state(Math.floor(Date.now() / 1000));
	let freeClaimLoading = $state(false);
	let freeClaimTimer: ReturnType<typeof setInterval> | null = null;

	let freeClaimable = $derived.by(() => {
		if (!lastFreeClaim) return 1; // first free claim
		const lastClaimSec = Math.floor(new Date(lastFreeClaim).getTime() / 1000);
		const elapsed = nowSeconds - lastClaimSec;
		return Math.max(0, Math.floor(elapsed / FREE_CLAIM_INTERVAL));
	});

	let freeClaimCountdown = $derived.by(() => {
		if (!lastFreeClaim) return 0; // can claim now
		const lastClaimSec = Math.floor(new Date(lastFreeClaim).getTime() / 1000);
		const elapsed = nowSeconds - lastClaimSec;
		const remainder = elapsed % FREE_CLAIM_INTERVAL;
		return FREE_CLAIM_INTERVAL - remainder;
	});

	let countdownDisplay = $derived.by(() => {
		const total = freeClaimCountdown;
		const m = Math.floor(total / 60);
		const s = total % 60;
		return `${m}:${s.toString().padStart(2, '0')}`;
	});

	let modalItemId = $state<number | null>(null);
	let modalItem = $derived(modalItemId !== null ? items.find(i => i.id === modalItemId) ?? null : null);
	let modalRarities = $derived(modalItemId !== null ? ownedItemRarities.get(modalItemId) ?? [] : []);
	let modalBestRarity = $derived(modalRarities[0] ?? null);

	// Progress: collection complete when 1 copy of each rarity of each item is owned
	let totalSlots = $derived(items.length * allRarities.length);
	let completedSlots = $derived.by(() => {
		let count = 0;
		for (const rarities of ownedItemRarities.values()) {
			count += rarities.length;
		}
		return count;
	});
	let rarityProgress = $derived.by(() => {
		return allRarities.map(rarity => {
			let ownedCount = 0;
			for (const itemRarities of ownedItemRarities.values()) {
				if (itemRarities.some(r => r.rarity_id === rarity.id)) {
					ownedCount++;
				}
			}
			return { ...rarity, owned: ownedCount, total: items.length };
		});
	});

	// Highest fully-completed rarity color for the badge
	let badgeRarityColor = $derived.by(() => {
		let color: string | null = null;
		for (const rp of rarityProgress) {
			if (rp.total > 0 && rp.owned >= rp.total) {
				color = rp.color;
			}
		}
		return color;
	});

	let maxRarityLevel = $derived(
		allRarities.length > 0 ? allRarities[allRarities.length - 1].level : Infinity
	);

	function openDetailModal(itemId: number) {
		modalItemId = itemId;
	}

	function closeDetailModal() {
		modalItemId = null;
	}

	function applyCollectionData(json: any) {
		collection = json.collection;
		items = json.items;
		ownedItemIds = new Set(json.ownedItemIds ?? []);
		stuckItemIds = new Set(json.stuckItemIds ?? []);
		allRarities = json.rarities ?? [];
		unclaimedRewards = json.unclaimedRewards ?? 0;
		lastFreeClaim = json.lastFreeClaim ?? null;
		const rarityMap = new Map<number, OwnedItemRarity[]>();
		for (const r of json.ownedItemRarities ?? []) {
			const list = rarityMap.get(r.collection_item_id) ?? [];
			list.push(r);
			rarityMap.set(r.collection_item_id, list);
		}
		ownedItemRarities = rarityMap;
	}

	async function refetchCollectionData() {
		if (!collection) return;
		try {
			const res = await fetch(`/api/collections/${collection.id}`);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const json = await res.json();
			applyCollectionData(json);
		} catch (err) {
			console.error('Failed to refetch collection data:', err);
		}
	}

	onMount(async () => {
		const id = $page.params.id;
		if (!id) return;

		try {
			const res = await fetch(`/api/collections/${id}`);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const json = await res.json();
			applyCollectionData(json);
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to load collection';
		} finally {
			loading = false;
		}

		// Tick every second for the free claim countdown
		freeClaimTimer = setInterval(() => {
			nowSeconds = Math.floor(Date.now() / 1000);
		}, 1000);
	});

	onDestroy(() => {
		if (freeClaimTimer) clearInterval(freeClaimTimer);
	});

	async function claimFreeRewards() {
		if (!data.user || !collection || freeClaimable < 1 || freeClaimLoading) return;
		freeClaimLoading = true;
		try {
			const res = await fetch('/api/rewards/free-claim', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ collectionId: collection.id })
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.message ?? `HTTP ${res.status}`);
			}
			const result = await res.json();
			lastFreeClaim = result.lastFreeClaim;
			await refetchCollectionData();
		} catch (err) {
			console.error('Failed to claim free rewards:', err);
		} finally {
			freeClaimLoading = false;
		}
	}

	async function toggleItemOwnership(itemId: number) {
		if (!data.user || !collection) return;
		const isOwned = ownedItemIds.has(itemId);
		const method = isOwned ? 'DELETE' : 'POST';
		try {
			const res = await fetch(
				`/api/collections/${collection.id}/items/${itemId}/own`,
				{ method }
			);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const next = new Set(ownedItemIds);
			if (isOwned) {
				next.delete(itemId);
				if (stuckItemIds.has(itemId)) {
					const nextStuck = new Set(stuckItemIds);
					nextStuck.delete(itemId);
					stuckItemIds = nextStuck;
				}
			} else {
				next.add(itemId);
			}
			ownedItemIds = next;
		} catch (err) {
			console.error('Failed to toggle item ownership:', err);
		}
	}

	async function toggleStick(itemId: number) {
		if (!data.user || !collection) return;
		if (!ownedItemIds.has(itemId)) return;

		const isStuck = stuckItemIds.has(itemId);
		const method = isStuck ? 'DELETE' : 'POST';

		try {
			const res = await fetch(
				`/api/collections/${collection.id}/items/${itemId}/stick`,
				{ method }
			);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);

			const nextStuck = new Set(stuckItemIds);
			if (isStuck) {
				nextStuck.delete(itemId);
				const currentRarities = ownedItemRarities.get(itemId) ?? [];
				const updatedRarities = currentRarities.map(r => ({ ...r, is_stuck: false }));
				const nextMap = new Map(ownedItemRarities);
				nextMap.set(itemId, updatedRarities);
				ownedItemRarities = nextMap;
			} else {
				nextStuck.add(itemId);
				const result = await res.json();
				const currentRarities = ownedItemRarities.get(itemId) ?? [];
				const updatedRarities = currentRarities.map(r => ({
					...r,
					is_stuck: r.rarity_id === result.rarity_id
				}));
				const nextMap = new Map(ownedItemRarities);
				nextMap.set(itemId, updatedRarities);
				ownedItemRarities = nextMap;
			}
			stuckItemIds = nextStuck;
		} catch (err) {
			console.error('Failed to toggle stick:', err);
		}
	}

	async function mergeItem(itemId: number, rarityId: number) {
		if (!data.user || !collection) return;
		try {
			const res = await fetch(
				`/api/collections/${collection.id}/items/${itemId}/merge`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ rarityId })
				}
			);
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.message ?? `HTTP ${res.status}`);
			}
			await refetchCollectionData();
		} catch (err) {
			console.error('Failed to merge items:', err);
		}
	}

	async function recycleItem(itemId: number, rarityId: number) {
		if (!data.user || !collection) return;
		try {
			const res = await fetch(
				`/api/collections/${collection.id}/items/${itemId}/recycle`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ rarityId })
				}
			);
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.message ?? `HTTP ${res.status}`);
			}
			await refetchCollectionData();
		} catch (err) {
			console.error('Failed to recycle items:', err);
		}
	}
</script>

<div class="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 p-8">
	<div class="flex items-center gap-2">
		<a href="/collections" class="btn btn-ghost btn-sm">&larr; Back</a>
	</div>

	{#if loading}
		<div class="flex flex-1 items-center justify-center">
			<span class="loading loading-spinner loading-lg"></span>
		</div>
	{:else if errorMsg}
		<div class="alert alert-error">
			<span>{errorMsg}</span>
		</div>
	{:else if collection}
		<div class="grid grid-cols-3 gap-4">
			<CollectionBadge {collection} classes="w-full" progress={completedSlots} progressMax={totalSlots} rarityColor={badgeRarityColor} />
			{#if data.user && items.length > 0 && allRarities.length > 0}
				<div class="flex flex-col justify-center gap-2">
					{#each rarityProgress as rp}
						<div class="flex flex-col gap-1 rounded-lg p-2">
							<div class="flex items-center justify-between">
								<span class="text-xs font-semibold" style="color: {rp.color};">{rp.name}</span>
								<span class="text-base-content/60 text-[10px]">{rp.owned}/{rp.total}</span>
							</div>
							<progress class="progress h-1.5 w-full" style="color: {rp.color};" value={rp.owned} max={rp.total}></progress>
						</div>
					{/each}
				</div>
			{:else}
				<div class="flex items-center">
					<p class="text-base-content/50 text-sm">{items.length} tracks</p>
				</div>
			{/if}
			<div class="flex flex-col justify-center gap-2">
				<button class="btn btn-primary btn-sm" onclick={() => showTriviaModal = true}>Play Trivia</button>
				<button class="btn btn-secondary btn-sm" onclick={() => showPairsModal = true}>Play Pairs</button>
				<button class="btn btn-accent btn-sm" disabled={unclaimedRewards === 0} onclick={() => showClaimModal = true}>
					Claim Rewards{unclaimedRewards > 0 ? ` (${unclaimedRewards})` : ''}
				</button>
				{#if data.user}
					<button
						class="btn btn-outline btn-accent btn-sm"
						disabled={freeClaimable < 1 || freeClaimLoading}
						onclick={claimFreeRewards}
					>
						{#if freeClaimLoading}
							<span class="loading loading-spinner loading-xs"></span>
						{:else}
							Free Claim{freeClaimable > 0 ? ` (${freeClaimable})` : ''}
						{/if}
					</button>
					<span class="text-base-content/60 text-center text-xs">
						{#if freeClaimable > 0}
							{freeClaimable} free reward{freeClaimable > 1 ? 's' : ''} ready
						{:else}
							Next free in {countdownDisplay}
						{/if}
					</span>
				{/if}
			</div>
		</div>

		{#if items.length > 0}
			<div class="grid grid-cols-2 gap-4">
				{#each items as item (item.id)}
					{@const rarities = ownedItemRarities.get(item.id) ?? []}
					{@const bestRarity = rarities[0] ?? null}
					<CollectionItem
						{item}
						owned={!data.user || ownedItemIds.has(item.id)}
						stuck={stuckItemIds.has(item.id)}
						showStickInHeader={!!data.user}
						onToggleStick={() => toggleStick(item.id)}
						onOpenDetail={() => openDetailModal(item.id)}
						rarityColor={bestRarity?.rarity_color ?? null}
						rarityName={bestRarity?.rarity_name ?? null}
					/>
				{/each}
			</div>
		{:else}
			<p class="text-base-content/70 text-center">No tracks in this collection yet.</p>
		{/if}
	{/if}
</div>

{#if modalItem}
	{@const mRarities = modalRarities}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="modal modal-open" onclick={closeDetailModal}>
		<div class="modal-box max-w-md" onclick={(e) => e.stopPropagation()}>
			<button class="btn btn-circle btn-ghost btn-sm absolute top-2 right-2" onclick={closeDetailModal}>&#10005;</button>
			<div class="flex flex-col gap-4 pt-2">
				<CollectionItem
					item={modalItem}
					owned={!data.user || ownedItemIds.has(modalItem.id)}
					stuck={stuckItemIds.has(modalItem.id)}
					rarityColor={modalBestRarity?.rarity_color ?? null}
					rarityName={modalBestRarity?.rarity_name ?? null}
				/>
				{#if data.user && ownedItemIds.has(modalItem.id)}
					<table class="table table-zebra table-xs w-full table-fixed border border-base-300">
						<thead>
							<tr>
								{#each allRarities as rarity}
									<th class="border border-base-300 p-1 text-center">
										<span class="text-[10px] font-semibold" style="color: {rarity.color};">{rarity.name}</span>
									</th>
								{/each}
							</tr>
						</thead>
						<tbody>
							<tr>
								{#each allRarities as rarity}
									{@const itemRarity = mRarities.find(r => r.rarity_id === rarity.id)}
									{@const copyCount = itemRarity?.copy_count ?? 0}
									<td class="border border-base-300 p-1 text-center">
										<span class="text-xs font-bold" style="color: {rarity.color};">{copyCount}x</span>
									</td>
								{/each}
							</tr>
							<tr>
								{#each allRarities as rarity}
									{@const itemRarity = mRarities.find(r => r.rarity_id === rarity.id)}
									{@const copyCount = itemRarity?.copy_count ?? 0}
									{@const isMaxTier = rarity.level >= maxRarityLevel}
									{@const mergeableCount = copyCount - (itemRarity?.is_stuck ? 1 : 0)}
									{@const canMerge = !isMaxTier && mergeableCount >= 2}
									<td class="border border-base-300 p-0.5">
										<button
											class="btn btn-xs w-full border-0"
											class:text-white={canMerge}
											class:opacity-30={!canMerge}
											style="background-color: {rarity.color};"
											disabled={!canMerge}
											onclick={() => mergeItem(modalItem!.id, rarity.id)}
											title={isMaxTier ? `${rarity.name} (max tier)` : canMerge ? `Merge 2x ${rarity.name} into 1x next tier` : `${rarity.name}: need 2+ copies to merge`}
										>
											Merge
										</button>
									</td>
								{/each}
							</tr>
							<tr>
								{#each allRarities as rarity}
									{@const itemRarity = mRarities.find(r => r.rarity_id === rarity.id)}
									{@const copyCount = itemRarity?.copy_count ?? 0}
									{@const recyclableCount = copyCount - (itemRarity?.is_stuck ? 1 : 0)}
									{@const canRecycle = recyclableCount >= 3}
									<td class="border border-base-300 p-0.5">
										<button
											class="btn btn-xs w-full border-0"
											class:text-white={canRecycle}
											class:opacity-30={!canRecycle}
											style="background-color: {rarity.color};"
											disabled={!canRecycle}
											onclick={() => recycleItem(modalItem!.id, rarity.id)}
											title={canRecycle ? `Recycle 3x ${rarity.name} → ${rarity.level} card spawn${rarity.level > 1 ? 's' : ''}` : `${rarity.name}: need 3+ copies to recycle`}
										>
											Recycle
										</button>
									</td>
								{/each}
							</tr>
						</tbody>
					</table>
				{/if}
			</div>
		</div>
	</div>
{/if}

{#if showTriviaModal && collection}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="modal modal-open" onclick={() => showTriviaModal = false}>
		<div class="modal-box max-w-2xl" onclick={(e) => e.stopPropagation()}>
			<button class="btn btn-circle btn-ghost btn-sm absolute top-2 right-2" onclick={() => showTriviaModal = false}>&#10005;</button>
			{#key showTriviaModal}
				<TriviaGame
					collectionId={collection.id}
					collectionName={collection.name}
					user={data.user}
					onBack={() => showTriviaModal = false}
					showBackButton={false}
				/>
			{/key}
		</div>
	</div>
{/if}

{#if showPairsModal && collection}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="modal modal-open" onclick={() => showPairsModal = false}>
		<div class="modal-box max-w-4xl" onclick={(e) => e.stopPropagation()}>
			<button class="btn btn-circle btn-ghost btn-sm absolute top-2 right-2" onclick={() => showPairsModal = false}>&#10005;</button>
			{#key showPairsModal}
				<PairsGame
					collectionId={collection.id}
					collectionName={collection.name}
					user={data.user}
					onBack={() => showPairsModal = false}
					showBackButton={false}
				/>
			{/key}
		</div>
	</div>
{/if}

{#if collection}
	<RewardClaimModal
		collectionId={collection.id}
		collectionName={collection.name}
		{unclaimedRewards}
		open={showClaimModal}
		onclose={(claimedCount) => {
			showClaimModal = false;
			if (claimedCount > 0) {
				unclaimedRewards = Math.max(0, unclaimedRewards - claimedCount);
				refetchCollectionData();
			}
		}}
	/>
{/if}
