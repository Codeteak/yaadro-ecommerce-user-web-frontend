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
COMPOSE_FILE="${APP_DIR}/docker-compose.yml"

compose() {
  if command -v docker-compose >/dev/null 2>&1; then
    docker-compose -f "${COMPOSE_FILE}" "$@"
  else
    docker compose -f "${COMPOSE_FILE}" "$@"
  fi
}

cd "${APP_DIR}"

# Instance profile creds can lag a few seconds after boot / role attach.
# Without this, `aws` prints "Unable to locate credentials" / "aws login" and exits 1.
echo "[application_start] Waiting for IAM instance credentials..."
for _ in $(seq 1 30); do
  if aws sts get-caller-identity --region "${AWS_REGION}" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done
if ! aws sts get-caller-identity --region "${AWS_REGION}" >/dev/null 2>&1; then
  echo "[application_start] ERROR: no AWS credentials (check EC2 instance profile / IMDS)." >&2
  aws configure list >&2 || true
  exit 1
fi

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
known = ("COMMON_", "SHOP_API_", "CUSTOMER_WEB_", "CUSTOMER_", "SUPERADMIN_", "MAPPER_")

def belongs(key, pfx):
    if not key.startswith(pfx):
        return False
    return not any(key.startswith(o) for o in known if o != pfx and len(o) > len(pfx))

out = {}
has_prefixed = any(isinstance(k, str) and k.startswith(known) for k in data)
if has_prefixed:
    for k, v in data.items():
        if isinstance(v, (dict, list)) or not isinstance(k, str):
            continue
        if belongs(k, common):
            out[k[len(common):]] = str(v)
    for k, v in data.items():
        if isinstance(v, (dict, list)) or not isinstance(k, str):
            continue
        if belongs(k, prefix):
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

# Stop the running site first so its image becomes unused and can be deleted.
echo "[application_start] Stopping old containers..."
compose down --remove-orphans || true
docker rm -f customer-web 2>/dev/null || true

# Free disk before pull — old layers/cache on t4g.micro make extract crawl / time out.
echo "[application_start] Clearing unused Docker artifacts and build cache..."
docker container prune -f || true
docker image prune -af || true
docker builder prune -af || true
docker system prune -af || true

# Drop leftover host junk from prior bundles (keep deploy scripts + compose + image-detail).
echo "[application_start] Clearing stale host artifacts under ${APP_DIR}..."
find "${APP_DIR}" -mindepth 1 -maxdepth 1 \
  ! -name 'scripts' \
  ! -name 'appspec.yml' \
  ! -name 'docker-compose.yml' \
  ! -name 'image-detail.json' \
  ! -name '.env' \
  -exec rm -rf {} + 2>/dev/null || true

echo "[application_start] Pulling ${ECR_IMAGE_URI}..."
compose pull
compose up -d --force-recreate --remove-orphans

echo "[application_start] customer-web deployment complete."
