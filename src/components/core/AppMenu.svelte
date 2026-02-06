<script lang="ts">
	import classNames from 'classnames';
	import { page } from '$app/stores';
	import routes from '$data/routes.json';
</script>

<aside class="w-56 min-h-screen bg-base-200">
	<ul class="menu p-4 gap-1">
		{#each routes as route}
			{@const active = $page.url.pathname === route.path}
			<li>
				<a
					href={route.path}
					class={classNames({
						'active': active
					})}
				>
					{route.label}
				</a>
			</li>
		{/each}
	</ul>
</aside>
