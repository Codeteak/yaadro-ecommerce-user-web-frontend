#!/usr/bin/env bash
set -euo pipefail

APP_PORT="${APP_PORT:-3000}"
for _ in $(seq 1 36); do
  if curl -fsS "http://127.0.0.1:${APP_PORT}/" >/dev/null 2>&1; then
    echo "[validate_service] customer-web healthy on :${APP_PORT}"
    exit 0
  fi
  sleep 5
done

echo "[validate_service] customer-web failed health check on :${APP_PORT}"
exit 1
