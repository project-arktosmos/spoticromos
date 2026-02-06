<script lang="ts">
	const lastUpdated = 'February 2026';
</script>

<div class="mx-auto flex max-w-3xl flex-col gap-6 p-8">
	<h1 class="text-3xl font-bold">Cookie Policy</h1>
	<p class="text-base-content/60 text-sm">Last updated: {lastUpdated}</p>

	<p class="text-base-content/80 leading-relaxed">
		This Cookie Policy explains how Spoticromos uses cookies and browser local storage when you use
		our service.
	</p>

	<h2 class="mt-4 text-xl font-semibold">1. What Are Cookies?</h2>
	<p class="text-base-content/80 leading-relaxed">
		Cookies are small text files stored on your device by your web browser. They are used to
		remember information about your visit, such as your authentication status and preferences.
		Local storage is a similar browser technology that allows websites to store data persistently
		on your device.
	</p>

	<h2 class="mt-4 text-xl font-semibold">2. Cookies We Use</h2>
	<p class="text-base-content/80 leading-relaxed">
		Spoticromos uses only essential cookies required for the service to function. We do not use
		advertising, analytics, or tracking cookies.
	</p>

	<div class="overflow-x-auto">
		<table class="table table-zebra w-full">
			<thead>
				<tr>
					<th class="text-sm">Name</th>
					<th class="text-sm">Type</th>
					<th class="text-sm">Duration</th>
					<th class="text-sm">Purpose</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td class="font-mono text-sm">session</td>
					<td class="text-sm">HTTP-only cookie</td>
					<td class="text-sm">30 days</td>
					<td class="text-sm"
						>Identifies your authenticated session. This cookie is essential for keeping you logged
						in and cannot be accessed by client-side scripts.</td
					>
				</tr>
				<tr>
					<td class="font-mono text-sm">spotify_cv</td>
					<td class="text-sm">HTTP-only cookie</td>
					<td class="text-sm">10 minutes</td>
					<td class="text-sm"
						>Stores the PKCE code verifier during the Spotify OAuth login flow. This cookie is
						temporary and is automatically deleted after login completes.</td
					>
				</tr>
			</tbody>
		</table>
	</div>

	<h2 class="mt-4 text-xl font-semibold">3. Local Storage</h2>
	<p class="text-base-content/80 leading-relaxed">
		In addition to cookies, we use your browser's local storage for the following purposes:
	</p>

	<div class="overflow-x-auto">
		<table class="table table-zebra w-full">
			<thead>
				<tr>
					<th class="text-sm">Key</th>
					<th class="text-sm">Duration</th>
					<th class="text-sm">Purpose</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td class="font-mono text-sm">app-theme</td>
					<td class="text-sm">Persistent</td>
					<td class="text-sm"
						>Stores your theme preference (light or dark mode) so it persists between visits.</td
					>
				</tr>
				<tr>
					<td class="font-mono text-sm">cookie-consent</td>
					<td class="text-sm">Persistent</td>
					<td class="text-sm"
						>Records that you have acknowledged the cookie consent notice.</td
					>
				</tr>
				<tr>
					<td class="font-mono text-sm">spotify-cache:*</td>
					<td class="text-sm">5 minutes</td>
					<td class="text-sm"
						>Temporarily caches Spotify API responses (playlists, tracks, albums, artists) to
						reduce API calls and improve performance. Automatically expires.</td
					>
				</tr>
				<tr>
					<td class="font-mono text-sm">musicbrainz-cache:*</td>
					<td class="text-sm">5 minutes</td>
					<td class="text-sm"
						>Temporarily caches MusicBrainz API responses for music metadata enrichment.
						Automatically expires.</td
					>
				</tr>
				<tr>
					<td class="font-mono text-sm">lyrics-cache:*</td>
					<td class="text-sm">5 minutes</td>
					<td class="text-sm"
						>Temporarily caches lyrics API responses. Automatically expires.</td
					>
				</tr>
			</tbody>
		</table>
	</div>

	<h2 class="mt-4 text-xl font-semibold">4. Managing Cookies and Local Storage</h2>
	<p class="text-base-content/80 leading-relaxed">
		You can manage cookies and local storage through your browser settings:
	</p>
	<ul class="text-base-content/80 list-disc space-y-1 pl-6">
		<li>
			<strong>Cookies</strong> — most browsers allow you to view, delete, and block cookies through
			their settings or preferences menu. Note that blocking the session cookie will prevent you
			from logging in.
		</li>
		<li>
			<strong>Local Storage</strong> — you can clear local storage through your browser's developer
			tools or by clearing site data in your browser settings. Clearing local storage will reset
			your theme preference and cookie consent status.
		</li>
	</ul>

	<h2 class="mt-4 text-xl font-semibold">5. Third-Party Cookies</h2>
	<p class="text-base-content/80 leading-relaxed">
		Spoticromos does not set any third-party cookies. We do not use analytics services, advertising
		networks, or social media tracking pixels.
	</p>

	<h2 class="mt-4 text-xl font-semibold">6. Changes to This Policy</h2>
	<p class="text-base-content/80 leading-relaxed">
		We may update this Cookie Policy from time to time. Changes will be posted on this page with
		an updated revision date.
	</p>
</div>
