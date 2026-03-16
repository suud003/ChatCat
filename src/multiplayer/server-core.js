/**
 * Multiplayer server core — handles auth, state sync, leaderboard.
 * CommonJS module, shared between embedded-server and standalone-server.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { C2S, S2C, encode, decode, STATE_FIELDS } = require('./protocol');

let bcrypt;
try {
  bcrypt = require('bcryptjs');
} catch {
  // Fallback: if bcryptjs not installed, use simple SHA-256 comparison
  bcrypt = null;
}

class MultiplayerServerCore {
  /**
   * @param {object} opts
   * @param {string} opts.accountsPath — path to JSON file storing user accounts
   * @param {number} [opts.maxUsers=50]
   */
  constructor(opts = {}) {
    this.accountsPath = opts.accountsPath || path.join(__dirname, 'accounts.json');
    this.maxUsers = opts.maxUsers || 50;

    // ws → { userId, username, state, token }
    this.clients = new Map();

    // userId → account data (in-memory cache)
    this._accounts = {};
    this._loadAccounts();
  }

  /* -------------------------------------------------------------- */
  /*  Account persistence                                           */
  /* -------------------------------------------------------------- */

  _loadAccounts() {
    try {
      if (fs.existsSync(this.accountsPath)) {
        const raw = fs.readFileSync(this.accountsPath, 'utf-8');
        this._accounts = JSON.parse(raw);
      }
    } catch (e) {
      console.warn('[ServerCore] Failed to load accounts:', e.message);
      this._accounts = {};
    }
  }

  _saveAccounts() {
    try {
      const dir = path.dirname(this.accountsPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.accountsPath, JSON.stringify(this._accounts, null, 2), 'utf-8');
    } catch (e) {
      console.warn('[ServerCore] Failed to save accounts:', e.message);
    }
  }

  /* -------------------------------------------------------------- */
  /*  Connection lifecycle                                          */
  /* -------------------------------------------------------------- */

  handleConnection(ws) {
    // ws is not yet authenticated; just wait for messages
  }

  handleMessage(ws, raw) {
    const msg = decode(raw);
    if (!msg) return;

    switch (msg.type) {
      case C2S.AUTH_REGISTER:
        this._handleRegister(ws, msg);
        break;
      case C2S.AUTH_LOGIN:
        this._handleLogin(ws, msg);
        break;
      case C2S.STATE_UPDATE:
        this._handleStateUpdate(ws, msg);
        break;
      case C2S.LEADERBOARD_REQ:
        this._handleLeaderboardRequest(ws, msg);
        break;
      case C2S.ACTION:
        this._handleAction(ws, msg);
        break;
    }
  }

  handleDisconnect(ws) {
    const client = this.clients.get(ws);
    if (client) {
      this.clients.delete(ws);
      this._broadcast(encode(S2C.USER_LEFT, { userId: client.userId }));
      console.log(`[ServerCore] User left: ${client.username} (${client.userId})`);
    }
  }

  /* -------------------------------------------------------------- */
  /*  Auth                                                          */
  /* -------------------------------------------------------------- */

  async _handleRegister(ws, msg) {
    const { username, passwordHash } = msg;

    if (!username || !passwordHash || username.length < 2 || username.length > 20) {
      ws.send(encode(S2C.AUTH_ERROR, { reason: '用户名需2-20个字符' }));
      return;
    }

    // Check duplicate username
    const existing = Object.values(this._accounts).find(a => a.username === username);
    if (existing) {
      ws.send(encode(S2C.AUTH_ERROR, { reason: '用户名已存在' }));
      return;
    }

    const userId = crypto.randomUUID();
    const token = crypto.randomBytes(32).toString('hex');

    // Hash the password (client already sent SHA-256, server does bcrypt on top)
    let storedHash;
    if (bcrypt) {
      storedHash = await bcrypt.hash(passwordHash, 10);
    } else {
      storedHash = passwordHash; // Fallback
    }

    this._accounts[userId] = {
      userId,
      username,
      passwordHash: storedHash,
      token,
      state: { level: 1, affinity: 0, rebirthCount: 0, mood: 'normal', isInFlow: false, skinId: 'bongo-classic', totalCPS: 0 },
      createdAt: Date.now()
    };
    this._saveAccounts();

    // Send register success (NOT auto-login)
    ws.send(encode(S2C.AUTH_OK, { userId, username, registered: true }));
  }

  async _handleLogin(ws, msg) {
    const { username, passwordHash, token: loginToken } = msg;

    // Find account by username
    const account = Object.values(this._accounts).find(a => a.username === username);
    if (!account) {
      ws.send(encode(S2C.AUTH_ERROR, { reason: '用户不存在' }));
      return;
    }

    // Token-based auto-login
    if (loginToken && account.token === loginToken) {
      this._authenticateClient(ws, account.userId, account.username, account.token);
      return;
    }

    // Password-based login
    if (!passwordHash) {
      ws.send(encode(S2C.AUTH_ERROR, { reason: '请提供密码' }));
      return;
    }

    let valid = false;
    if (bcrypt) {
      valid = await bcrypt.compare(passwordHash, account.passwordHash);
    } else {
      valid = passwordHash === account.passwordHash;
    }

    if (!valid) {
      ws.send(encode(S2C.AUTH_ERROR, { reason: '密码错误' }));
      return;
    }

    // Generate new token
    const newToken = crypto.randomBytes(32).toString('hex');
    account.token = newToken;
    this._saveAccounts();

    this._authenticateClient(ws, account.userId, account.username, newToken);
  }

  _authenticateClient(ws, userId, username, token) {
    // Kick existing connection with same userId
    for (const [existingWs, client] of this.clients) {
      if (client.userId === userId && existingWs !== ws) {
        existingWs.close(4001, 'Replaced by new connection');
        this.clients.delete(existingWs);
        this._broadcast(encode(S2C.USER_LEFT, { userId }));
      }
    }

    const account = this._accounts[userId];
    const state = account ? { ...account.state } : { level: 1, affinity: 0, rebirthCount: 0, mood: 'normal', isInFlow: false, skinId: 'bongo-classic', totalCPS: 0 };

    this.clients.set(ws, { userId, username, state, token });

    // Send auth success
    ws.send(encode(S2C.AUTH_OK, { userId, username, token }));

    // Send snapshot of all currently connected users (excluding self)
    const snapshot = [];
    for (const [otherWs, client] of this.clients) {
      if (otherWs !== ws) {
        snapshot.push({ userId: client.userId, username: client.username, state: client.state });
      }
    }
    ws.send(encode(S2C.USERS_SNAPSHOT, { users: snapshot }));

    // Broadcast join to others
    this._broadcastExcept(ws, encode(S2C.USER_JOINED, { userId, username, state }));

    console.log(`[ServerCore] User joined: ${username} (${userId}), online: ${this.clients.size}`);
  }

  /* -------------------------------------------------------------- */
  /*  State sync                                                    */
  /* -------------------------------------------------------------- */

  _handleStateUpdate(ws, msg) {
    const client = this.clients.get(ws);
    if (!client) return;

    // Merge incoming state fields
    let changed = false;
    for (const key of STATE_FIELDS) {
      if (msg[key] !== undefined && msg[key] !== client.state[key]) {
        client.state[key] = msg[key];
        changed = true;
      }
    }

    if (!changed) return;

    // Persist to account
    if (this._accounts[client.userId]) {
      this._accounts[client.userId].state = { ...client.state };
      this._debouncedSaveAccounts();
    }

    // Broadcast state change to others
    const stateMsg = { userId: client.userId };
    for (const key of STATE_FIELDS) {
      if (msg[key] !== undefined) stateMsg[key] = msg[key];
    }
    this._broadcastExcept(ws, encode(S2C.USER_STATE, stateMsg));
  }

  /* -------------------------------------------------------------- */
  /*  Actions (typing / click) — real-time broadcast                */
  /* -------------------------------------------------------------- */

  _handleAction(ws, msg) {
    const client = this.clients.get(ws);
    if (!client) return;
    const { actionType } = msg;
    if (actionType !== 'typing' && actionType !== 'click') return;
    this._broadcastExcept(ws, encode(S2C.USER_ACTION, { userId: client.userId, actionType }));
  }

  /* -------------------------------------------------------------- */
  /*  Leaderboard                                                   */
  /* -------------------------------------------------------------- */

  _handleLeaderboardRequest(ws, msg) {
    const sortBy = msg.sortBy || 'affinity';
    const leaderboard = this.getLeaderboard(sortBy);
    ws.send(encode(S2C.LEADERBOARD_DATA, { entries: leaderboard, sortBy }));
  }

  getLeaderboard(sortBy = 'affinity') {
    const validFields = ['affinity', 'level', 'rebirthCount'];
    const field = validFields.includes(sortBy) ? sortBy : 'affinity';

    // Collect all accounts (not just online)
    const entries = Object.values(this._accounts).map(acc => {
      const isOnline = [...this.clients.values()].some(c => c.userId === acc.userId);
      return {
        userId: acc.userId,
        username: acc.username,
        level: acc.state?.level || 1,
        affinity: acc.state?.affinity || 0,
        rebirthCount: acc.state?.rebirthCount || 0,
        online: isOnline,
      };
    });

    // Sort descending
    entries.sort((a, b) => (b[field] || 0) - (a[field] || 0));

    // Add rank
    entries.forEach((e, i) => { e.rank = i + 1; });

    return entries;
  }

  /* -------------------------------------------------------------- */
  /*  Broadcasting                                                  */
  /* -------------------------------------------------------------- */

  _broadcast(data) {
    for (const [ws] of this.clients) {
      try { ws.send(data); } catch {}
    }
  }

  _broadcastExcept(exceptWs, data) {
    for (const [ws] of this.clients) {
      if (ws !== exceptWs) {
        try { ws.send(data); } catch {}
      }
    }
  }

  /* -------------------------------------------------------------- */
  /*  Debounced save                                                */
  /* -------------------------------------------------------------- */

  _debouncedSaveAccounts() {
    if (this._saveTimer) return;
    this._saveTimer = setTimeout(() => {
      this._saveTimer = null;
      this._saveAccounts();
    }, 5000);
  }

  /** Flush pending saves (call on shutdown) */
  flush() {
    if (this._saveTimer) {
      clearTimeout(this._saveTimer);
      this._saveTimer = null;
    }
    this._saveAccounts();
  }

  /** Get count of online users */
  get onlineCount() {
    return this.clients.size;
  }
}

module.exports = { MultiplayerServerCore };
