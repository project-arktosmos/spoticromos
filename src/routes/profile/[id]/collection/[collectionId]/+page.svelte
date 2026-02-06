<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import type { CollectionRow, CollectionItemWithArtists } from '$lib/server/repositories/collection.repository';
	import type { OwnedItemRarity } from '$lib/server/repositories/ownership.repository';
	import type { RarityRow } from '$types/rarity.type';
	import CollectionBadge from '$components/core/CollectionBadge.svelte';
	import CollectionItem from '$components/core/CollectionItem.svelte';

	interface ProfileUser {
		spotify_id: string;
		display_name: string | null;
		avatar_url: string | null;
	}

	let profileUser = $state<ProfileUser | null>(null);
	let collection = $state<CollectionRow | null>(null);
	let items = $state<CollectionItemWithArtists[]>([]);
	let ownedItemIds = $state<Set<number>>(new Set());
	let ownedItemRarities = $state<Map<number, OwnedItemRarity[]>>(new Map());
	let stuckItemIds = $state<Set<number>>(new Set());
	let allRarities = $state<RarityRow[]>([]);
	let loading = $state(true);
	let errorMsg = $state('');

	let modalItemId = $state<number | null>(null);
	let modalItem = $derived(modalItemId !== null ? items.find(i => i.id === modalItemId) ?? null : null);
	let modalRarities = $derived(modalItemId !== null ? ownedItemRarities.get(modalItemId) ?? [] : []);
	let modalBestRarity = $derived(modalRarities[0] ?? null);

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

	let badgeRarityColor = $derived.by(() => {
		let color: string | null = null;
		for (const rp of rarityProgress) {
			if (rp.total > 0 && rp.owned >= rp.total) {
				color = rp.color;
			}
		}
		return color;
	});

	function openDetailModal(itemId: number) {
		modalItemId = itemId;
	}

	function closeDetailModal() {
		modalItemId = null;
	}

	onMount(async () => {
		const userId = $page.params.id;
		const collectionId = $page.params.collectionId;
		if (!userId || !collectionId) return;

		try {
			const res = await fetch(`/api/profile/${encodeURIComponent(userId)}/collection/${encodeURIComponent(collectionId)}`);
			if (res.status === 404) {
				errorMsg = 'User or collection not found';
				return;
			}
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const json = await res.json();
			profileUser = json.user;
			collection = json.collection;
			items = json.items;
			ownedItemIds = new Set(json.ownedItemIds ?? []);
			stuckItemIds = new Set(json.stuckItemIds ?? []);
			allRarities = json.rarities ?? [];
			const rarityMap = new Map<number, OwnedItemRarity[]>();
			for (const r of json.ownedItemRarities ?? []) {
				const list = rarityMap.get(r.collection_item_id) ?? [];
				list.push(r);
				rarityMap.set(r.collection_item_id, list);
			}
			ownedItemRarities = rarityMap;
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to load collection';
		} finally {
			loading = false;
		}
	});
</script>

<div class="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 p-8">
	{#if profileUser}
		<div class="flex items-center gap-2">
			<a href="/profile/{profileUser.spotify_id}" class="btn btn-ghost btn-sm">&larr; {profileUser.display_name ?? 'Profile'}</a>
		</div>
	{/if}

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
			{#if items.length > 0 && allRarities.length > 0}
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
				{#if profileUser}
					<div class="flex items-center gap-3">
						{#if profileUser.avatar_url}
							<img
								src={profileUser.avatar_url}
								alt={profileUser.display_name ?? 'User'}
								class="h-12 w-12 rounded-full object-cover"
							/>
						{:else}
							<div class="bg-base-300 flex h-12 w-12 items-center justify-center rounded-full">
								<span class="text-base-content/30 text-lg">?</span>
							</div>
						{/if}
						<span class="text-sm font-semibold">{profileUser.display_name ?? 'Unknown User'}</span>
					</div>
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
						owned={ownedItemIds.has(item.id)}
						stuck={stuckItemIds.has(item.id)}
						onOpenDetail={() => openDetailModal(item.id)}
						rarityColor={bestRarity?.rarity_color ?? null}
						rarityName={bestRarity?.rarity_name ?? null}
						rarityCounts={rarities}
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
					owned={ownedItemIds.has(modalItem.id)}
					stuck={stuckItemIds.has(modalItem.id)}
					rarityColor={modalBestRarity?.rarity_color ?? null}
					rarityName={modalBestRarity?.rarity_name ?? null}
				/>
				{#if ownedItemIds.has(modalItem.id)}
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
						</tbody>
					</table>
				{/if}
			</div>
		</div>
	</div>
{/if}
