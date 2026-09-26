import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Regression lock: createPortal must never target `#app-shell`.
 * That host remount race caused: Cannot read properties of null (reading 'removeChild').
 */

const root = join(fileURLToPath(new URL('../..', import.meta.url)));

/** @param {string} dir @param {string[]} out */
function walk(dir, out) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    if (name === 'node_modules' || name === '.next' || name === 'out') continue;
    const full = join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(full, out);
    else if (/\.(jsx?|tsx?)$/.test(name)) out.push(full);
  }
}

const files = [];
walk(root, files);

const bad = [];
for (const file of files) {
  const rel = relative(root, file);
  const text = readFileSync(file, 'utf8');
  if (!/createPortal\s*\(/.test(text)) continue;
  // Portal host is second arg — reject getAppShellEl / shell host patterns.
  if (
    /createPortal\s*\([^;]*getAppShellEl/.test(text) ||
    /createPortal\s*\([^;]*\bshell\b/.test(text) ||
    /setPortalTarget\s*\(\s*getAppShellEl/.test(text) ||
    /setHost\s*\(\s*shell\s*\|\|/.test(text)
  ) {
    bad.push(rel);
  }
}

test('createPortal never targets #app-shell / getAppShellEl', () => {
  assert.deepEqual(bad, [], `app-shell portal hosts:\n${bad.join('\n')}`);
});
