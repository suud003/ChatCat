# ChatCat V2 — Pillar B 轻办公AI · 技术实现方案

> **版本**: v1.0 | **日期**: 2026-03-18 | **对应产品方案**: v2-productivity-plan.html  
> **范围**: Phase 2 (B1-B2, B4-B5 Quick Panel核心) + Phase 3 (B3 截图OCR) + Phase 5 B部分 (处理历史)

---

## 一、现状分析 & 差距识别

### 1.1 现有能力盘点

| 能力 | 现状 | 代码位置 | V2需求 |
|------|------|---------|--------|
| 全局热键 | ✅ `Ctrl+Shift+C` 已注册 (显示窗口+打开聊天) | `main.js:514-520` | **新增** 3个热键 (Space/S/Q) |
| 剪贴板监控 | ✅ 2秒轮询，纯文本 | `main.js:350-386` | 增强：图片检测 |
| AI 服务 (渲染) | ✅ OpenAI兼容API + 流式SSE + 多模型 | `chat/ai-service.js` | 复用，无需修改 |
| AI 服务 (主进程) | ✅ `electron.net.fetch()` | `skills/skill-engine.js` | 新增多模态调用 |
| 聊天UI | ✅ 完整的对话面板 + 气泡 | `chat/chat-ui.js` (28KB) | 复用气泡展示短结果 |
| 性格系统 | ✅ 4种性格 + systemPrompt构建 | `chat/personality.js` | 复用于文本处理 |
| 通知系统 | ✅ L0-L3 四级通知 | `notification-mgr.js` | 复用，剪贴板图片提醒 |
| 窗口管理 | ✅ 透明/穿透/alwaysOnTop | `main.js:91-134` | **新建** Quick Panel 独立窗口 |
| 拖拽交互 | ⚠️ 已有宠物拖拽逻辑 | `renderer.js` setupDrag | **新增** 外部文本/文件拖入 |
| 截图能力 | ❌ 不存在 | - | **新建** 截图引擎 |
| Quick Panel | ❌ 不存在 | - | **新建** 浮窗 |
| 文本处理器 | ❌ 不存在 | - | **新建** 润色/总结/解释 |

### 1.2 现有 IPC 通道可复用情况

```
可复用:
  ├── clipboard-update (主→渲): 已有，增强加入图片检测
  ├── store get/set: 已有，存取处理历史
  └── AI 调用: ai-service.js 已支持流式，可直接复用

需新增:
  ├── quick-panel-toggle: 主进程管理 QP 窗口显示/隐藏
  ├── quick-panel-request: QP渲染 → 主进程 → 主窗口渲染 (AI处理)
  ├── screenshot-capture: 截图请求 & 返回图片数据
  ├── clipboard-image-detected: 检测到剪贴板图片
  └── drag-text-received: 拖拽文本到猫窗口
```

---

## 二、模块依赖关系

### 2.1 架构总图

```
┌──────────────────────────────────────────────────────────────────┐
│                   Layer 3: 结果展示 & 交互                        │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐  │
│  │ B1: Quick Panel  │  │ B5: 拖拽到猫      │  │ 猫咪气泡(复用) │  │
│  │ (独立BrowserWin) │  │ + 结果展示        │  │ (短结果展示)   │  │
│  └────────┬─────────┘  └────────┬─────────┘  └───────┬───────┘  │
│           │                     │                     │          │
├───────────┼─────────────────────┼─────────────────────┼──────────┤
│           │         Layer 2: AI 处理                   │          │
│  ┌────────┴──────────────────────────────────────┐    │          │
│  │              B2: 文本处理器                     │    │          │
│  │  (润色/总结/解释 三模式 + Prompt模板)           │    │          │
│  └────────┬──────────────────────────────────────┘    │          │
│           │                                           │          │
│  ┌────────┴──────────────────────────────────────┐    │          │
│  │              B3: 截图OCR引擎                   │    │          │
│  │  (截图捕获 + 多模态AI → 文字+理解)             │    │          │
│  └────────┬──────────────────────────────────────┘    │          │
│           │                                           │          │
│  ┌────────┴──────────────────────────────────────┐    │          │
│  │              B4: 快捷问答                      │    │          │
│  │  (多轮对话 + 上下文 + 代码高亮)                │    │          │
│  └────────────────────────────────────────────────┘    │          │
│                                                        │          │
├────────────────────────────────────────────────────────┼──────────┤
│                   Layer 1: 输入捕获                     │          │
│  ┌──────────────────┐  ┌──────────────────┐           │          │
│  │ 全局热键 (主进程) │  │ 剪贴板图片检测    │           │          │
│  │ Ctrl+Shift+Space │  │ (主进程增强)      │           │          │
│  │ Ctrl+Shift+S     │  │                  │           │          │
│  └──────────────────┘  └──────────────────┘           │          │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 进程分工

```
主进程 (main.js / Node.js)
  ├── 全局热键注册 (globalShortcut)
  ├── Quick Panel BrowserWindow 创建与管理
  ├── 截图引擎 (desktopCapturer / nativeImage)
  ├── 剪贴板图片检测 (clipboard.readImage)
  └── 多模态AI调用 (net.fetch with base64 image)

渲染进程 - 主窗口 (renderer.js / 猫咪窗口)
  ├── 拖拽接收 (ondragover/ondrop)
  ├── 猫咪气泡展示短结果 (复用现有 showCatBubble)
  └── 操作菜单弹出 (拖入后选择 润色/总结/解释)

渲染进程 - Quick Panel (quick-panel-renderer.js)
  ├── 输入框 + 模式按钮 (润色/总结/解释/问答/截图)
  ├── 文本处理结果展示
  ├── 多轮问答历史
  └── 一键复制 / 处理历史
```

### 2.3 数据流

```
[输入触发]
  │
  ├─ 热键 Ctrl+Shift+Space → 主进程 → 打开/聚焦 Quick Panel → 自动读剪贴板
  ├─ 热键 Ctrl+Shift+S → 主进程 → 截图遮罩 → 选区 → base64 图片
  ├─ 拖拽文本到猫窗口 → 渲染进程 ondrop → 弹操作菜单
  └─ 剪贴板图片检测 → 主进程轮询 → 通知猫咪气泡 → 用户确认
       │
       ▼
[AI 处理]
  ├─ 文本输入 → B2 TextProcessor → 构建 prompt → ai-service.callAI() → 流式结果
  ├─ 图片输入 → B3 ScreenshotOCR → base64 → 多模态AI → 文字+理解
  └─ 问答输入 → B4 QuickQA → 维护对话历史 → ai-service.callAI() → 流式结果
       │
       ▼
[结果展示]
  ├─ <50字 → 猫咪气泡 (L2通知，5秒自动消失)
  ├─ 50-500字 → Quick Panel 结果区
  └─ >500字 → Quick Panel 可折叠卡片
```

---

## 三、B1: Quick Panel 浮窗

### 3.1 文件信息

| 属性 | 值 |
|------|-----|
| **主进程文件** | `src/quick-panel/quick-panel-main.js` |
| **渲染页面** | `src/quick-panel/quick-panel.html` |
| **渲染脚本** | `src/quick-panel/quick-panel-renderer.js` |
| **预加载脚本** | `src/quick-panel/quick-panel-preload.js` |
| **模块类型** | 主进程 CommonJS + 渲染进程 ES Module |
| **依赖** | Electron BrowserWindow, globalShortcut |

### 3.2 Quick Panel 窗口设计

#### 窗口规格

```javascript
// quick-panel-main.js
const { BrowserWindow, globalShortcut, screen, clipboard, nativeImage } = require('electron');

class QuickPanelManager {
  constructor(mainWindow, store) {
    this._mainWindow = mainWindow;  // 主猫咪窗口引用
    this._store = store;
    this._panelWindow = null;
    this._isVisible = false;
  }

  init() {
    this._registerShortcuts();
  }

  _createPanel() {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    
    this._panelWindow = new BrowserWindow({
      width: 420,
      height: 380,
      x: Math.round(width / 2 - 210),   // 屏幕居中
      y: Math.round(height * 0.3),       // 上方1/3位置
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      show: false,
      webPreferences: {
        preload: path.join(__dirname, 'quick-panel-preload.js'),
        contextIsolation: true,
        nodeIntegration: false
      }
    });
    
    this._panelWindow.loadFile(path.join(__dirname, 'quick-panel.html'));
    
    // 失焦自动隐藏 (可选，用户可在设置中关闭)
    this._panelWindow.on('blur', () => {
      if (this._store.get('quickPanelAutoHide', true)) {
        this.hide();
      }
    });
    
    this._panelWindow.on('closed', () => {
      this._panelWindow = null;
      this._isVisible = false;
    });
  }

  toggle() {
    if (!this._panelWindow || this._panelWindow.isDestroyed()) {
      this._createPanel();
    }
    
    if (this._isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }
  
  show() {
    if (!this._panelWindow) this._createPanel();
    
    // 读取剪贴板内容预填
    const clipText = clipboard.readText();
    const clipImage = clipboard.readImage();
    
    this._panelWindow.webContents.send('panel-show', {
      clipboardText: clipText || '',
      hasImage: !clipImage.isEmpty(),
    });
    
    this._panelWindow.show();
    this._panelWindow.focus();
    this._isVisible = true;
  }
  
  hide() {
    if (this._panelWindow && !this._panelWindow.isDestroyed()) {
      this._panelWindow.hide();
    }
    this._isVisible = false;
  }

  destroy() {
    if (this._panelWindow && !this._panelWindow.isDestroyed()) {
      this._panelWindow.destroy();
    }
    globalShortcut.unregister('CommandOrControl+Shift+Space');
    globalShortcut.unregister('CommandOrControl+Shift+S');
  }
}

module.exports = { QuickPanelManager };
```

#### 全局热键注册

```javascript
_registerShortcuts() {
  // Quick Panel 开关
  globalShortcut.register('CommandOrControl+Shift+Space', () => {
    this.toggle();
  });
  
  // 截图模式 (直接进入截图，不打开QP)
  globalShortcut.register('CommandOrControl+Shift+S', () => {
    this._startScreenshot();
  });
}
```

**注意**: 现有 `Ctrl+Shift+C` 热键保持不变 (切换聊天)。新增的热键不冲突。

### 3.3 Quick Panel HTML

```html
<!-- quick-panel.html -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'self' 'unsafe-inline';">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif;
      background: transparent;
      overflow: hidden;
    }
    
    .panel {
      width: 400px;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-radius: 16px;
      border: 1px solid rgba(0, 0, 0, 0.08);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
      padding: 16px;
      margin: 10px;
    }
    
    .panel-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      font-size: 14px;
      font-weight: 600;
      color: #6c4ab6;
      -webkit-app-region: drag;   /* 可拖拽移动 */
      cursor: grab;
    }
    
    .input-area {
      background: #f8f8fa;
      border: 1px solid #e8e8ec;
      border-radius: 10px;
      padding: 10px 12px;
      margin-bottom: 10px;
      min-height: 60px;
      max-height: 120px;
      overflow-y: auto;
      font-size: 13px;
      outline: none;
      color: #333;
    }
    .input-area:empty::before {
      content: attr(data-placeholder);
      color: #aaa;
    }
    
    .mode-buttons {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-bottom: 10px;
    }
    .mode-btn {
      background: #f5f5f7;
      border: 1px solid #e0e0e4;
      border-radius: 8px;
      padding: 5px 12px;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.15s;
      color: #555;
    }
    .mode-btn:hover { background: #eee; }
    .mode-btn.active {
      background: #6c4ab6;
      color: #fff;
      border-color: #6c4ab6;
    }
    
    .result-area {
      background: #fafbfc;
      border: 1px solid #e8e8ec;
      border-radius: 10px;
      padding: 12px;
      min-height: 80px;
      max-height: 200px;
      overflow-y: auto;
      font-size: 13px;
      line-height: 1.6;
      color: #444;
      display: none;  /* 有结果时显示 */
    }
    .result-area.visible { display: block; }
    .result-area .streaming-cursor {
      display: inline-block;
      width: 2px;
      height: 14px;
      background: #6c4ab6;
      animation: blink 0.8s infinite;
    }
    @keyframes blink { 50% { opacity: 0; } }
    
    .actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 10px;
    }
    .action-btn {
      background: #6c4ab6;
      color: #fff;
      border: none;
      border-radius: 8px;
      padding: 6px 16px;
      font-size: 12px;
      cursor: pointer;
      transition: background 0.15s;
    }
    .action-btn:hover { background: #5a3d9e; }
    .action-btn.secondary {
      background: #f0f0f3;
      color: #666;
    }
    .action-btn.secondary:hover { background: #e5e5e8; }
    
    .status-bar {
      font-size: 11px;
      color: #aaa;
    }
  </style>
</head>
<body>
  <div class="panel">
    <div class="panel-header">
      <span>🐱</span> ChatCat Quick Panel
      <span style="margin-left:auto;font-size:11px;color:#aaa;-webkit-app-region:no-drag;cursor:pointer;" id="btn-close">✕</span>
    </div>
    
    <div class="input-area" contenteditable="true" id="input-area"
         data-placeholder="输入问题或粘贴文本..."></div>
    
    <div class="mode-buttons">
      <button class="mode-btn" data-mode="ask">💬 问答</button>
      <button class="mode-btn active" data-mode="polish">✏️ 润色</button>
      <button class="mode-btn" data-mode="summarize">📋 总结</button>
      <button class="mode-btn" data-mode="explain">🔍 解释</button>
      <button class="mode-btn" data-mode="screenshot">📸 截图</button>
    </div>
    
    <div class="result-area" id="result-area"></div>
    
    <div class="actions">
      <span class="status-bar" id="status-bar">ESC 关闭 · Ctrl+Enter 发送</span>
      <div>
        <button class="action-btn secondary" id="btn-history">📋 历史</button>
        <button class="action-btn" id="btn-send">发送 ↵</button>
      </div>
    </div>
  </div>
  
  <script src="quick-panel-renderer.js" type="module"></script>
</body>
</html>
```

### 3.4 Quick Panel Preload

```javascript
// quick-panel-preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('qpAPI', {
  // 面板事件
  onPanelShow: (cb) => ipcRenderer.on('panel-show', (_, data) => cb(data)),
  
  // AI 处理请求 (通过主进程中转到主窗口的 AI 服务)
  processText: (mode, text) => ipcRenderer.invoke('qp-process-text', mode, text),
  processImage: (base64) => ipcRenderer.invoke('qp-process-image', base64),
  
  // 流式结果接收
  onStreamChunk: (cb) => ipcRenderer.on('qp-stream-chunk', (_, chunk) => cb(chunk)),
  onStreamEnd: (cb) => ipcRenderer.on('qp-stream-end', (_, result) => cb(result)),
  onStreamError: (cb) => ipcRenderer.on('qp-stream-error', (_, err) => cb(err)),
  
  // 操作
  copyToClipboard: (text) => ipcRenderer.send('qp-copy', text),
  close: () => ipcRenderer.send('qp-close'),
  startScreenshot: () => ipcRenderer.send('qp-screenshot'),
  
  // 历史记录
  getHistory: () => ipcRenderer.invoke('qp-get-history'),
  
  // 多轮问答上下文
  askQuestion: (question, history) => ipcRenderer.invoke('qp-ask', question, history),
});
```

### 3.5 Quick Panel 渲染脚本 (核心逻辑)

```javascript
// quick-panel-renderer.js

class QuickPanelUI {
  constructor() {
    this._mode = 'polish';  // 默认润色模式
    this._qaHistory = [];   // 问答历史 (最近10轮)
    this._isProcessing = false;
    
    this._inputArea = document.getElementById('input-area');
    this._resultArea = document.getElementById('result-area');
    this._statusBar = document.getElementById('status-bar');
    
    this._init();
  }
  
  _init() {
    // 面板显示时预填剪贴板
    window.qpAPI.onPanelShow((data) => {
      if (data.clipboardText && !this._inputArea.textContent.trim()) {
        this._inputArea.textContent = data.clipboardText;
      }
      this._inputArea.focus();
      // 选中全部文字方便用户直接输入覆盖
      if (this._inputArea.textContent) {
        const range = document.createRange();
        range.selectNodeContents(this._inputArea);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }
    });
    
    // 模式切换
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._mode = btn.dataset.mode;
        
        if (this._mode === 'screenshot') {
          window.qpAPI.startScreenshot();
        }
      });
    });
    
    // 发送按钮
    document.getElementById('btn-send').addEventListener('click', () => this._send());
    
    // 关闭按钮
    document.getElementById('btn-close').addEventListener('click', () => window.qpAPI.close());
    
    // 历史按钮
    document.getElementById('btn-history').addEventListener('click', () => this._showHistory());
    
    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        window.qpAPI.close();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        this._send();
      }
    });
    
    // 流式结果
    window.qpAPI.onStreamChunk((chunk) => {
      this._resultArea.classList.add('visible');
      // 追加流式内容
      const cursor = this._resultArea.querySelector('.streaming-cursor');
      if (cursor) cursor.remove();
      this._resultArea.innerHTML += this._escapeHtml(chunk) + '<span class="streaming-cursor"></span>';
      this._resultArea.scrollTop = this._resultArea.scrollHeight;
    });
    
    window.qpAPI.onStreamEnd((result) => {
      const cursor = this._resultArea.querySelector('.streaming-cursor');
      if (cursor) cursor.remove();
      this._isProcessing = false;
      this._statusBar.textContent = '✅ 完成 · 点击结果可复制';
      this._addCopyHandler();
    });
    
    window.qpAPI.onStreamError((err) => {
      const cursor = this._resultArea.querySelector('.streaming-cursor');
      if (cursor) cursor.remove();
      this._resultArea.innerHTML += `<div style="color:#e53935;">❌ ${err}</div>`;
      this._isProcessing = false;
    });
  }
  
  async _send() {
    if (this._isProcessing) return;
    
    const text = this._inputArea.textContent.trim();
    if (!text && this._mode !== 'screenshot') return;
    
    this._isProcessing = true;
    this._resultArea.innerHTML = '<span class="streaming-cursor"></span>';
    this._resultArea.classList.add('visible');
    this._statusBar.textContent = '⏳ 处理中...';
    
    try {
      if (this._mode === 'ask') {
        // 问答模式：维护对话历史
        this._qaHistory.push({ role: 'user', content: text });
        if (this._qaHistory.length > 20) {
          this._qaHistory = this._qaHistory.slice(-20); // 保留最近10轮
        }
        await window.qpAPI.askQuestion(text, this._qaHistory);
      } else {
        // 文本处理模式
        await window.qpAPI.processText(this._mode, text);
      }
    } catch (err) {
      this._resultArea.innerHTML = `<div style="color:#e53935;">❌ ${err.message}</div>`;
      this._isProcessing = false;
    }
  }
  
  async _showHistory() {
    const history = await window.qpAPI.getHistory();
    // 显示最近20条处理历史的简单列表
    if (!history || history.length === 0) {
      this._resultArea.innerHTML = '<div style="color:#aaa;">暂无历史记录</div>';
      this._resultArea.classList.add('visible');
      return;
    }
    
    let html = '<div style="font-size:12px;"><strong>📋 最近处理记录</strong></div>';
    for (const item of history.slice(-10).reverse()) {
      const modeLabels = { polish: '✏️', summarize: '📋', explain: '🔍', ask: '💬', ocr: '📸' };
      const time = new Date(item.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      const preview = (item.result || '').slice(0, 60).replace(/\n/g, ' ');
      html += `<div style="margin:4px 0;padding:6px;background:#f5f5f7;border-radius:6px;font-size:11px;cursor:pointer;" data-idx="${item.timestamp}">
        ${modeLabels[item.mode] || '📝'} <span style="color:#888;">${time}</span> ${preview}...
      </div>`;
    }
    this._resultArea.innerHTML = html;
    this._resultArea.classList.add('visible');
  }
  
  _addCopyHandler() {
    this._resultArea.style.cursor = 'pointer';
    this._resultArea.onclick = () => {
      const text = this._resultArea.textContent;
      window.qpAPI.copyToClipboard(text);
      this._statusBar.textContent = '📋 已复制到剪贴板';
      setTimeout(() => {
        this._statusBar.textContent = 'ESC 关闭 · Ctrl+Enter 发送';
      }, 2000);
    };
  }
  
  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

new QuickPanelUI();
```

### 3.6 主进程 IPC 路由

在 `quick-panel-main.js` 中注册 IPC handler，将 QP 的 AI 请求路由到合适的处理模块：

```javascript
_setupIPC() {
  const { ipcMain, clipboard, nativeImage } = require('electron');
  
  // 文本处理请求 → 转发到主窗口渲染进程的 AI 服务
  ipcMain.handle('qp-process-text', async (event, mode, text) => {
    // 构建 prompt
    const prompt = this._buildPrompt(mode, text);
    
    // 通过主进程直接调用 AI API (复用 skill-engine 的模式)
    const config = {
      apiBaseUrl: this._store.get('apiBaseUrl'),
      apiKey: this._store.get('apiKey'),
      modelName: this._store.get('modelName'),
    };
    
    return this._callAIStream(config, prompt, (chunk) => {
      // 流式回传到 QP 窗口
      if (this._panelWindow && !this._panelWindow.isDestroyed()) {
        this._panelWindow.webContents.send('qp-stream-chunk', chunk);
      }
    });
  });
  
  // 问答请求
  ipcMain.handle('qp-ask', async (event, question, history) => {
    const config = {
      apiBaseUrl: this._store.get('apiBaseUrl'),
      apiKey: this._store.get('apiKey'),
      modelName: this._store.get('modelName'),
    };
    
    const messages = [
      { role: 'system', content: '你是 ChatCat 🐱，一只聪明的AI猫咪助手。简洁准确地回答用户的问题。' },
      ...history.slice(-20)  // 最近10轮
    ];
    
    return this._callAIStreamMessages(config, messages, (chunk) => {
      if (this._panelWindow && !this._panelWindow.isDestroyed()) {
        this._panelWindow.webContents.send('qp-stream-chunk', chunk);
      }
    });
  });
  
  // 复制
  ipcMain.on('qp-copy', (event, text) => {
    clipboard.writeText(text);
  });
  
  // 关闭
  ipcMain.on('qp-close', () => {
    this.hide();
  });
  
  // 截图
  ipcMain.on('qp-screenshot', () => {
    this._startScreenshot();
  });
  
  // 处理历史
  ipcMain.handle('qp-get-history', async () => {
    return this._store.get('qpHistory', []);
  });
}
```

---

## 四、B2: 文本处理器 Text Processor

### 4.1 文件信息

| 属性 | 值 |
|------|-----|
| **文件路径** | `src/quick-panel/text-processor.js` |
| **模块类型** | CommonJS (主进程，被 quick-panel-main.js 引用) |
| **依赖** | AI API 配置 (store), net.fetch |
| **消费者** | Quick Panel, 拖拽到猫 |

### 4.2 三种处理模式的 Prompt 模板

```javascript
// text-processor.js
class TextProcessor {
  constructor(store) {
    this._store = store;
  }

  buildPrompt(mode, text) {
    const templates = {
      polish: {
        system: `你是一个专业的文本润色助手。
要求：
1. 保持原意不变，提升表达质量
2. 修正语法和错别字
3. 使措辞更加专业、得体
4. 如果是中文则保持中文，如果是英文则保持英文
5. 只输出润色后的文本，不要解释`,
        user: `请润色以下文本：\n\n${text}`
      },
      
      summarize: {
        system: `你是一个专业的内容总结助手。
要求：
1. 提取核心要点，用简洁的条目列出
2. 保留关键信息，忽略细枝末节
3. 如果内容较长，分层级总结
4. 用中文输出（除非原文是英文）
5. 格式：使用 • 符号列出要点`,
        user: `请总结以下内容的核心要点：\n\n${text}`
      },
      
      explain: {
        system: `你是一个耐心的教学助手，擅长用通俗易懂的方式解释概念。
要求：
1. 先给出一句话简明解释
2. 然后用"举个例子"补充说明
3. 如果是代码，逐行注释关键逻辑
4. 如果是专业术语，类比日常概念
5. 控制在200字以内`,
        user: `请解释以下内容：\n\n${text}`
      }
    };
    
    return templates[mode] || templates.polish;
  }
  
  // AI 调用配置
  getModelConfig(mode) {
    // 润色和总结用快速模型，解释可以用稍好的模型
    return {
      temperature: mode === 'polish' ? 0.3 : mode === 'explain' ? 0.5 : 0.4,
      maxTokens: mode === 'summarize' ? 500 : 800,
    };
  }
}

module.exports = { TextProcessor };
```

### 4.3 AI 流式调用 (主进程)

```javascript
// quick-panel-main.js 中的方法
async _callAIStream(config, promptObj, onChunk) {
  const { net } = require('electron');
  
  const body = {
    model: config.modelName,
    messages: [
      { role: 'system', content: promptObj.system },
      { role: 'user', content: promptObj.user }
    ],
    stream: true,
    temperature: promptObj.temperature || 0.4,
    max_tokens: promptObj.maxTokens || 800
  };
  
  const url = `${config.apiBaseUrl}/chat/completions`;
  
  try {
    const response = await net.fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      throw new Error(`API 错误: ${response.status}`);
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResult = '';
    let buffer = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // 保留不完整的行
      
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') break;
        
        try {
          const json = JSON.parse(data);
          const chunk = json.choices?.[0]?.delta?.content;
          if (chunk) {
            fullResult += chunk;
            onChunk(chunk);
          }
        } catch (e) {
          // 忽略解析错误
        }
      }
    }
    
    // 保存到历史
    this._saveToHistory(promptObj.mode, promptObj.user, fullResult);
    
    // 通知完成
    if (this._panelWindow && !this._panelWindow.isDestroyed()) {
      this._panelWindow.webContents.send('qp-stream-end', fullResult);
    }
    
    return fullResult;
  } catch (err) {
    if (this._panelWindow && !this._panelWindow.isDestroyed()) {
      this._panelWindow.webContents.send('qp-stream-error', err.message);
    }
    throw err;
  }
}

_saveToHistory(mode, input, result) {
  const history = this._store.get('qpHistory', []);
  history.push({
    mode,
    input: input.slice(0, 200),  // 只保存前200字
    result: result.slice(0, 500), // 只保存前500字
    timestamp: Date.now()
  });
  
  // 最多保留50条
  if (history.length > 50) {
    history.splice(0, history.length - 50);
  }
  
  this._store.set('qpHistory', history);
}
```

---

## 五、B3: 截图OCR引擎

### 5.1 文件信息

| 属性 | 值 |
|------|-----|
| **文件路径** | `src/quick-panel/screenshot-ocr.js` |
| **模块类型** | CommonJS (主进程) |
| **依赖** | Electron desktopCapturer, nativeImage, BrowserWindow |
| **消费者** | Quick Panel |

### 5.2 截图流程

```
Ctrl+Shift+S
  │
  ├─→ 隐藏 Quick Panel (如果可见)
  │
  ├─→ 创建全屏半透明遮罩窗口 (overlay)
  │     ├── 鼠标拖拽选区 (crosshair cursor)
  │     ├── 实时显示选区尺寸
  │     └── ESC 取消 / 松开鼠标确认
  │
  ├─→ 使用 desktopCapturer 截取整个屏幕
  │
  ├─→ 按选区裁剪 → nativeImage → base64 PNG
  │
  ├─→ 关闭遮罩窗口
  │
  ├─→ 发送 base64 到多模态 AI
  │     └── "请识别图片中的文字内容，并简要说明图片表达的含义"
  │
  └─→ 结果显示在 Quick Panel
```

### 5.3 截图实现

```javascript
// screenshot-ocr.js
const { BrowserWindow, desktopCapturer, screen, nativeImage } = require('electron');
const path = require('path');

class ScreenshotOCR {
  constructor(store) {
    this._store = store;
    this._overlayWindow = null;
  }

  async captureScreen() {
    return new Promise(async (resolve, reject) => {
      try {
        // 1. 获取主显示器
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width, height } = primaryDisplay.size;
        const scaleFactor = primaryDisplay.scaleFactor;
        
        // 2. 先截取全屏
        const sources = await desktopCapturer.getSources({
          types: ['screen'],
          thumbnailSize: { 
            width: width * scaleFactor, 
            height: height * scaleFactor 
          }
        });
        
        if (!sources || sources.length === 0) {
          reject(new Error('无法获取屏幕截图'));
          return;
        }
        
        const fullScreenImage = sources[0].thumbnail;
        
        // 3. 创建遮罩窗口让用户选区
        this._createOverlay(fullScreenImage, scaleFactor, (region) => {
          if (!region) {
            resolve(null); // 用户取消
            return;
          }
          
          // 4. 裁剪选区
          const cropped = fullScreenImage.crop({
            x: Math.round(region.x * scaleFactor),
            y: Math.round(region.y * scaleFactor),
            width: Math.round(region.width * scaleFactor),
            height: Math.round(region.height * scaleFactor)
          });
          
          // 5. 转 base64
          const base64 = cropped.toDataURL().replace(/^data:image\/png;base64,/, '');
          resolve(base64);
        });
        
      } catch (err) {
        reject(err);
      }
    });
  }
  
  _createOverlay(screenshotImage, scaleFactor, callback) {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.size;
    
    this._overlayWindow = new BrowserWindow({
      x: primaryDisplay.bounds.x,
      y: primaryDisplay.bounds.y,
      width,
      height,
      fullscreen: true,
      frame: false,
      transparent: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      webPreferences: {
        contextIsolation: true,
        preload: path.join(__dirname, 'screenshot-preload.js')
      }
    });
    
    // 将截图作为背景传入遮罩页面
    this._overlayWindow.loadFile(path.join(__dirname, 'screenshot-overlay.html'));
    
    this._overlayWindow.webContents.on('did-finish-load', () => {
      // 传入截图的 dataURL 作为背景
      const dataUrl = screenshotImage.toDataURL();
      this._overlayWindow.webContents.send('set-screenshot', dataUrl);
    });
    
    // 接收选区结果
    const { ipcMain } = require('electron');
    
    const onRegionSelected = (event, region) => {
      ipcMain.removeListener('screenshot-region', onRegionSelected);
      ipcMain.removeListener('screenshot-cancel', onCancel);
      this._destroyOverlay();
      callback(region);
    };
    
    const onCancel = () => {
      ipcMain.removeListener('screenshot-region', onRegionSelected);
      ipcMain.removeListener('screenshot-cancel', onCancel);
      this._destroyOverlay();
      callback(null);
    };
    
    ipcMain.on('screenshot-region', onRegionSelected);
    ipcMain.on('screenshot-cancel', onCancel);
  }
  
  _destroyOverlay() {
    if (this._overlayWindow && !this._overlayWindow.isDestroyed()) {
      this._overlayWindow.destroy();
    }
    this._overlayWindow = null;
  }
  
  // 多模态 AI 调用
  async processImage(base64, config) {
    const { net } = require('electron');
    
    const messages = [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: '请识别图片中的所有文字内容，然后简要说明图片表达的含义。如果有代码，请保留代码格式。如果有表格，请用Markdown表格还原。'
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/png;base64,${base64}`,
              detail: 'high'
            }
          }
        ]
      }
    ];
    
    const url = `${config.apiBaseUrl}/chat/completions`;
    const visionModel = config.visionModel || config.modelName;
    
    const response = await net.fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: visionModel,
        messages,
        max_tokens: 2000,
        temperature: 0.2
      })
    });
    
    if (!response.ok) {
      throw new Error(`Vision API 错误: ${response.status}`);
    }
    
    const json = await response.json();
    return json.choices?.[0]?.message?.content || '无法识别图片内容';
  }
}

module.exports = { ScreenshotOCR };
```

### 5.4 截图遮罩页面 (概要)

```html
<!-- screenshot-overlay.html -->
<!-- 全屏遮罩 + 鼠标拖拽选区 -->
<!-- 功能: 显示截图背景 + 半透明遮罩 + 拖拽选区高亮 + ESC取消 -->
```

选区交互逻辑：
- 背景：截图的 dataURL
- 遮罩：`rgba(0, 0, 0, 0.3)` 半透明
- 选区：`border: 2px dashed #82aaff` 虚线框，选区内显示清晰原图
- 右下角显示选区尺寸 `120 × 80`
- 鼠标样式：crosshair
- ESC 取消，松开鼠标确认

### 5.5 剪贴板图片检测 (main.js 增强)

```javascript
// main.js 修改：剪贴板轮询增强
let lastClipboardImageHash = '';

function startClipboardPolling() {
  setInterval(() => {
    // 现有：文本检测 (保持不变)
    const text = clipboard.readText();
    // ... 现有逻辑 ...
    
    // V2 新增：图片检测
    const image = clipboard.readImage();
    if (!image.isEmpty()) {
      const imageHash = image.toDataURL().slice(0, 100); // 用前100字符作为简单hash
      if (imageHash !== lastClipboardImageHash) {
        lastClipboardImageHash = imageHash;
        // 通知渲染进程（猫咪提示）
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('clipboard-image-detected', {
            width: image.getSize().width,
            height: image.getSize().height,
            timestamp: Date.now()
          });
        }
      }
    }
  }, 2000);
}
```

渲染进程收到 `clipboard-image-detected` 后，使用现有通知系统弹出 L2 气泡：

```
🐱「检测到图片，要我看看吗？」
[识别] [忽略]
```

用户点击"识别"→ 通过 IPC 将 `clipboard.readImage()` 的 base64 发送给 B3 OCR 引擎。

---

## 六、B4: 快捷问答 Quick Q&A

### 6.1 设计决策

B4 **不创建新文件**，而是复用 Quick Panel 的问答模式。核心逻辑已内嵌在 B1 Quick Panel 中：

- 模式按钮切换到 `💬 问答`
- 维护 `_qaHistory[]` 对话历史 (最近10轮 = 20条 messages)
- 通过 `qpAPI.askQuestion(question, history)` 调用
- 结果流式显示在 QP 结果区

### 6.2 上下文感知

问答模式可选附带上下文信息：

```javascript
// quick-panel-main.js
ipcMain.handle('qp-ask', async (event, question, history) => {
  const messages = [
    { 
      role: 'system', 
      content: `你是 ChatCat 🐱，一只聪明的AI猫咪助手。
简洁准确地回答用户的问题。
如果用户的问题涉及编程，给出代码示例。
回答控制在300字以内，除非用户要求详细解释。`
    },
    ...history.slice(-20)
  ];
  
  return this._callAIStreamMessages(config, messages, onChunk);
});
```

### 6.3 代码高亮

QP 渲染脚本中对结果进行简单的代码块识别和高亮：

```javascript
_formatResult(text) {
  // 识别 ```code``` 块
  return text.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
    return `<pre style="background:#1e1e2e;color:#e0e0e0;padding:10px;border-radius:8px;font-family:monospace;font-size:12px;overflow-x:auto;margin:8px 0;">${this._escapeHtml(code)}</pre>`;
  });
}
```

---

## 七、B5: 拖拽到猫 + 结果展示

### 7.1 实现位置

不创建新文件，在 `renderer.js` 中增加拖拽监听逻辑。

### 7.2 拖拽接收

```javascript
// renderer.js 中新增 (在 init() 的 UI 设置部分)
function setupDragReceive() {
  const catContainer = document.getElementById('character-container');
  
  // 允许拖入
  catContainer.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    catContainer.classList.add('drag-hover'); // 高亮效果
  });
  
  catContainer.addEventListener('dragleave', () => {
    catContainer.classList.remove('drag-hover');
  });
  
  catContainer.addEventListener('drop', async (e) => {
    e.preventDefault();
    catContainer.classList.remove('drag-hover');
    
    // 获取拖入内容
    let content = '';
    let type = 'text';
    
    // 纯文本
    if (e.dataTransfer.getData('text/plain')) {
      content = e.dataTransfer.getData('text/plain');
      type = 'text';
    }
    // 文件
    else if (e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('text/') || /\.(txt|md|js|py|html|css|json|ts)$/i.test(file.name)) {
        content = await file.text();
        type = 'file';
      } else {
        showCatBubble('🐱 暂时只能处理文本文件哦～');
        return;
      }
    }
    
    if (!content.trim()) return;
    
    // 弹出操作菜单
    showDragActionMenu(content, type);
  });
}

function showDragActionMenu(content, type) {
  // 在猫咪旁边显示操作菜单
  const menu = document.createElement('div');
  menu.className = 'drag-action-menu';
  menu.innerHTML = `
    <div class="dam-title">🐱 要我怎么处理？</div>
    <button class="dam-btn" data-action="polish">✏️ 润色</button>
    <button class="dam-btn" data-action="summarize">📋 总结</button>
    <button class="dam-btn" data-action="explain">🔍 解释</button>
    <button class="dam-btn dam-cancel">取消</button>
  `;
  
  document.body.appendChild(menu);
  
  // 按钮事件
  menu.querySelectorAll('.dam-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const action = btn.dataset.action;
      menu.remove();
      
      if (!action) return; // 取消
      
      // 通过 IPC 发给主进程处理
      showCatBubble('🐱 处理中...');
      const result = await window.electronAPI.qpProcessText(action, content);
      
      // 根据结果长度选择展示方式
      displayResult(result, action);
    });
  });
  
  // 3秒后自动关闭
  setTimeout(() => {
    if (menu.parentNode) menu.remove();
  }, 10000);
}

function displayResult(result, mode) {
  if (!result) return;
  
  const length = result.length;
  
  if (length < 50) {
    // 短结果：猫咪气泡
    showCatBubble(`${result}`);
  } else if (length < 500) {
    // 中等结果：L2 通知气泡
    showNotification({
      level: 'L2',
      title: { polish: '✏️ 润色结果', summarize: '📋 总结', explain: '🔍 解释' }[mode],
      message: result,
      actions: [{ label: '📋 复制', callback: () => navigator.clipboard.writeText(result) }]
    });
  } else {
    // 长结果：打开 Quick Panel 显示
    window.electronAPI.send('qp-show-result', { mode, result });
  }
}
```

### 7.3 CSS 新增

```css
/* 拖拽高亮效果 */
#character-container.drag-hover {
  filter: brightness(1.2);
  transition: filter 0.2s;
}

/* 操作菜单 */
.drag-action-menu {
  position: fixed;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(16px);
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  z-index: 9999;
  animation: fadeInUp 0.2s ease;
}
.dam-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #333;
}
.dam-btn {
  display: block;
  width: 100%;
  text-align: left;
  background: #f5f5f7;
  border: none;
  border-radius: 8px;
  padding: 8px 12px;
  margin: 4px 0;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s;
}
.dam-btn:hover { background: #e8e8eb; }
.dam-cancel { color: #888; }
```

---

## 八、preload.js 修改

### 8.1 新增暴露 API

在现有 `preload.js` 中追加：

```javascript
// V2 Pillar B 新增
// 剪贴板图片检测事件
onClipboardImageDetected: (cb) => ipcRenderer.on('clipboard-image-detected', (_, data) => cb(data)),

// 拖拽文本处理 (借助主进程的 QP AI 调用)
qpProcessText: (mode, text) => ipcRenderer.invoke('qp-process-text', mode, text),

// Quick Panel 显示结果 (从渲染进程触发打开QP并显示)
qpShowResult: (data) => ipcRenderer.send('qp-show-result', data),
```

---

## 九、main.js 修改

### 9.1 集成 Quick Panel Manager

```javascript
// main.js 修改 (在 app.whenReady 中)

const { QuickPanelManager } = require('./src/quick-panel/quick-panel-main');

app.whenReady().then(async () => {
  // ... 现有初始化 ...
  
  // V2: Quick Panel
  const quickPanelManager = new QuickPanelManager(mainWindow, store);
  quickPanelManager.init();
  
  // 现有热键调整: 保持 Ctrl+Shift+C 不变
  // 新增热键在 QuickPanelManager 中注册
  
  // ... 继续现有初始化 ...
});
```

### 9.2 热键冲突处理

| 热键 | 现有功能 | V2变化 |
|------|---------|--------|
| `Ctrl+Shift+C` | 显示窗口+打开聊天 | **保持不变** |
| `Ctrl+Shift+Space` | 无 | **新增** Quick Panel 开关 |
| `Ctrl+Shift+S` | 无 | **新增** 截图OCR |

**无冲突**。新增热键使用之前未占用的组合键。

---

## 十、Phase 5 B部分: 处理历史面板

### 10.1 处理历史存储

所有通过 Quick Panel 处理的结果自动保存到 `qpHistory`：

```javascript
// 数据结构
{
  mode: 'polish' | 'summarize' | 'explain' | 'ask' | 'ocr',
  input: string,      // 输入文本 (前200字)
  result: string,     // 结果 (前500字)
  timestamp: number,  // 时间戳
  inputType: 'text' | 'image' | 'drag'  // 输入来源
}
```

### 10.2 历史面板

历史面板集成在 Quick Panel 中（点击 📋 历史 按钮），展示最近50条记录：

- 按时间倒序
- 显示模式图标 + 时间 + 结果预览
- 点击条目恢复完整结果
- 一键复制
- 清空历史

### 10.3 反馈闭环 (Phase 5)

在 Quick Panel 结果区底部增加反馈按钮：

```
[👍 有用]  [👎 不好]  [🔄 重试]
```

- 👍/👎 记录到 `qpFeedback` store，用于后续优化 prompt
- 🔄 重新发送同样的请求

---

## 十一、存储设计

### 11.1 新增 Store Keys

| Key | 数据格式 | 大小估算 | 生命周期 |
|-----|---------|---------|---------|
| `qpHistory` | `Array<ProcessRecord>` | ~50KB (50条) | 用户手动清理 |
| `qpFeedback` | `Array<{ mode, rating, timestamp }>` | ~2KB | 永久 |
| `quickPanelAutoHide` | `boolean` | 1B | 永久 |
| `qpLastMode` | `string` | ~10B | 永久 |

### 11.2 清理策略

- `qpHistory`: 超过50条时自动裁剪旧记录
- 无定期清理任务，数据量可控

---

## 十二、性能考量

### 12.1 Quick Panel 窗口

**问题**: 额外创建一个 BrowserWindow 增加内存开销。

**缓解**:
1. **延迟创建**: 首次热键时才创建，之后复用 (show/hide)
2. **轻量页面**: QP 页面极简，无 Canvas、无大型框架
3. **内存估算**: 一个空 BrowserWindow ≈ 30-50MB，QP 内容简单 ≈ 额外 5-10MB

### 12.2 截图引擎

**问题**: `desktopCapturer.getSources()` 是同步阻塞的高开销操作。

**缓解**:
1. 仅在用户主动触发时执行
2. 截图后立即释放 bitmap 资源
3. 遮罩窗口关闭后立即 destroy

### 12.3 AI 调用频率

**问题**: 用户可能频繁使用文本处理。

**缓解**:
1. 流式输出减少等待感知
2. 使用快速/便宜模型 (配置中可选)
3. QP 中加入节流：处理中时禁止重复发送

### 12.4 剪贴板图片检测

**问题**: `clipboard.readImage()` 每2秒调用一次，有一定开销。

**缓解**:
1. 先 `readImage().isEmpty()` 快速判断，为空则跳过
2. hash 对比避免重复通知
3. 可在设置中关闭图片检测

---

## 十三、测试策略

### 13.1 单元测试

| 模块 | 测试重点 |
|------|---------|
| TextProcessor | 三种模式 prompt 构建正确性；特殊字符处理 |
| ScreenshotOCR | 图片裁剪准确性；base64 编码正确；空图片处理 |
| QuickPanelManager | 创建/显示/隐藏生命周期；热键注册/注销；IPC 路由 |

### 13.2 集成测试

| 场景 | 验证点 |
|------|-------|
| Ctrl+Shift+Space 打开QP | QP 窗口出现，自动读取剪贴板文本 |
| 润色模式处理文本 | AI 返回润色结果，流式显示 |
| 总结长文本 | 返回条目式摘要 |
| 问答多轮对话 | 历史正确维护，上下文连贯 |
| Ctrl+Shift+S 截图 | 遮罩出现，选区裁剪正确，OCR 返回文字 |
| 拖拽文本到猫 | 操作菜单出现，选择模式后正确处理 |
| 剪贴板图片检测 | 复制图片后猫咪提示，点击识别后 OCR |
| ESC 关闭 QP | 窗口隐藏（不销毁） |

---

## 十四、实施计划

### Phase 2: 轻办公AI核心 (B1 + B2 + B4 + B5)

| 步骤 | 工作项 | 预估 | 依赖 |
|------|--------|------|------|
| 2.1 | 新建 `quick-panel-main.js` (窗口管理+热键+IPC) | 4h | 无 |
| 2.2 | 新建 `quick-panel.html` + CSS | 2h | 无 |
| 2.3 | 新建 `quick-panel-preload.js` | 0.5h | 2.1 |
| 2.4 | 新建 `quick-panel-renderer.js` (UI交互+流式显示) | 3h | 2.2, 2.3 |
| 2.5 | 新建 `text-processor.js` (三模式 Prompt) | 2h | 无 |
| 2.6 | AI 流式调用实现 (主进程 net.fetch SSE) | 3h | 2.1, 2.5 |
| 2.7 | 修改 `main.js` 集成 QuickPanelManager | 1h | 2.1-2.6 |
| 2.8 | 修改 `preload.js` 新增 API | 0.5h | 2.7 |
| 2.9 | 修改 `renderer.js` 拖拽接收 + 结果展示 | 3h | 2.7 |
| 2.10 | 修改 `styles.css` 拖拽菜单样式 | 0.5h | 2.9 |
| 2.11 | 问答多轮历史 + 处理历史面板 | 2h | 2.4 |
| 2.12 | 联调测试 | 2h | 2.1-2.11 |
| | **Phase 2 合计** | **~23.5h** | |

### Phase 3: 截图OCR (B3)

| 步骤 | 工作项 | 预估 | 依赖 |
|------|--------|------|------|
| 3.1 | 新建 `screenshot-ocr.js` (截图引擎) | 4h | Phase 2 |
| 3.2 | 新建截图遮罩页面 (overlay HTML+CSS+JS) | 3h | 无 |
| 3.3 | 新建 `screenshot-preload.js` | 0.5h | 3.2 |
| 3.4 | 多模态 AI 调用 (Vision API) | 2h | 3.1 |
| 3.5 | 修改 `main.js` 剪贴板图片检测增强 | 1h | 无 |
| 3.6 | 渲染进程剪贴板图片提醒 (猫咪气泡) | 1h | 3.5 |
| 3.7 | OCR → 文本处理串联 (识别后可继续润色/总结) | 1h | 3.4, Phase 2 |
| 3.8 | 联调测试 | 2h | 3.1-3.7 |
| | **Phase 3 合计** | **~14.5h** | |

### Phase 5 B部分: 反馈+历史

| 步骤 | 工作项 | 预估 | 依赖 |
|------|--------|------|------|
| 5.1 | 反馈按钮 + 评分记录 | 1h | Phase 2 |
| 5.2 | 处理历史面板优化 (搜索/筛选) | 2h | Phase 2 |
| | **Phase 5 B部分 合计** | **~3h** | |

### 总计

| Phase | 工时 | 新建文件 | 修改文件 |
|-------|------|---------|---------|
| Phase 2 (B1+B2+B4+B5) | ~23.5h | 5 | 4 |
| Phase 3 (B3) | ~14.5h | 4 | 1 |
| Phase 5 B部分 | ~3h | 0 | 2 |
| **合计** | **~41h** | **9** | **7** |

---

## 十五、文件清单汇总

### 新建文件 (9个)

| 文件 | 模块 | 进程 | 说明 |
|------|------|------|------|
| `src/quick-panel/quick-panel-main.js` | B1 | 主 | QP窗口管理+热键+IPC路由 |
| `src/quick-panel/quick-panel.html` | B1 | 渲染 | QP界面 |
| `src/quick-panel/quick-panel-renderer.js` | B1 | 渲染 | QP交互逻辑 |
| `src/quick-panel/quick-panel-preload.js` | B1 | 桥接 | QP预加载API |
| `src/quick-panel/text-processor.js` | B2 | 主 | 三模式Prompt模板 |
| `src/quick-panel/screenshot-ocr.js` | B3 | 主 | 截图引擎+多模态AI |
| `src/quick-panel/screenshot-overlay.html` | B3 | 渲染 | 截图遮罩页面 |
| `src/quick-panel/screenshot-overlay.js` | B3 | 渲染 | 截图选区交互 |
| `src/quick-panel/screenshot-preload.js` | B3 | 桥接 | 截图预加载API |

### 修改文件 (5个)

| 文件 | 修改内容 |
|------|---------|
| `main.js` | 集成 QuickPanelManager (~10行) + 剪贴板图片检测增强 (~20行) |
| `preload.js` | 新增 3个 API (~6行) |
| `src/renderer.js` | 拖拽接收 setupDragReceive + 结果展示 (~60行) |
| `src/styles.css` | 拖拽菜单 `.dam-*` + 拖拽高亮 (~30行) |
| `src/index.html` | 无（QP 是独立窗口，不影响主页面） |

---

## 十六、风险 & 缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| macOS 截图权限 | 用户未授权屏幕录制权限导致截图失败 | 首次截图时检测权限，引导用户开启 |
| 热键冲突 | 与其他应用热键冲突 | 可在设置中自定义热键组合 |
| 多模态模型可用性 | 不是所有 API 都支持 Vision | 降级方案：提示用户切换到支持 Vision 的模型 |
| QP 窗口频繁创建销毁 | 内存波动 | 复用窗口 (show/hide)，不每次 create/destroy |
| 流式 SSE 解析 | 不同 API 的 SSE 格式可能有差异 | 复用现有 ai-service.js 的成熟解析逻辑 |
| 拖拽穿透 | 主窗口 ignoreMouseEvents 导致拖拽事件无法触发 | 猫咪区域动态切换 ignoreMouseEvents |

---

## 附录: 与产品方案对照表

| 产品模块 | 技术模块 | 方案覆盖 | 备注 |
|---------|---------|---------|------|
| B1 Quick Panel | QuickPanelManager + QP HTML/JS | ✅ 完整 | 独立 BrowserWindow |
| B2 文本处理器 | TextProcessor | ✅ 完整 | 三模式 Prompt |
| B3 截图OCR | ScreenshotOCR + 遮罩 | ✅ 完整 | desktopCapturer + Vision API |
| B4 快捷问答 | QP 问答模式 | ✅ 完整 | 复用QP，多轮对话 |
| B5 拖拽+结果 | renderer.js 拖拽 + 展示 | ✅ 完整 | 三级展示策略 |
| 三种交互方式 | 热键/拖拽/剪贴板 | ✅ 完整 | 全部覆盖 |
| 处理历史 | qpHistory store | ✅ 完整 | 50条滚动 |
