#!/usr/bin/env bash
# Single clean Next.js dev server on :3000.
# Fixes repeating local 404 / blank screens caused by multiple `next` PIDs +
# EMFILE watchers + a corrupted shared `.next` cache.
set -euo pipefail
cd "$(dirname "$0")/.."

# Raise FD limit so Watchpack does not hit EMFILE (macOS default soft maxfiles is often 256).
ulimit -n 10240 2>/dev/null || ulimit -n 4096 2>/dev/null || true

echo "Stopping listeners on ports 3000–3004 and stray next/dev processes…"
for p in 3000 3001 3002 3003 3004; do
  if command -v lsof >/dev/null 2>&1; then
    # shellcheck disable=SC2046
    kill -9 $(lsof -ti tcp:"$p" 2>/dev/null) 2>/dev/null || true
  fi
done
pkill -9 -f "next dev" 2>/dev/null || true
pkill -9 -f "node.*next/dist/bin/next" 2>/dev/null || true
sleep 1

still_busy=0
for p in 3000 3001 3002 3003 3004; do
  if lsof -nP -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "WARNING: port $p still busy — quit other IDE terminals running npm run dev"
    still_busy=1
  fi
done
if [[ "$still_busy" -eq 1 ]]; then
  echo "Aborting so we do not start another zombie on :3001+."
  echo "Close those terminals, then re-run: npm run dev:clean"
  exit 1
fi

echo "Removing .next cache…"
rm -rf .next .next-clean

unset YAADRO_DIST_DIR
# Polling avoids EMFILE when launchctl soft maxfiles stays at 256.
export WATCHPACK_POLLING=true
export CHOKIDAR_USEPOLLING=true
echo "Starting npm run dev on http://localhost:3000 (WATCHPACK_POLLING=true)…"
exec npm run dev
