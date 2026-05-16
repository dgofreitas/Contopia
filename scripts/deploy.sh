#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# Contopia — Deploy Helper
# STORY-007: SSH + docker compose deploy with health gate and rollback
#
# Usage:
#   ./scripts/deploy.sh --env staging --tag abc1234
#   ./scripts/deploy.sh --env production --tag abc1234 [--images-tar ./images.tar.gz]
#   ./scripts/deploy.sh --env production --tag abc1234 --timeout 180
#
# Requires: SSH access to target host, docker on remote, compose file present
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Constants ────────────────────────────────────────────────────────────────
readonly SCRIPT_NAME="$(basename "$0")"
readonly DEFAULT_TIMEOUT=120
readonly HEALTH_URL="http://localhost:8000/api/v1/ready"
readonly COMPOSE_DIR="/opt/contopia"

# ── Logger ───────────────────────────────────────────────────────────────────
log_info()  { echo "[$(date -u +%FT%TZ)] [INFO]  $*"; }
log_error() { echo "[$(date -u +%FT%TZ)] [ERROR] $*" >&2; }

# ── Cleanup ──────────────────────────────────────────────────────────────────
cleanup() {
  local exitCode=$?
  if [ $exitCode -ne 0 ]; then
    log_error "Deploy script failed with exit code $exitCode"
  fi
  exit "$exitCode"
}
trap cleanup EXIT

# ── Usage ────────────────────────────────────────────────────────────────────
usage() {
  cat <<EOF
Usage: $SCRIPT_NAME --env <staging|production> --tag <sha> [options]

Required:
  --env    Target environment: staging or production
  --tag    Git SHA or image tag to deploy

Options:
  --images-tar PATH   Path to a tar.gz of saved Docker images to load remotely
  --timeout SECONDS   Health check timeout (default: $DEFAULT_TIMEOUT)
  --host HOST         SSH host (overrides env-based default)
  --dry-run           Print what would be done without executing
  -h, --help          Show this help and exit

Environment variables (used if --host not given):
  STAGING_HOST, PROD_HOST
  SSH_PRIVATE_KEY  (optional — script can also rely on ssh-agent)
EOF
  exit 0
}

# ── Parse individual flag ─────────────────────────────────────────────────────
parseFlag() {
  case "$1" in
    --env)
      if [ -z "${2:-}" ]; then log_error "--env requires an argument"; exit 2; fi
      if [ "$2" != "staging" ] && [ "$2" != "production" ]; then
        log_error "--env must be 'staging' or 'production', got '$2'"; exit 2
      fi
      echo "$2" ;;
    --tag)
      if [ -z "${2:-}" ]; then log_error "--tag requires an argument"; exit 2; fi
      echo "$2" ;;
    --images-tar)
      if [ -z "${2:-}" ]; then log_error "--images-tar requires a path"; exit 2; fi
      echo "$2" ;;
    --timeout)
      if [ -z "${2:-}" ]; then log_error "--timeout requires a number"; exit 2; fi
      if ! [[ "$2" =~ ^[0-9]+$ ]]; then
        log_error "--timeout must be a positive integer"; exit 2
      fi
      echo "$2" ;;
    --host)
      if [ -z "${2:-}" ]; then log_error "--host requires an argument"; exit 2; fi
      echo "$2" ;;
    --dry-run) return 1 ;;
    -h|--help) usage ;;
    *) log_error "Unknown argument: $1"; usage; exit 2 ;;
  esac
}

# ── Determine SSH host from env ──────────────────────────────────────────────
resolveSshHost() {
  local env="$1" explicitHost="$2"
  if [ -n "$explicitHost" ]; then echo "$explicitHost"; return; fi
  if [ "$env" = "staging" ]; then
    local host="${STAGING_HOST:-}"
    if [ -z "$host" ]; then log_error "STAGING_HOST not set"; exit 2; fi
    echo "$host"
  else
    local host="${PROD_HOST:-}"
    if [ -z "$host" ]; then log_error "PROD_HOST not set"; exit 2; fi
    echo "$host"
  fi
}

# ── Parse arguments ──────────────────────────────────────────────────────────
parseArgs() {
  localEnv=""; localTag=""; localImagesTar=""; localHost=""
  localTimeout="$DEFAULT_TIMEOUT"; localDryRun=false

  while [ $# -gt 0 ]; do
    case "$1" in
      --env|--tag|--images-tar|--timeout|--host)
        local result; result="$(parseFlag "$1" "${2:-}")"
        if [ "$1" = "--env" ]; then localEnv="$result"
        elif [ "$1" = "--tag" ]; then localTag="$result"
        elif [ "$1" = "--images-tar" ]; then localImagesTar="$result"
        elif [ "$1" = "--timeout" ]; then localTimeout="$result"
        elif [ "$1" = "--host" ]; then localHost="$result"; fi
        shift 2 ;;
      --dry-run) localDryRun=true; shift ;;
      -h|--help) usage ;;
      *) log_error "Unknown argument: $1"; usage; exit 2 ;;
    esac
  done

  if [ -z "$localEnv" ]; then log_error "--env is required"; exit 2; fi
  if [ -z "$localTag" ]; then log_error "--tag is required"; exit 2; fi

  ENV="$localEnv"; TAG="$localTag"; IMAGES_TAR="$localImagesTar"
  TIMEOUT="$localTimeout"; DRY_RUN="$localDryRun"
  SSH_HOST="$(resolveSshHost "$localEnv" "$localHost")"
}

# ── Validate prerequisites ───────────────────────────────────────────────────
validatePrereqs() {
  if [ "$DRY_RUN" = true ]; then
    return 0
  fi

  if ! command -v ssh > /dev/null 2>&1; then
    log_error "ssh is required but not found"
    exit 1
  fi

  if ! command -v scp > /dev/null 2>&1; then
    log_error "scp is required but not found"
    exit 1
  fi

  if [ -n "$IMAGES_TAR" ] && [ ! -f "$IMAGES_TAR" ]; then
    log_error "Images tar not found: $IMAGES_TAR"
    exit 1
  fi
}

# ── Transfer images to remote ────────────────────────────────────────────────
transferImages() {
  if [ -z "$IMAGES_TAR" ]; then
    log_info "No images tar provided — assuming images exist on remote"
    return 0
  fi

  if [ "$DRY_RUN" = true ]; then
    log_info "[DRY-RUN] scp $IMAGES_TAR $SSH_HOST:/tmp/"
    return 0
  fi

  log_info "Transferring images to $SSH_HOST..."
  scp -o StrictHostKeyChecking=no "$IMAGES_TAR" "root@${SSH_HOST}:/tmp/deploy-images.tar.gz"
  log_info "Transfer complete."
}

# ── Health check loop ────────────────────────────────────────────────────────
healthCheck() {
  local timeout="$1"
  local elapsed=0

  log_info "Waiting for readiness at $HEALTH_URL (timeout: ${timeout}s)..."

  while true; do
    if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
      log_info "Health check passed."
      return 0
    fi

    if [ "$elapsed" -ge "$timeout" ]; then
      log_error "Health check timed out after ${timeout}s"
      return 1
    fi

    sleep 5
    elapsed=$((elapsed + 5))
  done
}

# ── Perform rollback on remote ───────────────────────────────────────────────
rollbackRemote() {
  log_error "Initiating rollback on $SSH_HOST..."
  if [ "$DRY_RUN" = true ]; then
    log_info "[DRY-RUN] Re-tagging :previous → :current on remote"
    return 1
  fi

  if ssh "root@${SSH_HOST}" "
    set -e
    docker tag contopia-backend:previous contopia-backend:current 2>/dev/null || true
    docker tag contopia-frontend:previous contopia-frontend:current 2>/dev/null || true
    cd $COMPOSE_DIR
    docker compose up -d --no-build
    sleep 10
    if curl -sf $HEALTH_URL; then
      echo 'ROLLBACK_OK'
    else
      echo 'ROLLBACK_FAILED'
    fi
  "; then
    log_info "Rollback succeeded."
    return 0
  else
    log_error "Rollback command failed."
    return 1
  fi
}

# ── Remote: load images chunk ────────────────────────────────────────────────
cmdLoadImages() {
  if [ -z "$IMAGES_TAR" ]; then
    echo ""
    return
  fi
  echo "echo '=== Loading Docker images ==='"
  echo "gunzip -c /tmp/deploy-images.tar.gz | docker load"
  echo "rm -f /tmp/deploy-images.tar.gz"
}

# ── Remote: tag images chunk ──────────────────────────────────────────────────
cmdTagImages() {
  local production="$1"
  if [ "$production" = true ]; then
    echo "echo '=== Tagging current images as :previous ==='"
    echo "docker tag contopia-backend:current contopia-backend:previous 2>/dev/null || true"
    echo "docker tag contopia-frontend:current contopia-frontend:previous 2>/dev/null || true"
  fi
  echo "echo '=== Tagging new images as :current ==='"
  echo "docker tag contopia-backend:${TAG} contopia-backend:current"
  echo "docker tag contopia-frontend:${TAG} contopia-frontend:current"
}

# ── Remote: deploy chunk ──────────────────────────────────────────────────────
cmdDeploy() {
  echo "echo '=== Deploying $ENV ==='"
  echo "cd ${COMPOSE_DIR}"
  echo "export IMAGE_TAG=${TAG}"
  echo "docker compose up -d --no-build"
}

# ── Remote: health check chunk ────────────────────────────────────────────────
cmdHealthCheck() {
  echo "echo '=== Health check (timeout: ${TIMEOUT}s) ==='"
  echo "TIMEOUT=${TIMEOUT}"
  echo "ELAPSED=0"
  echo "HEALTHY=false"
  echo 'until curl -sf http://localhost:8000/api/v1/ready; do'
  echo '  if [ "$ELAPSED" -ge "$TIMEOUT" ]; then'
  echo '    echo "HEALTH_FAILED"'
  echo '    HEALTHY=false'
  echo '    break'
  echo '  fi'
  echo '  sleep 5'
  echo '  ELAPSED=$((ELAPSED + 5))'
  echo 'done'
  echo 'if [ "$HEALTHY" != false ]; then'
  echo '  echo "HEALTH_OK"'
  echo 'fi'
}

# ── Remote: rollback or fail chunk ────────────────────────────────────────────
cmdRollbackOrFail() {
  local production="$1"
  if [ "$production" = true ]; then
    echo 'if [ "$HEALTHY" = false ]; then'
    echo "  echo '=== Rolling back to :previous ==='"
    echo '  docker tag contopia-backend:previous contopia-backend:current 2>/dev/null || true'
    echo '  docker tag contopia-frontend:previous contopia-frontend:current 2>/dev/null || true'
    echo "  cd ${COMPOSE_DIR}"
    echo '  docker compose up -d --no-build'
    echo '  sleep 10'
    echo '  if curl -sf http://localhost:8000/api/v1/ready; then'
    echo '    echo "ROLLBACK_OK"'
    echo '  else'
    echo '    echo "ROLLBACK_FAILED"'
    echo '  fi'
    echo '  exit 1'
    echo 'fi'
  else
    echo 'if [ "$HEALTHY" = false ]; then'
    echo '  exit 1'
    echo 'fi'
  fi
}

# ── Remote: prune chunk ──────────────────────────────────────────────────────
cmdPrune() {
  echo "echo '=== Pruning old images ==='"
  echo "docker image prune -f"
  echo "echo '=== Deploy to $ENV complete ==='"
}

# ── Remote deploy command ────────────────────────────────────────────────────
buildRemoteCommand() {
  local isProduction=false
  [ "$ENV" = "production" ] && isProduction=true

  {
    echo "set -e"
    cmdLoadImages
    cmdTagImages "$isProduction"
    cmdDeploy
    cmdHealthCheck
    cmdRollbackOrFail "$isProduction"
    cmdPrune
  }
}

# ── Execute remote deploy ────────────────────────────────────────────────────
executeRemoteDeploy() {
  local remoteCmd
  remoteCmd="$(buildRemoteCommand)"

  if [ "$DRY_RUN" = true ]; then
    log_info "[DRY-RUN] Would SSH to $SSH_HOST and execute:"
    echo "───────────────────────────────────────"
    echo -e "$remoteCmd"
    echo "───────────────────────────────────────"
    return 0
  fi

  log_info "Connecting to $SSH_HOST for $ENV deploy..."
  local result
  result="$(ssh "root@${SSH_HOST}" "$remoteCmd")" || true
  echo "$result"

  if echo "$result" | grep -q "ROLLBACK_FAILED"; then
    log_error "CRITICAL: Rollback also failed — manual intervention required."
    exit 1
  fi

  if echo "$result" | grep -q "ROLLBACK_OK"; then
    log_error "Deploy failed. Rollback executed successfully."
    exit 1
  fi

  if echo "$result" | grep -q "HEALTH_FAILED"; then
    log_error "Health check failed."
    exit 1
  fi

  if echo "$result" | grep -q "HEALTH_OK"; then
    log_info "Deploy to $ENV completed successfully."
  else
    log_error "Unexpected result — deploy may have failed."
    exit 1
  fi
}

# ── Main ─────────────────────────────────────────────────────────────────────
main() {
  parseArgs "$@"
  validatePrereqs
  transferImages
  executeRemoteDeploy
}

main "$@"
