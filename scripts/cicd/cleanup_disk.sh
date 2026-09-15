#!/usr/bin/env bash
# Free disk before customer-web Docker build/pull.
# Usage: cleanup_disk.sh [before_install|pre_pull|post_start|codebuild]
#
# Aggressive image deletion is ONLY used when the root disk is critically full.
# Otherwise we keep tagged layers so `docker pull` is incremental (fast deploys).
set -uo pipefail

MODE="${1:-pre_pull}"
LABEL="[cleanup_disk:${MODE}]"
APP_DIR="${APP_DIR:-/home/deploy/yaadro/customer-web}"
CUSTOMER_WEB_CONTAINER="${CUSTOMER_WEB_CONTAINER:-customer-web}"

log() { echo "${LABEL} $*"; }

avail_kb() {
  df -Pk / 2>/dev/null | awk 'NR==2 {print $4}'
}

used_pct() {
  df -P / 2>/dev/null | awk 'NR==2 {gsub(/%/,"",$5); print $5}'
}

disk_is_critical() {
  local kb pct
  kb="$(avail_kb || echo 0)"
  pct="$(used_pct || echo 100)"
  [[ "${kb}" =~ ^[0-9]+$ ]] || kb=0
  [[ "${pct}" =~ ^[0-9]+$ ]] || pct=100
  # <2GiB free or >=90% used — Next layer extract needs headroom.
  (( kb < 2097152 || pct >= 90 ))
}

disk_report() {
  log "Disk usage:"
  df -h / /var/lib/docker 2>/dev/null || df -h / || true
  if command -v docker >/dev/null 2>&1; then
    docker system df 2>/dev/null || true
  fi
}

truncate_docker_logs() {
  local min_size="${1:-20M}"
  log "Truncating Docker container logs (>= ${min_size})..."
  find /var/lib/docker/containers -type f -name '*-json.log' -size "+${min_size}" \
    -print -exec truncate -s 0 {} \; 2>/dev/null || true
}

clear_host_caches_and_logs() {
  log "Clearing host caches / old CodeDeploy / large logs..."
  rm -rf /tmp/codedeploy-deployment-staging-area/* 2>/dev/null || true
  if [[ -d /opt/codedeploy-agent/deployment-root ]]; then
    find /opt/codedeploy-agent/deployment-root -mindepth 1 -maxdepth 1 -type d \
      ! -name 'deployment-instructions' -mtime +1 -exec rm -rf {} + 2>/dev/null || true
  fi
  find /var/log -type f \( -name '*.log' -o -name '*.gz' -o -name '*.1' -o -name '*.old' \) \
    -size +20M -exec truncate -s 0 {} \; 2>/dev/null || true
  rm -rf /home/deploy/.npm/_cacache /root/.npm/_cacache 2>/dev/null || true
  rm -rf /tmp/next-* /tmp/npm-* /var/tmp/npm-* 2>/dev/null || true
  rm -rf /var/cache/yum/* /var/cache/dnf/* /var/cache/apt/archives/* 2>/dev/null || true
  if command -v journalctl >/dev/null 2>&1; then
    journalctl --vacuum-size=32M >/dev/null 2>&1 || true
  fi
}

stop_customer_web() {
  # Only used when we must reclaim the currently-running customer-web image layers.
  # Do not touch sibling stacks (shop-api / superadmin) on shared hosts.
  log "Stopping ${CUSTOMER_WEB_CONTAINER} so its image layers can be pruned..."
  docker stop -t 20 "${CUSTOMER_WEB_CONTAINER}" 2>/dev/null || true
  docker rm -f "${CUSTOMER_WEB_CONTAINER}" 2>/dev/null || true

  local compose="${APP_DIR}/docker-compose.yml"
  if [[ -f "${compose}" ]]; then
    if command -v docker-compose >/dev/null 2>&1; then
      docker-compose -f "${compose}" down --remove-orphans 2>/dev/null || true
    elif docker compose version >/dev/null 2>&1; then
      docker compose -f "${compose}" down --remove-orphans 2>/dev/null || true
    fi
  fi
}

# docker rmi fails harmlessly when an image is still used by a running sibling container.
remove_unused_images() {
  log "Removing local images not required by running containers..."
  local id
  while read -r id; do
    [[ -n "${id}" ]] || continue
    log "docker rmi -f ${id}"
    if ! docker rmi -f "${id}" 2>&1; then
      log "kept ${id} (in use or already removed)"
    fi
  done < <(docker images -q | awk 'NF && !seen[$0]++')
}

docker_light_prune() {
  log "Light prune (stopped containers + dangling images only — keeps tagged layer cache)"
  docker container prune -f || true
  docker image prune -f || true
  docker network prune -f || true
}

docker_aggressive_prune() {
  log "Aggressive prune (disk critically full — will force a full ECR re-pull afterward)"
  docker container prune -f || true
  docker network prune -f || true
  docker builder prune -af || true
  docker volume prune -f || true
  remove_unused_images
  docker image prune -af || true
  docker system prune -af || true
}

ensure_headroom() {
  local kb
  kb="$(avail_kb || echo 0)"
  log "Available after cleanup: ${kb} KiB"
  if [[ "${kb}" =~ ^[0-9]+$ ]] && (( kb < 524288 )); then
    log "WARNING: still <512MiB free — Next layer extract may fail. Grow the root EBS volume."
    return 1
  fi
  return 0
}

# Shared path for deploy hooks: free logs always; wipe images only when needed.
deploy_cleanup() {
  local allow_stop_web="${1:-0}"

  if disk_is_critical; then
    log "Disk critically full — aggressive cleanup"
    truncate_docker_logs 1M
    clear_host_caches_and_logs
    if [[ "${allow_stop_web}" == "1" ]]; then
      stop_customer_web
    fi
    docker_aggressive_prune
  else
    log "Disk OK — light cleanup only (preserve image layers for fast pull)"
    truncate_docker_logs 20M
    clear_host_caches_and_logs
    docker_light_prune
  fi
}

main() {
  log "Starting cleanup"
  disk_report

  if ! command -v docker >/dev/null 2>&1; then
    truncate_docker_logs 1M
    clear_host_caches_and_logs
    log "docker not installed; host caches/logs only"
    disk_report
    return 0
  fi

  case "${MODE}" in
    codebuild)
      log "CodeBuild: pruning unused Docker data before image build"
      truncate_docker_logs 20M
      docker_aggressive_prune
      ;;
    before_install)
      # Run early in CodeDeploy. Stop web only if we must reclaim its layers.
      deploy_cleanup 1
      ;;
    pre_pull)
      # ApplicationStart: do NOT wipe the cache again if BeforeInstall already
      # freed space — that forces a multi-GB ECR download and looks "stuck".
      deploy_cleanup 0
      ;;
    post_start)
      log "Deploy: light prune after container start"
      docker_light_prune
      truncate_docker_logs 20M
      ;;
    *)
      log "Unknown mode '${MODE}', treating as pre_pull"
      deploy_cleanup 0
      ;;
  esac

  disk_report
  ensure_headroom || true
  log "Cleanup finished"
}

main
