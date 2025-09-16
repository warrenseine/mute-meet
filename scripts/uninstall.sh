#!/usr/bin/env bash
set -euo pipefail

LABEL="com.mute-meet.relay"
PLIST="$HOME/Library/LaunchAgents/${LABEL}.plist"
DIST_PATH="$HOME/.local/dist"
DIST_FILE="mute-meet.js"
DIST_FILE_PATH="$DIST_PATH/$DIST_FILE"

echo "Stopping ${LABEL} if running..."
launchctl bootout "gui/$(id -u)/${LABEL}" >/dev/null 2>&1 || launchctl unload -w "$PLIST" >/dev/null 2>&1 || true

if [[ -f "$PLIST" ]]; then
  rm -f "$PLIST"
  echo "Removed $PLIST"
else
  echo "$PLIST not found (already removed)."
fi

if [[ -f "$DIST_FILE_PATH" ]]; then
  rm -f "$DIST_FILE_PATH"
  echo "Removed $DIST_FILE_PATH"
else
  echo "$DIST_FILE_PATH not found (already removed)."
fi

echo "Uninstalled ${LABEL}."


