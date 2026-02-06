<script lang="ts">
	import classNames from 'classnames';
	import { ThemeColors } from '$types/core.type';
	import type { Toast } from '$types/toast.type';
	import { toastStore, removeToast } from '$services/toast.service';

	const colorToAlert: Record<ThemeColors, string> = {
		[ThemeColors.Primary]: 'alert-primary',
		[ThemeColors.Secondary]: 'alert-secondary',
		[ThemeColors.Accent]: 'alert-accent',
		[ThemeColors.Success]: 'alert-success',
		[ThemeColors.Error]: 'alert-error',
		[ThemeColors.Info]: 'alert-info',
		[ThemeColors.Warning]: 'alert-warning',
		[ThemeColors.Neutral]: 'alert-neutral'
	};

	let toasts: Toast[] = $derived($toastStore);
</script>

{#if toasts.length > 0}
	<div class="toast toast-end toast-top z-50">
		{#each toasts as item (item.id)}
			<div class={classNames('alert shadow-lg', colorToAlert[item.color])}>
				{#if item.type === 'simple'}
					<span>{item.message}</span>
				{:else}
					<div class="flex items-start gap-3">
						{#if item.image}
							<img src={item.image} alt={item.title} class="h-12 w-12 rounded-lg object-cover" />
						{/if}
						<div class="flex flex-col">
							<span class="font-bold">{item.title}</span>
							<span class="text-sm">{item.description}</span>
						</div>
					</div>
				{/if}
				<button
					class="btn btn-ghost btn-sm"
					onclick={() => removeToast(item.id)}
					aria-label="Dismiss"
				>
					<i class="fa-solid fa-xmark"></i>
				</button>
			</div>
		{/each}
	</div>
{/if}
