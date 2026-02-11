#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/fun-ai-station-api}"
SERVICE_NAME="${SERVICE_NAME:-fun-ai-station-api}"

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

echo "[api] health (local): http://127.0.0.1:8001/health"
curl -fsS http://127.0.0.1:8001/health >/dev/null && echo "[api] OK" || echo "[api] WARN: health check failed"

