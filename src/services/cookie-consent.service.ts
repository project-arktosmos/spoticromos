import localStorageWritableStore from '$utils/localStorageWritableStore';

export type ConsentStatus = 'pending' | 'accepted';

export const cookieConsentStore = localStorageWritableStore<ConsentStatus>('cookie-consent', 'pending');

export function acceptCookies(): void {
	cookieConsentStore.set('accepted');
}
