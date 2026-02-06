<script lang="ts">
	import CollectionsView from '$components/core/CollectionsView.svelte';

	let { data } = $props();
</script>

<CollectionsView user={data.user} />
