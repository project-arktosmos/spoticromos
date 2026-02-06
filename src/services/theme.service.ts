import { get } from 'svelte/store';
import localStorageWritableStore from '$utils/localStorageWritableStore';

export type Theme = 'fantasy' | 'dracula';

const LIGHT_THEME: Theme = 'fantasy';
const DARK_THEME: Theme = 'dracula';

function getSystemPreference(): Theme {
	if (typeof window === 'undefined') return LIGHT_THEME;
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? DARK_THEME : LIGHT_THEME;
}

export const themeStore = localStorageWritableStore<Theme | null>('app-theme', null);

export function getEffectiveTheme(): Theme {
	return get(themeStore) ?? getSystemPreference();
}

export function toggleTheme(): void {
	const current = getEffectiveTheme();
	themeStore.set(current === LIGHT_THEME ? DARK_THEME : LIGHT_THEME);
}

export function applyTheme(theme: Theme): void {
	document.documentElement.setAttribute('data-theme', theme);
}
