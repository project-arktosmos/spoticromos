import { writable } from 'svelte/store';
import { ThemeColors } from '$types/core.type';
import type { Toast } from '$types/toast.type';

const DEFAULT_DURATION = 5000;

export const toastStore = writable<Toast[]>([]);

function addToast(item: Toast): void {
	toastStore.update((toasts) => [...toasts, item]);

	if (item.duration > 0) {
		setTimeout(() => removeToast(item.id), item.duration);
	}
}

export function removeToast(id: string): void {
	toastStore.update((toasts) => toasts.filter((t) => t.id !== id));
}

export function toast(
	message: string,
	color: ThemeColors = ThemeColors.Info,
	duration: number = DEFAULT_DURATION
): void {
	addToast({
		id: crypto.randomUUID(),
		type: 'simple',
		message,
		color,
		duration
	});
}

export function toastRich(options: {
	title: string;
	description: string;
	image?: string;
	color?: ThemeColors;
	duration?: number;
}): void {
	addToast({
		id: crypto.randomUUID(),
		type: 'rich',
		title: options.title,
		description: options.description,
		image: options.image,
		color: options.color ?? ThemeColors.Info,
		duration: options.duration ?? DEFAULT_DURATION
	});
}
