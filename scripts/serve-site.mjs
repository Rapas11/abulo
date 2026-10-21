// Serves the published site (docs/) the way GitHub Pages would, including the
// /<repo>/ prefix that Pages puts in front of a project site.
//
// Usage: node scripts/serve-site.mjs [port]
//        SITE_BASE= node scripts/serve-site.mjs   # serve at the root instead
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../docs/', import.meta.url)).replace(/\\/g, '/').replace(/\/$/, '');
const base = `/${(process.env.SITE_BASE ?? '/abulo').replace(/^\/+|\/+$/g, '')}`;
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
  '.apk': 'application/vnd.android.package-archive',
};

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  let pathname = decodeURIComponent(url.pathname);

  if (pathname === base || pathname.startsWith(`${base}/`)) {
    pathname = pathname.slice(base.length) || '/';
  } else {
    res.writeHead(302, { Location: `${base}${pathname === '/' ? '/' : pathname}` });
    res.end();
    return;
  }

  const resolved = normalize(join(root, pathname)).replace(/\\/g, '/');
  if (resolved !== root && !resolved.startsWith(`${root}/`)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  const candidates = pathname.endsWith('/')
    ? [join(root, pathname, 'index.html')]
    : [join(root, pathname), `${join(root, pathname)}.html`, join(root, pathname, 'index.html')];

  for (const file of [...candidates, join(root, '404.html')]) {
    try {
      const data = await readFile(file);
      const fallback = file.endsWith('404.html') && pathname !== '/404';
      res.statusCode = fallback ? 404 : 200;
      res.setHeader('Content-Type', types[extname(file).toLowerCase()] ?? 'application/octet-stream');
      res.setHeader('Content-Length', data.length);
      res.end(data);
      return;
    } catch {
      // try the next candidate
    }
  }

  res.statusCode = 404;
  res.end('Not found');
}).listen(port, process.env.HOST ?? '0.0.0.0', () => {
  console.log(`Abulo site: http://localhost:${port}${base}/`);
});
