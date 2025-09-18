#!/usr/bin/env bash
set -euo pipefail

LABEL="com.mute-meet.relay"
PLIST="$HOME/Library/LaunchAgents/${LABEL}.plist"
DIST_PATH="$HOME/.local/dist"
DIST_FILE="mute-meet.cjs"
LOG_DIR="$HOME/Library/Logs/com.mute-meet.relay"

if [[ ! -f "dist/$DIST_FILE" ]]; then
  mkdir -p dist

  echo "Installing dependencies..."
  npm install >/dev/null

  echo "Building $DIST_FILE..."
  npm run build >/dev/null
fi

mkdir -p "$LOG_DIR"
mkdir -p "$DIST_PATH"

cp "dist/$DIST_FILE" "$DIST_PATH/$DIST_FILE"
echo "Installed: $DIST_PATH/$DIST_FILE"

cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>node</string>
    <string>${DIST_PATH}/${DIST_FILE}</string>
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

