<script lang="ts">
	import classNames from 'classnames';
	import TriviaQuestionConfigFields from '$components/core/TriviaQuestionConfigFields.svelte';
	import {
		TriviaQuestionType,
		TRIVIA_QUESTION_TYPE_LABELS,
		DEFAULT_CONFIGS
	} from '$types/trivia.type';
	import type {
		TriviaQuestionRow,
		TriviaQuestionConfig,
		CreateTriviaQuestionPayload
	} from '$types/trivia.type';

	interface Props {
		question?: TriviaQuestionRow | null;
		onsave: (payload: CreateTriviaQuestionPayload) => void;
		oncancel: () => void;
		classes?: string;
	}

	let { question = null, onsave, oncancel, classes = '' }: Props = $props();

	let questionType = $state<TriviaQuestionType>(question?.question_type ?? TriviaQuestionType.WhichCameFirst);
	let config = $state<TriviaQuestionConfig>(question?.config ? { ...question.config } : { ...DEFAULT_CONFIGS[TriviaQuestionType.WhichCameFirst] });

	const questionTypes = Object.values(TriviaQuestionType);

	function changeQuestionType(newType: TriviaQuestionType) {
		questionType = newType;
		config = { ...DEFAULT_CONFIGS[newType] };
	}

	function handleSubmit() {
		onsave({
			question_type: questionType,
			config
		});
	}
</script>

<div class={classNames('flex flex-col gap-4', classes)}>
	<div class="flex flex-col gap-3">
		<label class="form-control w-full">
			<div class="label">
				<span class="label-text font-medium">Question type</span>
			</div>
			<select
				value={questionType}
				onchange={(e) => changeQuestionType((e.target as HTMLSelectElement).value as TriviaQuestionType)}
				class="select select-bordered w-full"
			>
				{#each questionTypes as type}
					<option value={type}>{TRIVIA_QUESTION_TYPE_LABELS[type]}</option>
				{/each}
			</select>
		</label>

		<TriviaQuestionConfigFields
			{questionType}
			{config}
			onchange={(c) => { config = c; }}
		/>
	</div>

	<div class="flex justify-end gap-2 pt-2">
		<button class="btn btn-ghost" onclick={oncancel}>Cancel</button>
		<button class="btn btn-primary" onclick={handleSubmit}>
			{question ? 'Save changes' : 'Add question'}
		</button>
	</div>
</div>
