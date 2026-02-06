<script lang="ts">
	import { onMount } from 'svelte';
	import classNames from 'classnames';
	import type { RarityRow, CreateRarityPayload } from '$types/rarity.type';

	let rarities = $state<RarityRow[]>([]);
	let loading = $state(true);
	let errorMsg = $state('');
	let saving = $state(false);

	// Form state
	let showForm = $state(false);
	let editingId = $state<number | null>(null);
	let formName = $state('');
	let formColor = $state('#6B7280');
	let formLevel = $state(1);

	// ---------------------------------------------------------------------------
	// Data fetching
	// ---------------------------------------------------------------------------

	async function fetchRarities() {
		try {
			const res = await fetch('/api/rarities');
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = await res.json();
			rarities = data.rarities ?? [];
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to load rarities';
		} finally {
			loading = false;
		}
	}

	onMount(fetchRarities);

	// ---------------------------------------------------------------------------
	// Create / Edit
	// ---------------------------------------------------------------------------

	function openCreate() {
		editingId = null;
		formName = '';
		formColor = '#6B7280';
		formLevel = rarities.length > 0 ? Math.max(...rarities.map((r) => r.level)) + 1 : 1;
		showForm = true;
	}

	function startEdit(rarity: RarityRow) {
		editingId = rarity.id;
		formName = rarity.name;
		formColor = rarity.color;
		formLevel = rarity.level;
		showForm = true;
	}

	function cancelForm() {
		showForm = false;
		editingId = null;
	}

	async function handleSave() {
		if (!formName.trim()) {
			errorMsg = 'Name is required';
			return;
		}
		saving = true;
		errorMsg = '';

		const payload: CreateRarityPayload = {
			name: formName.trim(),
			color: formColor,
			level: formLevel
		};

		try {
			const isEdit = editingId !== null;
			const url = isEdit ? `/api/rarities/${editingId}` : '/api/rarities';
			const method = isEdit ? 'PUT' : 'POST';

			const res = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});

			if (!res.ok) {
				const data = await res.json().catch(() => null);
				throw new Error(data?.message ?? `HTTP ${res.status}`);
			}

			showForm = false;
			editingId = null;
			loading = true;
			await fetchRarities();
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to save rarity';
		} finally {
			saving = false;
		}
	}

	// ---------------------------------------------------------------------------
	// Delete
	// ---------------------------------------------------------------------------

	async function handleDelete(rarity: RarityRow) {
		if (!confirm(`Delete "${rarity.name}"? This cannot be undone.`)) return;

		try {
			const res = await fetch(`/api/rarities/${rarity.id}`, { method: 'DELETE' });
			if (!res.ok) {
				const data = await res.json().catch(() => null);
				throw new Error(data?.message ?? `HTTP ${res.status}`);
			}
			loading = true;
			await fetchRarities();
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to delete rarity';
		}
	}
</script>

<div class="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 p-8">
	<div class="flex items-center justify-between">
		<h1 class="text-2xl font-bold">Rarities</h1>
		<button class="btn btn-primary btn-sm" onclick={openCreate}>+ New Rarity</button>
	</div>

	{#if errorMsg}
		<div class="alert alert-error">
			<span>{errorMsg}</span>
			<button class="btn btn-ghost btn-xs" onclick={() => { errorMsg = ''; }}>Dismiss</button>
		</div>
	{/if}

	{#if showForm}
		<div class="rounded-xl border border-base-300 bg-base-100 p-6 shadow">
			<h2 class="mb-4 text-lg font-semibold">
				{editingId !== null ? 'Edit Rarity' : 'New Rarity'}
			</h2>

			<div class="flex flex-col gap-4">
				<div class="form-control">
					<label class="label" for="rarity-name">
						<span class="label-text">Name</span>
					</label>
					<input
						id="rarity-name"
						type="text"
						class="input input-bordered"
						placeholder="e.g. Common, Rare, Legendary"
						bind:value={formName}
					/>
				</div>

				<div class="flex gap-4">
					<div class="form-control flex-1">
						<label class="label" for="rarity-color">
							<span class="label-text">Color</span>
						</label>
						<div class="flex items-center gap-3">
							<input
								id="rarity-color"
								type="color"
								class="h-10 w-14 cursor-pointer rounded border border-base-300"
								bind:value={formColor}
							/>
							<input
								type="text"
								class="input input-bordered input-sm w-28"
								bind:value={formColor}
								maxlength="7"
							/>
						</div>
					</div>

					<div class="form-control flex-1">
						<label class="label" for="rarity-level">
							<span class="label-text">Level (1 = lowest)</span>
						</label>
						<input
							id="rarity-level"
							type="number"
							class="input input-bordered"
							min="1"
							bind:value={formLevel}
						/>
					</div>
				</div>

				<div class="flex justify-end gap-2">
					<button class="btn btn-ghost btn-sm" onclick={cancelForm}>Cancel</button>
					<button
						class={classNames('btn btn-primary btn-sm', { loading: saving })}
						disabled={saving}
						onclick={handleSave}
					>
						{#if saving}
							<span class="loading loading-spinner loading-xs"></span>
						{/if}
						{editingId !== null ? 'Update' : 'Create'}
					</button>
				</div>
			</div>
		</div>
	{:else if loading}
		<div class="flex flex-1 items-center justify-center">
			<span class="loading loading-spinner loading-lg"></span>
		</div>
	{:else if rarities.length === 0}
		<p class="text-base-content/60 py-12 text-center">
			No rarities configured yet. Create one to get started.
		</p>
	{:else}
		<div class="overflow-x-auto">
			<table class="table">
				<thead>
					<tr>
						<th>Color</th>
						<th>Name</th>
						<th>Level</th>
						<th class="text-right">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each rarities as rarity (rarity.id)}
						<tr>
							<td>
								<div
									class="h-6 w-6 rounded-full border border-base-300"
									style="background-color: {rarity.color}"
								></div>
							</td>
							<td>
								<span class="font-semibold" style="color: {rarity.color}">
									{rarity.name}
								</span>
							</td>
							<td>{rarity.level}</td>
							<td class="text-right">
								<button
									class="btn btn-ghost btn-xs"
									onclick={() => startEdit(rarity)}
								>
									Edit
								</button>
								<button
									class="btn btn-ghost btn-xs text-error"
									onclick={() => handleDelete(rarity)}
								>
									Delete
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
