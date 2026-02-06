<script lang="ts">
	import { onMount } from 'svelte';
	import TriviaTemplateExpandedCard from '$components/core/TriviaTemplateExpandedCard.svelte';
	import TriviaTemplateForm from '$components/core/TriviaTemplateForm.svelte';
	import type {
		TriviaTemplateWithQuestions,
		CollectionSummary,
		CreateTriviaTemplatePayload,
		GeneratedTriviaQuestion
	} from '$types/trivia.type';

	// ---------------------------------------------------------------------------
	// State
	// ---------------------------------------------------------------------------

	let templates = $state<TriviaTemplateWithQuestions[]>([]);
	let loading = $state(true);
	let errorMsg = $state('');

	// Collections
	let collections = $state<CollectionSummary[]>([]);
	let loadingCollections = $state(true);
	let selectedCollectionId = $state<number | null>(null);

	// Inline editing
	let editingId = $state<number | null>(null);
	let creatingNew = $state(false);
	let saving = $state(false);

	// Generation
	let generatingQuestionId = $state<number | null>(null);
	let generatedResults = $state<Map<number, GeneratedTriviaQuestion>>(new Map());

	// Seed
	let seeding = $state(false);

	// ---------------------------------------------------------------------------
	// Data fetching
	// ---------------------------------------------------------------------------

	async function fetchTemplates() {
		try {
			const res = await fetch('/api/trivia-templates?expand=questions');
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = await res.json();
			templates = data.templates ?? [];
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to load templates';
		} finally {
			loading = false;
		}
	}

	async function fetchCollections() {
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
	}

	onMount(() => {
		fetchTemplates();
		fetchCollections();
	});

	// ---------------------------------------------------------------------------
	// Create / Edit
	// ---------------------------------------------------------------------------

	function openCreate() {
		editingId = null;
		creatingNew = true;
	}

	function cancelCreate() {
		creatingNew = false;
	}

	function startEdit(templateId: number) {
		creatingNew = false;
		editingId = templateId;
	}

	function cancelEdit() {
		editingId = null;
	}

	async function handleSave(payload: CreateTriviaTemplatePayload, templateId?: number) {
		saving = true;
		errorMsg = '';

		try {
			const isEdit = templateId !== undefined;
			const url = isEdit
				? `/api/trivia-templates/${templateId}`
				: '/api/trivia-templates';
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

			editingId = null;
			creatingNew = false;
			loading = true;
			await fetchTemplates();
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to save template';
		} finally {
			saving = false;
		}
	}

	// ---------------------------------------------------------------------------
	// Seed default template
	// ---------------------------------------------------------------------------

	async function seedDefault() {
		seeding = true;
		errorMsg = '';
		try {
			const res = await fetch('/api/trivia-templates/seed', { method: 'POST' });
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			loading = true;
			await fetchTemplates();
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to seed template';
		} finally {
			seeding = false;
		}
	}

	// ---------------------------------------------------------------------------
	// Delete
	// ---------------------------------------------------------------------------

	async function handleDelete(template: TriviaTemplateWithQuestions) {
		if (!confirm(`Delete "${template.name}"? This cannot be undone.`)) return;

		try {
			const res = await fetch(`/api/trivia-templates/${template.id}`, { method: 'DELETE' });
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			loading = true;
			await fetchTemplates();
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to delete template';
		}
	}

	// ---------------------------------------------------------------------------
	// Generate
	// ---------------------------------------------------------------------------

	async function handleGenerateQuestion(templateId: number, questionId: number) {
		if (!selectedCollectionId) return;
		generatingQuestionId = questionId;
		errorMsg = '';

		try {
			const res = await fetch(`/api/trivia-templates/${templateId}/generate`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ collectionId: selectedCollectionId, questionId })
			});
			if (!res.ok) {
				const data = await res.json().catch(() => null);
				throw new Error(data?.message ?? `HTTP ${res.status}`);
			}
			const data = await res.json();
			const firstQuestion = data.trivia?.questions?.[0] as GeneratedTriviaQuestion | undefined;
			if (firstQuestion) {
				const updated = new Map(generatedResults);
				updated.set(questionId, firstQuestion);
				generatedResults = updated;
			}
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Generation failed';
		} finally {
			generatingQuestionId = null;
		}
	}
</script>

<div class="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 p-8">
	<div class="flex items-center justify-between">
		<h1 class="text-2xl font-bold">Trivia Templates</h1>
		<button class="btn btn-primary btn-sm" onclick={openCreate}>+ New Template</button>
	</div>

	{#if errorMsg}
		<div class="alert alert-error">
			<span>{errorMsg}</span>
			<button class="btn btn-ghost btn-xs" onclick={() => { errorMsg = ''; }}>Dismiss</button>
		</div>
	{/if}

	<!-- Global collection selector -->
	{#if !loading && templates.length > 0}
			<div class="flex items-center gap-3 rounded-lg bg-base-200 px-4 py-3">
				<span class="text-sm font-medium whitespace-nowrap">Collection:</span>
				{#if loadingCollections}
					<span class="loading loading-spinner loading-sm"></span>
				{:else if collections.length === 0}
					<span class="text-base-content/50 text-sm">No collections available</span>
				{:else}
					<select
						class="select select-bordered select-sm flex-1"
						onchange={(e) => { selectedCollectionId = Number((e.target as HTMLSelectElement).value) || null; }}
					>
						<option value="">Choose collection...</option>
						{#each collections as col}
							<option value={col.id}>{col.name} ({col.track_count} tracks)</option>
						{/each}
					</select>
				{/if}
			</div>
		{/if}

		<!-- New template form -->
		{#if creatingNew}
			<div class="rounded-xl border border-primary bg-base-100 p-5 shadow-sm">
				<h2 class="mb-4 text-lg font-semibold">New Template</h2>
				<TriviaTemplateForm
					onsave={(payload) => handleSave(payload)}
					oncancel={cancelCreate}
				/>
			</div>
		{/if}

		{#if loading}
			<div class="flex flex-1 items-center justify-center">
				<span class="loading loading-spinner loading-lg"></span>
			</div>
		{:else if templates.length === 0}
			<div class="flex flex-col items-center gap-4 py-12">
				<p class="text-base-content/60 text-center">
					No trivia templates yet. Create one to get started, or seed the default template with all 6 question types.
				</p>
				<button
					class="btn btn-secondary btn-sm"
					disabled={seeding}
					onclick={seedDefault}
				>
					{#if seeding}
						<span class="loading loading-spinner loading-sm"></span>
					{/if}
					Seed default template
				</button>
			</div>
		{:else}
			<div class="flex flex-col gap-4">
				{#each templates as template (template.id)}
					<TriviaTemplateExpandedCard
						{template}
						isEditing={editingId === template.id}
						{generatingQuestionId}
						{generatedResults}
						collectionSelected={selectedCollectionId !== null}
						onedit={() => startEdit(template.id)}
						oncanceledit={cancelEdit}
						onsave={(payload) => handleSave(payload, template.id)}
						ondelete={() => handleDelete(template)}
						ongeneratequestion={(questionId) => handleGenerateQuestion(template.id, questionId)}
					/>
				{/each}
			</div>
		{/if}
</div>
