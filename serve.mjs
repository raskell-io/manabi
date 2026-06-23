#!/usr/bin/env node
/**
 * Tiny dependency-free static server for the adapter-static build.
 *
 * The build is a pure SPA: it emits `404.html` (the SvelteKit fallback) but no
 * `index.html`, so every path that isn't a real file — including `/` and client
 * routes like `/review` — is served `404.html` with a 200 so the SPA can boot
 * and route on the client.
 *
 * Usage: PORT=4317 HOST=127.0.0.1 node serve.mjs
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('./build', import.meta.url)));
const PORT = Number(process.env.PORT) || 4317;
const HOST = process.env.HOST || '127.0.0.1';
const FALLBACK = join(ROOT, '404.html');

const TYPES = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.mjs': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.webmanifest': 'application/manifest+json; charset=utf-8',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.ico': 'image/x-icon',
	'.wasm': 'application/wasm',
	'.woff': 'font/woff',
	'.woff2': 'font/woff2',
	'.map': 'application/json; charset=utf-8'
};

async function send(res, status, body, type) {
	res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
	res.end(body);
}

const server = createServer(async (req, res) => {
	try {
		const url = new URL(req.url, `http://${HOST}`);
		// Resolve the request to a path inside ROOT, blocking traversal.
		const rel = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
		let filePath = join(ROOT, rel);
		if (!filePath.startsWith(ROOT)) return send(res, 403, 'Forbidden', 'text/plain');

		let info = await stat(filePath).catch(() => null);
		if (info?.isDirectory()) {
			filePath = join(filePath, 'index.html');
			info = await stat(filePath).catch(() => null);
		}

		if (info?.isFile()) {
			const type = TYPES[extname(filePath)] || 'application/octet-stream';
			return send(res, 200, await readFile(filePath), type);
		}

		// SPA fallback — serve 404.html with a 200 so the client app boots.
		return send(res, 200, await readFile(FALLBACK), TYPES['.html']);
	} catch (err) {
		return send(res, 500, `Server error: ${err?.message ?? err}`, 'text/plain');
	}
});

server.listen(PORT, HOST, () => {
	console.log(`Manabi hosted at http://${HOST}:${PORT}  (root: ${ROOT})`);
});
