#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# Contopia — MongoDB Backup
# STORY-007: Dump MongoDB to /opt/contopia/backups/YYYY-MM-DD/mongodb.archive.gz
#
# Runs mongodump from the host. If mongodump is not installed, falls back to
# running it inside the contopia-mongodb container.
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Constants ────────────────────────────────────────────────────────────────
readonly BACKUP_BASE="/opt/contopia/backups"
readonly DATE_DIR="$(date -u +%Y-%m-%d)"
readonly BACKUP_DIR="${BACKUP_BASE}/${DATE_DIR}"
readonly ARCHIVE_NAME="mongodb.archive.gz"
readonly CONTAINER_NAME="contopia-mongodb"
readonly SCRIPT_NAME="$(basename "$0")"

# ── Logger ───────────────────────────────────────────────────────────────────
log_info()  { echo "[$(date -u +%FT%TZ)] [INFO]  $*"; }
log_error() { echo "[$(date -u +%FT%TZ)] [ERROR] $*" >&2; }

# ── Cleanup ──────────────────────────────────────────────────────────────────
cleanup() {
  local exitCode=$?
  if [ $exitCode -ne 0 ]; then
    log_error "${SCRIPT_NAME} failed with exit code $exitCode"
  else
    log_info "Backup completed successfully."
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

# ── Run mongodump from host ──────────────────────────────────────────────────
runHostDump() {
  local outFile="${BACKUP_DIR}/${ARCHIVE_NAME}"

  log_info "Running mongodump from host..."
  mongodump \
    --archive="$outFile" \
    --gzip

  log_info "Backup saved: $outFile"
}

# ── Run mongodump inside Docker container ────────────────────────────────────
runContainerDump() {
  local outFile="${BACKUP_DIR}/${ARCHIVE_NAME}"

  log_info "mongodump not found on host. Running inside container ${CONTAINER_NAME}..."

  if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    log_error "Container ${CONTAINER_NAME} is not running. Cannot dump."
    exit 1
  fi

  docker exec "$CONTAINER_NAME" mongodump \
    --archive \
    --gzip > "$outFile"

  log_info "Backup saved: $outFile"
}

# ── Main ─────────────────────────────────────────────────────────────────────
main() {
  ensureBackupDir

  if command -v mongodump > /dev/null 2>&1; then
    runHostDump
  else
    runContainerDump
  fi
}

main "$@"
