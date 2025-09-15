#!/usr/bin/env bash
set -euo pipefail

LABEL="com.mute-meet.relay"
PLIST="$HOME/Library/LaunchAgents/${LABEL}.plist"

echo "Stopping ${LABEL} if running..."
launchctl bootout "gui/$(id -u)/${LABEL}" >/dev/null 2>&1 || launchctl unload -w "$PLIST" >/dev/null 2>&1 || true

if [[ -f "$PLIST" ]]; then
  rm -f "$PLIST"
  echo "Removed $PLIST"
else
  echo "$PLIST not found (already removed)."
fi

echo "Uninstalled ${LABEL}."


