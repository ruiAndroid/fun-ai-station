#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/fun-agent-service}"
SERVICE_NAME="${SERVICE_NAME:-fun-agent-service}"

echo "[agent-service] cd $APP_DIR"
cd "$APP_DIR"

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "[agent-service] git pull"
  git pull
else
  echo "[agent-service] WARN: not a git repo: $APP_DIR"
fi

if [[ -f package-lock.json ]]; then
  echo "[agent-service] npm ci"
  npm ci
else
  echo "[agent-service] npm install"
  npm install
fi

echo "[agent-service] restart systemd: $SERVICE_NAME"
systemctl restart "$SERVICE_NAME"
systemctl --no-pager --full status "$SERVICE_NAME" || true

echo "[agent-service] health (local): http://127.0.0.1:4010/health"
curl -fsS http://127.0.0.1:4010/health >/dev/null && echo "[agent-service] OK" || echo "[agent-service] WARN: health check failed"

