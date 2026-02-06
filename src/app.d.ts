import type { SessionUser } from '$types/auth.type';

declare global {
	function gtag(...args: unknown[]): void;

	namespace App {
		interface Locals {
			user: SessionUser | null;
			accessToken: string | null;
		}
	}
}

export {};
