/**
 * Connection / Login UI — renders into Fun panel "联机" tab.
 *
 * KEY DESIGN:  "登录" and "连接" are SEPARATE concepts.
 *   - 登录 (Login) = local identity, persists across server switches.
 *     Once logged in, tabs stay unlocked. Only "登出" resets to login screen.
 *   - 连接 (Connect) = network connection to a specific server.
 *     Can freely connect/disconnect/switch servers without affecting login state.
 *
 * ES module for renderer process.
 */

import { sha256 } from './mp-client.js';

export class ConnectionUI {
  /**
   * @param {import('./mp-client.js').MultiplayerClient} client
   */
  constructor(client) {
    this._client = client;
    this._container = document.getElementById('tab-fun-connection');
    this._loginScreen = document.getElementById('fun-login-screen');

    // Local login state — independent of server connection
    this._loggedIn = false;
    this._loggedInUsername = '';

    // Callback for cat size change
    this.onCatSizeChange = null;

    if (!this._container) return;

    this._render();
    this._bindEvents();
    this._bindClientCallbacks();
  }

  _render() {
    this._container.innerHTML = `
      <div class="mp-connection">
        <div class="mp-status-row">
          <span class="mp-status-dot mp-dot-disconnected" id="mp-status-dot"></span>
          <span id="mp-status-text">未连接</span>
        </div>

        <!-- Mode switch -->
        <div class="mp-mode-switch">
          <label><input type="radio" name="mp-mode" value="lan" checked> LAN 内嵌</label>
          <label><input type="radio" name="mp-mode" value="external"> 外部服务器</label>
        </div>

        <!-- LAN controls -->
        <div id="mp-lan-controls" class="mp-section hidden">
          <div class="mp-row">
            <button id="mp-lan-toggle" class="mp-btn mp-btn-primary">启动服务器</button>
          </div>
          <div id="mp-lan-info" class="mp-info hidden">
            <span id="mp-lan-address">-</span>
            <button id="mp-lan-copy" class="mp-btn-small" title="复制地址">📋</button>
          </div>
        </div>

        <!-- Connect to friend -->
        <div id="mp-friend-connect" class="mp-section">
          <div class="mp-section-label">连接好友服务器</div>
          <div class="mp-row mp-friend-row">
            <input type="text" id="mp-friend-url" class="mp-input" placeholder="ws://好友IP:9527">
            <button id="mp-friend-connect-btn" class="mp-btn mp-btn-primary">连接</button>
          </div>
        </div>

        <!-- External server controls -->
        <div id="mp-external-controls" class="mp-section hidden">
          <div class="mp-row">
            <input type="text" id="mp-server-url" class="mp-input" placeholder="ws://192.168.1.100:9527">
          </div>
        </div>

        <!-- Connected info (shown when connected to a server) -->
        <div id="mp-connected-info" class="mp-section hidden">
          <div class="mp-user-info">
            <span class="mp-user-label">已连接:</span>
            <span id="mp-current-user" class="mp-user-name">-</span>
          </div>
        </div>

        <!-- Room controls (shown when authenticated) -->
        <div id="mp-room-section" class="mp-section hidden">
          <div class="mp-section-label">房间</div>
          <div id="mp-room-no-room">
            <div class="mp-row">
              <button id="mp-room-create-btn" class="mp-btn mp-btn-primary mp-btn-full">创建房间</button>
            </div>
            <div class="mp-row mp-room-join-row">
              <input type="text" id="mp-room-code-input" class="mp-input" placeholder="输入房间码" maxlength="6">
              <button id="mp-room-join-btn" class="mp-btn mp-btn-primary">加入</button>
            </div>
          </div>
          <div id="mp-room-in-room" class="hidden">
            <div class="mp-room-code-display">
              <span class="mp-room-code-label">房间码:</span>
              <span id="mp-room-code-value" class="mp-room-code">------</span>
              <button id="mp-room-copy-btn" class="mp-btn-small" title="复制房间码">📋</button>
            </div>
            <div id="mp-room-members" class="mp-room-members"></div>
            <div class="mp-row" style="margin-top: 6px;">
              <button id="mp-room-leave-btn" class="mp-btn mp-btn-danger mp-btn-full">离开房间</button>
            </div>
          </div>
        </div>

        <!-- Logout button (always visible when logged in) -->
        <div id="mp-logout-section" class="mp-section hidden">
          <button id="mp-logout-btn" class="mp-btn mp-btn-small mp-btn-muted">登出账号</button>
        </div>

        <!-- Cat size selector (always visible when logged in) -->
        <div id="mp-cat-size-section" class="mp-section hidden">
          <div class="mp-section-label">猫猫大小</div>
          <div class="mp-size-switch">
            <label><input type="radio" name="mp-cat-size" value="small"> 小</label>
            <label><input type="radio" name="mp-cat-size" value="medium" checked> 中</label>
            <label><input type="radio" name="mp-cat-size" value="large"> 大</label>
          </div>
        </div>
      </div>
    `;
  }

  // ─── Tab lock / unlock ─────────────────────────────────

  unlockTabs() {
    this._loginScreen?.classList.add('hidden');
    const tabsBar = document.getElementById('fun-panel-tabs');
    tabsBar?.classList.remove('hidden');
    const funHeader = document.getElementById('fun-bubble-header');
    const funBody = document.getElementById('fun-body');
    if (funHeader && funBody) {
      funHeader.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
      funBody.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
      const charTab = funHeader.querySelector('.panel-tab[data-tab="fun-character"]');
      const charContent = document.getElementById('tab-fun-character');
      if (charTab) charTab.classList.add('active');
      if (charContent) charContent.classList.add('active');
    }
  }

  lockTabs() {
    this._loginScreen?.classList.remove('hidden');
    const tabsBar = document.getElementById('fun-panel-tabs');
    tabsBar?.classList.add('hidden');
    const funBody = document.getElementById('fun-body');
    if (funBody) {
      funBody.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
    }
    const funHeader = document.getElementById('fun-bubble-header');
    if (funHeader) {
      funHeader.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
    }
  }

  // ─── Local login state management ─────────────────────

  /** Mark the user as locally logged in — tabs stay unlocked */
  _setLoggedIn(username) {
    this._loggedIn = true;
    this._loggedInUsername = username;
    this.unlockTabs();
    this._updateConnectionUI();
  }

  /** Full logout — clear credentials, lock tabs, go back to login screen */
  _doLogout() {
    this._loggedIn = false;
    this._loggedInUsername = '';
    this._client.disconnect();
    this._client.setCredentials('', '');
    this._client._saveCredentials = false;
    window.electronAPI?.mpSaveCredentials({ username: '', token: '' });
    window.electronAPI?.setStore('mpAutoLogin', false);
    window.electronAPI?.setStore('mpOfflineUsername', '');
    this.lockTabs();
    this._updateConnectionUI();
  }

  // ─── Events ─────────────────────────────────────────────

  _bindEvents() {
    // Mode switch
    this._container.querySelectorAll('input[name="mp-mode"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        const mode = e.target.value;
        this._setMode(mode);
        window.electronAPI?.setStore('mpMode', mode);
      });
    });

    // LAN toggle
    this._container.querySelector('#mp-lan-toggle')?.addEventListener('click', () => this._toggleLanServer());

    // Copy LAN address
    this._container.querySelector('#mp-lan-copy')?.addEventListener('click', () => {
      const addr = this._container.querySelector('#mp-lan-address')?.textContent;
      if (addr && addr !== '-') {
        navigator.clipboard.writeText(addr);
      }
    });

    // Connect to friend (toggle: connect / disconnect)
    this._container.querySelector('#mp-friend-connect-btn')?.addEventListener('click', () => {
      if (this._client.isConnected || this._client.isAuthenticated) {
        this._client.disconnect();
      } else {
        this._connectToFriend();
      }
    });
    this._container.querySelector('#mp-friend-url')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._connectToFriend();
    });

    // Logout (full reset)
    this._container.querySelector('#mp-logout-btn')?.addEventListener('click', () => {
      this._doLogout();
    });

    // Cat size selector
    this._container.querySelectorAll('input[name="mp-cat-size"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        const size = e.target.value;
        window.electronAPI?.setStore('mpCatSize', size);
        this.onCatSizeChange?.(size);
      });
    });

    // Room: create
    this._container.querySelector('#mp-room-create-btn')?.addEventListener('click', () => this._createRoom());
    // Room: join
    this._container.querySelector('#mp-room-join-btn')?.addEventListener('click', () => this._joinRoom());
    this._container.querySelector('#mp-room-code-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._joinRoom();
    });
    // Room: copy code
    this._container.querySelector('#mp-room-copy-btn')?.addEventListener('click', () => {
      const code = this._container.querySelector('#mp-room-code-value')?.textContent;
      if (code && code !== '------') navigator.clipboard.writeText(code);
    });
    // Room: leave
    this._container.querySelector('#mp-room-leave-btn')?.addEventListener('click', () => this._leaveRoom());

    // ─── Login screen events ────────────────────────────
    if (this._loginScreen) {
      // "进入" — offline or online depending on server field
      this._loginScreen.querySelector('#fun-login-btn')?.addEventListener('click', () => this._doEnter());
      this._loginScreen.querySelector('#fun-login-username')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this._doEnter();
      });
      this._loginScreen.querySelector('#fun-login-password')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this._doEnter();
      });

      // Toggle server section visibility
      this._loginScreen.querySelector('#fun-toggle-server-btn')?.addEventListener('click', () => {
        const section = this._loginScreen.querySelector('#fun-login-server-section');
        const btn = this._loginScreen.querySelector('#fun-toggle-server-btn');
        if (section?.classList.contains('hidden')) {
          section.classList.remove('hidden');
          btn.textContent = '联机登录 ▾';
        } else {
          section?.classList.add('hidden');
          btn.textContent = '联机登录 ▸';
        }
      });

      // Register
      this._loginScreen.querySelector('#fun-register-btn')?.addEventListener('click', () => this._doRegister());
    }
  }

  _bindClientCallbacks() {
    const prevConnected = this._client.onConnected;
    const prevDisconnected = this._client.onDisconnected;
    const prevAuthResult = this._client.onAuthResult;
    const prevConnectionFailed = this._client.onConnectionFailed;

    this._client.onConnected = () => {
      prevConnected?.();
      this._clearConnectionError();
      const connectBtn = this._container.querySelector('#mp-friend-connect-btn');
      if (connectBtn) { connectBtn.textContent = '连接'; connectBtn.disabled = false; }
      this._updateConnectionUI();

      // If offline user connects to a server, auto-auth with local identity
      if (this._loggedIn && this._loggedInUsername && !this._client._token) {
        this._autoAuthForOfflineUser();
      }
    };

    this._client.onDisconnected = () => {
      prevDisconnected?.();
      // DON'T touch login state — just update connection status display
      this._updateConnectionUI();
    };

    this._client.onConnectionFailed = (info) => {
      prevConnectionFailed?.(info);
      this._showConnectionError(info.reason || '连接失败');
      this._updateConnectionUI();
    };

    this._client.onAuthResult = (result) => {
      prevAuthResult?.(result);
      const errEl = this._loginScreen?.querySelector('#fun-login-error');
      const successEl = this._loginScreen?.querySelector('#fun-login-success');

      if (result.success && result.registered) {
        // Registration success — stay on login screen
        if (errEl) { errEl.textContent = ''; errEl.classList.add('hidden'); }
        if (successEl) {
          successEl.textContent = '注册成功！请点击「登录」进入';
          successEl.classList.remove('hidden');
        }
        const pwInput = this._loginScreen?.querySelector('#fun-login-password');
        if (pwInput) pwInput.focus();
      } else if (result.success) {
        // Login success — mark as locally logged in
        successEl?.classList.add('hidden');
        errEl?.classList.add('hidden');
        this._setLoggedIn(result.username || this._client.username);
      } else {
        successEl?.classList.add('hidden');
        if (errEl) {
          errEl.textContent = result.reason || '认证失败';
          errEl.classList.remove('hidden');
        }
      }
    };

    // Room callbacks
    const prevRoomCreated = this._client.onRoomCreated;
    this._client.onRoomCreated = (data) => {
      prevRoomCreated?.(data);
      this._showInRoom(data.code, data.members);
    };
    const prevRoomJoined = this._client.onRoomJoined;
    this._client.onRoomJoined = (data) => {
      prevRoomJoined?.(data);
      this._showInRoom(data.code, data.members);
    };
    const prevRoomLeft = this._client.onRoomLeft;
    this._client.onRoomLeft = (data) => {
      prevRoomLeft?.(data);
      this._showNoRoom();
    };
    const prevRoomDestroyed = this._client.onRoomDestroyed;
    this._client.onRoomDestroyed = (data) => {
      prevRoomDestroyed?.(data);
      this._showNoRoom();
      this._showRoomError('房间已解散');
    };
    const prevRoomError = this._client.onRoomError;
    this._client.onRoomError = (data) => {
      prevRoomError?.(data);
      const reasonMap = {
        INVALID_CODE: '房间码不存在',
        ROOM_FULL: '房间已满',
        ALREADY_IN_ROOM: '你已在房间中',
        MAX_ROOMS_REACHED: '服务器房间已满',
        NOT_IN_ROOM: '你不在任何房间中',
        NOT_AUTHENTICATED: '未登录',
      };
      this._showRoomError(reasonMap[data.reason] || data.reason);
    };
    const prevRoomMemberJoined = this._client.onRoomMemberJoined;
    this._client.onRoomMemberJoined = (data) => {
      prevRoomMemberJoined?.(data);
      this._updateMemberList();
    };
    const prevRoomMemberLeft = this._client.onRoomMemberLeft;
    this._client.onRoomMemberLeft = (data) => {
      prevRoomMemberLeft?.(data);
      this._updateMemberList();
    };
  }

  _setMode(mode) {
    const lanControls = this._container.querySelector('#mp-lan-controls');
    const extControls = this._container.querySelector('#mp-external-controls');
    const friendConnect = this._container.querySelector('#mp-friend-connect');
    if (mode === 'lan') {
      lanControls?.classList.remove('hidden');
      friendConnect?.classList.remove('hidden');
      extControls?.classList.add('hidden');
    } else {
      lanControls?.classList.add('hidden');
      friendConnect?.classList.add('hidden');
      extControls?.classList.remove('hidden');
    }
  }

  async _connectToFriend() {
    const urlInput = this._container.querySelector('#mp-friend-url');
    const connectBtn = this._container.querySelector('#mp-friend-connect-btn');
    let url = urlInput?.value?.trim();
    if (!url) return;

    if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
      url = 'ws://' + url;
    }
    if (url.match(/^wss?:\/\/[^:\/]+$/)) {
      url += ':9527';
    }

    urlInput.value = url;
    await window.electronAPI?.setStore('mpFriendUrl', url);

    // Show connecting state
    if (connectBtn) { connectBtn.textContent = '连接中...'; connectBtn.disabled = true; }
    this._clearConnectionError();

    const dot = this._container.querySelector('#mp-status-dot');
    const text = this._container.querySelector('#mp-status-text');
    if (dot) {
      dot.className = 'mp-status-dot mp-dot-connecting';
      text.textContent = `正在连接 ${url}...`;
    }

    this._client.connect(url);
  }

  async _toggleLanServer() {
    const btn = this._container.querySelector('#mp-lan-toggle');
    const info = this._container.querySelector('#mp-lan-info');
    const addrEl = this._container.querySelector('#mp-lan-address');

    const status = await window.electronAPI.mpGetServerStatus();

    if (status.running) {
      if (this._client.isConnected || this._client.state === 'authenticated') {
        const confirmed = await this._showInlineConfirm(
          '⚠️ 停止服务器将断开所有连接。'
        );
        if (!confirmed) return;
      }
      this._client.disconnect();
      await new Promise(r => setTimeout(r, 100));
      await window.electronAPI.mpStopServer();
      btn.textContent = '启动服务器';
      btn.classList.remove('mp-btn-danger');
      btn.classList.add('mp-btn-primary');
      info?.classList.add('hidden');
      this._clearInlineConfirm();
      this._updateConnectionUI();
    } else {
      const result = await window.electronAPI.mpStartServer();
      if (result.success) {
        btn.textContent = '停止服务器';
        btn.classList.remove('mp-btn-primary');
        btn.classList.add('mp-btn-danger');
        if (addrEl) addrEl.textContent = result.address;
        info?.classList.remove('hidden');
        // Connect locally via 127.0.0.1 (the LAN address may not be reachable from self)
        const localAddr = result.address.replace(/\/\/[^:]+:/, '//127.0.0.1:');
        this._client.connect(localAddr);
      } else {
        this._showConnectionError('启动失败: ' + (result.error || '未知错误'));
      }
    }
  }

  /**
   * "进入" button — if server address is filled, do online login.
   * If empty, just enter offline mode with the username.
   */
  async _doEnter() {
    const username = this._loginScreen?.querySelector('#fun-login-username')?.value?.trim();
    const errEl = this._loginScreen?.querySelector('#fun-login-error');

    if (!username) {
      if (errEl) { errEl.textContent = '请输入用户名'; errEl.classList.remove('hidden'); }
      return;
    }
    if (username.length < 2) {
      if (errEl) { errEl.textContent = '用户名至少2个字符'; errEl.classList.remove('hidden'); }
      return;
    }

    errEl?.classList.add('hidden');
    this._loginScreen?.querySelector('#fun-login-success')?.classList.add('hidden');

    const serverUrl = this._resolveServerUrl();

    if (serverUrl) {
      // ── Online mode: connect to server and authenticate ──
      const password = this._loginScreen?.querySelector('#fun-login-password')?.value;
      if (!password) {
        if (errEl) { errEl.textContent = '联机模式需要输入密码'; errEl.classList.remove('hidden'); }
        return;
      }
      if (password.length < 4) {
        if (errEl) { errEl.textContent = '密码至少4个字符'; errEl.classList.remove('hidden'); }
        return;
      }

      const autoLogin = this._loginScreen?.querySelector('#fun-auto-login')?.checked || false;
      this._client._saveCredentials = autoLogin;
      await window.electronAPI?.setStore('mpAutoLogin', autoLogin);
      await window.electronAPI?.setStore('mpLoginServer', serverUrl);

      this._client.setCredentials('', '');
      if (!autoLogin) {
        await window.electronAPI?.mpSaveCredentials({ username: '', token: '' });
      }

      if (!this._client.isConnected) {
        await this._ensureConnected();
        if (!this._client.isConnected) return;
      }

      const hash = await sha256(password);
      this._client.login(username, hash);
      // _setLoggedIn will be called from onAuthResult callback
    } else {
      // ── Offline mode: just enter with username, no server needed ──
      await window.electronAPI?.setStore('mpOfflineUsername', username);
      this._client._username = username;
      this._setLoggedIn(username);
    }
  }

  async _doRegister() {
    const username = this._loginScreen?.querySelector('#fun-login-username')?.value?.trim();
    const password = this._loginScreen?.querySelector('#fun-login-password')?.value;
    const errEl = this._loginScreen?.querySelector('#fun-login-error');

    if (!username) {
      if (errEl) { errEl.textContent = '请输入用户名'; errEl.classList.remove('hidden'); }
      return;
    }
    if (!password) {
      if (errEl) { errEl.textContent = '请输入密码'; errEl.classList.remove('hidden'); }
      return;
    }
    if (username.length < 2) {
      if (errEl) { errEl.textContent = '用户名至少2个字符'; errEl.classList.remove('hidden'); }
      return;
    }
    if (password.length < 4) {
      if (errEl) { errEl.textContent = '密码至少4个字符'; errEl.classList.remove('hidden'); }
      return;
    }

    errEl?.classList.add('hidden');
    this._loginScreen?.querySelector('#fun-login-success')?.classList.add('hidden');

    const serverUrl = this._resolveServerUrl();
    if (!serverUrl) {
      if (errEl) { errEl.textContent = '注册需要填写服务器地址'; errEl.classList.remove('hidden'); }
      return;
    }

    this._client.setCredentials('', '');
    await window.electronAPI?.setStore('mpLoginServer', serverUrl);

    if (!this._client.isConnected) {
      await this._ensureConnected();
      if (!this._client.isConnected) return;
    }

    const hash = await sha256(password);
    this._client.register(username, hash);
  }

  /**
   * Resolve server URL from login screen input.
   * Empty = start local LAN server. Otherwise treat as remote address.
   */
  _resolveServerUrl() {
    const serverInput = this._loginScreen?.querySelector('#fun-login-server');
    let url = serverInput?.value?.trim() || '';
    if (!url) return ''; // empty = use local LAN
    if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
      url = 'ws://' + url;
    }
    if (url.match(/^wss?:\/\/[^:\/]+$/)) {
      url += ':9527';
    }
    // Write normalized value back
    if (serverInput) serverInput.value = url;
    return url;
  }

  async _ensureConnected() {
    const remoteUrl = this._resolveServerUrl();

    if (remoteUrl) {
      this._client.connect(remoteUrl);
    } else {
      const status = await window.electronAPI.mpGetServerStatus();
      if (status.running) {
        this._client.connect(status.address);
      } else {
        const errEl = this._loginScreen?.querySelector('#fun-login-error');
        if (errEl) {
          errEl.textContent = '请输入服务器地址，或进入后手动启动本地服务器';
          errEl.classList.remove('hidden');
        }
        return;
      }
    }

    // Wait up to 8s for connection, checking every 200ms
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 200));
      if (this._client.isConnected) return;
    }

    // Timed out
    if (!this._client.isConnected) {
      const errEl = this._loginScreen?.querySelector('#fun-login-error');
      if (errEl) {
        errEl.textContent = '连接超时，请检查服务器地址是否正确';
        errEl.classList.remove('hidden');
      }
    }
  }

  /**
   * Update connection-related UI only.
   * NEVER touches login state or locks/unlocks tabs.
   */
  _updateConnectionUI() {
    const dot = this._container.querySelector('#mp-status-dot');
    const text = this._container.querySelector('#mp-status-text');
    const connectedInfo = this._container.querySelector('#mp-connected-info');
    const currentUser = this._container.querySelector('#mp-current-user');
    const logoutSection = this._container.querySelector('#mp-logout-section');
    const lanControls = this._container.querySelector('#mp-lan-controls');
    const connectBtn = this._container.querySelector('#mp-friend-connect-btn');
    const friendUrl = this._container.querySelector('#mp-friend-url');
    const mode = this._container.querySelector('input[name="mp-mode"]:checked')?.value || 'lan';

    const state = this._client.state;
    const isOnline = state === 'authenticated' || state === 'connected';

    // Status dot and text
    if (dot) {
      dot.className = 'mp-status-dot';
      if (state === 'authenticated') {
        dot.classList.add('mp-dot-connected');
        text.textContent = `已连接 - ${this._client.username}`;
      } else if (state === 'connected') {
        dot.classList.add('mp-dot-connected');
        text.textContent = `已连接服务器 - ${this._loggedInUsername || '未认证'}`;
      } else if (state === 'connecting') {
        dot.classList.add('mp-dot-connecting');
        text.textContent = '连接中...';
      } else if (this._loggedIn) {
        dot.classList.add('mp-dot-disconnected');
        text.textContent = `未连接服务器 - ${this._loggedInUsername}`;
      } else {
        dot.classList.add('mp-dot-disconnected');
        text.textContent = '未连接';
      }
    }

    // Toggle connect button between connect / disconnect
    if (connectBtn) {
      if (isOnline) {
        connectBtn.textContent = '断开连接';
        connectBtn.classList.remove('mp-btn-primary');
        connectBtn.classList.add('mp-btn-danger');
        connectBtn.disabled = false;
        if (friendUrl) friendUrl.disabled = true;
      } else {
        connectBtn.textContent = '连接';
        connectBtn.classList.remove('mp-btn-danger');
        connectBtn.classList.add('mp-btn-primary');
        connectBtn.disabled = false;
        if (friendUrl) friendUrl.disabled = false;
      }
    }

    // Connected info — show when authenticated on a server
    if (state === 'authenticated') {
      connectedInfo?.classList.remove('hidden');
      if (currentUser) currentUser.textContent = this._client.username;
    } else {
      connectedInfo?.classList.add('hidden');
    }

    // LAN controls — show when logged in and in LAN mode
    if (this._loggedIn && mode === 'lan' && lanControls) {
      lanControls.classList.remove('hidden');
      this._refreshLanStatus();
    } else if (lanControls) {
      lanControls.classList.add('hidden');
    }

    // Logout button — show when logged in
    if (this._loggedIn) {
      logoutSection?.classList.remove('hidden');
    } else {
      logoutSection?.classList.add('hidden');
    }

    // Cat size section — show when logged in
    const catSizeSection = this._container.querySelector('#mp-cat-size-section');
    if (this._loggedIn && catSizeSection) {
      catSizeSection.classList.remove('hidden');
    } else if (catSizeSection) {
      catSizeSection.classList.add('hidden');
    }

    // Room section — show when authenticated
    const roomSection = this._container.querySelector('#mp-room-section');
    if (state === 'authenticated' && roomSection) {
      roomSection.classList.remove('hidden');
    } else if (roomSection) {
      roomSection.classList.add('hidden');
    }
  }

  /** Initialize from saved settings */
  async initFromSaved() {
    const mode = await window.electronAPI.getStore('mpMode') || 'lan';
    const radio = this._container.querySelector(`input[name="mp-mode"][value="${mode}"]`);
    if (radio) radio.checked = true;
    this._setMode(mode);

    const autoLogin = await window.electronAPI.getStore('mpAutoLogin') || false;
    const autoLoginCheck = this._loginScreen?.querySelector('#fun-auto-login');
    if (autoLoginCheck) autoLoginCheck.checked = autoLogin;

    // Restore server address on login screen
    const savedServer = await window.electronAPI.getStore('mpLoginServer') || '';
    const serverInput = this._loginScreen?.querySelector('#fun-login-server');
    if (serverInput && savedServer) serverInput.value = savedServer;

    // Check for saved offline username — auto-enter
    const offlineUsername = await window.electronAPI.getStore('mpOfflineUsername') || '';

    const creds = await window.electronAPI.mpGetCredentials();

    if (autoLogin && creds.username && creds.token && savedServer) {
      // Online auto-login
      const usernameInput = this._loginScreen?.querySelector('#fun-login-username');
      if (usernameInput) usernameInput.value = creds.username;
      this._client._saveCredentials = true;
      this._client.setCredentials(creds.username, creds.token);
      await this._ensureConnected();
    } else if (offlineUsername) {
      // Offline auto-enter — restore previous session
      const usernameInput = this._loginScreen?.querySelector('#fun-login-username');
      if (usernameInput) usernameInput.value = offlineUsername;
      this._client._username = offlineUsername;
      // If we have saved credentials (from a previous online session), pre-set them
      // so that when user later connects to a server, token-based auto-login works
      if (creds.username && creds.token) {
        this._client._saveCredentials = true;
        this._client.setCredentials(creds.username, creds.token);
      }
      this._setLoggedIn(offlineUsername);
    } else if (creds.username) {
      // Just fill in the username field
      const usernameInput = this._loginScreen?.querySelector('#fun-login-username');
      if (usernameInput) usernameInput.value = creds.username;
    }

    const url = await window.electronAPI.getStore('mpExternalUrl') || '';
    const urlInput = this._container.querySelector('#mp-server-url');
    if (urlInput && url) urlInput.value = url;

    const friendUrl = await window.electronAPI.getStore('mpFriendUrl') || '';
    const friendInput = this._container.querySelector('#mp-friend-url');
    if (friendInput && friendUrl) friendInput.value = friendUrl;

    const status = await window.electronAPI.mpGetServerStatus();
    if (status.running) {
      this._refreshLanStatus();
    }

    // Restore cat size preference
    const savedSize = await window.electronAPI.getStore('mpCatSize') || 'medium';
    const sizeRadio = this._container.querySelector(`input[name="mp-cat-size"][value="${savedSize}"]`);
    if (sizeRadio) sizeRadio.checked = true;
    this.onCatSizeChange?.(savedSize);
  }

  async _refreshLanStatus() {
    const btn = this._container.querySelector('#mp-lan-toggle');
    const info = this._container.querySelector('#mp-lan-info');
    const addrEl = this._container.querySelector('#mp-lan-address');
    const status = await window.electronAPI.mpGetServerStatus();
    if (status.running) {
      if (btn) {
        btn.textContent = '停止服务器';
        btn.classList.remove('mp-btn-primary');
        btn.classList.add('mp-btn-danger');
      }
      if (addrEl) addrEl.textContent = status.address;
      info?.classList.remove('hidden');
    } else {
      if (btn) {
        btn.textContent = '启动服务器';
        btn.classList.remove('mp-btn-danger');
        btn.classList.add('mp-btn-primary');
      }
      info?.classList.add('hidden');
    }
  }

  /**
   * Auto-auth an offline user when they connect to a server.
   * Uses username + a fixed local password to register (if new) or login.
   */
  async _autoAuthForOfflineUser() {
    const username = this._loggedInUsername;
    if (!username) return;
    // Use a deterministic password so the same offline user always gets the same account
    const localPassword = `chatcat_local_${username}_2024`;
    const hash = await sha256(localPassword);

    // Try login first; if it fails with "user not found", auto-register
    const prevAuthResult = this._client.onAuthResult;
    this._client.onAuthResult = (result) => {
      if (result.success && result.registered) {
        // Registration succeeded — now login
        this._client.onAuthResult = prevAuthResult;
        this._client.login(username, hash);
      } else if (result.success) {
        // Login succeeded
        this._client.onAuthResult = prevAuthResult;
        prevAuthResult?.(result);
      } else {
        // Login failed (user not found) — try register
        if (result.reason && (result.reason.includes('不存在') || result.reason.includes('not found') || result.reason.includes('Invalid'))) {
          this._client.register(username, hash);
        } else {
          // Some other error — restore and report
          this._client.onAuthResult = prevAuthResult;
          prevAuthResult?.(result);
        }
      }
    };

    this._client.login(username, hash);
  }

  _showInlineConfirm(message) {
    this._clearInlineConfirm();
    return new Promise((resolve) => {
      const banner = document.createElement('div');
      banner.className = 'mp-inline-confirm';
      banner.innerHTML = `
        <div class="mp-inline-confirm-msg">${message}</div>
        <div class="mp-inline-confirm-btns">
          <button class="mp-btn mp-btn-small" data-action="cancel">取消</button>
          <button class="mp-btn mp-btn-small mp-btn-danger" data-action="ok">确定停止</button>
        </div>
      `;
      this._container.querySelector('.mp-connection')?.appendChild(banner);

      const cleanup = (result) => {
        banner.remove();
        resolve(result);
      };

      banner.querySelector('[data-action="cancel"]').addEventListener('click', () => cleanup(false));
      banner.querySelector('[data-action="ok"]').addEventListener('click', () => cleanup(true));
    });
  }

  _clearInlineConfirm() {
    this._container.querySelector('.mp-inline-confirm')?.remove();
  }

  // ─── Connection error display ──────────────────────────

  _showConnectionError(message) {
    this._clearConnectionError();
    const connectBtn = this._container.querySelector('#mp-friend-connect-btn');
    if (connectBtn) { connectBtn.textContent = '连接'; connectBtn.disabled = false; }

    const banner = document.createElement('div');
    banner.className = 'mp-connection-error';
    banner.innerHTML = `
      <span class="mp-error-icon">⚠️</span>
      <span class="mp-error-text">${message}</span>
      <button class="mp-error-close" title="关闭">✕</button>
    `;
    banner.querySelector('.mp-error-close')?.addEventListener('click', () => banner.remove());
    this._container.querySelector('.mp-connection')?.appendChild(banner);
    setTimeout(() => banner.remove(), 10000);
  }

  _clearConnectionError() {
    this._container.querySelectorAll('.mp-connection-error').forEach(el => el.remove());
  }

  // ─── Room UI ────────────────────────────────────────

  _showNoRoom() {
    this._container.querySelector('#mp-room-section')?.classList.remove('hidden');
    this._container.querySelector('#mp-room-no-room')?.classList.remove('hidden');
    this._container.querySelector('#mp-room-in-room')?.classList.add('hidden');
  }

  _showInRoom(code, members) {
    this._container.querySelector('#mp-room-section')?.classList.remove('hidden');
    this._container.querySelector('#mp-room-no-room')?.classList.add('hidden');
    this._container.querySelector('#mp-room-in-room')?.classList.remove('hidden');
    const codeEl = this._container.querySelector('#mp-room-code-value');
    if (codeEl) codeEl.textContent = code;
    this._renderMemberList(members);
  }

  _showRoomError(reason) {
    let errEl = this._container.querySelector('#mp-room-error');
    if (!errEl) {
      errEl = document.createElement('div');
      errEl.id = 'mp-room-error';
      errEl.className = 'mp-error';
      const roomSection = this._container.querySelector('#mp-room-section');
      roomSection?.prepend(errEl);
    }
    errEl.textContent = reason;
    errEl.classList.remove('hidden');
    clearTimeout(this._roomErrorTimer);
    this._roomErrorTimer = setTimeout(() => errEl.classList.add('hidden'), 3000);
  }

  _renderMemberList(members) {
    const container = this._container.querySelector('#mp-room-members');
    if (!container) return;
    container.innerHTML = members.map(m =>
      `<div class="mp-room-member">${m.username}</div>`
    ).join('');
  }

  _updateMemberList() {
    // The member list is updated via onRoomJoined/onRoomMemberJoined/onRoomMemberLeft
    // For dynamic updates, we rely on the server sending updated member lists
    // when members join/leave. The actual data comes through the callback chain.
  }

  async _createRoom() {
    try {
      await this._client.createRoom();
    } catch (err) {
      this._showRoomError(err.message);
    }
  }

  async _joinRoom() {
    const codeInput = this._container.querySelector('#mp-room-code-input');
    const code = codeInput?.value?.trim();
    if (!code) { this._showRoomError('请输入房间码'); return; }
    try {
      await this._client.joinRoom(code);
      if (codeInput) codeInput.value = '';
    } catch (err) {
      this._showRoomError(err.message);
    }
  }

  async _leaveRoom() {
    try {
      await this._client.leaveRoom();
    } catch (err) {
      this._showRoomError(err.message);
    }
  }
}
