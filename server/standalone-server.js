/**
 * Standalone multiplayer server — run with: node server/standalone-server.js
 * Can be deployed independently of Electron.
 */

const path = require('path');
const fs = require('fs');
const { WebSocketServer } = require('ws');
const { MultiplayerServerCore } = require('../src/multiplayer/server-core');

// Load config
let config = { port: 9527, maxUsers: 50 };
const configPath = path.join(__dirname, 'config.json');
try {
  if (fs.existsSync(configPath)) {
    config = { ...config, ...JSON.parse(fs.readFileSync(configPath, 'utf-8')) };
  }
} catch (e) {
  console.warn('Failed to load config.json, using defaults:', e.message);
}

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const accountsPath = path.join(dataDir, 'users.json');

const core = new MultiplayerServerCore({ accountsPath, maxUsers: config.maxUsers });
const wss = new WebSocketServer({ port: config.port });

wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress;
  console.log(`[Server] New connection from ${ip}`);

  core.handleConnection(ws);

  ws.on('message', (data) => {
    const raw = typeof data === 'string' ? data : data.toString('utf-8');
    core.handleMessage(ws, raw);
  });

  ws.on('close', () => {
    core.handleDisconnect(ws);
  });

  ws.on('error', (err) => {
    console.warn(`[Server] WS error from ${ip}:`, err.message);
  });
});

wss.on('error', (err) => {
  console.error('[Server] Fatal error:', err.message);
  process.exit(1);
});

console.log(`[Server] Bongocat Multiplayer Server started on port ${config.port}`);
console.log(`[Server] Max users: ${config.maxUsers}`);
console.log(`[Server] Accounts file: ${accountsPath}`);

// Graceful shutdown
function shutdown() {
  console.log('\n[Server] Shutting down...');
  core.flush();
  for (const client of wss.clients) {
    try { client.close(1000, 'Server shutting down'); } catch {}
  }
  wss.close(() => {
    console.log('[Server] Stopped.');
    process.exit(0);
  });
  // Force exit after 3s
  setTimeout(() => process.exit(0), 3000);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
