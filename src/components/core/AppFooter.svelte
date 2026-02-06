<script lang="ts">
	import classNames from 'classnames';
	import { _ } from 'svelte-i18n';

	interface Props {
		classes?: string;
	}

	let { classes = '' }: Props = $props();

	const currentYear = new Date().getFullYear();

	let computedClasses = $derived(
		classNames('mt-auto border-t border-base-300 bg-base-200 px-6 py-8', classes)
	);
</script>

<footer class={computedClasses}>
	<div class="mx-auto flex max-w-4xl flex-col items-center gap-4">
		<div class="flex items-center gap-2">
			<span class="text-xs text-base-content/60">{$_('footer.poweredBy')}</span>
			<a
				href="https://www.spotify.com"
				target="_blank"
				rel="noopener noreferrer"
				class="flex items-center gap-1 text-[#1DB954] transition-opacity hover:opacity-80"
			>
				<i class="fa-brands fa-spotify text-lg"></i>
				<span class="text-sm font-semibold">{$_('footer.spotify')}</span>
			</a>
		</div>

		<nav class="flex flex-wrap justify-center gap-4">
			<a href="/legal/privacy" class="link text-xs text-base-content/60 link-hover">
				{$_('footer.privacyPolicy')}
			</a>
			<a href="/legal/terms" class="link text-xs text-base-content/60 link-hover">
				{$_('footer.termsOfService')}
			</a>
			<a href="/legal/cookies" class="link text-xs text-base-content/60 link-hover">
				{$_('footer.cookiePolicy')}
			</a>
		</nav>

		<p class="text-xs text-base-content/40">
			&copy; {currentYear} Spoticromos. {$_('footer.copyright')}
		</p>
	</div>
</footer>
