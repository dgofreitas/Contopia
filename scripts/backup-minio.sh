#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# Contopia — MinIO Backup
# STORY-007: Mirror MinIO bucket 'contopia' to /opt/contopia/backups/YYYY-MM-DD/
#
# Uses mc mirror (MinIO Client). Runs from host if mc is installed, or
# from within the contopia-minio container.
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Constants ────────────────────────────────────────────────────────────────
readonly BACKUP_BASE="/opt/contopia/backups"
readonly DATE_DIR="$(date -u +%Y-%m-%d)"
readonly BACKUP_DIR="${BACKUP_BASE}/${DATE_DIR}/minio"
readonly BUCKET_NAME="contopia"
readonly CONTAINER_NAME="contopia-minio"
readonly SCRIPT_NAME="$(basename "$0")"
readonly MINIO_ALIAS="contopia-backup"

# ── Logger ───────────────────────────────────────────────────────────────────
log_info()  { echo "[$(date -u +%FT%TZ)] [INFO]  $*"; }
log_error() { echo "[$(date -u +%FT%TZ)] [ERROR] $*" >&2; }

# ── Cleanup ──────────────────────────────────────────────────────────────────
cleanup() {
  local exitCode=$?
  if [ $exitCode -ne 0 ]; then
    log_error "${SCRIPT_NAME} failed with exit code $exitCode"
  else
    log_info "MinIO backup completed successfully."
  fi
  exit "$exitCode"
}
trap cleanup EXIT

# ── Ensure backup directory exists ───────────────────────────────────────────
ensureBackupDir() {
  if [ ! -d "$BACKUP_DIR" ]; then
    mkdir -p "$BACKUP_DIR"
    log_info "Created backup directory: $BACKUP_DIR"
  fi
}

# ── Run mc mirror from host ──────────────────────────────────────────────────
runHostMirror() {
  log_info "Running mc mirror from host..."

  # Configure alias if not already set
  if ! mc alias list 2>/dev/null | grep -q "^${MINIO_ALIAS}\s"; then
    local minioEndpoint="${MINIO_ENDPOINT:-http://localhost:9000}"
    local minioAccessKey="${MINIO_ACCESS_KEY:-}"
    local minioSecretKey="${MINIO_SECRET_KEY:-}"

    if [ -z "$minioAccessKey" ] || [ -z "$minioSecretKey" ]; then
      log_error "MINIO_ACCESS_KEY and MINIO_SECRET_KEY must be set (env vars)"
      exit 1
    fi

    mc alias set "$MINIO_ALIAS" "$minioEndpoint" "$minioAccessKey" "$minioSecretKey"
  fi

  mc mirror "${MINIO_ALIAS}/${BUCKET_NAME}" "$BACKUP_DIR"
  log_info "Backup saved to: $BACKUP_DIR"
}

# ── Run mc mirror inside Docker container ────────────────────────────────────
runContainerMirror() {
  log_info "Running mc mirror inside container ${CONTAINER_NAME}..."

  if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    log_error "Container ${CONTAINER_NAME} is not running. Cannot backup."
    exit 1
  fi

  # Use env vars from the container to configure mc
  local minioAccessKey
  local minioSecretKey

  minioAccessKey="$(docker exec "$CONTAINER_NAME" printenv MINIO_ROOT_USER 2>/dev/null || true)"
  minioSecretKey="$(docker exec "$CONTAINER_NAME" printenv MINIO_ROOT_PASSWORD 2>/dev/null || true)"

  if [ -z "$minioAccessKey" ]; then
    minioAccessKey="${MINIO_ACCESS_KEY:-}"
  fi
  if [ -z "$minioSecretKey" ]; then
    minioSecretKey="${MINIO_SECRET_KEY:-}"
  fi
  if [ -z "$minioAccessKey" ] || [ -z "$minioSecretKey" ]; then
    log_error "Could not determine MinIO credentials"
    exit 1
  fi

  docker exec "$CONTAINER_NAME" sh -c "
    mc alias set ${MINIO_ALIAS} http://localhost:9000 ${minioAccessKey} ${minioSecretKey}
    mc mirror ${MINIO_ALIAS}/${BUCKET_NAME} /tmp/minio-backup
  "

  # Copy backup out of container
  docker cp "${CONTAINER_NAME}:/tmp/minio-backup/." "$BACKUP_DIR"
  docker exec "$CONTAINER_NAME" rm -rf /tmp/minio-backup

  log_info "Backup saved to: $BACKUP_DIR"
}

# ── Main ─────────────────────────────────────────────────────────────────────
main() {
  ensureBackupDir

  if command -v mc > /dev/null 2>&1; then
    runHostMirror
  else
    runContainerMirror
  fi
}

main "$@"
