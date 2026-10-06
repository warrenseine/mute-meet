#!/usr/bin/env bash
set -euo pipefail

LABEL="com.mute-meet.relay"
PLIST="$HOME/Library/LaunchAgents/${LABEL}.plist"
BIN_PATH="$HOME/.local/bin"
BIN_FILE="mute-meet"
LOG_DIR="$HOME/Library/Logs/com.mute-meet.relay"

if [[ ! -f "dist/$BIN_FILE" ]]; then
  mkdir -p dist

  # Homebrew's node is built without SEA support; prefer the mise-pinned one.
  run() {
    if command -v mise >/dev/null 2>&1; then
      mise exec -- "$@"
    else
      "$@"
    fi
  }

  echo "Installing dependencies..."
  run npm install >/dev/null

  echo "Building $BIN_FILE..."
  run npm run package >/dev/null
fi

mkdir -p "$LOG_DIR"
mkdir -p "$BIN_PATH"

cp "dist/$BIN_FILE" "$BIN_PATH/$BIN_FILE"
echo "Installed: $BIN_PATH/$BIN_FILE"

cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${BIN_PATH}/${BIN_FILE}</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${HOME}</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${LOG_DIR}/out.log</string>
  <key>StandardErrorPath</key>
  <string>${LOG_DIR}/err.log</string>
</dict>
</plist>
PLIST

echo "Created: $PLIST"

if launchctl print "gui/$(id -u)/${LABEL}" >/dev/null 2>&1; then
  echo "Unloading existing service..."
  launchctl bootout "gui/$(id -u)/${LABEL}" || true
  sleep 1
  while launchctl print "gui/$(id -u)/${LABEL}" >/dev/null 2>&1; do
    sleep 0.1
  done
fi

echo "Loading service..."
if launchctl help 2>&1 | grep -q bootstrap; then
  launchctl bootstrap "gui/$(id -u)" "$PLIST"
  launchctl enable "gui/$(id -u)/${LABEL}"
  launchctl kickstart -k "gui/$(id -u)/${LABEL}"
else
  launchctl load -w "$PLIST"
fi

echo "Installed and started ${LABEL}. Logs: $LOG_DIR/out.log, $LOG_DIR/err.log"

