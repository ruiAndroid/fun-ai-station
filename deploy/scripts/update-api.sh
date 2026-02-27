#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/fun-ai-station-api}"
SERVICE_NAME="${SERVICE_NAME:-fun-ai-station-api}"
SCHED_SERVICE_NAME="${SCHED_SERVICE_NAME:-fun-ai-station-scheduler}"
SCHED_LOG_DIR="${SCHED_LOG_DIR:-/data/funai/logs/fun-ai-station-scheduler}"
LONG_SCHED_SERVICE_NAME="${LONG_SCHED_SERVICE_NAME:-fun-ai-station-long-scheduler}"
LONG_SCHED_LOG_DIR="${LONG_SCHED_LOG_DIR:-/data/funai/logs/fun-ai-station-long-scheduler}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

systemd_unit_installed() {
  local unit_name="$1"

  local load_state=""
  load_state="$(systemctl show --no-pager --property=LoadState --value "${unit_name}.service" 2>/dev/null || true)"
  if [[ "$load_state" == "loaded" ]]; then
    return 0
  fi

  [[ -e "/etc/systemd/system/${unit_name}.service" ]] && return 0
  [[ -e "/run/systemd/system/${unit_name}.service" ]] && return 0
  [[ -e "/usr/lib/systemd/system/${unit_name}.service" ]] && return 0
  [[ -e "/lib/systemd/system/${unit_name}.service" ]] && return 0

  return 1
}

files_equal() {
  local a="$1"
  local b="$2"

  if command -v cmp >/dev/null 2>&1; then
    cmp -s "$a" "$b"
    return $?
  fi

  if command -v diff >/dev/null 2>&1; then
    diff -q "$a" "$b" >/dev/null 2>&1
    return $?
  fi

  return 1
}

ensure_systemd_unit() {
  local unit_name="$1"
  local unit_template="$2"
  local target_unit="/etc/systemd/system/${unit_name}.service"

  if [[ -z "$unit_name" ]]; then
    echo "[api] WARN: empty systemd unit name (skipping)"
    return 0
  fi

  # Prefer template under APP_DIR, fallback to template next to this script.
  if [[ ! -f "$unit_template" ]]; then
    unit_template="$DEPLOY_DIR/systemd/${unit_name}.service"
  fi

  if [[ ! -f "$unit_template" ]]; then
    echo "[api] WARN: systemd unit template not found (skipping install): $unit_name"
    return 0
  fi

  if [[ ! -f "$target_unit" ]] || ! files_equal "$unit_template" "$target_unit"; then
    echo "[api] install systemd unit: $unit_name"
    cp "$unit_template" "$target_unit" || {
      echo "[api] WARN: failed to copy unit to /etc/systemd/system (need root?): $unit_name"
      return 0
    }

    systemctl daemon-reload || true
  fi

  systemctl enable "$unit_name" >/dev/null 2>&1 || true
}

echo "[api] cd $APP_DIR"
cd "$APP_DIR"

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "[api] git pull"
  git pull 
else
  echo "[api] WARN: not a git repo: $APP_DIR"
fi

# Optional: keep backward compatibility with older docs/systemd comment
if [[ -f "$APP_DIR/configs/fun-ai-station-api.env" && ! -f "$APP_DIR/.env" ]]; then
  echo "[api] create .env -> configs/fun-ai-station-api.env symlink (compat)"
  ln -s "configs/fun-ai-station-api.env" "$APP_DIR/.env"
fi

if [[ ! -d "$APP_DIR/.venv" ]]; then
  echo "[api] create venv: $APP_DIR/.venv"
  python3 -m venv "$APP_DIR/.venv"
fi

echo "[api] pip install -r requirements.txt"
"$APP_DIR/.venv/bin/pip" install -r requirements.txt

if [[ -f "$APP_DIR/alembic.ini" ]]; then
  echo "[api] alembic upgrade head"
  "$APP_DIR/.venv/bin/alembic" upgrade head
else
  echo "[api] WARN: alembic.ini not found (skipping migrations)"
fi

echo "[api] restart systemd: $SERVICE_NAME"
systemctl restart "$SERVICE_NAME"
systemctl --no-pager --full status "$SERVICE_NAME" || true

ensure_systemd_unit "$SCHED_SERVICE_NAME" "$APP_DIR/deploy/systemd/${SCHED_SERVICE_NAME}.service"
ensure_systemd_unit "$LONG_SCHED_SERVICE_NAME" "$APP_DIR/deploy/systemd/${LONG_SCHED_SERVICE_NAME}.service"

if systemd_unit_installed "$SCHED_SERVICE_NAME"; then
  echo "[api] ensure scheduler log dir: $SCHED_LOG_DIR"
  mkdir -p "$SCHED_LOG_DIR" || true

  echo "[api] restart systemd: $SCHED_SERVICE_NAME"
  systemctl restart "$SCHED_SERVICE_NAME" || {
    echo "[api] WARN: restart failed, trying daemon-reload then restart: $SCHED_SERVICE_NAME"
    systemctl daemon-reload || true
    systemctl restart "$SCHED_SERVICE_NAME" || true
  }
  systemctl --no-pager --full status "$SCHED_SERVICE_NAME" || true
else
  echo "[api] WARN: $SCHED_SERVICE_NAME not installed (skipping restart)"
fi

if systemd_unit_installed "$LONG_SCHED_SERVICE_NAME"; then
  echo "[api] ensure long scheduler log dir: $LONG_SCHED_LOG_DIR"
  mkdir -p "$LONG_SCHED_LOG_DIR" || true

  echo "[api] restart systemd: $LONG_SCHED_SERVICE_NAME"
  systemctl restart "$LONG_SCHED_SERVICE_NAME" || {
    echo "[api] WARN: restart failed, trying daemon-reload then restart: $LONG_SCHED_SERVICE_NAME"
    systemctl daemon-reload || true
    systemctl restart "$LONG_SCHED_SERVICE_NAME" || true
  }
  systemctl --no-pager --full status "$LONG_SCHED_SERVICE_NAME" || true
else
  echo "[api] WARN: $LONG_SCHED_SERVICE_NAME not installed (skipping restart)"
fi

echo "[api] health (local): http://127.0.0.1:8001/health"
curl -fsS http://127.0.0.1:8001/health >/dev/null && echo "[api] OK" || echo "[api] WARN: health check failed"
