#!/usr/bin/env node
/**
 * Fail if staged (or argv) files look like they contain secrets.
 * Used by pre-commit; pass explicit paths for ad-hoc scans.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const PATTERNS = [
  {
    name: 'private-key',
    re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  },
  {
    name: 'aws-access-key',
    re: /\bAKIA[0-9A-Z]{16}\b/,
  },
  {
    name: 'generic-api-secret',
    re: /\b(?:api[_-]?key|api[_-]?secret|secret[_-]?key|access[_-]?token)\s*[:=]\s*['"][^'"]{16,}['"]/i,
  },
  {
    name: 'jwt-like',
    re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
  },
];

const SKIP_NAME =
  /(^|\/)(\.env\.example|\.env\.local\.example|package-lock\.json|.*\.(test|spec)\.(js|mjs|ts|tsx))$/i;

function stagedFiles() {
  try {
    const out = execSync('git diff --cached --name-only --diff-filter=ACMR', {
      encoding: 'utf8',
    });
    return out
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

const files = (process.argv.slice(2).length ? process.argv.slice(2) : stagedFiles()).filter(
  f => !SKIP_NAME.test(f) && fs.existsSync(f) && fs.statSync(f).isFile()
);

const hits = [];
for (const file of files) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  if (text.includes('\0')) continue;
  for (const { name, re } of PATTERNS) {
    if (re.test(text)) {
      hits.push(`${file}: possible ${name}`);
    }
  }
}

if (hits.length) {
  console.error('security:secrets — potential secrets in staged files:');
  for (const h of hits) console.error(`  - ${h}`);
  console.error('Remove secrets (use env / CI secrets) before committing.');
  process.exit(1);
}

console.log(`security:secrets — ok (${files.length} file${files.length === 1 ? '' : 's'} scanned)`);
