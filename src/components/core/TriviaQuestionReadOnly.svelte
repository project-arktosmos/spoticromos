<script lang="ts">
	import classNames from 'classnames';
	import { getQuestionTemplateText } from '$types/trivia.type';
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

	let templateText = $derived(getQuestionTemplateText(question.question_type, question.config));
</script>

<div class={classNames('rounded-lg bg-base-200 px-3 py-2', classes)}>
	<div class="flex items-center gap-2">
		<span class="flex-1 text-sm font-medium">{templateText}</span>
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
								<div class={classNames(
									'flex items-center gap-2 rounded px-2 py-1 text-sm',
									{
										'bg-success/20 font-semibold': i === gq.correctIndex,
										'bg-base-100': i !== gq.correctIndex
									}
								)}>
									{#if option.imageUrl}
										<img
											src={option.imageUrl}
											alt=""
											class="h-8 w-8 shrink-0 rounded object-cover"
										/>
									{/if}
									<span class="flex-1">{option.label}</span>
									{#if option.verification}
										<span class="text-base-content/50 text-xs">{option.verification}</span>
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
