<script lang="ts">
	import classNames from 'classnames';
	import TriviaTemplateForm from '$components/core/TriviaTemplateForm.svelte';
	import TriviaQuestionReadOnly from '$components/core/TriviaQuestionReadOnly.svelte';
	import type {
		TriviaTemplateWithQuestions,
		CreateTriviaTemplatePayload,
		GeneratedTriviaQuestion
	} from '$types/trivia.type';

	interface Props {
		template: TriviaTemplateWithQuestions;
		isEditing: boolean;
		generatingQuestionId: number | null;
		generatedResults: Map<number, GeneratedTriviaQuestion>;
		collectionSelected: boolean;
		onedit: () => void;
		oncanceledit: () => void;
		onsave: (payload: CreateTriviaTemplatePayload) => void;
		ondelete: () => void;
		ongeneratequestion: (questionId: number) => void;
		classes?: string;
	}

	let {
		template,
		isEditing,
		generatingQuestionId,
		generatedResults,
		collectionSelected,
		onedit,
		oncanceledit,
		onsave,
		ondelete,
		ongeneratequestion,
		classes = ''
	}: Props = $props();

	let computedClasses = $derived(
		classNames(
			'rounded-xl border bg-base-100 p-5 shadow-sm',
			{
				'border-primary': isEditing,
				'border-base-300': !isEditing
			},
			classes
		)
	);
</script>

<div class={computedClasses}>
	{#if isEditing}
		<h2 class="mb-4 text-lg font-semibold">Edit: {template.name}</h2>
		{#key template.id}
			<TriviaTemplateForm
				template={template}
				questions={template.questions}
				onsave={onsave}
				oncancel={oncanceledit}
			/>
		{/key}
	{:else}
		<div class="flex items-start justify-between gap-4">
			<div class="flex-1">
				<h2 class="text-lg font-semibold">{template.name}</h2>
				{#if template.description}
					<p class="text-base-content/60 mt-1 text-sm">{template.description}</p>
				{/if}
			</div>
			<div class="flex gap-1">
				<button class="btn btn-ghost btn-sm" onclick={onedit}>Edit</button>
				<button class="btn btn-ghost btn-sm text-error" onclick={ondelete}>Delete</button>
			</div>
		</div>

		<div class="mt-3 flex flex-col gap-1.5">
			{#each template.questions as question, i (question.id)}
				<TriviaQuestionReadOnly
					{question}
					index={i}
					generating={generatingQuestionId === question.id}
					generated={generatedResults.get(question.id) ?? null}
					{collectionSelected}
					ongenerate={() => ongeneratequestion(question.id)}
				/>
			{/each}
			{#if template.questions.length === 0}
				<p class="text-base-content/40 text-center text-sm">No questions configured</p>
			{/if}
		</div>
	{/if}
</div>
