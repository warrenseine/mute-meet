## Mute Meet

Toggle mute/unmute in Google Meet using a global shortcut on macOS.

### Install extension

1. Open `chrome://extensions/`.
2. Enable Developer mode.
3. Click "Load unpacked" and select this folder.

Notes:
- If using the Chrome command, Chrome must be running but does not need to be focused.
- The extension targets the most recently used `meet.google.com` tab.

### Install server

Run a tiny local relay that accepts a POST and notifies the extension via WebSocket.

1. In a new terminal:
   ```bash
   ./scripts/install.sh
   ```

   Or, to run from source:
   ```bash
   npm install
   npm start
   ```
   This starts HTTP on `http://127.0.0.1:9876` and WS on `ws://127.0.0.1:9876`.

2. The extension auto-connects to the relay. To toggle from anywhere:
   ```bash
   curl -X POST http://127.0.0.1:9876/toggle
   ```

3. Bind a global hotkey using Shortcuts:
   - Create a Shortcut "Toggle Meet Mute" with action "Get Contents of URL" → Method: POST → URL: `http://127.0.0.1:9876/toggle` → no body.
   - Assign a keyboard shortcut in System Settings → Keyboard → Keyboard Shortcuts → Shortcuts.
   - Alternatively, add a Karabiner-Elements configuration file to map F5 (Microphone) to Shortcut "Toggle Meet Mute"
   ```json
   {
      "description": "Maps F5 to Shortcut",
      "manipulators": [
         {
               "from": { "key_code": "f5" },
               "to": [{ "shell_command": "shortcuts run \"Toggle Meet Mute\"" }],
               "type": "basic"
         }
      ]
   }
   ```

### Run Relay as a macOS Daemon (auto-restart)

Use `launchd` to keep the relay running and auto-restart on failure or reboot.

1. Install and start:
   ```bash
   chmod +x scripts/install.sh scripts/uninstall.sh
   ./scripts/install.sh
   ```

3. Logs:
   - `~/Library/Logs/com.mute-meet.relay/out.log`
   - `~/Library/Logs/com.mute-meet.relay/err.log`

2. Test:
   ```bash
   curl -s http://127.0.0.1:9876/healthz && echo
   curl -X POST http://127.0.0.1:9876/toggle
   ```

3. Uninstall:
   ```bash
   ./scripts/uninstall.sh
   ```

