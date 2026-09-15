#!/usr/bin/env bash
# Free disk before customer-web Docker build/pull.
# Usage: cleanup_disk.sh [pre_pull|post_start|codebuild]
set -euo pipefail

MODE="${1:-pre_pull}"
LABEL="[cleanup_disk:${MODE}]"

log() { echo "${LABEL} $*"; }

disk_report() {
  log "Disk usage:"
  df -h / /var/lib/docker 2>/dev/null || df -h / || true
  if command -v docker >/dev/null 2>&1; then
    docker system df 2>/dev/null || true
  fi
}

truncate_docker_logs() {
  # Container json logs grow without bound and commonly fill small EC2 roots.
  find /var/lib/docker/containers -type f -name '*-json.log' -size +20M \
    -exec truncate -s 0 {} \; 2>/dev/null || true
}

clear_host_caches_and_logs() {
  # CodeDeploy / OS leftovers that accumulate across deploys.
  rm -rf /tmp/codedeploy-deployment-staging-area/* 2>/dev/null || true
  find /opt/codedeploy-agent/deployment-root -mindepth 1 -maxdepth 1 -type d \
    ! -name 'deployment-instructions' \
    -mtime +2 -exec rm -rf {} + 2>/dev/null || true
  find /var/log -type f \( -name '*.log' -o -name '*.gz' -o -name '*.1' \) -size +50M \
    -exec truncate -s 0 {} \; 2>/dev/null || true
  # npm / Next caches if a host-side build ever ran
  rm -rf /home/deploy/.npm/_cacache /root/.npm/_cacache 2>/dev/null || true
  rm -rf /tmp/next-* /tmp/npm-* 2>/dev/null || true
  if command -v journalctl >/dev/null 2>&1; then
    journalctl --vacuum-size=50M >/dev/null 2>&1 || true
  fi
}

docker_light_prune() {
  docker container prune -f >/dev/null 2>&1 || true
  docker image prune -f >/dev/null 2>&1 || true
  docker network prune -f >/dev/null 2>&1 || true
}

docker_aggressive_prune() {
  docker container prune -f >/dev/null 2>&1 || true
  # Drop unused images/build cache so the new ~230MB+ Next layer can extract.
  docker image prune -af >/dev/null 2>&1 || true
  docker builder prune -af >/dev/null 2>&1 || true
  docker volume prune -f >/dev/null 2>&1 || true
  docker network prune -f >/dev/null 2>&1 || true
  docker system prune -af >/dev/null 2>&1 || true
}

main() {
  log "Starting cleanup"
  disk_report

  truncate_docker_logs
  clear_host_caches_and_logs

  if ! command -v docker >/dev/null 2>&1; then
    log "docker not installed; host caches/logs only"
    disk_report
    return 0
  fi

  case "${MODE}" in
    codebuild)
      log "CodeBuild: pruning all unused Docker data before image build"
      docker_aggressive_prune
      ;;
    pre_pull)
      log "Deploy: pruning unused Docker data before image pull"
      docker_aggressive_prune
      ;;
    post_start)
      log "Deploy: light prune after container start"
      docker_light_prune
      truncate_docker_logs
      ;;
    *)
      log "Unknown mode '${MODE}', using pre_pull"
      docker_aggressive_prune
      ;;
  esac

  disk_report
  log "Cleanup finished"
}

main
