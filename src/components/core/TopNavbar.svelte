<script lang="ts">
	import classNames from 'classnames';
	import type { SessionUser } from '$types/auth.type';

	interface Props {
		user: SessionUser | null;
		classes?: string;
	}

	let { user, classes = '' }: Props = $props();

	let computedClasses = $derived(
		classNames('navbar bg-base-300 shadow-md px-4', classes)
	);
</script>

<nav class={computedClasses}>
	<div class="flex-1">
		<a href="/" class="text-xl font-bold">Spoticromos</a>
	</div>
	<div class="flex-none gap-2">
		{#if user && !user.isAnonymous}
			<div class="flex items-center gap-3">
				<a href="/profile" class="text-sm hover:underline">{user.displayName}</a>
				{#if user.avatarUrl}
					<div class="avatar">
						<div class="w-8 rounded-full">
							<img src={user.avatarUrl} alt={user.displayName ?? 'User avatar'} />
						</div>
					</div>
				{/if}
				<form method="POST" action="/api/auth/logout">
					<button type="submit" class="btn btn-ghost btn-sm">Logout</button>
				</form>
			</div>
		{:else if user && user.isAnonymous}
			<div class="flex items-center gap-3">
				<span class="text-base-content/60 text-sm">Playing as Guest</span>
				<a href="/api/auth/login" class="btn btn-primary btn-sm">Connect Spotify</a>
			</div>
		{:else}
			<a href="/api/auth/login" class="btn btn-primary btn-sm">Login with Spotify</a>
		{/if}
	</div>
</nav>
