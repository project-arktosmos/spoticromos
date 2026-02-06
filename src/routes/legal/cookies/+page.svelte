<script lang="ts">
	const lastUpdated = 'February 2026';
</script>

<div class="flex flex-col gap-6 p-4 tablet:p-8">
	<h1 class="text-3xl font-bold">Cookie Policy</h1>
	<p class="text-sm text-base-content/60">Last updated: {lastUpdated}</p>

	<p class="leading-relaxed text-base-content/80">
		This Cookie Policy explains how Spoticromos uses cookies and browser local storage when you use
		our service.
	</p>

	<h2 class="mt-4 text-xl font-semibold">1. What Are Cookies?</h2>
	<p class="leading-relaxed text-base-content/80">
		Cookies are small text files stored on your device by your web browser. They are used to
		remember information about your visit, such as your authentication status and preferences. Local
		storage is a similar browser technology that allows websites to store data persistently on your
		device.
	</p>

	<h2 class="mt-4 text-xl font-semibold">2. Essential Cookies</h2>
	<p class="leading-relaxed text-base-content/80">
		These cookies are strictly necessary for the service to function. They are always active and do
		not require your consent.
	</p>

	<div class="overflow-x-auto">
		<table class="table w-full table-zebra">
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

	<h2 class="mt-4 text-xl font-semibold">3. Analytics Cookies (Optional)</h2>
	<p class="leading-relaxed text-base-content/80">
		If you give consent, we use Google Analytics 4 (GA4) to understand how visitors interact with
		our site. These cookies are only set after you explicitly accept analytics in the cookie consent
		banner. You can withdraw consent at any time by clearing your browser's site data.
	</p>

	<div class="overflow-x-auto">
		<table class="table w-full table-zebra">
			<thead>
				<tr>
					<th class="text-sm">Name</th>
					<th class="text-sm">Provider</th>
					<th class="text-sm">Duration</th>
					<th class="text-sm">Purpose</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td class="font-mono text-sm">_ga</td>
					<td class="text-sm">Google Analytics</td>
					<td class="text-sm">2 years</td>
					<td class="text-sm"
						>Distinguishes unique visitors by assigning a randomly generated number as a client
						identifier.</td
					>
				</tr>
				<tr>
					<td class="font-mono text-sm">_ga_E0XX7BNZDS</td>
					<td class="text-sm">Google Analytics</td>
					<td class="text-sm">2 years</td>
					<td class="text-sm">Maintains session state for Google Analytics 4.</td>
				</tr>
			</tbody>
		</table>
	</div>

	<p class="mt-2 leading-relaxed text-base-content/80">
		Google Analytics collects data such as pages visited, time spent on pages, browser type, device
		type, and approximate geographic location (based on anonymized IP). This data is processed by
		Google. For more information, see
		<a
			href="https://policies.google.com/privacy"
			target="_blank"
			rel="noopener noreferrer"
			class="link link-primary">Google's Privacy Policy</a
		>
		and
		<a
			href="https://tools.google.com/dlpage/gaoptout"
			target="_blank"
			rel="noopener noreferrer"
			class="link link-primary">Google Analytics Opt-out Browser Add-on</a
		>.
	</p>

	<h2 class="mt-4 text-xl font-semibold">4. Local Storage</h2>
	<p class="leading-relaxed text-base-content/80">
		In addition to cookies, we use your browser's local storage for the following purposes:
	</p>

	<div class="overflow-x-auto">
		<table class="table w-full table-zebra">
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
					<td class="text-sm">Records that you have acknowledged the cookie consent notice.</td>
				</tr>
				<tr>
					<td class="font-mono text-sm">spotify-cache:*</td>
					<td class="text-sm">5 minutes</td>
					<td class="text-sm"
						>Temporarily caches Spotify API responses (playlists, tracks, albums, artists) to reduce
						API calls and improve performance. Automatically expires.</td
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
					<td class="text-sm">Temporarily caches lyrics API responses. Automatically expires.</td>
				</tr>
			</tbody>
		</table>
	</div>

	<h2 class="mt-4 text-xl font-semibold">5. Managing Cookies and Local Storage</h2>
	<p class="leading-relaxed text-base-content/80">
		You can manage cookies and local storage through your browser settings:
	</p>
	<ul class="list-disc space-y-1 pl-6 text-base-content/80">
		<li>
			<strong>Cookies</strong> — most browsers allow you to view, delete, and block cookies through their
			settings or preferences menu. Note that blocking the session cookie will prevent you from logging
			in.
		</li>
		<li>
			<strong>Local Storage</strong> — you can clear local storage through your browser's developer tools
			or by clearing site data in your browser settings. Clearing local storage will reset your theme
			preference and cookie consent status.
		</li>
	</ul>

	<h2 class="mt-4 text-xl font-semibold">6. Third-Party Cookies</h2>
	<p class="leading-relaxed text-base-content/80">
		With your consent, Google Analytics sets cookies on your device as described in section 3. We do
		not use advertising networks or social media tracking pixels. Apart from Google Analytics, no
		other third-party cookies are set.
	</p>

	<h2 class="mt-4 text-xl font-semibold">7. Your Consent Choices</h2>
	<p class="leading-relaxed text-base-content/80">
		When you first visit Spoticromos, you will see a consent banner offering two choices:
	</p>
	<ul class="list-disc space-y-1 pl-6 text-base-content/80">
		<li>
			<strong>Accept All</strong> — enables essential cookies and analytics cookies (Google Analytics).
		</li>
		<li>
			<strong>Essential Only</strong> — enables only the cookies required for the site to function. No
			analytics data will be collected.
		</li>
	</ul>
	<p class="mt-2 leading-relaxed text-base-content/80">
		You can change your preference at any time by clearing your browser's local storage for this
		site, which will reset the consent banner.
	</p>

	<h2 class="mt-4 text-xl font-semibold">8. Changes to This Policy</h2>
	<p class="leading-relaxed text-base-content/80">
		We may update this Cookie Policy from time to time. Changes will be posted on this page with an
		updated revision date.
	</p>
</div>
