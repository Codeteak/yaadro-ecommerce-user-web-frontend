#!/usr/bin/env node
/**
 * Discover and run all *.test.mjs under utils/, lib/, functions/lib/.
 * Used by `npm run test:ci` so GitHub Actions catches regressions
 * (portal removeChild, catalog realtime, auth, cart, …).
 */
import { spawnSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const roots = ['utils', 'lib', 'functions/lib'];

/** @param {string} dir @param {string[]} out */
function walk(dir, out) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    const full = join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(full, out);
    else if (name.endsWith('.test.mjs')) out.push(full);
  }
}

const files = [];
for (const r of roots) walk(join(root, r), files);
files.sort();

if (files.length === 0) {
  console.error('No *.test.mjs files found');
  process.exit(1);
}

console.log(`Running ${files.length} test files…`);
const rel = files.map((f) => relative(root, f));
const result = spawnSync(
  process.execPath,
  ['--import', './scripts/register-extensionless.mjs', '--test', ...rel],
  { cwd: root, stdio: 'inherit', env: process.env }
);
process.exit(result.status ?? 1);
