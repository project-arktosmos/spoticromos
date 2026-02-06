<script lang="ts">
	import { onMount } from 'svelte';
	import type { UserCollectionWithRewards } from '$lib/server/repositories/rewards.repository';
	import RewardCollectionCard from '$components/core/RewardCollectionCard.svelte';
	import RewardClaimModal from '$components/core/RewardClaimModal.svelte';

	let collections = $state<UserCollectionWithRewards[]>([]);
	let loading = $state(true);
	let errorMsg = $state('');

	let addingMap = $state<Record<number, boolean>>({});

	// Modal state
	let modalOpen = $state(false);
	let modalCollectionId = $state(0);
	let modalCollectionName = $state('');
	let modalUnclaimedRewards = $state(0);

	onMount(async () => {
		try {
			const res = await fetch('/api/rewards');
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = await res.json();
			collections = data.collections;
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to load rewards';
		} finally {
			loading = false;
		}
	});

	async function handleAdd(collectionId: number) {
		addingMap[collectionId] = true;
		try {
			const res = await fetch('/api/rewards/add', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ collectionId })
			});
			if (!res.ok) {
				const data = await res.json().catch(() => null);
				throw new Error(data?.message ?? `HTTP ${res.status}`);
			}
			collections = collections.map((c) =>
				c.collection_id === collectionId
					? { ...c, unclaimed_rewards: c.unclaimed_rewards + 10 }
					: c
			);
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to add rewards';
		} finally {
			addingMap[collectionId] = false;
		}
	}

	function openClaimModal(collection: UserCollectionWithRewards) {
		modalCollectionId = collection.collection_id;
		modalCollectionName = collection.collection_name;
		modalUnclaimedRewards = collection.unclaimed_rewards;
		modalOpen = true;
	}

	function handleModalClose(claimedCount: number) {
		modalOpen = false;
		if (claimedCount > 0) {
			collections = collections.map((c) =>
				c.collection_id === modalCollectionId
					? {
							...c,
							unclaimed_rewards: c.unclaimed_rewards - claimedCount,
							claimed_items: c.claimed_items + claimedCount
						}
					: c
			);
		}
	}
</script>

<div class="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 p-8">
	<h1 class="text-2xl font-bold">Rewards</h1>

	{#if loading}
		<div class="flex flex-1 items-center justify-center">
			<span class="loading loading-spinner loading-lg"></span>
		</div>
	{:else if errorMsg}
		<div class="alert alert-error">
			<span>{errorMsg}</span>
		</div>
	{:else if collections.length === 0}
		<p class="text-base-content/70 text-center">No collections owned yet. Add collections first.</p>
	{:else}
		<p class="text-base-content/70 text-sm">{collections.length} collections</p>

		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each collections as collection (collection.collection_id)}
				<RewardCollectionCard
					{collection}
					addingRewards={addingMap[collection.collection_id] ?? false}
					onadd={() => handleAdd(collection.collection_id)}
					onclaim={() => openClaimModal(collection)}
				/>
			{/each}
		</div>
	{/if}
</div>

<RewardClaimModal
	collectionId={modalCollectionId}
	collectionName={modalCollectionName}
	unclaimedRewards={modalUnclaimedRewards}
	open={modalOpen}
	onclose={handleModalClose}
/>
