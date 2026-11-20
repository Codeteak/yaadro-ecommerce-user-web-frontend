#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/deploy/yaadro/customer-web"
chown -R deploy:deploy "${APP_DIR}"
chmod +x "${APP_DIR}/scripts/cicd/"*.sh || true
