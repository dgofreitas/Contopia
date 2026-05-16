#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# Contopia — Rollback Helper
# STORY-007: Re-tag Docker images :previous → :current and redeploy
#
# Usage:
#   ./scripts/rollback.sh
#   ./scripts/rollback.sh --timeout 180
#   ./scripts/rollback.sh --compose-dir /opt/contopia
#   ./scripts/rollback.sh --dry-run
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Constants ────────────────────────────────────────────────────────────────
readonly SCRIPT_NAME="$(basename "$0")"
readonly DEFAULT_TIMEOUT=120
readonly DEFAULT_COMPOSE_DIR="/opt/contopia"
readonly HEALTH_URL="http://localhost:8000/api/v1/ready"
readonly SERVICES="backend frontend"

# ── Logger ───────────────────────────────────────────────────────────────────
log_info()  { echo "[$(date -u +%FT%TZ)] [INFO]  $*"; }
log_error() { echo "[$(date -u +%FT%TZ)] [ERROR] $*" >&2; }

# ── Cleanup ──────────────────────────────────────────────────────────────────
cleanup() {
  local exitCode=$?
  if [ $exitCode -ne 0 ]; then
    log_error "${SCRIPT_NAME} failed with exit code $exitCode"
  fi
  exit "$exitCode"
}
trap cleanup EXIT

# ── Usage ────────────────────────────────────────────────────────────────────
usage() {
  cat <<EOF
Usage: $SCRIPT_NAME [options]

Re-tags Docker images :previous → :current for all services and redeploys
with \`docker compose up -d --no-build\`.

Options:
  --timeout SECONDS     Health check timeout (default: $DEFAULT_TIMEOUT)
  --compose-dir PATH    Docker compose directory (default: $DEFAULT_COMPOSE_DIR)
  --dry-run             Print what would be done without executing
  -h, --help            Show this help and exit
EOF
  exit 0
}

# ── Parse arguments ──────────────────────────────────────────────────────────
parseArgs() {
  localTimeout="$DEFAULT_TIMEOUT"
  localComposeDir="$DEFAULT_COMPOSE_DIR"
  localDryRun=false

  while [ $# -gt 0 ]; do
    case "$1" in
      --timeout)
        if [ -z "${2:-}" ]; then log_error "--timeout requires a value"; exit 2; fi
        if ! [[ "$2" =~ ^[0-9]+$ ]]; then log_error "--timeout must be a number"; exit 2; fi
        localTimeout="$2"; shift 2 ;;
      --compose-dir)
        if [ -z "${2:-}" ]; then log_error "--compose-dir requires a path"; exit 2; fi
        if [ ! -d "$2" ]; then log_error "Directory not found: $2"; exit 1; fi
        localComposeDir="$2"; shift 2 ;;
      --dry-run)
        localDryRun=true; shift ;;
      -h|--help) usage ;;
      *)
        log_error "Unknown argument: $1"; usage; exit 2 ;;
    esac
  done

  TIMEOUT="$localTimeout"
  COMPOSE_DIR="$localComposeDir"
  DRY_RUN="$localDryRun"
}

# ── Validate prerequisites ───────────────────────────────────────────────────
validatePrereqs() {
  if [ ! -f "${COMPOSE_DIR}/docker-compose.yml" ]; then
    log_error "docker-compose.yml not found in ${COMPOSE_DIR}"
    exit 1
  fi

  if [ "$DRY_RUN" = true ]; then
    return 0
  fi

  if ! command -v docker > /dev/null 2>&1; then
    log_error "docker is required but not found"
    exit 1
  fi

  if ! docker compose version > /dev/null 2>&1; then
    log_error "docker compose plugin is required but not available"
    exit 1
  fi
}

# ── Re-tag images ────────────────────────────────────────────────────────────
retagImages() {
  log_info "Re-tagging :previous → :current images..."
  local anyPrevious=false

  for svc in $SERVICES; do
    if docker image inspect "contopia-${svc}:previous" > /dev/null 2>&1; then
      anyPrevious=true
      if [ "$DRY_RUN" = true ]; then
        log_info "[DRY-RUN] docker tag contopia-${svc}:previous contopia-${svc}:current"
      else
        docker tag "contopia-${svc}:previous" "contopia-${svc}:current"
        log_info "  Re-tagged contopia-${svc}:previous → :current"
      fi
    else
      log_error "Image contopia-${svc}:previous not found — cannot rollback this service"
    fi
  done

  if [ "$anyPrevious" = false ]; then
    log_error "No :previous images found for any service. Nothing to rollback."
    exit 1
  fi
}

# ── Redeploy with compose ────────────────────────────────────────────────────
redeploy() {
  log_info "Running docker compose up -d --no-build in ${COMPOSE_DIR}..."
  if [ "$DRY_RUN" = true ]; then
    log_info "[DRY-RUN] cd ${COMPOSE_DIR} && docker compose up -d --no-build"
    return 0
  fi
  (cd "$COMPOSE_DIR" && docker compose up -d --no-build)
  log_info "Containers restarted."
}

# ── Health check ─────────────────────────────────────────────────────────────
healthCheck() {
  local elapsed=0

  log_info "Waiting for readiness at ${HEALTH_URL} (timeout: ${TIMEOUT}s)..."

  if [ "$DRY_RUN" = true ]; then
    log_info "[DRY-RUN] Would wait up to ${TIMEOUT}s for ${HEALTH_URL}"
    return 0
  fi

  while [ "$elapsed" -lt "$TIMEOUT" ]; do
    if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
      log_info "Health check passed."
      return 0
    fi
    sleep 5
    elapsed=$((elapsed + 5))
  done

  log_error "Health check failed after ${TIMEOUT}s — service is not ready."
  return 1
}

# ── Main ─────────────────────────────────────────────────────────────────────
main() {
  parseArgs "$@"
  validatePrereqs
  retagImages
  redeploy
  healthCheck
}

main "$@"
