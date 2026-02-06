<script lang="ts">
	import { TriviaQuestionType } from '$types/trivia.type';
	import type { TriviaQuestionConfig } from '$types/trivia.type';

	interface Props {
		questionType: TriviaQuestionType;
		config: TriviaQuestionConfig;
		onchange: (config: TriviaQuestionConfig) => void;
		classes?: string;
	}

	let { questionType, config, onchange, classes = '' }: Props = $props();

	function updateField(field: string, value: unknown) {
		onchange({ ...config, [field]: value } as TriviaQuestionConfig);
	}

	let hasOptionCount = $derived(
		questionType !== TriviaQuestionType.WhatYearReleased
	);

	let hasSubject = $derived(
		questionType === TriviaQuestionType.WhichCameFirst ||
		questionType === TriviaQuestionType.WhatYearReleased ||
		questionType === TriviaQuestionType.WhatArtistForTitle
	);

	let hasFragmentLength = $derived(
		questionType === TriviaQuestionType.WhoSangLyrics
	);
</script>

<div class={classes}>
	<div class="flex flex-wrap items-end gap-3">
		<label class="form-control w-20">
			<div class="label">
				<span class="label-text text-xs">Count</span>
			</div>
			<input
				type="number"
				min="1"
				max="20"
				value={(config as { count: number }).count}
				oninput={(e) => updateField('count', Number((e.target as HTMLInputElement).value) || 1)}
				class="input input-bordered input-sm w-full"
			/>
		</label>

		{#if hasSubject}
			<label class="form-control w-28">
				<div class="label">
					<span class="label-text text-xs">Subject</span>
				</div>
				<select
					value={(config as { subject: string }).subject}
					onchange={(e) => updateField('subject', (e.target as HTMLSelectElement).value)}
					class="select select-bordered select-sm w-full"
				>
					<option value="song">Song</option>
					<option value="album">Album</option>
				</select>
			</label>
		{/if}

		{#if hasOptionCount}
			<label class="form-control w-24">
				<div class="label">
					<span class="label-text text-xs">Options</span>
				</div>
				<input
					type="number"
					min="2"
					max="6"
					value={(config as { optionCount: number }).optionCount}
					oninput={(e) => updateField('optionCount', Number((e.target as HTMLInputElement).value) || 4)}
					class="input input-bordered input-sm w-full"
				/>
			</label>
		{/if}

		{#if hasFragmentLength}
			<label class="form-control w-28">
				<div class="label">
					<span class="label-text text-xs">Fragment words</span>
				</div>
				<input
					type="number"
					min="3"
					max="20"
					value={(config as { fragmentLength: number }).fragmentLength}
					oninput={(e) => updateField('fragmentLength', Number((e.target as HTMLInputElement).value) || 8)}
					class="input input-bordered input-sm w-full"
				/>
			</label>
		{/if}
	</div>
</div>
