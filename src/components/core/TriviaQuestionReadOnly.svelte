<script lang="ts">
	import classNames from 'classnames';
	import {
		TriviaQuestionType,
		TRIVIA_QUESTION_TYPE_LABELS
	} from '$types/trivia.type';
	import type { TriviaQuestionRow, GeneratedTriviaQuestion } from '$types/trivia.type';

	interface Props {
		question: TriviaQuestionRow;
		generating: boolean;
		generatedQuestions: GeneratedTriviaQuestion[];
		collectionSelected: boolean;
		ongenerate: () => void;
		classes?: string;
	}

	let { question, generating, generatedQuestions, collectionSelected, ongenerate, classes = '' }: Props = $props();

	let config = $derived(question.config as unknown as Record<string, unknown>);

	let hasSubject = $derived(
		question.question_type === TriviaQuestionType.WhichCameFirst ||
		question.question_type === TriviaQuestionType.WhatYearReleased ||
		question.question_type === TriviaQuestionType.WhatArtistForTitle ||
		question.question_type === TriviaQuestionType.WhatLabelReleasedIt
	);

	let hasOptionCount = $derived(
		question.question_type !== TriviaQuestionType.WhatYearReleased &&
		question.question_type !== TriviaQuestionType.OddOneOut
	);

	let hasFragmentLength = $derived(
		question.question_type === TriviaQuestionType.WhoSangLyrics ||
		question.question_type === TriviaQuestionType.WhatSongFromLyrics
	);
</script>

<div class={classNames('rounded-lg bg-base-200 px-3 py-2', classes)}>
	<div class="flex items-center gap-2">
		<span class="text-sm font-medium">{TRIVIA_QUESTION_TYPE_LABELS[question.question_type]}</span>
		<div class="text-base-content/40 flex flex-1 flex-wrap items-center gap-x-2 text-xs">
			{#if hasSubject}
				<span>{config.subject}</span>
			{/if}
			{#if hasOptionCount}
				<span>{config.optionCount} opts</span>
			{/if}
			{#if hasFragmentLength}
				<span>{config.fragmentLength}w</span>
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

	{#if generatedQuestions.length > 0}
		<div class="mt-2 flex flex-col gap-2">
			{#each generatedQuestions as gq, qi (qi)}
				<div class="rounded-md bg-base-300 p-3">
					<p class="text-sm font-medium">{gq.questionText}</p>
					<div class="mt-2 flex flex-col gap-1">
						{#each gq.options as option, i}
							<div class={classNames(
								'flex items-center gap-3 rounded px-2 py-1 text-sm',
								{
									'bg-success/20 font-semibold': i === gq.correctIndex,
									'bg-base-100': i !== gq.correctIndex
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
			{/each}
		</div>
	{:else if !collectionSelected}
		<p class="text-base-content/30 mt-1 text-xs">Select a collection to preview questions</p>
	{/if}
</div>
