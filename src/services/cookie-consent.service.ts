import { get } from 'svelte/store';
import localStorageWritableStore from '$utils/localStorageWritableStore';

export interface CookieConsent {
	status: 'pending' | 'accepted';
	analytics: boolean;
}

const STORAGE_KEY = 'cookie-consent';

const defaultConsent: CookieConsent = {
	status: 'pending',
	analytics: false
};

// Migrate from the old string format ("accepted"/"pending") to the new object format.
// Old users who already accepted will see the banner again so they can make the analytics choice.
if (typeof window !== 'undefined') {
	const raw = localStorage.getItem(STORAGE_KEY);
	if (raw !== null) {
		try {
			const parsed = JSON.parse(raw);
			if (typeof parsed === 'string') {
				localStorage.removeItem(STORAGE_KEY);
			}
		} catch {
			localStorage.removeItem(STORAGE_KEY);
		}
	}
}

export const cookieConsentStore = localStorageWritableStore<CookieConsent>(
	STORAGE_KEY,
	defaultConsent
);

export function acceptAllCookies(): void {
	cookieConsentStore.set({ status: 'accepted', analytics: true });
	grantAnalyticsConsent();
}

export function acceptEssentialOnly(): void {
	cookieConsentStore.set({ status: 'accepted', analytics: false });
	denyAnalyticsConsent();
}

export function hasAnalyticsConsent(): boolean {
	const consent = get(cookieConsentStore);
	return consent.status === 'accepted' && consent.analytics;
}

function grantAnalyticsConsent(): void {
	if (typeof gtag !== 'function') return;
	gtag('consent', 'update', {
		analytics_storage: 'granted'
	});
}

function denyAnalyticsConsent(): void {
	if (typeof gtag !== 'function') return;
	gtag('consent', 'update', {
		analytics_storage: 'denied'
	});

	// Clean up any existing GA cookies
	if (typeof document === 'undefined') return;
	const cookies = document.cookie.split(';');
	for (const cookie of cookies) {
		const name = cookie.split('=')[0].trim();
		if (name.startsWith('_ga') || name.startsWith('_gid')) {
			document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname}`;
			document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
		}
	}
}

export function initAnalyticsFromConsent(): void {
	if (hasAnalyticsConsent()) {
		grantAnalyticsConsent();
	}
}
