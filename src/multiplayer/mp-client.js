/**
 * Multiplayer client — manages WebSocket connection to multiplayer server.
 * ES module for renderer process.
 */

// Import protocol via the CommonJS-compatible global (loaded by script tag) or inline constants
const C2S = {
  AUTH_REGISTER: 'auth:register',
  AUTH_LOGIN: 'auth:login',
  STATE_UPDATE: 'state:update',
  LEADERBOARD_REQ: 'leaderboard:request',
  ACTION: 'action',
};

const S2C = {
  AUTH_OK: 'auth:ok',
  AUTH_ERROR: 'auth:error',
  USER_JOINED: 'user:joined',
  USER_LEFT: 'user:left',
  USER_STATE: 'user:state',
  USERS_SNAPSHOT: 'users:snapshot',
  LEADERBOARD_DATA: 'leaderboard:data',
  USER_ACTION: 'user:action',
};

const STATE_FIELDS = ['level', 'affinity', 'rebirthCount', 'mood', 'isInFlow', 'skinId', 'totalCPS'];

// Rate limit: minimum interval between state updates (ms)
const STATE_UPDATE_INTERVAL = 5000;
// Periodic sync for slow-changing values
const PERIODIC_SYNC_INTERVAL = 30000;
// Reconnection config
const RECONNECT_MIN = 1000;
const RECONNECT_MAX = 30000;
// Heartbeat interval
const HEARTBEAT_INTERVAL = 30000;

export class MultiplayerClient {
  constructor() {
    this._ws = null;
    this._url = '';
    this._connected = false;
    this._authenticated = false;
    this._destroyed = false;
    this._userId = null;
    this._username = '';
    this._token = '';

    // State tracking
    this._lastSentState = {};
    this._lastSendTime = 0;
    this._pendingStateUpdate = null;
    this._stateTimer = null;
    this._periodicTimer = null;

    // Reconnection
    this._reconnectDelay = RECONNECT_MIN;
    this._reconnectTimer = null;
    this._shouldReconnect = false;

    // Heartbeat
    this._heartbeatTimer = null;

    // Auto-login save flag
    this._saveCredentials = false;

    // Switching flag — suppresses onDisconnected when reconnecting to a new server
    this._switching = false;

    // Callbacks
    this.onConnected = null;
    this.onDisconnected = null;
    this.onConnectionFailed = null; // ({ url, reason }) — called when connection attempt fails
    this.onAuthResult = null;      // ({ success, userId, username, token, reason })
    this.onUserJoined = null;      // ({ userId, username, state })
    this.onUserLeft = null;        // ({ userId })
    this.onUserState = null;       // ({ userId, ...stateFields })
    this.onUsersSnapshot = null;   // ([{ userId, username, state }])
    this.onLeaderboard = null;     // ([{ username, level, affinity, rebirthCount, rank }])
    this.onUserAction = null;      // ({ userId, actionType })
  }

  /** Current connection state: 'disconnected' | 'connecting' | 'connected' | 'authenticated' */
  get state() {
    if (this._authenticated) return 'authenticated';
    if (this._connected) return 'connected';
    if (this._ws && this._ws.readyState === WebSocket.CONNECTING) return 'connecting';
    return 'disconnected';
  }

  get userId() { return this._userId; }
  get username() { return this._username; }
  get isConnected() { return this._connected; }
  get isAuthenticated() { return this._authenticated; }

  /* ------------------------------------------------------------------ */
  /*  Connection                                                         */
  /* ------------------------------------------------------------------ */

  connect(url) {
    if (this._ws) {
      // Switching to a new server — suppress onDisconnected to avoid UI flicker
      this._switching = true;
      this.disconnect();
      this._switching = false;
    }

    this._url = url;
    this._shouldReconnect = true;
    this._reconnectDelay = RECONNECT_MIN;
    this._doConnect();
  }

  disconnect() {
    this._shouldReconnect = false;
    this._clearTimers();

    if (this._ws) {
      this._ws.onclose = null; // prevent double onDisconnected from server-side close
      try { this._ws.close(1000); } catch {}
      this._ws = null;
    }

    this._connected = false;
    this._authenticated = false;
    this._userId = null;
    // Only fire onDisconnected if not switching servers
    if (!this._switching) {
      this.onDisconnected?.();
    }
  }

  /** Permanently destroy — suppress all callbacks, used on app quit */
  destroy() {
    this._destroyed = true;
    this._shouldReconnect = false;
    this._clearTimers();
    if (this._ws) {
      this._ws.onclose = null;
      this._ws.onerror = null;
      this._ws.onmessage = null;
      try { this._ws.close(1000); } catch {}
      this._ws = null;
    }
    this._connected = false;
    this._authenticated = false;
  }

  _doConnect() {
    try {
      this._ws = new WebSocket(this._url);
    } catch (err) {
      console.warn('[MPClient] WebSocket creation failed:', err.message);
      this.onConnectionFailed?.({ url: this._url, reason: '无效的服务器地址' });
      this._scheduleReconnect();
      return;
    }

    // Connection timeout — if not connected within 8s, report failure
    this._connectTimeout = setTimeout(() => {
      if (this._ws && this._ws.readyState === WebSocket.CONNECTING) {
        console.warn('[MPClient] Connection timeout');
        this.onConnectionFailed?.({ url: this._url, reason: '连接超时，请检查IP地址和端口是否正确' });
        try { this._ws.close(); } catch {}
      }
    }, 8000);

    this._ws.onopen = () => {
      if (this._connectTimeout) { clearTimeout(this._connectTimeout); this._connectTimeout = null; }
      this._connected = true;
      this._reconnectDelay = RECONNECT_MIN;
      this._startHeartbeat();
      this.onConnected?.();

      // Auto-login with saved token
      if (this._token && this._username) {
        this._send({
          type: C2S.AUTH_LOGIN,
          username: this._username,
          token: this._token
        });
      }
    };

    this._ws.onmessage = (event) => {
      this._handleMessage(event.data);
    };

    this._ws.onclose = (event) => {
      if (this._connectTimeout) { clearTimeout(this._connectTimeout); this._connectTimeout = null; }
      if (this._destroyed) return;
      const wasConnected = this._connected;
      this._connected = false;
      this._authenticated = false;
      this._stopHeartbeat();

      if (!wasConnected) {
        // Never successfully connected — report as connection failure
        this.onConnectionFailed?.({ url: this._url, reason: '无法连接到服务器，请检查对方是否已启动服务器' });
      } else {
        this.onDisconnected?.();
      }

      // Code 4001 = replaced by new connection from same user; don't reconnect
      if (event.code === 4001) {
        this._shouldReconnect = false;
        return;
      }

      if (this._shouldReconnect) {
        this._scheduleReconnect();
      }
    };

    this._ws.onerror = (err) => {
      if (this._destroyed) return;
      console.warn('[MPClient] WebSocket error for', this._url);
    };
  }

  _scheduleReconnect() {
    if (!this._shouldReconnect || this._destroyed) return;
    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null;
      this._doConnect();
    }, this._reconnectDelay);
    this._reconnectDelay = Math.min(this._reconnectDelay * 2, RECONNECT_MAX);
  }

  /* ------------------------------------------------------------------ */
  /*  Auth                                                               */
  /* ------------------------------------------------------------------ */

  login(username, passwordHash) {
    this._username = username;
    this._send({ type: C2S.AUTH_LOGIN, username, passwordHash });
  }

  register(username, passwordHash) {
    this._username = username;
    this._send({ type: C2S.AUTH_REGISTER, username, passwordHash });
  }

  /** Set saved credentials for auto-login on reconnect */
  setCredentials(username, token) {
    this._username = username;
    this._token = token;
  }

  /* ------------------------------------------------------------------ */
  /*  State sync                                                        */
  /* ------------------------------------------------------------------ */

  /**
   * Send a state update. Diffs against last sent state and rate-limits.
   * @param {object} state - { level, affinity, rebirthCount, mood, isInFlow, skinId, totalCPS }
   * @param {boolean} [immediate=false] - bypass rate limit (for level-up, prestige)
   */
  sendStateUpdate(state, immediate = false) {
    if (!this._authenticated) return;

    // Compute diff
    const diff = {};
    let hasChanges = false;
    for (const key of STATE_FIELDS) {
      if (state[key] !== undefined && state[key] !== this._lastSentState[key]) {
        diff[key] = state[key];
        hasChanges = true;
      }
    }
    if (!hasChanges) return;

    const now = Date.now();
    if (immediate || (now - this._lastSendTime >= STATE_UPDATE_INTERVAL)) {
      this._lastSendTime = now;
      this._lastSentState = { ...this._lastSentState, ...diff };
      this._send({ type: C2S.STATE_UPDATE, ...diff });
      this._pendingStateUpdate = null;
      if (this._stateTimer) {
        clearTimeout(this._stateTimer);
        this._stateTimer = null;
      }
    } else {
      // Queue the update
      this._pendingStateUpdate = { ...this._pendingStateUpdate, ...diff };
      if (!this._stateTimer) {
        const waitTime = STATE_UPDATE_INTERVAL - (now - this._lastSendTime);
        this._stateTimer = setTimeout(() => {
          this._stateTimer = null;
          if (this._pendingStateUpdate) {
            this._lastSendTime = Date.now();
            this._lastSentState = { ...this._lastSentState, ...this._pendingStateUpdate };
            this._send({ type: C2S.STATE_UPDATE, ...this._pendingStateUpdate });
            this._pendingStateUpdate = null;
          }
        }, waitTime);
      }
    }
  }

  /** Start periodic sync for slow-changing values */
  startPeriodicSync(getStateFn) {
    this._stopPeriodicSync();
    this._periodicTimer = setInterval(() => {
      if (!this._authenticated) return;
      const state = getStateFn();
      if (state) this.sendStateUpdate(state);
    }, PERIODIC_SYNC_INTERVAL);
  }

  _stopPeriodicSync() {
    if (this._periodicTimer) {
      clearInterval(this._periodicTimer);
      this._periodicTimer = null;
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Leaderboard                                                       */
  /* ------------------------------------------------------------------ */

  requestLeaderboard(sortBy = 'affinity') {
    this._send({ type: C2S.LEADERBOARD_REQ, sortBy });
  }

  /* ------------------------------------------------------------------ */
  /*  Actions (typing / click) — real-time, no throttle                 */
  /* ------------------------------------------------------------------ */

  sendAction(actionType) {
    if (!this._authenticated) return;
    this._send({ type: C2S.ACTION, actionType });
  }

  /* ------------------------------------------------------------------ */
  /*  Message handling                                                   */
  /* ------------------------------------------------------------------ */

  _handleMessage(raw) {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    if (!msg || !msg.type) return;

    switch (msg.type) {
      case S2C.AUTH_OK:
        if (msg.registered) {
          // Registration success — don't mark as authenticated, let user login
          this.onAuthResult?.({ success: true, registered: true, username: msg.username });
        } else {
          this._authenticated = true;
          this._userId = msg.userId;
          this._username = msg.username;
          this._token = msg.token;
          // Save credentials only if auto-login is enabled
          if (this._saveCredentials) {
            window.electronAPI?.mpSaveCredentials({ username: msg.username, token: msg.token });
          }
          this.onAuthResult?.({ success: true, registered: false, userId: msg.userId, username: msg.username, token: msg.token });
        }
        break;

      case S2C.AUTH_ERROR:
        this.onAuthResult?.({ success: false, reason: msg.reason });
        break;

      case S2C.USER_JOINED:
        this.onUserJoined?.({ userId: msg.userId, username: msg.username, state: msg.state });
        break;

      case S2C.USER_LEFT:
        this.onUserLeft?.({ userId: msg.userId });
        break;

      case S2C.USER_STATE:
        this.onUserState?.(msg);
        break;

      case S2C.USERS_SNAPSHOT:
        this.onUsersSnapshot?.(msg.users || []);
        break;

      case S2C.LEADERBOARD_DATA:
        this.onLeaderboard?.({ entries: msg.entries || [], sortBy: msg.sortBy });
        break;

      case S2C.USER_ACTION:
        this.onUserAction?.({ userId: msg.userId, actionType: msg.actionType });
        break;
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Heartbeat                                                         */
  /* ------------------------------------------------------------------ */

  _startHeartbeat() {
    this._stopHeartbeat();
    this._heartbeatTimer = setInterval(() => {
      if (this._ws && this._ws.readyState === WebSocket.OPEN) {
        // WebSocket ping at protocol level — just send a small JSON
        try { this._ws.send('{"type":"ping"}'); } catch {}
      }
    }, HEARTBEAT_INTERVAL);
  }

  _stopHeartbeat() {
    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer);
      this._heartbeatTimer = null;
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Helpers                                                           */
  /* ------------------------------------------------------------------ */

  _send(obj) {
    if (this._ws && this._ws.readyState === WebSocket.OPEN) {
      this._ws.send(JSON.stringify(obj));
    }
  }

  _clearTimers() {
    this._stopHeartbeat();
    this._stopPeriodicSync();
    if (this._connectTimeout) {
      clearTimeout(this._connectTimeout);
      this._connectTimeout = null;
    }
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    if (this._stateTimer) {
      clearTimeout(this._stateTimer);
      this._stateTimer = null;
    }
  }
}

/** SHA-256 hash a string (for client-side password pre-hashing) */
export async function sha256(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
