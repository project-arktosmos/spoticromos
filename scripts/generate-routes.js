import { readdirSync, statSync, mkdirSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, relative, sep } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const routesDir = join(__dirname, '../src/routes');
const outputDir = join(__dirname, '../src/data');
const outputPath = join(outputDir, 'routes.json');

/**
 * Recursively find all +page.svelte files in the routes directory
 */
function findPages(dir, results = []) {
	const entries = readdirSync(dir);

	for (const entry of entries) {
		const fullPath = join(dir, entry);
		const stat = statSync(fullPath);

		if (stat.isDirectory()) {
			findPages(fullPath, results);
		} else if (entry === '+page.svelte') {
			results.push(fullPath);
		}
	}

	return results;
}

/**
 * Convert a file path to a URL route path
 */
function toRoutePath(filePath) {
	const rel = relative(routesDir, filePath);
	const dir = dirname(rel);
	return dir === '.' ? '/' : '/' + dir.split(sep).join('/');
}

/**
 * Derive a human-readable label from a route path
 */
function toLabel(routePath) {
	if (routePath === '/') return 'Home';
	const segments = routePath.split('/').filter(Boolean);
	const last = segments[segments.length - 1];
	return last.charAt(0).toUpperCase() + last.slice(1);
}

try {
	const pages = findPages(routesDir);

	const routes = pages
		.map(toRoutePath)
		.filter((route) => !route.startsWith('/api/'))
		.filter((route) => !route.includes('['))
		.sort()
		.map((path) => ({ path, label: toLabel(path) }));

	mkdirSync(outputDir, { recursive: true });
	writeFileSync(outputPath, JSON.stringify(routes, null, '\t'));

	console.log(`✓ Generated routes.json with ${routes.length} routes`);
} catch (error) {
	console.error('Error generating routes.json:', error);
	process.exit(1);
}
