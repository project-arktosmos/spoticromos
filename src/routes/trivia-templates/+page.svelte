<script lang="ts">
	import { onMount } from 'svelte';
	import TriviaTemplateCard from '$components/core/TriviaTemplateCard.svelte';
	import TriviaTemplateForm from '$components/core/TriviaTemplateForm.svelte';
	import TriviaGenerateModal from '$components/core/TriviaGenerateModal.svelte';
	import TriviaPreview from '$components/core/TriviaPreview.svelte';
	import type {
		TriviaTemplateRow,
		TriviaTemplateQuestionRow,
		CreateTriviaTemplatePayload,
		GeneratedTriviaSet
	} from '$types/trivia.type';

	// ---------------------------------------------------------------------------
	// State
	// ---------------------------------------------------------------------------

	let templates = $state<(TriviaTemplateRow & { question_count: number })[]>([]);
	let loading = $state(true);
	let errorMsg = $state('');

	// Form modal state
	let showForm = $state(false);
	let editingTemplate = $state<TriviaTemplateRow | null>(null);
	let editingQuestions = $state<TriviaTemplateQuestionRow[]>([]);
	let saving = $state(false);

	// Generate modal state
	let generateTemplateId = $state<number | null>(null);
	let generateTemplateName = $state('');

	// Preview state
	let triviaPreview = $state<GeneratedTriviaSet | null>(null);

	// ---------------------------------------------------------------------------
	// Data fetching
	// ---------------------------------------------------------------------------

	async function fetchTemplates() {
		try {
			const res = await fetch('/api/trivia-templates');
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = await res.json();
			templates = data.templates ?? [];
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to load templates';
		} finally {
			loading = false;
		}
	}

	onMount(fetchTemplates);

	// ---------------------------------------------------------------------------
	// Create / Edit
	// ---------------------------------------------------------------------------

	function openCreate() {
		editingTemplate = null;
		editingQuestions = [];
		showForm = true;
	}

	async function openEdit(template: TriviaTemplateRow & { question_count: number }) {
		try {
			const res = await fetch(`/api/trivia-templates/${template.id}`);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = await res.json();
			editingTemplate = data.template;
			editingQuestions = data.questions;
			showForm = true;
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to load template';
		}
	}

	async function handleSave(payload: CreateTriviaTemplatePayload) {
		saving = true;
		errorMsg = '';

		try {
			const isEdit = editingTemplate !== null;
			const url = isEdit
				? `/api/trivia-templates/${editingTemplate!.id}`
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

			showForm = false;
			editingTemplate = null;
			editingQuestions = [];
			loading = true;
			await fetchTemplates();
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to save template';
		} finally {
			saving = false;
		}
	}

	function handleCancel() {
		showForm = false;
		editingTemplate = null;
		editingQuestions = [];
	}

	// ---------------------------------------------------------------------------
	// Delete
	// ---------------------------------------------------------------------------

	async function handleDelete(template: TriviaTemplateRow & { question_count: number }) {
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

	function openGenerate(template: TriviaTemplateRow & { question_count: number }) {
		generateTemplateId = template.id;
		generateTemplateName = template.name;
	}

	function closeGenerate() {
		generateTemplateId = null;
		generateTemplateName = '';
	}

	function handleGenerated(trivia: GeneratedTriviaSet) {
		closeGenerate();
		triviaPreview = trivia;
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

	{#if triviaPreview}
		<TriviaPreview
			trivia={triviaPreview}
			onclose={() => { triviaPreview = null; }}
		/>
	{:else if showForm}
		<div class="rounded-xl border border-base-300 bg-base-100 p-6 shadow">
			<h2 class="mb-4 text-lg font-semibold">
				{editingTemplate ? 'Edit Template' : 'New Template'}
			</h2>
			<TriviaTemplateForm
				template={editingTemplate}
				questions={editingQuestions}
				onsave={handleSave}
				oncancel={handleCancel}
			/>
		</div>
	{:else if loading}
		<div class="flex flex-1 items-center justify-center">
			<span class="loading loading-spinner loading-lg"></span>
		</div>
	{:else if templates.length === 0}
		<p class="text-base-content/60 py-12 text-center">
			No trivia templates yet. Create one to get started.
		</p>
	{:else}
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each templates as template (template.id)}
				<TriviaTemplateCard
					{template}
					onedit={() => openEdit(template)}
					ondelete={() => handleDelete(template)}
					ongenerate={() => openGenerate(template)}
				/>
			{/each}
		</div>
	{/if}

	{#if generateTemplateId !== null}
		<TriviaGenerateModal
			templateId={generateTemplateId}
			templateName={generateTemplateName}
			open={true}
			onclose={closeGenerate}
			ongenerated={handleGenerated}
		/>
	{/if}
</div>
