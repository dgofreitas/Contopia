#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# Contopia — Cleanup Old Backups
# STORY-007: Delete backup directories in /opt/contopia/backups/ older than 7
#            days. Logs what was deleted.
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Constants ────────────────────────────────────────────────────────────────
readonly BACKUP_BASE="/opt/contopia/backups"
readonly RETENTION_DAYS=7
readonly SCRIPT_NAME="$(basename "$0")"

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

# ── Validate backup directory ────────────────────────────────────────────────
validateBackupDir() {
  if [ ! -d "$BACKUP_BASE" ]; then
    log_info "Backup directory ${BACKUP_BASE} does not exist. Nothing to clean."
    exit 0
  fi
}

# ── Find and delete old backups ──────────────────────────────────────────────
cleanupOldBackups() {
  local deleted=0
  local errors=0

  log_info "Scanning ${BACKUP_BASE} for directories older than ${RETENTION_DAYS} days..."

  while IFS= read -r -d '' dir; do
    if [ -d "$dir" ]; then
      log_info "Deleting old backup: $dir"
      if rm -rf "$dir"; then
        deleted=$((deleted + 1))
      else
        log_error "Failed to delete: $dir"
        errors=$((errors + 1))
      fi
    fi
  done < <(find "$BACKUP_BASE" -mindepth 1 -maxdepth 1 -type d -mtime "+${RETENTION_DAYS}" -print0)

  if [ "$deleted" -gt 0 ]; then
    log_info "Deleted ${deleted} old backup(s)."
  else
    log_info "No backups older than ${RETENTION_DAYS} days found."
  fi

  if [ "$errors" -gt 0 ]; then
    log_error "${errors} error(s) during cleanup."
    exit 1
  fi
}

# ── Main ─────────────────────────────────────────────────────────────────────
main() {
  validateBackupDir
  cleanupOldBackups
}

main "$@"
