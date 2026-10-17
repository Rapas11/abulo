// Minimal static file server for the exported web build. No dependencies.
// Usage: node scripts/serve-dist.mjs [port]
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const port = Number(process.argv[2] ?? 4173);

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
};

createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
  const cleanRoot = root.replace(/\\/g, '/');
  const candidate = normalize(join(root, pathname)).replace(/\\/g, '/');
  if (!candidate.startsWith(cleanRoot)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  const candidates = pathname.endsWith('/')
    ? [join(root, pathname, 'index.html')]
    : [join(root, pathname), `${join(root, pathname)}.html`];
  candidates.push(join(root, 'index.html'));

  for (const file of candidates) {
    try {
      const data = await readFile(file);
      res.setHeader('Content-Type', types[extname(file).toLowerCase()] ?? 'application/octet-stream');
      res.end(data);
      return;
    } catch {
      // try the next candidate
    }
  }
  res.statusCode = 404;
  res.end('Not found');
}).listen(port, () => {
  console.log(`Abulo web preview: http://localhost:${port}`);
});
