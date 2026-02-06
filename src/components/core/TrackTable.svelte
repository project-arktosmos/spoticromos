<script lang="ts">
	import classNames from 'classnames';
	import type { SpotifyTrack } from '$types/spotify.type';

	export interface TrackTableItem {
		track: SpotifyTrack;
		status?: 'pending' | 'fetching' | 'done' | 'error';
	}

	interface Props {
		items: TrackTableItem[];
		showStatus?: boolean;
		highlightIndex?: number;
	}

	let { items, showStatus = true, highlightIndex = -1 }: Props = $props();

	function formatDuration(ms: number): string {
		const minutes = Math.floor(ms / 60000);
		const seconds = Math.floor((ms % 60000) / 1000);
		return `${minutes}:${seconds.toString().padStart(2, '0')}`;
	}
</script>

<div class="overflow-x-auto">
	<table class="table table-sm">
		<thead>
			<tr>
				<th class="w-10">#</th>
				<th>Title</th>
				<th>Artist</th>
				<th>Album</th>
				<th class="text-right">Duration</th>
				{#if showStatus}
					<th class="w-20 text-center">Status</th>
				{/if}
			</tr>
		</thead>
		<tbody>
			{#each items as item, i (i)}
				<tr
					class={classNames({
						'bg-primary/10': highlightIndex === i,
						hover: highlightIndex !== i
					})}
				>
					<td class="text-base-content/50">{i + 1}</td>
					<td>
						<div class="flex items-center gap-3">
							{#if item.track.album?.images?.[item.track.album.images.length - 1]?.url}
								<img
									src={item.track.album.images[item.track.album.images.length - 1].url}
									alt={item.track.album.name}
									class="h-8 w-8 rounded"
								/>
							{/if}
							<span class="font-medium">{item.track.name}</span>
						</div>
					</td>
					<td class="text-base-content/70">
						{item.track.artists.map((a) => a.name).join(', ')}
					</td>
					<td class="text-base-content/70">{item.track.album?.name}</td>
					<td class="text-right text-base-content/50">
						{formatDuration(item.track.duration_ms)}
					</td>
					{#if showStatus}
						<td class="text-center">
							{#if item.status === 'done'}
								<span class="badge badge-sm badge-success">Done</span>
							{:else if item.status === 'fetching'}
								<span class="loading loading-xs loading-spinner"></span>
							{:else if item.status === 'error'}
								<span class="badge badge-sm badge-error">Error</span>
							{:else}
								<span class="badge badge-ghost badge-sm">Pending</span>
							{/if}
						</td>
					{/if}
				</tr>
			{/each}
		</tbody>
	</table>
</div>
