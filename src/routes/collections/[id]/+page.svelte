<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import type {
		CollectionRow,
		CollectionItemWithArtists
	} from '$lib/server/repositories/collection.repository';
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
	let showProgressModal = $state(false);
	let unclaimedRewards = $state(0);

	// Free claim state — values come from the server (UTC-based) to avoid
	// timezone drift between the browser clock and the database.
	let freeClaimable = $state(0);
	let freeClaimCountdown = $state(0); // seconds until next free claim
	let freeClaimLoading = $state(false);
	let freeClaimTimer: ReturnType<typeof setInterval> | null = null;

	let countdownDisplay = $derived.by(() => {
		const total = freeClaimCountdown;
		const m = Math.floor(total / 60);
		const s = total % 60;
		return `${m}:${s.toString().padStart(2, '0')}`;
	});

	let modalItemId = $state<number | null>(null);
	let modalItem = $derived(
		modalItemId !== null ? (items.find((i) => i.id === modalItemId) ?? null) : null
	);
	let modalRarities = $derived(
		modalItemId !== null ? (ownedItemRarities.get(modalItemId) ?? []) : []
	);
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
		return allRarities.map((rarity) => {
			let ownedCount = 0;
			for (const itemRarities of ownedItemRarities.values()) {
				if (itemRarities.some((r) => r.rarity_id === rarity.id)) {
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
		freeClaimable = json.freeClaimable ?? 0;
		freeClaimCountdown = json.freeClaimCountdown ?? 0;
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

		// Tick every second to decrement the server-provided countdown locally
		freeClaimTimer = setInterval(() => {
			if (freeClaimCountdown > 0) {
				freeClaimCountdown -= 1;
				if (freeClaimCountdown <= 0) {
					freeClaimCountdown = 0;
					freeClaimable += 1;
				}
			}
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
			freeClaimable = result.freeClaimable;
			freeClaimCountdown = result.freeClaimCountdown;
			await refetchCollectionData();
		} catch (err) {
			console.error('Failed to claim free rewards:', err);
		} finally {
			freeClaimLoading = false;
		}
	}

	async function toggleStick(itemId: number) {
		if (!data.user || !collection) return;
		if (!ownedItemIds.has(itemId)) return;

		const isStuck = stuckItemIds.has(itemId);
		const method = isStuck ? 'DELETE' : 'POST';

		try {
			const res = await fetch(`/api/collections/${collection.id}/items/${itemId}/stick`, {
				method
			});
			if (!res.ok) throw new Error(`HTTP ${res.status}`);

			const nextStuck = new Set(stuckItemIds);
			if (isStuck) {
				nextStuck.delete(itemId);
				const currentRarities = ownedItemRarities.get(itemId) ?? [];
				const updatedRarities = currentRarities.map((r) => ({ ...r, is_stuck: false }));
				const nextMap = new Map(ownedItemRarities);
				nextMap.set(itemId, updatedRarities);
				ownedItemRarities = nextMap;
			} else {
				nextStuck.add(itemId);
				const result = await res.json();
				const currentRarities = ownedItemRarities.get(itemId) ?? [];
				const updatedRarities = currentRarities.map((r) => ({
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
			const res = await fetch(`/api/collections/${collection.id}/items/${itemId}/merge`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ rarityId })
			});
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
			const res = await fetch(`/api/collections/${collection.id}/items/${itemId}/recycle`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ rarityId })
			});
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

<div class="flex min-h-screen w-full flex-col gap-6 p-4 tablet:p-8">
	{#if loading}
		<div class="flex flex-1 items-center justify-center">
			<span class="loading loading-lg loading-spinner"></span>
		</div>
	{:else if errorMsg}
		<div class="alert alert-error">
			<span>{errorMsg}</span>
		</div>
	{:else if collection}
		<div class="grid grid-cols-1 gap-4 tablet:grid-cols-2 large:grid-cols-3">
			<CollectionBadge
				{collection}
				classes="w-full"
				progress={completedSlots}
				progressMax={totalSlots}
				rarityColor={badgeRarityColor}
			/>
			{#if data.user && items.length > 0 && allRarities.length > 0}
				<div class="hidden flex-col justify-center gap-2 large:order-3 large:flex">
					{#each rarityProgress as rp}
						<div class="flex flex-col gap-1 rounded-lg p-2" style:--rarity-color={rp.color}>
							<div class="flex items-center justify-between">
								<span class="text-xs font-semibold [color:var(--rarity-color)]">{rp.name}</span>
								<span class="text-[10px] text-base-content/60">{rp.owned}/{rp.total}</span>
							</div>
							<progress
								class="progress h-1.5 w-full [color:var(--rarity-color)]"
								value={rp.owned}
								max={rp.total}
							></progress>
						</div>
					{/each}
				</div>
			{:else}
				<div class="hidden items-center large:order-3 large:flex">
					<p class="text-sm text-base-content/50">{items.length} tracks</p>
				</div>
			{/if}
			<div class="flex flex-col justify-center gap-2 large:order-2">
				<a
					href="https://open.spotify.com/playlist/{collection.spotify_playlist_id}"
					target="_blank"
					rel="noopener noreferrer"
					class="btn w-full border-[#1DB954] text-[#1DB954] btn-outline btn-sm"
				>
					Open in Spotify
				</a>
				<div class="grid grid-cols-2 gap-2 tablet:grid-cols-1">
					<button class="btn btn-sm btn-primary" onclick={() => (showTriviaModal = true)}
						>Play Trivia</button
					>
					<button class="btn btn-sm btn-secondary" onclick={() => (showPairsModal = true)}
						>Play Pairs</button
					>
					<button
						class="btn btn-sm btn-accent"
						disabled={unclaimedRewards === 0}
						onclick={() => (showClaimModal = true)}
					>
						Claim Rewards{unclaimedRewards > 0 ? ` (${unclaimedRewards})` : ''}
					</button>
					{#if data.user}
						<button
							class="btn btn-outline btn-sm btn-accent"
							disabled={freeClaimable < 1 || freeClaimLoading}
							onclick={claimFreeRewards}
						>
							{#if freeClaimLoading}
								<span class="loading loading-xs loading-spinner"></span>
							{:else}
								Free Claim{freeClaimable > 0 ? ` (${freeClaimable})` : ''}
							{/if}
						</button>
					{/if}
				</div>
				{#if data.user}
					<span class="text-center text-xs text-base-content/60">
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
			<div class="grid grid-cols-2 gap-4 large:grid-cols-3">
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
			<p class="text-center text-base-content/70">No tracks in this collection yet.</p>
		{/if}
	{/if}
</div>

{#if modalItem}
	{@const mRarities = modalRarities}
	<div
		class="modal-open modal"
		role="dialog"
		tabindex="-1"
		onclick={closeDetailModal}
		onkeydown={(e) => {
			if (e.key === 'Escape') closeDetailModal();
		}}
	>
		<div class="modal-box max-w-md" role="presentation" onclick={(e) => e.stopPropagation()}>
			<button
				class="btn absolute top-2 right-2 btn-circle btn-ghost btn-sm"
				onclick={closeDetailModal}>&#10005;</button
			>
			<div class="flex flex-col gap-4 pt-2">
				<CollectionItem
					item={modalItem}
					owned={!data.user || ownedItemIds.has(modalItem.id)}
					stuck={stuckItemIds.has(modalItem.id)}
					rarityColor={modalBestRarity?.rarity_color ?? null}
					rarityName={modalBestRarity?.rarity_name ?? null}
				/>
				{#if data.user && ownedItemIds.has(modalItem.id)}
					<table class="table w-full table-fixed border border-base-300 table-zebra table-xs">
						<thead>
							<tr>
								{#each allRarities as rarity}
									<th
										class="border border-base-300 p-1 text-center"
										style:--rarity-color={rarity.color}
									>
										<span class="text-[10px] font-semibold [color:var(--rarity-color)]"
											>{rarity.name}</span
										>
									</th>
								{/each}
							</tr>
						</thead>
						<tbody>
							<tr>
								{#each allRarities as rarity}
									{@const itemRarity = mRarities.find((r) => r.rarity_id === rarity.id)}
									{@const copyCount = itemRarity?.copy_count ?? 0}
									<td
										class="border border-base-300 p-1 text-center"
										style:--rarity-color={rarity.color}
									>
										<span class="text-xs font-bold [color:var(--rarity-color)]">{copyCount}x</span>
									</td>
								{/each}
							</tr>
							<tr>
								{#each allRarities as rarity}
									{@const itemRarity = mRarities.find((r) => r.rarity_id === rarity.id)}
									{@const copyCount = itemRarity?.copy_count ?? 0}
									{@const isMaxTier = rarity.level >= maxRarityLevel}
									{@const mergeableCount = copyCount - (itemRarity?.is_stuck ? 1 : 0)}
									{@const canMerge = !isMaxTier && mergeableCount >= 2}
									<td class="border border-base-300 p-0.5" style:--rarity-color={rarity.color}>
										<button
											class="btn w-full border-0 [background-color:var(--rarity-color)] btn-xs"
											class:text-white={canMerge}
											class:opacity-30={!canMerge}
											disabled={!canMerge}
											onclick={() => mergeItem(modalItem!.id, rarity.id)}
											title={isMaxTier
												? `${rarity.name} (max tier)`
												: canMerge
													? `Merge 2x ${rarity.name} into 1x next tier`
													: `${rarity.name}: need 2+ copies to merge`}
										>
											Merge
										</button>
									</td>
								{/each}
							</tr>
							<tr>
								{#each allRarities as rarity}
									{@const itemRarity = mRarities.find((r) => r.rarity_id === rarity.id)}
									{@const copyCount = itemRarity?.copy_count ?? 0}
									{@const recyclableCount = copyCount - (itemRarity?.is_stuck ? 1 : 0)}
									{@const canRecycle = recyclableCount >= 3}
									<td class="border border-base-300 p-0.5" style:--rarity-color={rarity.color}>
										<button
											class="btn w-full border-0 [background-color:var(--rarity-color)] btn-xs"
											class:text-white={canRecycle}
											class:opacity-30={!canRecycle}
											disabled={!canRecycle}
											onclick={() => recycleItem(modalItem!.id, rarity.id)}
											title={canRecycle
												? `Recycle 3x ${rarity.name} → ${rarity.level} card spawn${rarity.level > 1 ? 's' : ''}`
												: `${rarity.name}: need 3+ copies to recycle`}
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
	<div
		class="modal-open modal"
		role="dialog"
		tabindex="-1"
		onclick={() => (showTriviaModal = false)}
		onkeydown={(e) => {
			if (e.key === 'Escape') showTriviaModal = false;
		}}
	>
		<div class="modal-box max-w-2xl" role="presentation" onclick={(e) => e.stopPropagation()}>
			<button
				class="btn absolute top-2 right-2 btn-circle btn-ghost btn-sm"
				onclick={() => (showTriviaModal = false)}>&#10005;</button
			>
			{#key showTriviaModal}
				<TriviaGame
					collectionId={collection.id}
					collectionName={collection.name}
					user={data.user}
					onBack={() => (showTriviaModal = false)}
					showBackButton={false}
				/>
			{/key}
		</div>
	</div>
{/if}

{#if showPairsModal && collection}
	<div
		class="modal-open modal"
		role="dialog"
		tabindex="-1"
		onclick={() => (showPairsModal = false)}
		onkeydown={(e) => {
			if (e.key === 'Escape') showPairsModal = false;
		}}
	>
		<div class="modal-box max-w-4xl" role="presentation" onclick={(e) => e.stopPropagation()}>
			<button
				class="btn absolute top-2 right-2 btn-circle btn-ghost btn-sm"
				onclick={() => (showPairsModal = false)}>&#10005;</button
			>
			{#key showPairsModal}
				<PairsGame
					collectionId={collection.id}
					collectionName={collection.name}
					user={data.user}
					onBack={() => (showPairsModal = false)}
					showBackButton={false}
				/>
			{/key}
		</div>
	</div>
{/if}

{#if showProgressModal && allRarities.length > 0}
	<div
		class="modal-open modal"
		role="dialog"
		tabindex="-1"
		onclick={() => (showProgressModal = false)}
		onkeydown={(e) => {
			if (e.key === 'Escape') showProgressModal = false;
		}}
	>
		<div class="modal-box max-w-sm" role="presentation" onclick={(e) => e.stopPropagation()}>
			<button
				class="btn absolute top-2 right-2 btn-circle btn-ghost btn-sm"
				onclick={() => (showProgressModal = false)}>&#10005;</button
			>
			<h3 class="mb-4 text-lg font-bold">Progress</h3>
			<div class="flex flex-col gap-2">
				{#each rarityProgress as rp}
					<div class="flex flex-col gap-1 rounded-lg p-2" style:--rarity-color={rp.color}>
						<div class="flex items-center justify-between">
							<span class="text-xs font-semibold [color:var(--rarity-color)]">{rp.name}</span>
							<span class="text-[10px] text-base-content/60">{rp.owned}/{rp.total}</span>
						</div>
						<progress
							class="progress h-1.5 w-full [color:var(--rarity-color)]"
							value={rp.owned}
							max={rp.total}
						></progress>
					</div>
				{/each}
			</div>
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
