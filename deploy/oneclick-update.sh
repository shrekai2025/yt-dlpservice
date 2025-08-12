#!/usr/bin/env bash
set -euo pipefail

# One-click update script
# - Forces local code to match remote origin/main
# - Cleans dependencies cache on demand
# - Rebuilds and restarts PM2 service

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

LOG_DIR="$REPO_ROOT/logs"
STATUS_FILE="$LOG_DIR/oneclick-update.status"
LATEST_FILE="$LOG_DIR/oneclick-update.latest"

mkdir -p "$LOG_DIR"

echo "START" > "$STATUS_FILE"

trap 'echo "FAIL" > "$STATUS_FILE"' ERR

echo "[Update] Stopping service..."
pm2 stop yt-dlpservice || true

echo "[Update] Fetching and hard resetting to origin/main..."
git fetch origin
git reset --hard origin/main
git clean -fd

echo "[Update] Installing dependencies cleanly..."
rm -rf node_modules package-lock.json || true
npm install

echo "[Update] Updating database schema..."
npx prisma db push
npx prisma generate

echo "[Update] Building application..."
npm run build

echo "[Update] Restarting service..."
pm2 restart yt-dlpservice || pm2 start ecosystem.config.cjs

echo "OK" > "$STATUS_FILE"
echo "[Update] Done."

