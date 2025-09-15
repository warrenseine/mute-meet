import http from 'http';
import { WebSocketServer } from 'ws';

process.title = 'mute-meet';
const HTTP_PORT = process.env.PORT ? Number(process.env.PORT) : 9876;

const RELAY_TOKEN = process.env.RELAY_TOKEN || '';

function nowIso() {
    return new Date().toISOString();
}

const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url && req.url.startsWith('/toggle')) {
        if (RELAY_TOKEN) {
            const provided = req.headers['authorization'] || req.headers['x-relay-token'] || '';
            const token = Array.isArray(provided) ? provided[0] : provided;
            const bearer = token.toString().startsWith('Bearer ') ? token.toString().slice(7) : token.toString();
            if (bearer !== RELAY_TOKEN) {
                console.warn(`[mute-meet ${nowIso()}] /toggle unauthorized from ${req.socket.remoteAddress || ''}`);
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'unauthorized' }));
                return;
            }
        }
        const sent = broadcast({ type: 'toggle', ts: Date.now() });
        console.log(`[mute-meet ${nowIso()}] /toggle broadcast to ${sent}/${wss.clients.size} client(s) from ${req.socket.remoteAddress || ''}`);
        res.writeHead(204);
        res.end();
        return;
    }
    if (req.method === 'GET' && req.url === '/healthz') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
        return;
    }
    if (req.method === 'GET' && req.url === '/clients') {
        const list = [];
        for (const [ws, info] of clients.entries()) {
            list.push({ id: info.id, connectedAt: info.connectedAt, lastPongAt: info.lastPongAt, readyState: ws.readyState });
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ count: list.length, clients: list }));
        return;
    }
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Mute Meet\n');
});

const wss = new WebSocketServer({ server });

const clients = new Map();
let nextClientId = 1;

function broadcast(message) {
    const data = JSON.stringify(message);
    let sent = 0;
    for (const client of wss.clients) {
        if (client.readyState === 1) {
            try {
                client.send(data);
                sent += 1;
            } catch (err) {
                console.warn(`[mute-meet ${nowIso()}] send error to client`, err && err.message ? err.message : err);
            }
        }
    }
    return sent;
}

server.on('error', (err) => {
    console.error('[mute-meet] http server error:', err);
});

wss.on('error', (err) => {
    console.error('[mute-meet] websocket server error:', err);
});

wss.on('connection', (ws, req) => {
    const id = nextClientId++;
    const info = { id, connectedAt: Date.now(), lastPongAt: Date.now() };
    clients.set(ws, info);
    ws.isAlive = true;
    console.log(`[mute-meet ${nowIso()}] ws connected id=${id} from ${req.socket.remoteAddress || ''}`);

    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data.toString());
            if (msg && msg.type === 'ping') {
                ws.send(JSON.stringify({ type: 'pong', ts: Date.now() }));
            }
        } catch (_) { }
    });

    ws.on('pong', () => {
        ws.isAlive = true;
        info.lastPongAt = Date.now();
    });
    ws.on('close', () => {
        clients.delete(ws);
        console.log(`[mute-meet ${nowIso()}] ws closed id=${id}`);
    });
    ws.on('error', (err) => {
        console.warn(`[mute-meet ${nowIso()}] ws error id=${id}:`, err && err.message ? err.message : err);
    });
});

const HEARTBEAT_MS = 30000;
const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
        if (ws.isAlive === false) {
            const info = clients.get(ws);
            console.warn(`[mute-meet ${nowIso()}] ws timeout id=${info ? info.id : '?'} closing`);
            try { ws.terminate(); } catch { }
            continue;
        }
        ws.isAlive = false;
        try { ws.ping(); } catch { }
    }
}, HEARTBEAT_MS);
heartbeat.unref?.();

server.listen(HTTP_PORT, '127.0.0.1', () => {
    console.log(`Mute Meet listening on http://127.0.0.1:${HTTP_PORT} (WS available)`);
});

function shutdown(code = 0) {
    console.log('[mute-meet] shutting down...');
    try { clearInterval(heartbeat); } catch { }
    try { wss.close(); } catch { }
    try { server.close(() => process.exit(code)); return; } catch { }
    process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
process.on('uncaughtException', (err) => {
    console.error('[mute-meet] uncaughtException:', err && err.stack ? err.stack : err);
    setTimeout(() => process.exit(1), 50);
});
process.on('unhandledRejection', (reason) => {
    console.error('[mute-meet] unhandledRejection:', reason);
    setTimeout(() => process.exit(1), 50);
});



