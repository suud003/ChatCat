/**
 * Embedded WebSocket server — runs inside Electron main process for LAN mode.
 * CommonJS module.
 */

const os = require('os');
const path = require('path');
const { MultiplayerServerCore } = require('./server-core');

let WebSocketServer;
try {
  WebSocketServer = require('ws').WebSocketServer;
} catch {
  WebSocketServer = null;
}

class EmbeddedServer {
  constructor(userDataPath) {
    this._wss = null;
    this._core = null;
    this._port = 9527;
    this._userDataPath = userDataPath || '.';
  }

  /**
   * Start the embedded WebSocket server.
   * @param {number} [port=9527]
   * @returns {Promise<{ address: string, port: number }>}
   */
  start(port = 9527) {
    if (!WebSocketServer) {
      return Promise.reject(new Error('ws module not available. Run: npm install ws'));
    }
    if (this._wss) {
      const ip = this._getLocalIP();
      return Promise.resolve({ address: `ws://${ip}:${this._port}`, port: this._port });
    }

    this._port = port;
    const accountsPath = path.join(this._userDataPath, 'mp-accounts.json');

    this._core = new MultiplayerServerCore({ accountsPath, maxUsers: 50 });

    return new Promise((resolve, reject) => {
      const wss = new WebSocketServer({ port: this._port });

      wss.on('listening', () => {
        this._wss = wss;
        this._setupHandlers();
        const ip = this._getLocalIP();
        console.log(`[EmbeddedServer] Started on ws://${ip}:${this._port}`);
        resolve({ address: `ws://${ip}:${this._port}`, port: this._port });
      });

      wss.on('error', (err) => {
        if (!this._wss) {
          // Error during startup
          this._core = null;
          reject(err);
        } else {
          console.error('[EmbeddedServer] Server error:', err.message);
        }
      });
    });
  }

  _setupHandlers() {
    if (!this._wss) return;

    this._wss.on('connection', (ws) => {
      this._core.handleConnection(ws);

      ws.on('message', (data) => {
        const raw = typeof data === 'string' ? data : data.toString('utf-8');
        this._core.handleMessage(ws, raw);
      });

      ws.on('close', () => {
        this._core.handleDisconnect(ws);
      });

      ws.on('error', (err) => {
        console.warn('[EmbeddedServer] ws error:', err.message);
      });
    });
  }

  /** Stop the embedded server */
  stop() {
    if (this._wss) {
      // Close all connections
      for (const client of this._wss.clients) {
        try { client.close(1000, 'Server shutting down'); } catch {}
      }
      this._wss.close();
      this._wss = null;
    }
    if (this._core) {
      this._core.flush();
      this._core = null;
    }
    console.log('[EmbeddedServer] Stopped');
  }

  /** Get current server address or null if not running */
  getAddress() {
    if (!this._wss) return null;
    const ip = this._getLocalIP();
    return `ws://${ip}:${this._port}`;
  }

  /** Check if running */
  get isRunning() {
    return this._wss !== null;
  }

  /** Get online user count */
  get onlineCount() {
    return this._core ? this._core.onlineCount : 0;
  }

  /** Detect best local IP address */
  _getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
    return '127.0.0.1';
  }
}

module.exports = { EmbeddedServer };
