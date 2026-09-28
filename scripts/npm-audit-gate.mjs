#!/usr/bin/env node
/**
 * npm audit gate for pre-commit.
 * - Always prints a summary.
 * - Hard-fails when high/critical issues have a non-breaking fix.
 * - Warns (does not fail) when the only fix is a major/breaking upgrade
 *   (e.g. Next 14 → 16), so commits stay usable until the team upgrades.
 */
import { execSync } from 'node:child_process';

function runAuditJson() {
  try {
    const out = execSync('npm audit --json', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return JSON.parse(out || '{}');
  } catch (err) {
    const out = err.stdout?.toString?.() || err.stdout || '';
    try {
      return JSON.parse(out || '{}');
    } catch {
      console.error('security:audit — could not parse npm audit JSON');
      process.exit(1);
    }
  }
}

const report = runAuditJson();
const vulns = report.vulnerabilities || {};
const meta = report.metadata?.vulnerabilities || {};

console.log(
  `security:audit — summary: critical=${meta.critical ?? 0} high=${meta.high ?? 0} moderate=${meta.moderate ?? 0} low=${meta.low ?? 0}`
);

const blocking = [];
const warned = [];

for (const [name, info] of Object.entries(vulns)) {
  const severity = String(info.severity || '').toLowerCase();
  if (severity !== 'high' && severity !== 'critical') continue;

  const viaForce =
    Boolean(info.fixAvailable) &&
    typeof info.fixAvailable === 'object' &&
    Boolean(info.fixAvailable.isSemVerMajor);

  const line = `${name}@${info.range || '?'} (${severity})${
    info.via?.[0]?.title ? ` — ${info.via[0].title}` : ''
  }`;

  if (viaForce || info.fixAvailable === false) {
    warned.push(line);
  } else if (info.fixAvailable) {
    blocking.push(line);
  } else {
    warned.push(line);
  }
}

if (warned.length) {
  console.warn('security:audit — high/critical needing major upgrade (warn only):');
  for (const w of warned) console.warn(`  ! ${w}`);
}

if (blocking.length) {
  console.error('security:audit — high/critical with non-breaking fix (blocking):');
  for (const b of blocking) console.error(`  x ${b}`);
  console.error('Run `npm audit fix` (without --force), then retry commit.');
  process.exit(1);
}

console.log('security:audit — ok (no blocking high/critical with safe fixes)');
process.exit(0);
