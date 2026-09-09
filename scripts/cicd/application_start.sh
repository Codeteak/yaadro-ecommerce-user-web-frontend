#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/deploy/yaadro/customer-web"
HOST_RUNTIME_CONF="/etc/yaadro/app-runtime.conf"

if [[ -f "${HOST_RUNTIME_CONF}" ]]; then
  # shellcheck disable=SC1090
  set -a
  source "${HOST_RUNTIME_CONF}"
  set +a
fi

SHARED_RUNTIME_SECRET="yaadro-ecom-prod-runtime-env"
SECRET_ID="${APP_ENV_SECRET_ID:-${AWS_SECRET_ID:-${SHARED_RUNTIME_SECRET}}}"
SECRET_PREFIX="${APP_ENV_SECRET_PREFIX:-CUSTOMER_WEB_}"
AWS_REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-ap-south-1}}"
IMAGE_DETAIL_FILE="${APP_DIR}/image-detail.json"
APP_PORT="${APP_PORT:-3000}"

cd "${APP_DIR}"

echo "[application_start] Writing .env from Secrets Manager (${SECRET_ID}, prefix ${SECRET_PREFIX})..."
rm -f .env
aws secretsmanager get-secret-value \
  --secret-id "${SECRET_ID}" \
  --region "${AWS_REGION}" \
  --query SecretString \
  --output text | APP_ENV_SECRET_PREFIX="${SECRET_PREFIX}" python3 -c '
import json, os, sys
data = json.load(sys.stdin)
prefix = os.environ.get("APP_ENV_SECRET_PREFIX", "CUSTOMER_WEB_")
common = "COMMON_"
known = ("COMMON_", "SHOP_API_", "CUSTOMER_", "CUSTOMER_WEB_", "SUPERADMIN_", "MAPPER_")
out = {}
has_prefixed = any(isinstance(k, str) and k.startswith(known) for k in data)
if has_prefixed:
    for k, v in data.items():
        if isinstance(v, (dict, list)) or not isinstance(k, str):
            continue
        if k.startswith(common):
            out[k[len(common):]] = str(v)
    for k, v in data.items():
        if isinstance(v, (dict, list)) or not isinstance(k, str):
            continue
        if k.startswith(prefix):
            out[k[len(prefix):]] = str(v)
else:
    for k, v in data.items():
        if isinstance(v, (dict, list)):
            continue
        out[str(k)] = str(v)
for k in sorted(out):
    print(f"{k}={out[k]}")
' | tr -d '\r' > .env

{
  echo "NODE_ENV=production"
  echo "PORT=${APP_PORT}"
  echo "HOSTNAME=0.0.0.0"
} >> .env

if [[ ! -f "${IMAGE_DETAIL_FILE}" ]]; then
  echo "[application_start] Missing ${IMAGE_DETAIL_FILE}"
  exit 1
fi

ECR_IMAGE_URI="$(jq -r '.imageUri // empty' "${IMAGE_DETAIL_FILE}")"
[[ -n "${ECR_IMAGE_URI}" ]] || { echo "[application_start] imageUri missing"; exit 1; }

ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
aws ecr get-login-password --region "${AWS_REGION}" | docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
export ECR_IMAGE_URI
export APP_PORT

COMPOSE_FILE="${APP_DIR}/docker-compose.yml"
if command -v docker-compose >/dev/null 2>&1; then
  docker-compose -f "${COMPOSE_FILE}" pull
  docker-compose -f "${COMPOSE_FILE}" down --remove-orphans
  docker-compose -f "${COMPOSE_FILE}" up -d --force-recreate
else
  docker compose -f "${COMPOSE_FILE}" pull
  docker compose -f "${COMPOSE_FILE}" down --remove-orphans
  docker compose -f "${COMPOSE_FILE}" up -d --force-recreate
fi

echo "[application_start] customer-web deployment complete."
