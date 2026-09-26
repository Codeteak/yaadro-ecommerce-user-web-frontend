import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Inventory: every Radix Portal / createPortal call site must use the stable
 * body-mounted host. Prevents removeChild-null regressions from slipping in.
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

const radixPortalHits = [];
const rawCreatePortalHits = [];
const appShellPortalHits = [];

for (const file of files) {
  const rel = relative(root, file);
  if (rel.includes('safePortal')) continue;
  const text = readFileSync(file, 'utf8');
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    const n = i + 1;
    if (/<(Dialog|Popover)\.Portal\b/.test(line) && !/container=/.test(line)) {
      // Multi-line: check next few lines for container=
      const window = lines.slice(i, i + 6).join('\n');
      if (!/container=/.test(window)) {
        radixPortalHits.push(`${rel}:${n}`);
      }
    }
    if (
      /createPortal\s*\(/.test(line) &&
      !/createAppPortal/.test(line) &&
      !rel.includes('node_modules')
    ) {
      rawCreatePortalHits.push(`${rel}:${n}`);
    }
    if (/createAppPortal\s*\([^)]*getAppShellEl|createAppPortal\s*\([^)]*shell/.test(line)) {
      appShellPortalHits.push(`${rel}:${n}`);
    }
  });
}

test('all Radix Dialog/Popover portals pass container= (stable body host)', () => {
  assert.deepEqual(
    radixPortalHits,
    [],
    `Radix portals missing container=:\n${radixPortalHits.join('\n')}`
  );
});

test('no raw react-dom createPortal outside safePortal', () => {
  assert.deepEqual(
    rawCreatePortalHits,
    [],
    `Raw createPortal call sites:\n${rawCreatePortalHits.join('\n')}`
  );
});

test('createAppPortal never targets #app-shell', () => {
  assert.deepEqual(
    appShellPortalHits,
    [],
    `createAppPortal(shell) call sites:\n${appShellPortalHits.join('\n')}`
  );
});
