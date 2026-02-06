import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';

const root = resolve(import.meta.dirname, '..');

export default defineConfig(({ mode }) => {
	// Load .env files the same way SvelteKit does
	const env = loadEnv(mode || 'development', root, '');
	Object.assign(process.env, env);

	return {
		resolve: {
			alias: {
				$lib: resolve(root, 'src/lib'),
				$types: resolve(root, 'src/types'),
				$adapters: resolve(root, 'src/adapters'),
				$services: resolve(root, 'src/services'),
				$utils: resolve(root, 'src/utils'),
				$data: resolve(root, 'src/data'),
				$components: resolve(root, 'src/components')
			}
		},
		plugins: [
			{
				name: 'sveltekit-env-shim',
				resolveId(id) {
					if (id === '$env/dynamic/private') return '\0$env/dynamic/private';
				},
				load(id) {
					if (id === '\0$env/dynamic/private') {
						return 'export const env = process.env;';
					}
				}
			}
		]
	};
});
