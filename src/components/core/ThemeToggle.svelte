<script lang="ts">
	import classNames from 'classnames';
	import {
		themeStore,
		toggleTheme,
		getEffectiveTheme,
		applyTheme,
		type Theme
	} from '$services/theme.service';
	import { onMount } from 'svelte';

	let currentTheme: Theme = $state('fantasy');

	onMount(() => {
		currentTheme = getEffectiveTheme();
		applyTheme(currentTheme);

		const unsubscribe = themeStore.subscribe(() => {
			currentTheme = getEffectiveTheme();
			applyTheme(currentTheme);
		});

		return unsubscribe;
	});

	function handleToggle() {
		toggleTheme();
	}

	let isDark = $derived(currentTheme === 'dracula');
</script>

<button
	class={classNames('btn btn-circle btn-ghost btn-sm fixed bottom-4 left-4 z-50')}
	onclick={handleToggle}
	aria-label="Toggle theme"
>
	{#if isDark}
		<i class="fa-solid fa-sun text-lg"></i>
	{:else}
		<i class="fa-solid fa-moon text-lg"></i>
	{/if}
</button>
