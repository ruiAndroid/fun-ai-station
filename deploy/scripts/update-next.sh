#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/fun-ai-station}"
SERVICE_NAME="${SERVICE_NAME:-fun-ai-station}"

echo "[next] cd $APP_DIR"
cd "$APP_DIR"

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "[next] git pull"
  git pull
else
  echo "[next] WARN: not a git repo: $APP_DIR"
fi



if [[ -f package-lock.json ]]; then
  echo "[next] npm ci"
  npm ci
else
  echo "[next] npm install"
  npm install
fi

echo "[next] npm run build"
npm run build

echo "[next] restart systemd: $SERVICE_NAME"
systemctl restart "$SERVICE_NAME"
systemctl --no-pager --full status "$SERVICE_NAME" || true

echo "[next] health (local): http://127.0.0.1:3000/"
curl -fsS http://127.0.0.1:3000/ >/dev/null && echo "[next] OK" || echo "[next] WARN: health check failed"

