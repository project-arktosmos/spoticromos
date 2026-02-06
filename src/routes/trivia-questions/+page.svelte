<script lang="ts">
	import { onMount } from 'svelte';
	import classNames from 'classnames';
	import TriviaQuestionForm from '$components/core/TriviaQuestionForm.svelte';
	import type {
		TriviaQuestionRow,
		CollectionSummary,
		CreateTriviaQuestionPayload,
		GeneratedTriviaQuestion
	} from '$types/trivia.type';

	// ---------------------------------------------------------------------------
	// State
	// ---------------------------------------------------------------------------

	let questions = $state<TriviaQuestionRow[]>([]);
	let loading = $state(true);
	let errorMsg = $state('');

	// Collections
	let collections = $state<CollectionSummary[]>([]);
	let loadingCollections = $state(true);
	let selectedCollectionId = $state<number | null>(null);

	// Inline editing
	let creatingNew = $state(false);
	let _saving = $state(false);

	// Generation
	let generatingAll = $state(false);
	let generatingQuestionId = $state<number | null>(null);
	let generatedResults = $state<Map<number, GeneratedTriviaQuestion[]>>(new Map());

	// Seed
	let seeding = $state(false);

	// ---------------------------------------------------------------------------
	// Data fetching
	// ---------------------------------------------------------------------------

	async function fetchQuestions() {
		try {
			const res = await fetch('/api/trivia-questions');
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = await res.json();
			questions = data.questions ?? [];
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to load questions';
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
		fetchQuestions();
		fetchCollections();
	});

	// ---------------------------------------------------------------------------
	// Create / Edit
	// ---------------------------------------------------------------------------

	function openCreate() {
		creatingNew = true;
	}

	function cancelCreate() {
		creatingNew = false;
	}

	async function handleSave(payload: CreateTriviaQuestionPayload, questionId?: number) {
		_saving = true;
		errorMsg = '';

		try {
			const isEdit = questionId !== undefined;
			const url = isEdit ? `/api/trivia-questions/${questionId}` : '/api/trivia-questions';
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

			creatingNew = false;
			loading = true;
			await fetchQuestions();
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to save question';
		} finally {
			_saving = false;
		}
	}

	// ---------------------------------------------------------------------------
	// Seed default questions
	// ---------------------------------------------------------------------------

	async function seedDefault() {
		seeding = true;
		errorMsg = '';
		try {
			const res = await fetch('/api/trivia-questions/seed', { method: 'POST' });
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			loading = true;
			await fetchQuestions();
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to seed questions';
		} finally {
			seeding = false;
		}
	}

	// ---------------------------------------------------------------------------
	// Delete
	// ---------------------------------------------------------------------------

	async function handleDelete(question: TriviaQuestionRow) {
		if (!confirm('Delete this question? This cannot be undone.')) return;

		try {
			const res = await fetch(`/api/trivia-questions/${question.id}`, { method: 'DELETE' });
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			loading = true;
			await fetchQuestions();
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to delete question';
		}
	}

	// ---------------------------------------------------------------------------
	// Generate
	// ---------------------------------------------------------------------------

	async function generateAll() {
		if (!selectedCollectionId || questions.length === 0) return;
		generatingAll = true;
		generatedResults = new Map();
		errorMsg = '';

		try {
			const res = await fetch('/api/trivia-questions/generate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ collectionId: selectedCollectionId })
			});
			if (!res.ok) {
				const data = await res.json().catch(() => null);
				throw new Error(data?.message ?? `HTTP ${res.status}`);
			}
			const data = await res.json();
			const allGenerated = (data.trivia?.questions ?? []) as GeneratedTriviaQuestion[];

			// Group generated questions by their source question config id
			const grouped = new Map<number, GeneratedTriviaQuestion[]>();
			for (const gq of allGenerated) {
				const list = grouped.get(gq.questionId) ?? [];
				list.push(gq);
				grouped.set(gq.questionId, list);
			}
			generatedResults = grouped;
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Generation failed';
		} finally {
			generatingAll = false;
		}
	}

	async function handleGenerate(questionId: number) {
		if (!selectedCollectionId) return;
		generatingQuestionId = questionId;
		errorMsg = '';

		try {
			const res = await fetch('/api/trivia-questions/generate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ collectionId: selectedCollectionId, questionId })
			});
			if (!res.ok) {
				const data = await res.json().catch(() => null);
				throw new Error(data?.message ?? `HTTP ${res.status}`);
			}
			const data = await res.json();
			const generated = (data.trivia?.questions ?? []) as GeneratedTriviaQuestion[];
			if (generated.length > 0) {
				const updated = new Map(generatedResults);
				updated.set(questionId, generated);
				generatedResults = updated;
			}
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Generation failed';
		} finally {
			generatingQuestionId = null;
		}
	}

	function onCollectionChange(colId: number | null) {
		selectedCollectionId = colId;
		generatedResults = new Map();
		if (colId) generateAll();
	}
</script>

<div class="flex min-h-screen w-full flex-col gap-6 p-4 tablet:p-8">
	<div class="flex items-center justify-between">
		<h1 class="text-2xl font-bold">Trivia Questions</h1>
		<button class="btn btn-sm btn-primary" onclick={openCreate}>+ New Question</button>
	</div>

	{#if errorMsg}
		<div class="alert alert-error">
			<span>{errorMsg}</span>
			<button
				class="btn btn-ghost btn-xs"
				onclick={() => {
					errorMsg = '';
				}}>Dismiss</button
			>
		</div>
	{/if}

	<!-- Global collection selector -->
	{#if !loading && questions.length > 0}
		<div class="flex items-center gap-3 rounded-lg bg-base-200 px-4 py-3">
			<span class="text-sm font-medium whitespace-nowrap">Collection:</span>
			{#if loadingCollections}
				<span class="loading loading-sm loading-spinner"></span>
			{:else if collections.length === 0}
				<span class="text-sm text-base-content/50">No collections available</span>
			{:else}
				<select
					class="select-bordered select flex-1 select-sm"
					onchange={(e) => {
						onCollectionChange(Number((e.target as HTMLSelectElement).value) || null);
					}}
				>
					<option value="">Choose collection...</option>
					{#each collections as col}
						<option value={col.id}>{col.name} ({col.track_count} tracks)</option>
					{/each}
				</select>
			{/if}
		</div>
	{/if}

	<!-- New question form -->
	{#if creatingNew}
		<div class="rounded-xl border border-primary bg-base-100 p-5 shadow-sm">
			<h2 class="mb-4 text-lg font-semibold">New Question</h2>
			<TriviaQuestionForm onsave={(payload) => handleSave(payload)} oncancel={cancelCreate} />
		</div>
	{/if}

	{#if loading}
		<div class="flex flex-1 items-center justify-center">
			<span class="loading loading-lg loading-spinner"></span>
		</div>
	{:else if questions.length === 0}
		<div class="flex flex-col items-center gap-4 py-12">
			<p class="text-center text-base-content/60">
				No trivia questions yet. Create one to get started, or seed the defaults with all 13
				question types.
			</p>
			<button class="btn btn-sm btn-secondary" disabled={seeding} onclick={seedDefault}>
				{#if seeding}
					<span class="loading loading-sm loading-spinner"></span>
				{/if}
				Seed default questions
			</button>
		</div>
	{:else}
		<div class="flex flex-col gap-3">
			{#each questions as question (question.id)}
				{@const generatedQuestions = generatedResults.get(question.id) ?? []}
				<div class="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
					{#key question.id}
						<TriviaQuestionForm {question} onsave={(payload) => handleSave(payload, question.id)} />
					{/key}

					<div class="mt-3 flex items-center gap-2 border-t border-base-300 pt-3">
						<button
							class="btn btn-xs btn-primary"
							disabled={!selectedCollectionId ||
								generatingAll ||
								generatingQuestionId === question.id}
							onclick={() => handleGenerate(question.id)}
						>
							{#if generatingAll || generatingQuestionId === question.id}
								<span class="loading loading-xs loading-spinner"></span>
							{/if}
							Generate
						</button>
						<div class="flex-1"></div>
						<button class="btn text-error btn-ghost btn-xs" onclick={() => handleDelete(question)}
							>Delete</button
						>
					</div>

					{#if generatedQuestions.length > 0}
						<div class="mt-2 flex flex-col gap-2">
							{#each generatedQuestions as gq, qi (qi)}
								<div class="rounded-md bg-base-300 p-3">
									<div class="flex items-start gap-3">
										{#if gq.imageUrl}
											<img
												src={gq.imageUrl}
												alt=""
												class="h-12 w-12 shrink-0 rounded object-cover"
											/>
										{/if}
										<div class="flex flex-1 flex-col gap-1">
											{#each gq.options as option, i}
												<div
													class={classNames('flex items-center gap-2 rounded px-2 py-1 text-sm', {
														'bg-success/20 font-semibold': i === gq.correctIndex,
														'bg-base-100': i !== gq.correctIndex
													})}
												>
													{#if option.imageUrl}
														<img
															src={option.imageUrl}
															alt=""
															class="h-8 w-8 shrink-0 rounded object-cover"
														/>
													{/if}
													<span class="flex-1">{option.label}</span>
													{#if option.verification}
														<span class="text-xs text-base-content/50">{option.verification}</span>
													{/if}
												</div>
											{/each}
										</div>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
