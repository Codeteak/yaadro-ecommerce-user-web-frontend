#!/usr/bin/env bash
# CodeDeploy ApplicationStop — must not fail the deployment.
# This event often runs the *previous* revision's script; keep it resilient.
set +e

APP_DIR="/home/deploy/yaadro/customer-web"
COMPOSE_FILE="${APP_DIR}/docker-compose.yml"

if [[ ! -d "${APP_DIR}" ]]; then
  echo "[application_stop] ${APP_DIR} missing — nothing to stop."
  exit 0
fi

cd "${APP_DIR}" || exit 0

if [[ -f "${COMPOSE_FILE}" ]]; then
  if command -v docker-compose >/dev/null 2>&1; then
    docker-compose -f "${COMPOSE_FILE}" down --remove-orphans
  elif docker compose version >/dev/null 2>&1; then
    docker compose -f "${COMPOSE_FILE}" down --remove-orphans
  else
    echo "[application_stop] docker compose not available — skip."
  fi
else
  echo "[application_stop] no docker-compose.yml — skip."
fi

# Never fail ApplicationStop; a hard fail blocks BeforeInstall on the next deploy.
exit 0
