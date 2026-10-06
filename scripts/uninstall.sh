#!/usr/bin/env bash
set -euo pipefail

LABEL="com.mute-meet.relay"
PLIST="$HOME/Library/LaunchAgents/${LABEL}.plist"
BIN_FILE_PATH="$HOME/.local/bin/mute-meet"
LEGACY_FILE_PATH="$HOME/.local/dist/mute-meet.cjs"

echo "Stopping ${LABEL} if running..."
launchctl bootout "gui/$(id -u)/${LABEL}" >/dev/null 2>&1 || launchctl unload -w "$PLIST" >/dev/null 2>&1 || true

if [[ -f "$PLIST" ]]; then
  rm -f "$PLIST"
  echo "Removed $PLIST"
else
  echo "$PLIST not found (already removed)."
fi

for FILE_PATH in "$BIN_FILE_PATH" "$LEGACY_FILE_PATH"; do
  if [[ -f "$FILE_PATH" ]]; then
    rm -f "$FILE_PATH"
    echo "Removed $FILE_PATH"
  fi
done

echo "Uninstalled ${LABEL}."


