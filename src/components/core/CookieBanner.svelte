<script lang="ts">
	import classNames from 'classnames';
	import { _ } from 'svelte-i18n';
	import { cookieConsentStore, acceptCookies } from '$services/cookie-consent.service';

	let visible = $derived($cookieConsentStore === 'pending');
</script>

{#if visible}
	<div
		class={classNames(
			'fixed bottom-0 left-0 right-0 z-40',
			'border-t border-base-content/10 bg-base-300 p-4 shadow-lg'
		)}
	>
		<div
			class="mx-auto flex max-w-4xl flex-col items-center gap-3 sm:flex-row sm:justify-between"
		>
			<p class="text-base-content/80 text-sm">
				{$_('cookie.message')}
				<a href="/legal/cookies" class="link link-primary text-sm">
					{$_('cookie.learnMore')}
				</a>
			</p>
			<button class="btn btn-primary btn-sm" onclick={acceptCookies}>
				{$_('cookie.accept')}
			</button>
		</div>
	</div>
{/if}
