#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/deploy/yaadro/customer-web"

install_pkg() {
  if command -v dnf >/dev/null 2>&1; then
    dnf install -y "$@"
  elif command -v yum >/dev/null 2>&1; then
    yum install -y "$@"
  else
    apt-get update -y
    apt-get install -y "$@"
  fi
}

if ! id -u deploy >/dev/null 2>&1; then
  useradd --create-home --home-dir /home/deploy --shell /bin/bash deploy
fi

mkdir -p "${APP_DIR}"

command -v aws >/dev/null 2>&1 || install_pkg awscli
command -v jq >/dev/null 2>&1 || install_pkg jq
command -v docker >/dev/null 2>&1 || install_pkg docker
systemctl enable --now docker

if ! docker compose version >/dev/null 2>&1 && ! command -v docker-compose >/dev/null 2>&1; then
  ARCH="$(uname -m)"
  COMPOSE_ARCH="x86_64"
  [[ "${ARCH}" == "aarch64" || "${ARCH}" == "arm64" ]] && COMPOSE_ARCH="aarch64"
  curl -fsSL "https://github.com/docker/compose/releases/download/v2.29.7/docker-compose-linux-${COMPOSE_ARCH}" -o /usr/local/bin/docker-compose
  chmod +x /usr/local/bin/docker-compose
fi
