<script lang="ts">
	import classNames from 'classnames';
	import { onMount } from 'svelte';
	import type { GeneratedTriviaSet } from '$types/trivia.type';

	interface CollectionSummary {
		id: number;
		name: string;
		cover_image_url: string | null;
		track_count: number;
	}

	interface Props {
		templateId: number;
		templateName: string;
		open: boolean;
		onclose: () => void;
		ongenerated: (trivia: GeneratedTriviaSet) => void;
	}

	let { templateId, templateName, open, onclose, ongenerated }: Props = $props();

	let collections = $state<CollectionSummary[]>([]);
	let selectedCollectionId = $state<number | null>(null);
	let loading = $state(false);
	let loadingCollections = $state(true);
	let errorMsg = $state('');

	onMount(async () => {
		try {
			const res = await fetch('/api/collections');
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = await res.json();
			collections = data.collections ?? [];
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to load collections';
		} finally {
			loadingCollections = false;
		}
	});

	async function generate() {
		if (!selectedCollectionId) return;
		loading = true;
		errorMsg = '';

		try {
			const res = await fetch(`/api/trivia-templates/${templateId}/generate`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ collectionId: selectedCollectionId })
			});
			if (!res.ok) {
				const data = await res.json().catch(() => null);
				throw new Error(data?.message ?? `HTTP ${res.status}`);
			}
			const data = await res.json();
			ongenerated(data.trivia);
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Generation failed';
		} finally {
			loading = false;
		}
	}
</script>

{#if open}
	<dialog class="modal modal-open">
		<div class="modal-box">
			<h3 class="text-lg font-bold">Generate Trivia</h3>
			<p class="text-base-content/60 mt-1 text-sm">
				Using template: <span class="font-medium">{templateName}</span>
			</p>

			<div class="mt-4">
				{#if loadingCollections}
					<div class="flex items-center justify-center py-8">
						<span class="loading loading-spinner loading-md"></span>
					</div>
				{:else if collections.length === 0}
					<p class="text-base-content/50 py-4 text-center text-sm">
						No collections found. Save a collection first.
					</p>
				{:else}
					<label class="form-control w-full">
						<div class="label">
							<span class="label-text">Select a collection</span>
						</div>
						<select
							class="select select-bordered w-full"
							onchange={(e) => { selectedCollectionId = Number((e.target as HTMLSelectElement).value) || null; }}
						>
							<option value="">Choose collection...</option>
							{#each collections as col}
								<option value={col.id}>
									{col.name} ({col.track_count} tracks)
								</option>
							{/each}
						</select>
					</label>
				{/if}

				{#if errorMsg}
					<div class="alert alert-error mt-3">
						<span>{errorMsg}</span>
					</div>
				{/if}
			</div>

			<div class="modal-action">
				<button class="btn btn-ghost" onclick={onclose}>Cancel</button>
				<button
					class={classNames('btn btn-primary', { loading })}
					disabled={!selectedCollectionId || loading}
					onclick={generate}
				>
					{#if loading}
						<span class="loading loading-spinner loading-sm"></span>
					{/if}
					Generate
				</button>
			</div>
		</div>
		<form method="dialog" class="modal-backdrop">
			<button onclick={onclose}>close</button>
		</form>
	</dialog>
{/if}
