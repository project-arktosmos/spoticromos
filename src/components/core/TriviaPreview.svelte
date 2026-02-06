<script lang="ts">
	import classNames from 'classnames';
	import { TRIVIA_QUESTION_TYPE_LABELS } from '$types/trivia.type';
	import type { GeneratedTriviaSet } from '$types/trivia.type';

	interface Props {
		trivia: GeneratedTriviaSet;
		onclose: () => void;
		classes?: string;
	}

	let { trivia, onclose, classes = '' }: Props = $props();
</script>

<div class={classNames('flex flex-col gap-4', classes)}>
	<div class="flex items-center justify-between">
		<div>
			<h2 class="text-lg font-bold">{trivia.templateName}</h2>
			<p class="text-base-content/60 text-sm">
				Collection: {trivia.collectionName} &middot;
				{trivia.questions.length} question{trivia.questions.length !== 1 ? 's' : ''} generated
				{#if trivia.skippedCount > 0}
					<span class="text-warning">({trivia.skippedCount} skipped)</span>
				{/if}
			</p>
		</div>
		<button class="btn btn-ghost btn-sm" onclick={onclose}>Close</button>
	</div>

	{#if trivia.questions.length === 0}
		<div class="alert alert-warning">
			<span>No questions could be generated. The collection may not have enough data for the configured question types.</span>
		</div>
	{:else}
		<div class="flex flex-col gap-3">
			{#each trivia.questions as question, i (i)}
				<div class="rounded-lg border border-base-300 bg-base-200 p-4">
					<div class="mb-1 flex items-center gap-2">
						<span class="badge badge-neutral badge-sm">Q{i + 1}</span>
						<span class="text-base-content/50 text-xs">
							{TRIVIA_QUESTION_TYPE_LABELS[question.questionType]}
						</span>
					</div>

					<div class="flex items-start gap-3">
						{#if question.imageUrl}
							<img
								src={question.imageUrl}
								alt=""
								class="h-12 w-12 rounded object-cover"
							/>
						{/if}
						<div class="flex-1">
							<p class="mb-2 font-medium">{question.questionText}</p>
							<div class="grid grid-cols-1 gap-1 sm:grid-cols-2">
								{#each question.options as option, j (j)}
									<div
										class={classNames(
											'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm',
											{
												'bg-success/20 font-semibold': j === question.correctIndex,
												'bg-base-300': j !== question.correctIndex
											}
										)}
									>
										<span class="text-base-content/40 text-xs">{String.fromCharCode(65 + j)}.</span>
										{#if option.imageUrl}
											<img
												src={option.imageUrl}
												alt=""
												class="h-8 w-8 shrink-0 rounded object-cover"
											/>
										{/if}
										<span>{option.label}</span>
										{#if option.meta}
											<span class="text-base-content/40 ml-auto text-xs">({option.meta})</span>
										{/if}
									</div>
								{/each}
							</div>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
