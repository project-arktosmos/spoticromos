<script lang="ts">
	import { TriviaQuestionType } from '$types/trivia.type';
	import type { TriviaQuestionConfig, ImageDisplayConfig } from '$types/trivia.type';

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

	function updateImageField(field: keyof ImageDisplayConfig, value: string) {
		if (value === '') {
			const { [field]: _, ...rest } = config as unknown as Record<string, unknown>;
			onchange(rest as unknown as TriviaQuestionConfig);
		} else {
			updateField(field, value);
		}
	}

	let hasOptionCount = $derived(
		questionType !== TriviaQuestionType.WhatYearReleased &&
		questionType !== TriviaQuestionType.OddOneOut
	);

	let hasSubject = $derived(
		questionType === TriviaQuestionType.WhichCameFirst ||
		questionType === TriviaQuestionType.WhatYearReleased ||
		questionType === TriviaQuestionType.WhatArtistForTitle ||
		questionType === TriviaQuestionType.WhatLabelReleasedIt
	);

	let hasFragmentLength = $derived(
		questionType === TriviaQuestionType.WhoSangLyrics ||
		questionType === TriviaQuestionType.WhatSongFromLyrics
	);

	let imgConfig = $derived(config as ImageDisplayConfig);
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

		<label class="form-control w-32">
			<div class="label">
				<span class="label-text text-xs">Question image</span>
			</div>
			<select
				value={imgConfig.showImage ?? ''}
				onchange={(e) => updateImageField('showImage', (e.target as HTMLSelectElement).value)}
				class="select select-bordered select-sm w-full"
			>
				<option value="">Default</option>
				<option value="album">Album cover</option>
				<option value="artist">Artist photo</option>
			</select>
		</label>

		<label class="form-control w-32">
			<div class="label">
				<span class="label-text text-xs">Option images</span>
			</div>
			<select
				value={imgConfig.showOptionImages ?? ''}
				onchange={(e) => updateImageField('showOptionImages', (e.target as HTMLSelectElement).value)}
				class="select select-bordered select-sm w-full"
			>
				<option value="">None</option>
				<option value="album">Album covers</option>
				<option value="artist">Artist photos</option>
			</select>
		</label>
	</div>
</div>
