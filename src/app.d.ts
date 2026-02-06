import type { SessionUser } from '$types/auth.type';

declare global {
	namespace App {
		interface Locals {
			user: SessionUser | null;
			accessToken: string | null;
		}
	}
}

export {};
