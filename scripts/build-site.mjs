#!/usr/bin/env node
/**
 * Builds the published site into docs/ (the folder GitHub Pages serves).
 *
 *   site/            hand-written landing page (tokens: __BASE__ __SITE_URL__ __REPO_URL__)
 *   app/             Expo app
 *   docs/            generated: landing page + static web export in docs/app/
 *
 * Usage:
 *   node scripts/build-site.mjs
 *   SITE_BASE=/abulo REPO_URL=https://github.com/you/abulo node scripts/build-site.mjs
 *
 * Environment:
 *   SITE_BASE  Path the site is served from. Default "/abulo".
 *   SITE_URL   Absolute URL of the site, used for Open Graph tags.
 *   REPO_URL   GitHub repository URL used by the "Source" links.
 */
import { spawnSync } from 'node:child_process';
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const appDir = join(root, 'app');
const siteDir = join(root, 'site');
const outDir = join(root, 'docs');
const appOut = join(outDir, 'app');

const base = normalizeBase(process.env.SITE_BASE ?? '/abulo');
const siteUrl = ensureTrailingSlash(process.env.SITE_URL ?? `http://localhost:4173${base}/`);
const repoUrl = (process.env.REPO_URL ?? 'https://github.com').replace(/\/+$/, '');

function normalizeBase(value) {
  const clean = `/${value.replace(/^\/+|\/+$/g, '')}`;
  return clean === '/' ? '' : clean;
}

function ensureTrailingSlash(value) {
  return value.endsWith('/') ? value : `${value}/`;
}

function run(command, args, options) {
  const result = spawnSync(command, args, { stdio: 'inherit', ...options });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} exited with ${result.status ?? result.signal}`);
  }
}

async function exportWeb() {
  const expoBin = join(appDir, 'node_modules', 'expo', 'bin', 'cli');
  if (!existsSync(expoBin)) {
    throw new Error('app/node_modules is missing — run `npm install` in app/ first.');
  }

  console.log(`\n▸ Exporting web build with base URL ${base}/app\n`);
  run(process.execPath, [expoBin, 'export', '-p', 'web', '--output-dir', appOut], {
    cwd: appDir,
    env: { ...process.env, EXPO_BASE_URL: `${base}/app`, CI: '1' },
  });

  await moveNodeModulesAssets();
}

/**
 * Expo emits bundled fonts and images under assets/node_modules/..., a folder
 * name that git ignores and GitHub Pages refuses to serve. Rename it and fix the
 * URLs baked into the bundle.
 */
async function moveNodeModulesAssets() {
  const assetsDir = join(appOut, 'assets');
  const from = join(assetsDir, 'node_modules');
  if (!existsSync(from)) return;

  await cp(from, join(assetsDir, 'vendor'), { recursive: true });
  await rm(from, { recursive: true, force: true });
  console.log('▸ Moved bundled assets out of assets/node_modules → assets/vendor');

  const files = [];
  const walk = async (dir) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (/\.(js|css|html|json)$/.test(entry.name)) files.push(full);
    }
  };
  await walk(appOut);

  let patched = 0;
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    if (!source.includes('/assets/node_modules/')) continue;
    await writeFile(file, source.replaceAll('/assets/node_modules/', '/assets/vendor/'));
    patched += 1;
  }
  console.log(`▸ Rewrote asset URLs in ${patched} file(s)`);
}

async function rewriteHtml(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      // The Expo export already carries the base URL.
      if (entry.name === 'app') continue;
      await rewriteHtml(full);
      continue;
    }
    if (!entry.name.endsWith('.html')) continue;

    const source = await readFile(full, 'utf8');
    const next = source
      .replaceAll('__BASE__', base)
      .replaceAll('__SITE_URL__', siteUrl)
      .replaceAll('__REPO_URL__', repoUrl);
    if (next !== source) await writeFile(full, next);
  }
}

async function main() {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  console.log('▸ Copying landing page');
  await cp(siteDir, outDir, { recursive: true });

  await exportWeb();
  await rewriteHtml(outDir);
  await writeFile(join(outDir, '.nojekyll'), '');

  console.log('\n✓ Site ready in docs/');
  console.log(`  Landing : ${siteUrl}`);
  console.log(`  Web app : ${siteUrl}app/`);
  console.log(`  APK     : ${repoUrl}/releases/download/v0.1.0/abulo-0.1.0.apk\n`);
  console.log('  Preview locally: node scripts/serve-site.mjs\n');
}

main().catch((error) => {
  console.error(`\n✗ ${error.message}\n`);
  process.exit(1);
});
