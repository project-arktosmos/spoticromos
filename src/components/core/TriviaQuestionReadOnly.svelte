<script lang="ts">
	import classNames from 'classnames';
	import {
		TriviaQuestionType,
		TRIVIA_QUESTION_TYPE_LABELS
	} from '$types/trivia.type';
	import type { TriviaTemplateQuestionRow, GeneratedTriviaQuestion } from '$types/trivia.type';

	interface Props {
		question: TriviaTemplateQuestionRow;
		index: number;
		generating: boolean;
		generated: GeneratedTriviaQuestion | null;
		collectionSelected: boolean;
		ongenerate: () => void;
		classes?: string;
	}

	let { question, index, generating, generated, collectionSelected, ongenerate, classes = '' }: Props = $props();

	let config = $derived(question.config as Record<string, unknown>);

	let hasSubject = $derived(
		question.question_type === TriviaQuestionType.WhichCameFirst ||
		question.question_type === TriviaQuestionType.WhatYearReleased ||
		question.question_type === TriviaQuestionType.WhatArtistForTitle
	);

	let hasOptionCount = $derived(
		question.question_type !== TriviaQuestionType.WhatYearReleased
	);

	let hasFragmentLength = $derived(
		question.question_type === TriviaQuestionType.WhoSangLyrics
	);
</script>

<div class={classNames('rounded-lg bg-base-200 px-3 py-2', classes)}>
	<div class="flex items-center gap-2">
		<span class="text-base-content/40 text-xs font-bold">#{index + 1}</span>
		<span class="text-sm font-medium">{TRIVIA_QUESTION_TYPE_LABELS[question.question_type]}</span>
		<div class="flex flex-1 flex-wrap items-center gap-1">
			<span class="badge badge-sm badge-ghost">{config.count} q</span>
			{#if hasSubject}
				<span class="badge badge-sm badge-outline">{config.subject}</span>
			{/if}
			{#if hasOptionCount}
				<span class="badge badge-sm badge-ghost">{config.optionCount} opts</span>
			{/if}
			{#if hasFragmentLength}
				<span class="badge badge-sm badge-ghost">{config.fragmentLength} words</span>
			{/if}
		</div>
		<button
			class="btn btn-primary btn-xs"
			disabled={!collectionSelected || generating}
			onclick={ongenerate}
		>
			{#if generating}
				<span class="loading loading-spinner loading-xs"></span>
			{/if}
			Generate
		</button>
	</div>

	{#if generated}
		<div class="mt-2 rounded-md bg-base-300 p-3">
			<p class="text-sm font-medium">{generated.questionText}</p>
			<div class="mt-2 flex flex-col gap-1">
				{#each generated.options as option, i}
					<div class={classNames(
						'flex items-center gap-3 rounded px-2 py-1 text-sm',
						{
							'bg-success/20 font-semibold': i === generated.correctIndex,
							'bg-base-100': i !== generated.correctIndex
						}
					)}>
						<span class="flex-1">{option.label}</span>
						{#if option.verification}
							<span class="text-base-content/50 text-xs">{option.verification}</span>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
