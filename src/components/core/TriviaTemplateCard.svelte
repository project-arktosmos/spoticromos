<script lang="ts">
	import classNames from 'classnames';
	import type { TriviaTemplateRow } from '$types/trivia.type';

	interface Props {
		template: TriviaTemplateRow & { question_count: number };
		onedit: () => void;
		ondelete: () => void;
		ongenerate: () => void;
		classes?: string;
	}

	let { template, onedit, ondelete, ongenerate, classes = '' }: Props = $props();

	let computedClasses = $derived(classNames('card bg-base-200 shadow-sm', classes));
</script>

<div class={computedClasses}>
	<div class="card-body p-4">
		<h2 class="card-title text-base">{template.name}</h2>
		{#if template.description}
			<p class="text-base-content/60 text-sm">{template.description}</p>
		{/if}
		<p class="text-base-content/50 text-xs">
			{template.question_count} question{template.question_count !== 1 ? 's' : ''}
		</p>
		<div class="card-actions mt-2 justify-end">
			<button class="btn btn-primary btn-sm" onclick={ongenerate}>Generate</button>
			<button class="btn btn-ghost btn-sm" onclick={onedit}>Edit</button>
			<button class="btn btn-ghost btn-sm text-error" onclick={ondelete}>Delete</button>
		</div>
	</div>
</div>
