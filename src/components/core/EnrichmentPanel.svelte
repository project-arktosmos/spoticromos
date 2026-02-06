<script lang="ts">
	interface Props {
		totalTracks: number;
		enrichedCount: number;
		status: 'idle' | 'running' | 'done';
		jobTotal: number;
		jobCompleted: number;
		jobFailed: number;
		currentTrackName: string | null;
		onstart: () => void;
	}

	let {
		totalTracks,
		enrichedCount,
		status,
		jobTotal,
		jobCompleted,
		jobFailed,
		currentTrackName,
		onstart
	}: Props = $props();

	let pendingCount = $derived(totalTracks - enrichedCount);
	let progress = $derived(jobTotal > 0 ? Math.round(((jobCompleted + jobFailed) / jobTotal) * 100) : 0);
</script>

<div class="rounded-xl p-4">
	{#if status === 'idle' && pendingCount > 0}
		<div class="flex items-center gap-4">
			<button class="btn btn-primary" onclick={onstart}>
				Start Enriching Tracks
			</button>
			<p class="text-base-content/60 text-sm">
				{totalTracks} tracks loaded
				{#if enrichedCount > 0}
					&mdash; {enrichedCount} already enriched, {pendingCount} remaining
				{:else}
					&mdash; click to fetch full details for all tracks
				{/if}
			</p>
		</div>
	{:else if status === 'idle' && pendingCount === 0 && totalTracks > 0}
		<div class="flex items-center gap-2">
			<span class="badge badge-success">All tracks enriched!</span>
			<p class="text-base-content/60 text-sm">{totalTracks} tracks in collection</p>
		</div>
	{:else if status === 'running'}
		<div class="flex flex-col gap-3">
			<div class="flex items-center justify-between">
				<p class="text-base-content/70 text-sm font-medium">
					Enriching track {jobCompleted + jobFailed + 1} of {jobTotal}
					&mdash; {jobCompleted} done{#if jobFailed > 0}, {jobFailed} failed{/if}
				</p>
				<span class="loading loading-spinner loading-sm"></span>
			</div>

			<progress class="progress progress-primary w-full" value={progress} max="100"></progress>

			{#if currentTrackName}
				<p class="text-base-content/50 truncate text-sm">
					Currently enriching: <span class="font-medium text-base-content/80">{currentTrackName}</span>
				</p>
			{/if}
		</div>
	{:else if status === 'done'}
		<div class="flex items-center gap-2">
			<span class="badge badge-success">Enrichment complete!</span>
			<p class="text-base-content/60 text-sm">
				{jobCompleted} enriched{#if jobFailed > 0}, {jobFailed} failed{/if} of {jobTotal} tracks
			</p>
		</div>
	{/if}
</div>
