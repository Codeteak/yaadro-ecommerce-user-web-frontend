#!/usr/bin/env sh
# Pre-commit gate for yaadro-ecommerce-user-web-frontend.
# Blocks commit on: staged lint/format, repo lint, unit tests,
# secret scan, npm audit (high+), TypeScript errors, Next.js build errors.

set -e

cd "$(dirname -- "$0")/.." || exit 1

fail() {
  echo ""
  echo "Commit aborted: $1"
  echo "Fix the issue, then try again. Skip only with --no-verify (not recommended)."
  exit 1
}

echo "==> [1/6] lint-staged (eslint --fix + prettier on staged files)"
npx lint-staged || fail "lint-staged failed"

echo "==> [2/6] eslint (next lint)"
npm run lint || fail "lint errors"

echo "==> [3/6] unit tests"
npm test || fail "tests failed"

echo "==> [4/6] security (staged secrets + npm audit high+)"
npm run security:secrets || fail "possible secrets in staged files"
npm run security:audit || fail "npm audit reported high/critical vulnerabilities"

echo "==> [5/6] TypeScript (tsc --noEmit)"
npm run typecheck || fail "type errors"

echo "==> [6/6] production build (next build)"
npm run build || fail "build failed"

echo ""
echo "Pre-commit checks passed."
