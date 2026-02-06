import type { ClientInit } from '@sveltejs/kit';
import '$services/i18n';
import { waitLocale } from 'svelte-i18n';

export const init: ClientInit = async () => {
	await waitLocale();
};
