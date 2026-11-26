#!/usr/bin/env bash
# CodeDeploy ApplicationStop — must never hang or fail the deployment.
#
# Runs from the *previous* successful revision. Unbounded `docker compose down`
# caused ScriptTimedOut (300s) on t4g.micro when Docker was wedged
# (d-O9GYOYOVL). v1 avoided this by having no ApplicationStop; cutover lives
# in ApplicationStart (`compose up --force-recreate`). This hook only does a
# bounded stop so Install can proceed; Start owns the real replace.
set +e

APP_DIR="/home/deploy/yaadro/customer-web"
COMPOSE_FILE="${APP_DIR}/docker-compose.yml"
CONTAINER_NAME="customer-web"

# Prefer GNU/coreutils timeout; fall back to bare command if missing.
run_timeout() {
  local secs="$1"
  shift
  if command -v timeout >/dev/null 2>&1; then
    timeout "${secs}" "$@"
    return $?
  fi
  "$@"
  return $?
}

stop_by_name() {
  echo "[application_stop] Bounded stop/rm of ${CONTAINER_NAME}..."
  run_timeout 30 docker stop -t 10 "${CONTAINER_NAME}" 2>/dev/null || true
  run_timeout 15 docker rm -f "${CONTAINER_NAME}" 2>/dev/null || true
}

if [[ ! -d "${APP_DIR}" ]]; then
  echo "[application_stop] ${APP_DIR} missing — nothing to stop."
  exit 0
fi

cd "${APP_DIR}" || exit 0

# Compose file may require these to parse; Start normally exports them.
export ECR_IMAGE_URI="${ECR_IMAGE_URI:-application-stop-placeholder}"
export APP_PORT="${APP_PORT:-3000}"

# Best-effort: short compose down for networks/orphans. Hard-capped so a
# wedged Docker daemon cannot burn the full appspec 300s budget.
if [[ -f "${COMPOSE_FILE}" ]]; then
  echo "[application_stop] Bounded compose down (max 60s)..."
  if command -v docker-compose >/dev/null 2>&1; then
    run_timeout 60 docker-compose -f "${COMPOSE_FILE}" down --remove-orphans -t 20
  elif docker compose version >/dev/null 2>&1; then
    run_timeout 60 docker compose -f "${COMPOSE_FILE}" down --remove-orphans -t 20
  else
    echo "[application_stop] docker compose not available."
  fi
fi

# Always ensure the named container is gone even if compose timed out/hung.
stop_by_name

# Never fail ApplicationStop; a hard fail blocks BeforeInstall on the next deploy.
exit 0
