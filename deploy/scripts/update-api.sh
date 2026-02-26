#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/fun-ai-station-api}"
SERVICE_NAME="${SERVICE_NAME:-fun-ai-station-api}"
SCHED_SERVICE_NAME="${SCHED_SERVICE_NAME:-fun-ai-station-scheduler}"
SCHED_LOG_DIR="${SCHED_LOG_DIR:-/data/funai/logs/fun-ai-station-scheduler}"
LONG_SCHED_SERVICE_NAME="${LONG_SCHED_SERVICE_NAME:-fun-ai-station-long-scheduler}"
LONG_SCHED_LOG_DIR="${LONG_SCHED_LOG_DIR:-/data/funai/logs/fun-ai-station-long-scheduler}"

ensure_systemd_unit() {
  local unit_name="$1"
  local unit_template="$2"

  if systemctl list-unit-files | grep -q "^${unit_name}\\.service"; then
    return 0
  fi

  if [[ ! -f "$unit_template" ]]; then
    echo "[api] WARN: systemd unit template not found: $unit_template (skipping install)"
    return 0
  fi

  echo "[api] install systemd unit: $unit_name"
  cp "$unit_template" "/etc/systemd/system/${unit_name}.service" || {
    echo "[api] WARN: failed to copy unit to /etc/systemd/system (need root?): $unit_name"
    return 0
  }

  systemctl daemon-reload || true
  systemctl enable "$unit_name" || true
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

if systemctl list-unit-files | grep -q "^${SCHED_SERVICE_NAME}\\.service"; then
  echo "[api] ensure scheduler log dir: $SCHED_LOG_DIR"
  mkdir -p "$SCHED_LOG_DIR" || true

  echo "[api] restart systemd: $SCHED_SERVICE_NAME"
  systemctl restart "$SCHED_SERVICE_NAME"
  systemctl --no-pager --full status "$SCHED_SERVICE_NAME" || true
else
  echo "[api] WARN: $SCHED_SERVICE_NAME not installed (skipping restart)"
fi

if systemctl list-unit-files | grep -q "^${LONG_SCHED_SERVICE_NAME}\\.service"; then
  echo "[api] ensure long scheduler log dir: $LONG_SCHED_LOG_DIR"
  mkdir -p "$LONG_SCHED_LOG_DIR" || true

  echo "[api] restart systemd: $LONG_SCHED_SERVICE_NAME"
  systemctl restart "$LONG_SCHED_SERVICE_NAME"
  systemctl --no-pager --full status "$LONG_SCHED_SERVICE_NAME" || true
else
  echo "[api] WARN: $LONG_SCHED_SERVICE_NAME not installed (skipping restart)"
fi

echo "[api] health (local): http://127.0.0.1:8001/health"
curl -fsS http://127.0.0.1:8001/health >/dev/null && echo "[api] OK" || echo "[api] WARN: health check failed"
