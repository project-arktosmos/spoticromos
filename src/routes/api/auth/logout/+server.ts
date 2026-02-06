import { redirect } from '@sveltejs/kit';
import { deleteSession } from '$lib/server/repositories/session.repository';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies }) => {
	const sessionId = cookies.get('session');

	if (sessionId) {
		await deleteSession(sessionId);
	}

	cookies.delete('session', { path: '/' });

	redirect(302, '/');
};
