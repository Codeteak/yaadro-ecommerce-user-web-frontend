/**
 * Cloudflare Pages static export cannot include App Router Route Handlers.
 * Temporarily move app/api aside, run `next build` with NEXT_STATIC_EXPORT=true, restore.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apiDir = path.join(root, 'app', 'api');
const parkedDir = path.join(root, 'app', '_api_parked_for_static_export');

function parkApiRoutes() {
  if (!fs.existsSync(apiDir)) return false;
  if (fs.existsSync(parkedDir)) {
    fs.rmSync(parkedDir, { recursive: true, force: true });
  }
  fs.renameSync(apiDir, parkedDir);
  return true;
}

function restoreApiRoutes() {
  if (!fs.existsSync(parkedDir)) return;
  if (fs.existsSync(apiDir)) {
    fs.rmSync(apiDir, { recursive: true, force: true });
  }
  fs.renameSync(parkedDir, apiDir);
}

const parked = parkApiRoutes();
process.env.NEXT_STATIC_EXPORT = 'true';

const result = spawnSync('npx', ['next', 'build'], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, NEXT_STATIC_EXPORT: 'true' },
  shell: process.platform === 'win32',
});

if (parked) restoreApiRoutes();

if ((result.status ?? 1) !== 0) {
  process.exit(result.status ?? 1);
}

const outDir = path.join(root, 'out');
if (!fs.existsSync(outDir)) {
  console.error('Static export did not produce out/ directory.');
  process.exit(1);
}

console.log('Generating service worker with Workbox…');
const workbox = spawnSync('npx', ['workbox', 'generateSW', 'workbox-config.cjs'], {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

process.exit(workbox.status ?? 1);
