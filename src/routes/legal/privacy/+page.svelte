<script lang="ts">
	const lastUpdated = 'February 2026';
</script>

<div class="flex flex-col gap-6 p-4 tablet:p-8">
	<h1 class="text-3xl font-bold">Privacy Policy</h1>
	<p class="text-sm text-base-content/60">Last updated: {lastUpdated}</p>

	<p class="leading-relaxed text-base-content/80">
		Spoticromos ("we", "us", "our") is a music collection and game platform that integrates with the
		Spotify API. This Privacy Policy explains how we collect, use, store, and protect your
		information when you use our service.
	</p>

	<h2 class="mt-4 text-xl font-semibold">1. Information We Collect</h2>

	<h3 class="text-lg font-medium">1.1 Information from Spotify</h3>
	<p class="leading-relaxed text-base-content/80">
		When you log in with your Spotify account, we collect the following information through the
		Spotify API:
	</p>
	<ul class="list-disc space-y-1 pl-6 text-base-content/80">
		<li><strong>Spotify User ID</strong> — your unique Spotify identifier</li>
		<li><strong>Display Name</strong> — your public Spotify display name</li>
		<li><strong>Email Address</strong> — the email associated with your Spotify account</li>
		<li><strong>Avatar URL</strong> — your Spotify profile picture URL</li>
		<li>
			<strong>Playlist Data</strong> — metadata about your playlists (names, track listings) when you
			choose to import them
		</li>
	</ul>

	<h3 class="text-lg font-medium">1.2 Information Generated Through Use</h3>
	<ul class="list-disc space-y-1 pl-6 text-base-content/80">
		<li>
			<strong>Collection Data</strong> — your imported playlists, collected items, and rarity tiers
		</li>
		<li>
			<strong>Game Results</strong> — scores and statistics from trivia and pairs games you play
		</li>
		<li>
			<strong>Trivia Templates</strong> — custom trivia games you create
		</li>
	</ul>

	<h2 class="mt-4 text-xl font-semibold">2. How We Use Your Information</h2>
	<p class="leading-relaxed text-base-content/80">We use the collected information to:</p>
	<ul class="list-disc space-y-1 pl-6 text-base-content/80">
		<li>Authenticate you and maintain your session</li>
		<li>Display your profile information within the app</li>
		<li>Import and display your Spotify playlists as collections</li>
		<li>Enrich track metadata (artist details, album information, lyrics)</li>
		<li>Power game mechanics (item collection, rarity assignment, scoring)</li>
		<li>Display your game history and collection progress</li>
	</ul>

	<h2 class="mt-4 text-xl font-semibold">3. Data Storage</h2>

	<h3 class="text-lg font-medium">3.1 Server-Side Storage</h3>
	<p class="leading-relaxed text-base-content/80">
		Your data is stored in a MySQL database on our server. This includes your Spotify profile
		information, authentication tokens, imported collections, track/artist/album metadata, game
		results, and lyrics data. Spotify OAuth tokens (access and refresh tokens) are stored
		server-side only and are never sent to your browser.
	</p>

	<h3 class="text-lg font-medium">3.2 Browser Storage</h3>
	<p class="leading-relaxed text-base-content/80">
		We use your browser's local storage for the following purposes:
	</p>
	<ul class="list-disc space-y-1 pl-6 text-base-content/80">
		<li><strong>Theme Preference</strong> — your light/dark mode selection</li>
		<li>
			<strong>API Response Caches</strong> — temporary caches of Spotify and lyrics API responses (automatically
			expire after 5 minutes)
		</li>
		<li><strong>Cookie Consent</strong> — whether you have accepted the cookie notice</li>
	</ul>

	<h2 class="mt-4 text-xl font-semibold">4. Cookies</h2>
	<p class="leading-relaxed text-base-content/80">
		We use essential cookies for authentication and, with your consent, analytics cookies to
		understand site usage. For a detailed breakdown, please see our
		<a href="/legal/cookies" class="link link-primary">Cookie Policy</a>.
	</p>
	<ul class="list-disc space-y-1 pl-6 text-base-content/80">
		<li>
			<strong>Session Cookie</strong> — an HTTP-only cookie that identifies your session (expires after
			30 days)
		</li>
		<li>
			<strong>OAuth Cookie</strong> — a temporary HTTP-only cookie used during the Spotify login process
			(expires after 10 minutes)
		</li>
		<li>
			<strong>Analytics Cookies</strong> — Google Analytics cookies (<code class="text-xs">_ga</code
			>,
			<code class="text-xs">_ga_*</code>) set only with your explicit consent. These help us
			understand how visitors use the site.
		</li>
	</ul>

	<h2 class="mt-4 text-xl font-semibold">5. Third-Party Services</h2>
	<p class="leading-relaxed text-base-content/80">Spoticromos integrates with the following:</p>
	<ul class="list-disc space-y-1 pl-6 text-base-content/80">
		<li>
			<strong>Spotify Web API</strong> — to authenticate users, fetch playlists, and retrieve music
			metadata (tracks, albums, artists). Your use of Spotify data is also subject to
			<a
				href="https://www.spotify.com/legal/privacy-policy/"
				target="_blank"
				rel="noopener noreferrer"
				class="link link-primary">Spotify's Privacy Policy</a
			>.
		</li>
		<li>
			<strong>LrcLib</strong> — to fetch song lyrics. Only track names, artist names, album names, and
			durations are sent to this service. No personal user data is shared.
		</li>
		<li>
			<strong>Google Analytics 4</strong> — with your consent, we use Google Analytics to collect
			anonymized usage data (pages visited, session duration, browser/device type, approximate
			location). This data is processed by Google under their
			<a
				href="https://policies.google.com/privacy"
				target="_blank"
				rel="noopener noreferrer"
				class="link link-primary">Privacy Policy</a
			>. No personal data (name, email, Spotify ID) is sent to Google Analytics. You can opt out at
			any time via the cookie consent banner or by using the
			<a
				href="https://tools.google.com/dlpage/gaoptout"
				target="_blank"
				rel="noopener noreferrer"
				class="link link-primary">Google Analytics Opt-out Add-on</a
			>.
		</li>
	</ul>

	<h2 class="mt-4 text-xl font-semibold">6. Data Retention</h2>
	<p class="leading-relaxed text-base-content/80">
		Your data is retained for as long as your account exists. Sessions expire after 30 days of
		inactivity. Spotify tokens are refreshed automatically while your session is active and are
		invalidated when you log out.
	</p>

	<h2 class="mt-4 text-xl font-semibold">7. Your Rights</h2>
	<p class="leading-relaxed text-base-content/80">You have the right to:</p>
	<ul class="list-disc space-y-1 pl-6 text-base-content/80">
		<li>Access the personal data we hold about you</li>
		<li>Request correction of inaccurate data</li>
		<li>Request deletion of your data and account</li>
		<li>
			Revoke Spotify access at any time through your
			<a
				href="https://www.spotify.com/account/apps/"
				target="_blank"
				rel="noopener noreferrer"
				class="link link-primary">Spotify Account Settings</a
			>
		</li>
	</ul>

	<h2 class="mt-4 text-xl font-semibold">8. Data Security</h2>
	<p class="leading-relaxed text-base-content/80">
		We take reasonable measures to protect your data. OAuth tokens are stored server-side only,
		session cookies are HTTP-only to prevent client-side access, and all authentication flows use
		PKCE (Proof Key for Code Exchange) for enhanced security.
	</p>

	<h2 class="mt-4 text-xl font-semibold">9. Changes to This Policy</h2>
	<p class="leading-relaxed text-base-content/80">
		We may update this Privacy Policy from time to time. Changes will be posted on this page with an
		updated revision date. Continued use of the service after changes constitutes acceptance of the
		revised policy.
	</p>

	<h2 class="mt-4 text-xl font-semibold">10. Contact</h2>
	<p class="leading-relaxed text-base-content/80">
		If you have questions about this Privacy Policy or wish to exercise your data rights, please
		contact the application administrator.
	</p>
</div>
