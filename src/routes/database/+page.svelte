<script lang="ts">
	import { onMount } from 'svelte';
	import classNames from 'classnames';

	let tables = $state<string[]>([]);
	let selectedTable = $state<string | null>(null);
	let rows = $state<Record<string, unknown>[]>([]);
	let columns = $state<string[]>([]);
	let total = $state(0);
	let page = $state(1);
	let limit = $state(25);
	let loadingTables = $state(false);
	let loadingData = $state(false);
	let error = $state<string | null>(null);

	$effect(() => {
		if (total > 0) {
			totalPages = Math.ceil(total / limit);
		} else {
			totalPages = 0;
		}
	});

	let totalPages = $state(0);

	onMount(fetchTables);

	async function fetchTables() {
		loadingTables = true;
		error = null;
		try {
			const res = await fetch('/api/database/tables');
			if (!res.ok) throw new Error(await res.text());
			const data = await res.json();
			tables = data.tables;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load tables';
		} finally {
			loadingTables = false;
		}
	}

	async function selectTable(name: string) {
		selectedTable = name;
		page = 1;
		await fetchTableData();
	}

	async function fetchTableData() {
		if (!selectedTable) return;
		loadingData = true;
		error = null;
		try {
			const res = await fetch(`/api/database/tables/${selectedTable}?page=${page}&limit=${limit}`);
			if (!res.ok) throw new Error(await res.text());
			const data = await res.json();
			rows = data.rows;
			columns = data.columns;
			total = data.total;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load table data';
		} finally {
			loadingData = false;
		}
	}

	function goToPage(p: number) {
		page = p;
		fetchTableData();
	}

	function formatCellValue(value: unknown): string {
		if (value === null || value === undefined) return 'NULL';
		if (typeof value === 'object') return JSON.stringify(value);
		return String(value);
	}
</script>

<div class="flex min-h-screen">
	<!-- Sidebar -->
	<aside class="flex w-60 shrink-0 flex-col border-r border-base-300 bg-base-200">
		<div class="border-b border-base-300 p-4">
			<h2 class="text-lg font-bold">Tables</h2>
		</div>

		{#if loadingTables}
			<div class="flex flex-1 items-center justify-center">
				<span class="loading loading-md loading-spinner"></span>
			</div>
		{:else}
			<ul class="menu w-full p-2">
				{#each tables as table (table)}
					<li>
						<button
							class={classNames('justify-start', {
								active: selectedTable === table
							})}
							onclick={() => selectTable(table)}
						>
							{table}
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</aside>

	<!-- Main content -->
	<main class="flex flex-1 flex-col overflow-hidden p-6">
		<div class="mb-4 flex items-center justify-between">
			<h1 class="text-2xl font-bold">Database Explorer</h1>
		</div>

		{#if error}
			<div class="mb-4 alert alert-error">
				<span>{error}</span>
			</div>
		{/if}

		{#if !selectedTable}
			<div class="flex flex-1 items-center justify-center">
				<p class="text-lg text-base-content/50">Select a table to view its data</p>
			</div>
		{:else if loadingData}
			<div class="flex flex-1 items-center justify-center">
				<span class="loading loading-lg loading-spinner"></span>
			</div>
		{:else}
			<div class="mb-3 flex items-center justify-between">
				<h2 class="text-lg font-semibold">{selectedTable}</h2>
				<span class="text-sm text-base-content/60">{total} rows</span>
			</div>

			<div class="flex-1 overflow-auto">
				<table class="table-pin-rows table table-sm">
					<thead>
						<tr>
							{#each columns as col (col)}
								<th class="bg-base-200 whitespace-nowrap">{col}</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each rows as row, i (i)}
							<tr class="hover">
								{#each columns as col (col)}
									<td class="max-w-xs truncate whitespace-nowrap" title={formatCellValue(row[col])}>
										{#if row[col] === null || row[col] === undefined}
											<span class="text-base-content/30 italic">NULL</span>
										{:else}
											{formatCellValue(row[col])}
										{/if}
									</td>
								{/each}
							</tr>
						{/each}
						{#if rows.length === 0}
							<tr>
								<td colspan={columns.length} class="text-center text-base-content/50">
									No data in this table
								</td>
							</tr>
						{/if}
					</tbody>
				</table>
			</div>

			<!-- Pagination -->
			{#if totalPages > 1}
				<div class="mt-4 flex items-center justify-center gap-2">
					<button class="btn btn-sm" disabled={page <= 1} onclick={() => goToPage(page - 1)}>
						«
					</button>

					<span class="text-sm">
						Page {page} of {totalPages}
					</span>

					<button
						class="btn btn-sm"
						disabled={page >= totalPages}
						onclick={() => goToPage(page + 1)}
					>
						»
					</button>
				</div>
			{/if}
		{/if}
	</main>
</div>
