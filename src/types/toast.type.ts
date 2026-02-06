import type { ThemeColors } from '$types/core.type';

export interface ToastSimple {
	id: string;
	type: 'simple';
	message: string;
	color: ThemeColors;
	duration: number;
}

export interface ToastRich {
	id: string;
	type: 'rich';
	title: string;
	description: string;
	image?: string;
	color: ThemeColors;
	duration: number;
}

export type Toast = ToastSimple | ToastRich;
