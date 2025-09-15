// Relay WebSocket client (single service worker)
let ws;

function connectRelay() {
  const RELAY_WS_URL = "ws://localhost:9876";

  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;

  console.log(`mute-meet: ws connect ${RELAY_WS_URL}`);

  try {
    ws = new WebSocket(RELAY_WS_URL);
  } catch (_) {
    console.warn("mute-meet: ws ctor failed, retry soon");
    setTimeout(connectRelay, 1000);
    return;
  }

  ws.addEventListener("open", () => {
    console.log("mute-meet: ws connected");
    try { ws.send(JSON.stringify({ type: "ping", ts: Date.now() })); } catch (_) { }
  });

  ws.addEventListener("message", (ev) => {
    try {
      const data = JSON.parse(ev.data);
      switch (data && data.type) {
        case "pong":
          console.log("mute-meet: pong");
          break;
        case "toggle":
          console.log("mute-meet: toggle received");
          handleToggleMute();
          break;
      }
    } catch (_) {
      console.warn("mute-meet: bad message");
    }
  });

  ws.addEventListener("close", () => {
    console.warn("mute-meet: ws closed; reconnecting");
    setTimeout(connectRelay, 1000);
  });

  ws.addEventListener("error", () => {
    console.warn("mute-meet: ws error; closing");
    try { ws.close(); } catch (_) { }
  });
}

connectRelay();

async function executeToggleMute(tabId) {
  try {
    console.log(`mute-meet: executing content script on tab ${tabId}`);
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const button = document.querySelector("button[aria-label*='turn on microphone' i]") ??
          document.querySelector("button[aria-label*='turn off microphone' i]")

        if (button) {
          button.click();
          return { ok: true };
        }

        return { ok: false, reason: "microphone button not found" };
      }
    });

    const result = results?.[0]?.result;

    if (result && result.ok) {
      console.log(`mute-meet: success on tab ${tabId}`);
    } else {
      console.warn(`mute-meet: failed on tab ${tabId} ${result && result.reason}`);
    }
  } catch (err) {
    console.error(`mute-meet: script injection error ${err && err.message ? err.message : err}`);
  }
}

async function handleToggleMute() {
  let tabs = await chrome.tabs.query({ url: "https://meet.google.com/*" });
  if (!tabs || tabs.length === 0) {
    console.warn("mute-meet: no Meet tabs found");
    return;
  }

  tabs.sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0));
  const target = tabs[0];
  if (!target || typeof target.id !== "number") {
    console.warn("mute-meet: invalid target tab");
    return;
  }

  await executeToggleMute(target.id);
}

chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-mute") {
    console.log("mute-meet: command toggle-mute");
    handleToggleMute();
  }
});

console.log("mute-meet: service worker loaded");

let heartbeatInterval;

async function runHeartbeat() {
  try {
    await chrome.storage.local.set({ 'last-heartbeat': Date.now() });
  } catch (e) {
    // ignore
  }
}

async function startHeartbeat() {
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  runHeartbeat().then(() => {
    heartbeatInterval = setInterval(runHeartbeat, 20 * 1000);
  });
  console.log('mute-meet: heartbeat started');
}

startHeartbeat();
