<script lang="ts">
	import classNames from 'classnames';
	import TriviaQuestionConfigFields from '$components/core/TriviaQuestionConfigFields.svelte';
	import {
		TriviaQuestionType,
		TRIVIA_QUESTION_TYPE_LABELS,
		DEFAULT_CONFIGS
	} from '$types/trivia.type';
	import type {
		TriviaTemplateRow,
		TriviaTemplateQuestionRow,
		TriviaQuestionConfig,
		CreateTriviaTemplatePayload
	} from '$types/trivia.type';

	interface QuestionDraft {
		question_type: TriviaQuestionType;
		config: TriviaQuestionConfig;
	}

	interface Props {
		template?: TriviaTemplateRow | null;
		questions?: TriviaTemplateQuestionRow[];
		onsave: (payload: CreateTriviaTemplatePayload) => void;
		oncancel: () => void;
		classes?: string;
	}

	let { template = null, questions = [], onsave, oncancel, classes = '' }: Props = $props();

	let name = $state(template?.name ?? '');
	let description = $state(template?.description ?? '');
	let drafts = $state<QuestionDraft[]>(
		questions.length > 0
			? questions.map((q) => ({ question_type: q.question_type, config: { ...q.config } }))
			: [{ question_type: TriviaQuestionType.WhichCameFirst, config: { ...DEFAULT_CONFIGS[TriviaQuestionType.WhichCameFirst] } }]
	);

	let isValid = $derived(name.trim().length > 0 && drafts.length > 0);

	const questionTypes = Object.values(TriviaQuestionType);

	function addQuestion() {
		const type = TriviaQuestionType.WhichCameFirst;
		drafts = [...drafts, { question_type: type, config: { ...DEFAULT_CONFIGS[type] } }];
	}

	function removeQuestion(index: number) {
		drafts = drafts.filter((_, i) => i !== index);
	}

	function moveQuestion(index: number, direction: -1 | 1) {
		const newIndex = index + direction;
		if (newIndex < 0 || newIndex >= drafts.length) return;
		const updated = [...drafts];
		[updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
		drafts = updated;
	}

	function changeQuestionType(index: number, newType: TriviaQuestionType) {
		const updated = [...drafts];
		updated[index] = {
			question_type: newType,
			config: { ...DEFAULT_CONFIGS[newType] }
		};
		drafts = updated;
	}

	function updateConfig(index: number, config: TriviaQuestionConfig) {
		const updated = [...drafts];
		updated[index] = { ...updated[index], config };
		drafts = updated;
	}

	function handleSubmit() {
		if (!isValid) return;
		onsave({
			name: name.trim(),
			description: description.trim() || undefined,
			questions: drafts.map((d, i) => ({
				question_type: d.question_type,
				config: d.config,
				position: i
			}))
		});
	}
</script>

<div class={classNames('flex flex-col gap-4', classes)}>
	<div class="flex flex-col gap-3">
		<label class="form-control w-full">
			<div class="label">
				<span class="label-text font-medium">Template name</span>
			</div>
			<input
				type="text"
				bind:value={name}
				placeholder="e.g. 90s Music Quiz"
				class="input input-bordered w-full"
			/>
		</label>

		<label class="form-control w-full">
			<div class="label">
				<span class="label-text font-medium">Description</span>
			</div>
			<textarea
				bind:value={description}
				placeholder="Optional description..."
				class="textarea textarea-bordered w-full"
				rows="2"
			></textarea>
		</label>
	</div>

	<div class="divider my-0"></div>

	<div class="flex items-center justify-between">
		<h3 class="text-sm font-semibold">Questions ({drafts.length})</h3>
		<button class="btn btn-ghost btn-sm" onclick={addQuestion}>+ Add question</button>
	</div>

	<div class="flex flex-col gap-3">
		{#each drafts as draft, i (i)}
			<div class="rounded-lg border border-base-300 bg-base-200 p-3">
				<div class="flex items-start gap-2">
					<div class="flex flex-col gap-1">
						<button
							class="btn btn-ghost btn-xs"
							disabled={i === 0}
							onclick={() => moveQuestion(i, -1)}
						>&#9650;</button>
						<button
							class="btn btn-ghost btn-xs"
							disabled={i === drafts.length - 1}
							onclick={() => moveQuestion(i, 1)}
						>&#9660;</button>
					</div>

					<div class="flex flex-1 flex-col gap-2">
						<div class="flex items-center gap-2">
							<span class="text-base-content/50 text-xs font-medium">#{i + 1}</span>
							<select
								value={draft.question_type}
								onchange={(e) => changeQuestionType(i, (e.target as HTMLSelectElement).value as TriviaQuestionType)}
								class="select select-bordered select-sm flex-1"
							>
								{#each questionTypes as type}
									<option value={type}>{TRIVIA_QUESTION_TYPE_LABELS[type]}</option>
								{/each}
							</select>
							<button
								class="btn btn-ghost btn-sm text-error"
								onclick={() => removeQuestion(i)}
							>&#10005;</button>
						</div>

						<TriviaQuestionConfigFields
							questionType={draft.question_type}
							config={draft.config}
							onchange={(config) => updateConfig(i, config)}
						/>
					</div>
				</div>
			</div>
		{/each}
	</div>

	{#if drafts.length === 0}
		<p class="text-base-content/50 text-center text-sm">No questions added. Click "+ Add question" to start.</p>
	{/if}

	<div class="flex justify-end gap-2 pt-2">
		<button class="btn btn-ghost" onclick={oncancel}>Cancel</button>
		<button class="btn btn-primary" disabled={!isValid} onclick={handleSubmit}>
			{template ? 'Save changes' : 'Create template'}
		</button>
	</div>
</div>
