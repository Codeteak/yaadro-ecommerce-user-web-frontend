#!/usr/bin/env bash
# CodeDeploy ApplicationStop — must not fail the deployment.
# This event often runs the *previous* revision's script; keep it resilient.
set +e

APP_DIR="/home/deploy/yaadro/customer-web"
COMPOSE_FILE="${APP_DIR}/docker-compose.yml"
CONTAINER_NAME="customer-web"

if [[ ! -d "${APP_DIR}" ]]; then
  echo "[application_stop] ${APP_DIR} missing — nothing to stop."
  exit 0
fi

cd "${APP_DIR}" || exit 0

# docker-compose.yml requires ECR_IMAGE_URI to parse. Start sets it; Stop does not.
# Use a placeholder so `compose down` can run without image-detail.json.
export ECR_IMAGE_URI="${ECR_IMAGE_URI:-application-stop-placeholder}"
export APP_PORT="${APP_PORT:-3000}"

compose_down() {
  if command -v docker-compose >/dev/null 2>&1; then
    docker-compose -f "${COMPOSE_FILE}" down --remove-orphans
    return $?
  fi
  if docker compose version >/dev/null 2>&1; then
    docker compose -f "${COMPOSE_FILE}" down --remove-orphans
    return $?
  fi
  echo "[application_stop] docker compose not available."
  return 1
}

if [[ -f "${COMPOSE_FILE}" ]]; then
  if ! compose_down; then
    echo "[application_stop] compose down failed — falling back to container name."
    docker stop "${CONTAINER_NAME}" 2>/dev/null || true
    docker rm -f "${CONTAINER_NAME}" 2>/dev/null || true
  fi
else
  echo "[application_stop] no docker-compose.yml — stopping by container name."
  docker stop "${CONTAINER_NAME}" 2>/dev/null || true
  docker rm -f "${CONTAINER_NAME}" 2>/dev/null || true
fi

# Never fail ApplicationStop; a hard fail blocks BeforeInstall on the next deploy.
exit 0
