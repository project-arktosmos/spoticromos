export function parsePlaylistUrl(input: string): string | null {
	const trimmed = input.trim();
	if (!trimmed) return null;

	// Raw ID (22 alphanumeric characters)
	if (/^[a-zA-Z0-9]{22}$/.test(trimmed)) {
		return trimmed;
	}

	// Spotify URI: spotify:playlist:ID
	const uriMatch = trimmed.match(/^spotify:playlist:([a-zA-Z0-9]{22})$/);
	if (uriMatch) {
		return uriMatch[1];
	}

	// URL: https://open.spotify.com/playlist/ID[?params]
	try {
		const url = new URL(trimmed);
		if (url.hostname === 'open.spotify.com') {
			const pathMatch = url.pathname.match(/^\/playlist\/([a-zA-Z0-9]{22})$/);
			if (pathMatch) {
				return pathMatch[1];
			}
		}
	} catch {
		// Not a valid URL
	}

	return null;
}
