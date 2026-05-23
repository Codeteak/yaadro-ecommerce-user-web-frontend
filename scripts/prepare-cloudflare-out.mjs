/**
 * Cloudflare Pages post-build tweaks for static export (`out/`).
 *
 * 1. Remove `404.html` — when present, Pages disables SPA / `_redirects` fallbacks and
 *    returns HTTP 404 for routes like `/products/<slug>` without a matching file.
 * 2. Ensure `_redirects` exists (copied from `public/` by Next).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'out');

if (!fs.existsSync(outDir)) {
  console.error('[cloudflare] out/ not found — run next build first');
  process.exit(1);
}

const notFoundHtml = path.join(outDir, '404.html');
if (fs.existsSync(notFoundHtml)) {
  fs.unlinkSync(notFoundHtml);
  console.log('[cloudflare] removed out/404.html (enables _redirects + product PDP rewrites)');
}

const redirects = path.join(outDir, '_redirects');
if (!fs.existsSync(redirects)) {
  console.error('[cloudflare] out/_redirects missing');
  process.exit(1);
}
