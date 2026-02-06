<script lang="ts">
	import classNames from 'classnames';
	import { _ } from 'svelte-i18n';
	import {
		cookieConsentStore,
		acceptAllCookies,
		acceptEssentialOnly
	} from '$services/cookie-consent.service';

	let visible = $derived($cookieConsentStore.status === 'pending');
</script>

{#if visible}
	<div
		class={classNames(
			'fixed right-0 bottom-0 left-0 z-40',
			'border-t border-base-content/10 bg-base-300 p-4 shadow-lg'
		)}
	>
		<div class="mx-auto flex max-w-4xl flex-col gap-3">
			<p class="text-sm text-base-content/80">
				{$_('cookie.message')}
			</p>
			<p class="text-xs text-base-content/60">
				{$_('cookie.analyticsInfo')}
				<a href="/legal/cookies" class="link text-xs link-primary">
					{$_('cookie.learnMore')}
				</a>
				&middot;
				<a href="/legal/privacy" class="link text-xs link-primary">
					{$_('cookie.privacyPolicy')}
				</a>
			</p>
			<div class="flex flex-wrap gap-2 sm:justify-end">
				<button class="btn btn-ghost btn-sm" onclick={acceptEssentialOnly}>
					{$_('cookie.essentialOnly')}
				</button>
				<button class="btn btn-sm btn-primary" onclick={acceptAllCookies}>
					{$_('cookie.acceptAll')}
				</button>
			</div>
		</div>
	</div>
{/if}
