#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

LOG_DIR="$REPO_ROOT/logs"
mkdir -p "$LOG_DIR"

STATUS_FILE="$LOG_DIR/login-setup.status"
LOG_FILE="$LOG_DIR/login-setup-$(date -Iseconds | tr ':' '-').log"
echo "START" > "$STATUS_FILE"

{
  echo "[LoginSetup] locating Chromium via puppeteer..."
  CHROME_BIN=$(node -e "console.log(require('puppeteer').executablePath())")
  if [ -z "${CHROME_BIN:-}" ] || [ ! -x "$CHROME_BIN" ]; then
    echo "[LoginSetup] Chromium not found or not executable at: $CHROME_BIN"
    echo "FAIL" > "$STATUS_FILE"
    exit 1
  fi
  echo "[LoginSetup] Chromium: $CHROME_BIN"

  PROFILE_DIR="$HOME/chrome-profile"
  mkdir -p "$PROFILE_DIR"
  echo "[LoginSetup] Profile: $PROFILE_DIR"

  echo "[LoginSetup] ensuring dependencies..."
  # For Ubuntu 24.04: libasound2t64
  if command -v apt-get >/dev/null 2>&1; then
    sudo add-apt-repository -y universe || true
    sudo apt-get update || true
    sudo apt-get install -y xvfb xauth libnss3 libatk-bridge2.0-0 libxkbcommon0 libgtk-3-0 libdrm2 libxdamage1 libgbm1 libasound2t64 || true
  fi

  echo "[LoginSetup] starting tmux session 'chrome'..."
  tmux kill-session -t chrome >/dev/null 2>&1 || true
  # Start Xvfb and Chromium inside one session
  tmux new -d -s chrome "bash -lc 'set -e; Xvfb :99 -screen 0 1280x1024x24 -nolisten tcp & export DISPLAY=:99; \"$CHROME_BIN\" --remote-debugging-address=127.0.0.1 --remote-debugging-port=9222 --user-data-dir=\"$PROFILE_DIR\" --no-first-run --no-default-browser-check --disable-dev-shm-usage --disable-gpu --no-sandbox --lang=zh-CN --window-size=1280,900'"

  echo "[LoginSetup] tmux started. Check with: tmux ls"
  echo "OK" > "$STATUS_FILE"
} >> "$LOG_FILE" 2>&1

echo "$LOG_FILE" > "$LOG_DIR/login-setup.latest"

