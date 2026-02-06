import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		redirect(302, `/profile/${locals.user.spotifyId}`);
	}
	redirect(302, '/api/auth/login');
};
