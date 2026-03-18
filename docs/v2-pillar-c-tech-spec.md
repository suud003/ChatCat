# ChatCat V2 — Pillar C 打字内容消费 · 技术实现方案

> **版本**: v1.0 | **日期**: 2026-03-18 | **对应产品方案**: v2-productivity-plan.html  
> **范围**: Phase 6 (C0-C4 全部模块) — 用户授权可选功能  
> **核心原则**: 🔐 默认关闭 · 用户知情授权 · 数据先清洗再消费

---

## 一、现状分析 & 差距识别

### 1.1 现有能力盘点

| 能力 | 现状 | 代码位置 | V2需求 |
|------|------|---------|--------|
| 键盘记录 | ✅ 完整，keycode→字符+拼音检测+文件输出 | `recorder/keyboard-recorder.js` (303行) | 增强：接入清洗管道 |
| 拼音检测 | ✅ 状态机设计，拼音/英文/取消三态 | `recorder/pinyin-detector.js` (149行) | 增强：支持更多输入法模式 |
| 文本转换 | ✅ 原始按键→可读文本 (AI) | `skills/text-converter.js` (143行) | 增强：与清洗管道串联 |
| 日报生成 | ✅ convertedText→AI日报 | `skills/daily-report.js` (135行) | 增强：增加内容维度 |
| 待办提取 | ✅ 从convertedText提取TODO | `skills/todo-extractor.js` (166行) | 增强：从分段内容提取 |
| 安全授权 | ❌ 不存在 | - | **新建** 安全协议弹窗 |
| 敏感过滤 | ❌ 不存在 | - | **新建** 敏感信息过滤器 |
| 内容分段 | ❌ 不存在 | - | **新建** 内容分段器 |
| 内容回顾 | ❌ 不存在 | - | **新建** 回顾面板 |

### 1.2 现有数据流

```
当前 V1 数据流:
  uiohook keydown (main.js)
    └─→ KeyboardRecorder.processKeydown(keycode)
          ├─→ PinyinDetector 判断拼音/英文
          ├─→ 格式化: [HH:MM:SS] [拼音:xxx][选字:N]... 或 [HH:MM:SS] text
          ├─→ 每5秒 flush 到 keyboard_YYYY-MM-DD.txt
          └─→ IPC 通知渲染进程 (recorder-update)
                └─→ TypeRecorder UI 预览

  SkillScheduler 每10分钟触发:
    └─→ TextConverter → 读取今日 keyboard.txt → AI 转换 → convertedText_{date}
    └─→ DailyReport → 读取 convertedText → AI 生成日报 → dailyReport_{date}
    └─→ TodoExtractor → 读取 convertedText → AI 提取待办 → todos 合并
```

### 1.3 V2 数据流 (Pillar C 开启后)

```
V2 数据流 (用户授权 Pillar C 后):
  uiohook keydown (main.js)
    └─→ KeyboardRecorder.processKeydown(keycode)
          ├─→ PinyinDetector 判断拼音/英文
          │
          ├─→ [V2 新增] C1: SensitiveFilter.filter(line)
          │     ├─→ 匹配敏感关键词 → 整行替换为 [FILTERED]
          │     ├─→ 纯密文行 → 丢弃
          │     └─→ 安全行 → 通过
          │
          ├─→ 格式化 + flush 到 keyboard_YYYY-MM-DD.txt (已过滤)
          └─→ IPC 通知渲染进程

  SkillScheduler 每10分钟触发:
    └─→ TextConverter → 读取今日 keyboard.txt → AI 转换
          │
          ├─→ [V2 新增] C3: ContentSegmenter.segment(convertedText)
          │     ├─→ 按时间分段 (暂停>5min 为分界)
          │     ├─→ 按类型分类 (code/text/chat)
          │     └─→ 存储 segments_{date}
          │
          └─→ convertedText_{date} (已清洗+分段)

  日报生成 (18:00 或 /report):
    └─→ DailyReport (增强版)
          ├─→ Pillar A 节奏数据 (rhythmData_{date})
          ├─→ [V2 新增] Pillar C 内容分段摘要 (segments_{date})
          └─→ AI 生成 「节奏+内容」双维度日报
```

---

## 二、模块依赖关系

### 2.1 架构总图

```
┌─────────────────────────────────────────────────────────────────┐
│                     🔐 Layer 0: 安全授权                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ C0: Privacy Consent Dialog (安全协议弹窗)                │   │
│  │  contentConsentGranted = false → 下方所有模块不加载       │   │
│  │  contentConsentGranted = true  → 激活 Layer 1/2/3        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                     Layer 1: 内容采集                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ KeyboardRecorder (现有增强)                               │   │
│  │  keycode → 字符 → PinyinDetector → [C1过滤] → 文件        │   │
│  └────────────────────────────┬─────────────────────────────┘   │
│                                │                                 │
├────────────────────────────────┼─────────────────────────────────┤
│                     Layer 2: 数据清洗                  │         │
│  ┌──────────────┐  ┌──────────┴───────┐  ┌──────────────────┐  │
│  │ C1: 敏感过滤  │  │ C2: 拼音→中文转换 │  │ C3: 内容分段器    │  │
│  │ (写入前过滤)  │  │ (TextConverter   │  │ (转换后分段)      │  │
│  │              │  │  增强)           │  │                  │  │
│  └──────┬───────┘  └────────┬─────────┘  └────────┬─────────┘  │
│         │                   │                      │             │
│         └───────────────────┼──────────────────────┘             │
│                             │                                    │
├─────────────────────────────┼────────────────────────────────────┤
│                     Layer 3: 下游消费                  │          │
│  ┌──────────────────┐  ┌───┴──────────┐  ┌──────────────────┐  │
│  │ C4a: 日报增强     │  │ C4b: 待办提取 │  │ C4c: 内容回顾面板 │  │
│  │ (A+C 双维度)     │  │ (分段中提取)  │  │ (时间轴可视化)   │  │
│  └──────────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 进程分工

```
主进程 (Node.js / CommonJS)
  ├── C0: 安全协议弹窗 (BrowserWindow dialog)
  ├── C1: 敏感过滤器 (在 KeyboardRecorder 内部调用)
  ├── C2: TextConverter 增强 (现有)
  ├── C3: ContentSegmenter (主进程处理)
  └── C4a: DailyReport 增强 (现有)

渲染进程 (ES Module)
  ├── C0: 授权状态检查 + 设置页开关
  ├── C4c: 内容回顾面板 (Tools Tab)
  └── 授权后动态加载相关UI
```

---

## 三、C0: 安全协议弹窗 Privacy Consent Dialog

### 3.1 文件信息

| 属性 | 值 |
|------|-----|
| **文件路径** | `src/consent/privacy-consent.js` |
| **模块类型** | CommonJS (主进程) |
| **依赖** | Electron dialog / BrowserWindow, store |
| **触发方式** | 用户首次点击内容相关功能 / 设置页手动开启 |

### 3.2 授权状态管理

```javascript
// privacy-consent.js
const { BrowserWindow, ipcMain } = require('electron');
const path = require('path');

class PrivacyConsentManager {
  constructor(store, mainWindow) {
    this._store = store;
    this._mainWindow = mainWindow;
    this._consentWindow = null;
  }
  
  init() {
    // 监听授权请求
    ipcMain.handle('consent-check', () => {
      return this.isConsentGranted();
    });
    
    ipcMain.handle('consent-request', async () => {
      return this.requestConsent();
    });
    
    ipcMain.handle('consent-revoke', () => {
      return this.revokeConsent();
    });
  }
  
  isConsentGranted() {
    return this._store.get('contentConsentGranted', false);
  }
  
  getConsentInfo() {
    return {
      granted: this._store.get('contentConsentGranted', false),
      grantedAt: this._store.get('contentConsentGrantedAt', null),
      version: this._store.get('contentConsentVersion', null)
    };
  }
  
  async requestConsent() {
    if (this.isConsentGranted()) return true;
    
    return new Promise((resolve) => {
      this._showConsentDialog((accepted) => {
        if (accepted) {
          this._store.set('contentConsentGranted', true);
          this._store.set('contentConsentGrantedAt', Date.now());
          this._store.set('contentConsentVersion', '1.0');
          
          // 通知渲染进程：授权已通过，激活 Pillar C UI
          if (this._mainWindow && !this._mainWindow.isDestroyed()) {
            this._mainWindow.webContents.send('consent-status-changed', { granted: true });
          }
        }
        resolve(accepted);
      });
    });
  }
  
  revokeConsent() {
    this._store.set('contentConsentGranted', false);
    this._store.set('contentConsentRevokedAt', Date.now());
    
    // 立即停止记录
    if (this._mainWindow && !this._mainWindow.isDestroyed()) {
      this._mainWindow.webContents.send('consent-status-changed', { granted: false });
    }
    
    // 注意：不删除已有的本地文件，只是停止记录
    return true;
  }
  
  _showConsentDialog(callback) {
    this._consentWindow = new BrowserWindow({
      width: 500,
      height: 480,
      parent: this._mainWindow,
      modal: true,
      frame: false,
      transparent: true,
      resizable: false,
      webPreferences: {
        preload: path.join(__dirname, 'consent-preload.js'),
        contextIsolation: true,
        nodeIntegration: false
      }
    });
    
    this._consentWindow.loadFile(path.join(__dirname, 'consent-dialog.html'));
    
    // 接收用户选择
    const onAccept = () => {
      cleanup();
      this._consentWindow.close();
      callback(true);
    };
    
    const onDecline = () => {
      cleanup();
      this._consentWindow.close();
      callback(false);
    };
    
    const cleanup = () => {
      ipcMain.removeListener('consent-accept', onAccept);
      ipcMain.removeListener('consent-decline', onDecline);
    };
    
    ipcMain.once('consent-accept', onAccept);
    ipcMain.once('consent-decline', onDecline);
    
    this._consentWindow.on('closed', () => {
      cleanup();
      this._consentWindow = null;
      // 窗口被关闭（不通过按钮）= 拒绝
      callback(false);
    });
  }
}

module.exports = { PrivacyConsentManager };
```

### 3.3 授权对话框 UI

```html
<!-- consent-dialog.html -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif;
      background: transparent;
    }
    .dialog {
      background: #fff;
      border: 2px solid #ffb74d;
      border-radius: 16px;
      padding: 28px;
      margin: 10px;
      box-shadow: 0 8px 32px rgba(255, 152, 0, 0.2);
    }
    .header {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 18px;
      font-weight: 700;
      color: #e65100;
      margin-bottom: 16px;
    }
    .body {
      font-size: 13px;
      color: #555;
      line-height: 1.8;
    }
    .features {
      margin: 12px 0;
      padding-left: 20px;
    }
    .features li {
      margin: 6px 0;
    }
    .features li strong { color: #333; }
    
    .check-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      background: #fff8e1;
      border-radius: 10px;
      padding: 12px;
      margin: 10px 0;
      font-size: 13px;
      line-height: 1.6;
    }
    .check-item input[type="checkbox"] {
      margin-top: 4px;
      flex-shrink: 0;
    }
    
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 20px;
    }
    .btn {
      padding: 10px 24px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      border: none;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-cancel {
      background: #f5f5f5;
      color: #888;
    }
    .btn-cancel:hover { background: #eee; }
    .btn-accept {
      background: linear-gradient(135deg, #FF9800, #F57C00);
      color: #fff;
      opacity: 0.5;
      cursor: not-allowed;
    }
    .btn-accept.enabled {
      opacity: 1;
      cursor: pointer;
    }
    .btn-accept.enabled:hover {
      box-shadow: 0 4px 12px rgba(255, 152, 0, 0.4);
    }
  </style>
</head>
<body>
  <div class="dialog">
    <div class="header">🔐 数据授权 — ChatCat 打字内容功能</div>
    
    <div class="body">
      <p>要开启以下高级功能，需要你的明确授权：</p>
      <ul class="features">
        <li><strong>智能日报</strong> — 基于打字内容生成「今天写了什么」</li>
        <li><strong>待办提取</strong> — 从打字中自动识别 TODO 事项</li>
        <li><strong>内容回顾</strong> — 可视化你的工作内容概要</li>
      </ul>
      <p>为此，ChatCat 需要记录你的<strong>键盘按键内容</strong>（而不仅是频率）。</p>
    </div>
    
    <div class="check-item">
      <input type="checkbox" id="check1">
      <label for="check1">我了解并同意：打字内容<strong>仅存储在本地</strong>，不会上传到任何服务器。
      密码、token等敏感信息会被自动过滤。我可以随时在设置中关闭此功能。</label>
    </div>
    
    <div class="check-item">
      <input type="checkbox" id="check2">
      <label for="check2">我了解：关闭此功能后，已记录的本地文件将被<strong>保留但不再更新</strong>，
      我可以手动删除历史记录。</label>
    </div>
    
    <div class="actions">
      <button class="btn btn-cancel" id="btn-cancel">暂不开启</button>
      <button class="btn btn-accept" id="btn-accept">✅ 同意并开启</button>
    </div>
  </div>
  
  <script>
    const check1 = document.getElementById('check1');
    const check2 = document.getElementById('check2');
    const btnAccept = document.getElementById('btn-accept');
    const btnCancel = document.getElementById('btn-cancel');
    
    function updateButton() {
      if (check1.checked && check2.checked) {
        btnAccept.classList.add('enabled');
      } else {
        btnAccept.classList.remove('enabled');
      }
    }
    
    check1.addEventListener('change', updateButton);
    check2.addEventListener('change', updateButton);
    
    btnAccept.addEventListener('click', () => {
      if (check1.checked && check2.checked) {
        window.consentAPI.accept();
      }
    });
    
    btnCancel.addEventListener('click', () => {
      window.consentAPI.decline();
    });
  </script>
</body>
</html>
```

### 3.4 consent-preload.js

```javascript
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('consentAPI', {
  accept: () => ipcRenderer.send('consent-accept'),
  decline: () => ipcRenderer.send('consent-decline'),
});
```

### 3.5 设置页授权开关

在 `renderer.js` 的设置面板中增加 Pillar C 授权开关：

```javascript
// 设置面板中增加
async function setupConsentToggle() {
  const isGranted = await window.electronAPI.consentCheck();
  
  // 创建开关 UI
  const toggle = document.createElement('div');
  toggle.className = 'setting-item';
  toggle.innerHTML = `
    <div class="setting-label">
      <span>📝 打字内容智能分析</span>
      <span class="setting-desc">开启后可生成基于内容的增强日报、待办提取和内容回顾</span>
    </div>
    <label class="switch">
      <input type="checkbox" id="consent-toggle" ${isGranted ? 'checked' : ''}>
      <span class="slider"></span>
    </label>
  `;
  
  const toggleInput = toggle.querySelector('#consent-toggle');
  toggleInput.addEventListener('change', async () => {
    if (toggleInput.checked) {
      // 开启：弹出授权对话框
      const accepted = await window.electronAPI.consentRequest();
      toggleInput.checked = accepted;
    } else {
      // 关闭：撤回授权
      await window.electronAPI.consentRevoke();
    }
  });
  
  // 挂载到设置面板
  document.getElementById('settings-privacy')?.appendChild(toggle);
}
```

---

## 四、C1: 敏感信息过滤器 Sensitive Filter

### 4.1 文件信息

| 属性 | 值 |
|------|-----|
| **文件路径** | `src/cleaner/sensitive-filter.js` |
| **模块类型** | CommonJS (主进程) |
| **调用位置** | KeyboardRecorder flush 之前 |
| **原则** | 宁可多过滤，不可少过滤 |

### 4.2 类设计

```javascript
// sensitive-filter.js

class SensitiveFilter {
  constructor() {
    // 关键词黑名单 (不区分大小写)
    this._keywords = [
      // 密码类
      'password', 'passwd', 'pwd', '密码', '口令',
      // 令牌类
      'token', 'secret', 'api_key', 'apikey', 'api-key',
      'access_key', 'accesskey', 'secret_key', 'secretkey',
      // 凭证类
      'private_key', 'privatekey', 'credential',
      'authorization', 'bearer',
      // 数据库
      'connection_string', 'connectionstring',
      // 金融
      '银行卡', '信用卡', '身份证',
    ];
    
    // 编译为正则 (一次性编译，性能更好)
    this._keywordRegex = new RegExp(
      this._keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'),
      'i'
    );
    
    // 密文模式
    this._cipherRegex = /^[•*●◆█]+$/;
    
    // 长无意义串 (40+字符无空格)
    this._hashRegex = /\S{40,}/;
  }
  
  /**
   * 过滤一行文本
   * @param {string} line - 原始行
   * @returns {string|null} - 过滤后的行，null 表示整行丢弃
   */
  filterLine(line) {
    if (!line || !line.trim()) return line;
    
    const trimmed = line.trim();
    
    // 1. 纯密文行 → 丢弃
    if (this._cipherRegex.test(trimmed)) {
      return null;
    }
    
    // 2. 关键词匹配 → 替换
    if (this._keywordRegex.test(trimmed)) {
      const matchedKeyword = trimmed.match(this._keywordRegex)?.[0] || 'sensitive';
      return `[FILTERED: 包含敏感关键词 ${matchedKeyword}]`;
    }
    
    // 3. 长无意义串 → 截断
    if (this._hashRegex.test(trimmed)) {
      return trimmed.replace(this._hashRegex, (match) => {
        if (match.length > 40) {
          return `[HASH: ${match.length}字符]`;
        }
        return match;
      });
    }
    
    // 4. 安全行 → 通过
    return line;
  }
  
  /**
   * 批量过滤多行文本
   * @param {string} text - 多行文本
   * @returns {string} - 过滤后的文本
   */
  filterText(text) {
    if (!text) return text;
    
    return text.split('\n')
      .map(line => this.filterLine(line))
      .filter(line => line !== null)  // 丢弃 null 行
      .join('\n');
  }
  
  /**
   * 统计过滤结果
   */
  getStats(text) {
    const lines = text.split('\n');
    let filtered = 0;
    let discarded = 0;
    let hashed = 0;
    
    for (const line of lines) {
      const result = this.filterLine(line);
      if (result === null) discarded++;
      else if (result.startsWith('[FILTERED')) filtered++;
      else if (result.includes('[HASH:')) hashed++;
    }
    
    return { total: lines.length, filtered, discarded, hashed, passed: lines.length - filtered - discarded - hashed };
  }
}

module.exports = { SensitiveFilter };
```

### 4.3 集成到 KeyboardRecorder

在 `keyboard-recorder.js` 中修改 flush 逻辑：

```javascript
// keyboard-recorder.js 修改

const { SensitiveFilter } = require('../cleaner/sensitive-filter');

class KeyboardRecorder {
  constructor(store, contentConsentGranted) {
    // ... 现有代码 ...
    
    // V2: 敏感过滤器 (仅在 Pillar C 授权时使用)
    this._sensitiveFilter = new SensitiveFilter();
    this._contentMode = contentConsentGranted; // 是否开启内容记录
  }
  
  // 修改 _flush() 方法
  _flush() {
    if (this._buffer.length === 0) return;
    
    let content = this._buffer.join('');
    
    // V2: 如果 Pillar C 授权，进行敏感过滤
    if (this._contentMode) {
      content = this._sensitiveFilter.filterText(content);
    }
    
    // 写入文件 (现有逻辑)
    fs.appendFileSync(this._filePath, content + '\n');
    this._buffer = [];
    
    // IPC 通知
    // ... 现有代码 ...
  }
  
  // 动态开关
  setContentMode(enabled) {
    this._contentMode = enabled;
    if (!enabled) {
      console.log('[KeyboardRecorder] 内容记录已关闭');
    }
  }
}
```

### 4.4 自定义过滤规则

用户可在设置中追加自定义敏感关键词：

```javascript
// Store key: 'customSensitiveKeywords'
// 格式: ['关键词1', '关键词2', ...]

// SensitiveFilter 初始化时读取
constructor(store) {
  // ... 内置关键词 ...
  
  const customKeywords = store?.get('customSensitiveKeywords', []) || [];
  this._keywords = [...this._keywords, ...customKeywords];
  
  // 重新编译正则
  this._keywordRegex = new RegExp(
    this._keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'),
    'i'
  );
}
```

---

## 五、C2: 拼音→中文转换增强

### 5.1 修改文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/skills/text-converter.js` | **修改** | 与清洗管道串联 |
| `src/skills/skills/text-converter/SKILL.md` | **修改** | 更新 prompt 模板 |
| `src/recorder/pinyin-detector.js` | **微调** | 增强边界处理 |

### 5.2 TextConverter 增强

现有 TextConverter 直接读取 keyboard.txt 并调用 AI 转换。V2 增强点：

```javascript
// text-converter.js 修改

class TextConverter {
  // ... 现有代码 ...
  
  async convert(date) {
    const rawContent = await this._readTodayKeyboard(date);
    if (!rawContent) return null;
    
    // V2: 确认内容已经过敏感过滤（由 KeyboardRecorder 保证）
    // 额外校验: 二次过滤（双保险）
    const safeContent = this._secondPassFilter(rawContent);
    
    // 调用 AI 转换 (现有逻辑，prompt 微调)
    const converted = await this._callAI(safeContent);
    
    // V2: 存储转换结果时标记已清洗
    const storeKey = `convertedText_${date}`;
    this._store.set(storeKey, {
      text: converted,
      cleaned: true,        // V2: 标记已清洗
      timestamp: Date.now(),
      rawLines: rawContent.split('\n').length
    });
    
    return converted;
  }
  
  _secondPassFilter(content) {
    // 双保险：即使 KeyboardRecorder 遗漏，这里再过滤一次
    const lines = content.split('\n');
    return lines.filter(line => {
      // 跳过已标记为 FILTERED 的行
      if (line.includes('[FILTERED') || line.includes('[HASH:')) return false;
      return true;
    }).join('\n');
  }
}
```

### 5.3 代码/命令行智能保留

在 AI 转换 prompt 中增加指导：

```
增强指令:
- 如果一行明显是代码（有缩进、函数调用、分号结尾等），保留原样不转换
- 如果一行是终端命令（以 $ 或 > 开头，或包含 npm/git/docker 等），保留原样
- 只对自然语言部分进行拼音→中文转换
- 对代码注释中的拼音进行转换
```

---

## 六、C3: 内容分段器 Content Segmenter

### 6.1 文件信息

| 属性 | 值 |
|------|-----|
| **文件路径** | `src/cleaner/content-segmenter.js` |
| **模块类型** | CommonJS (主进程) |
| **调用时机** | TextConverter 转换完成后 |
| **输出** | `segments_{date}` store key |

### 6.2 类设计

```javascript
// content-segmenter.js

class ContentSegmenter {
  constructor(store) {
    this._store = store;
    
    // 分段阈值
    this._pauseThresholdMinutes = 5;  // 暂停>5分钟视为新段
    
    // 代码检测模式
    this._codePatterns = [
      /^[\s]*[{}()\[\]]/,           // 括号开头
      /;\s*$/,                       // 分号结尾
      /^\s*(const|let|var|function|class|import|export|return|if|else|for|while)\b/,
      /^\s*(def|async|await|print|try|except|catch|throw)\b/,
      /^\s*\/\//,                    // 注释
      /^\s*#(?!#)/,                  // Python 注释
      /^\s*\*/,                      // 多行注释
      /[=!<>]{2,}/,                  // 运算符
      /\.\w+\(/,                     // 方法调用
    ];
    
    // 聊天模式检测
    this._chatPatterns = [
      /^(哈哈|嗯嗯|好的|收到|OK|ok|谢谢|嗯|对|是的|没问题)/,
      /[？?！!~～]{2,}/,             // 多个感叹号/问号
      /^@\w/,                        // @某人
    ];
  }
  
  /**
   * 对已转换的文本进行分段
   * @param {string} convertedText - 已转换的可读文本
   * @param {string} date - 日期 YYYY-MM-DD
   * @returns {Array<Segment>} - 分段结果
   */
  segment(convertedText, date) {
    if (!convertedText) return [];
    
    const lines = convertedText.split('\n');
    const segments = [];
    let currentSegment = null;
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      // 解析时间戳 (格式: [HH:MM:SS] content)
      const timeMatch = trimmed.match(/^\[(\d{2}:\d{2}:\d{2})\]\s*(.*)/);
      const time = timeMatch ? timeMatch[1] : null;
      const content = timeMatch ? timeMatch[2] : trimmed;
      
      if (!content.trim()) continue;
      
      // 判断是否需要开启新段
      if (this._shouldStartNewSegment(currentSegment, time)) {
        if (currentSegment) {
          this._finalizeSegment(currentSegment);
          segments.push(currentSegment);
        }
        currentSegment = this._createSegment(time, date);
      }
      
      // 添加内容到当前段
      if (!currentSegment) {
        currentSegment = this._createSegment(time, date);
      }
      
      currentSegment.lines.push(content);
      currentSegment.charCount += content.length;
      currentSegment.endTime = time || currentSegment.endTime;
      
      // 累计类型投票
      if (this._isCodeLine(content)) {
        currentSegment._codeVotes++;
      } else if (this._isChatLine(content)) {
        currentSegment._chatVotes++;
      } else {
        currentSegment._textVotes++;
      }
    }
    
    // 最后一个段
    if (currentSegment) {
      this._finalizeSegment(currentSegment);
      segments.push(currentSegment);
    }
    
    // 存储
    const storeKey = `segments_${date}`;
    this._store.set(storeKey, segments);
    
    return segments;
  }
  
  _createSegment(time, date) {
    return {
      startTime: time || '00:00:00',
      endTime: time || '00:00:00',
      type: 'text',      // code | text | chat
      lang: 'mixed',     // zh | en | mixed
      density: 'medium', // high | medium | low
      charCount: 0,
      lines: [],
      summary: '',
      _codeVotes: 0,
      _textVotes: 0,
      _chatVotes: 0,
    };
  }
  
  _shouldStartNewSegment(current, newTime) {
    if (!current || !newTime) return !current;
    
    // 解析时间差
    const [ch, cm, cs] = current.endTime.split(':').map(Number);
    const [nh, nm, ns] = newTime.split(':').map(Number);
    const diffMinutes = (nh * 60 + nm) - (ch * 60 + cm);
    
    return diffMinutes >= this._pauseThresholdMinutes;
  }
  
  _finalizeSegment(segment) {
    // 确定类型 (投票制)
    const maxVotes = Math.max(segment._codeVotes, segment._textVotes, segment._chatVotes);
    if (maxVotes === 0) {
      segment.type = 'text';
    } else if (segment._codeVotes === maxVotes) {
      segment.type = 'code';
    } else if (segment._chatVotes === maxVotes) {
      segment.type = 'chat';
    } else {
      segment.type = 'text';
    }
    
    // 确定语言
    const allText = segment.lines.join(' ');
    const zhCount = (allText.match(/[\u4e00-\u9fff]/g) || []).length;
    const enCount = (allText.match(/[a-zA-Z]/g) || []).length;
    if (zhCount > enCount * 2) segment.lang = 'zh';
    else if (enCount > zhCount * 2) segment.lang = 'en';
    else segment.lang = 'mixed';
    
    // 确定密度
    const [sh, sm] = segment.startTime.split(':').map(Number);
    const [eh, em] = segment.endTime.split(':').map(Number);
    const durationMin = Math.max(1, (eh * 60 + em) - (sh * 60 + sm));
    const charsPerMin = segment.charCount / durationMin;
    
    if (charsPerMin > 50) segment.density = 'high';
    else if (charsPerMin > 20) segment.density = 'medium';
    else segment.density = 'low';
    
    // 生成摘要 (纯本地规则，0 token)
    const typeLabels = { code: '编码', text: '文字输入', chat: '聊天' };
    const startShort = segment.startTime.slice(0, 5);
    const endShort = segment.endTime.slice(0, 5);
    segment.summary = `${startShort}-${endShort} ${typeLabels[segment.type]} ${segment.charCount}字`;
    
    // 清理内部投票字段
    delete segment._codeVotes;
    delete segment._textVotes;
    delete segment._chatVotes;
  }
  
  _isCodeLine(text) {
    return this._codePatterns.some(p => p.test(text));
  }
  
  _isChatLine(text) {
    return this._chatPatterns.some(p => p.test(text)) && text.length < 30;
  }
}

module.exports = { ContentSegmenter };
```

### 6.3 输出数据格式

```json
[
  {
    "startTime": "10:05:12",
    "endTime": "10:42:38",
    "type": "code",
    "lang": "en",
    "density": "high",
    "charCount": 2840,
    "summary": "10:05-10:42 编码 2840字",
    "lines": ["const foo = ...", "..."]
  },
  {
    "startTime": "11:00:05",
    "endTime": "11:15:22",
    "type": "text",
    "lang": "zh",
    "density": "medium",
    "charCount": 580,
    "summary": "11:00-11:15 文字输入 580字",
    "lines": ["今天的方案需要...", "..."]
  }
]
```

---

## 七、C4: 下游消费

### 7.1 C4a: 日报增强

#### 修改文件

| 文件 | 修改 |
|------|------|
| `src/skills/daily-report.js` | 注入分段内容摘要 |
| `src/skills/skills/daily-report/SKILL.md` | 更新 prompt 模板 |

#### 增强逻辑

```javascript
// daily-report.js 修改

async execute() {
  // 现有: 获取 convertedText
  const convertedText = this._store.get(`convertedText_${today}`);
  
  // V2 Pillar A: 获取节奏数据
  const rhythmData = this._store.get(`rhythmData_${today}`);
  
  // V2 Pillar C: 获取内容分段 (仅 Pillar C 授权后)
  let contentSections = null;
  if (this._store.get('contentConsentGranted')) {
    const segments = this._store.get(`segments_${today}`);
    if (segments && segments.length > 0) {
      // 不传原始文本给 AI，只传结构化摘要
      contentSections = segments.map(s => ({
        time: `${s.startTime.slice(0,5)}-${s.endTime.slice(0,5)}`,
        type: s.type,
        lang: s.lang,
        density: s.density,
        charCount: s.charCount,
        summary: s.summary,
        // 只传前100字作为上下文，不传完整内容
        preview: s.lines.slice(0, 3).join(' ').slice(0, 100)
      }));
    }
  }
  
  // 构建增强 prompt
  const prompt = this._buildEnhancedPrompt(convertedText, rhythmData, contentSections, context);
  
  // 调用 AI
  const report = await this._callAI(prompt);
  
  // 存储
  this._store.set(`dailyReport_${today}`, report);
  return report;
}
```

#### 增强 Prompt 模板

```
你是 ChatCat 🐱，一只懂用户工作节奏的AI猫咪。

今天的数据包含两个维度：
1. 节奏数据（打字速度、心流时长等纯数值）
2. 内容概要（用户今天写了什么类型的内容）

请生成一份综合日报：
- 开头用节奏数据描述工作状态（心流/卡壳/效率）
- 中间用内容概要说明「今天做了什么」
- 结尾给出1条具体建议
- 200字以内，猫咪语气

节奏数据：
{rhythmDataJSON}

内容概要：
{contentSectionsJSON}
```

### 7.2 C4b: 待办提取增强

```javascript
// todo-extractor.js 修改

async extract(date) {
  // 现有: 从 convertedText 提取
  const convertedText = this._store.get(`convertedText_${date}`)?.text || '';
  
  // V2: 同时从分段数据中提取
  const segments = this._store.get(`segments_${date}`) || [];
  
  // 从分段的文本内容中用正则先筛
  const candidates = [];
  
  for (const segment of segments) {
    for (const line of (segment.lines || [])) {
      if (this._isTodoCandidate(line)) {
        candidates.push({
          text: line,
          time: segment.startTime,
          type: segment.type,
          source: 'content-segment'
        });
      }
    }
  }
  
  // ... 继续现有 AI 提取逻辑 ...
  // 将 candidates 追加到 AI prompt 中
}

_isTodoCandidate(line) {
  const patterns = [
    /\bTODO\b/i,
    /\bFIXME\b/i,
    /\bHACK\b/i,
    /\bXXX\b/i,
    /待办|明天要|记得|别忘了|需要|应该/,
    /\/\/\s*(todo|fixme)/i,
    /#\s*(todo|fixme)/i,
  ];
  return patterns.some(p => p.test(line));
}
```

### 7.3 C4c: 内容回顾面板

#### 文件位置

不新建文件，在 `renderer.js` 中增加回顾面板逻辑。作为 Tools 面板的新 Tab。

#### UI 结构

```
#tools-tab-content-review
├── .review-header
│   ├── 日期选择器 (默认今天)
│   └── 统计概要 (总字数/段数/类型分布)
│
├── .review-timeline
│   └── 纵向时间轴
│       ├── [10:05-10:42] 🔧 编码 (2840字) — 密度:高
│       ├── [11:00-11:15] 📝 文字 (580字) — 密度:中
│       ├── [14:00-14:30] 💬 聊天 (120字) — 密度:低
│       └── ...
│
└── .review-stats
    ├── 类型饼图 (code/text/chat 分布)
    └── 时间密度热力图
```

#### 实现要点

```javascript
// renderer.js 中新增
async function setupContentReviewTab() {
  // 检查授权
  const isGranted = await window.electronAPI.consentCheck();
  if (!isGranted) {
    // 未授权：显示引导开启
    container.innerHTML = `
      <div style="text-align:center;padding:40px;">
        <div style="font-size:36px;margin-bottom:12px;">📝</div>
        <div style="font-size:14px;color:#888;">内容回顾需要授权打字内容记录</div>
        <button class="review-enable-btn" onclick="enableContentConsent()">🔐 了解并开启</button>
      </div>
    `;
    return;
  }
  
  // 已授权：渲染时间轴
  const today = new Date().toISOString().split('T')[0];
  const segments = await window.electronAPI.getStore(`segments_${today}`) || [];
  
  renderTimeline(container, segments);
}

function renderTimeline(container, segments) {
  const typeIcons = { code: '🔧', text: '📝', chat: '💬' };
  const densityLabels = { high: '高密度', medium: '中等', low: '低密度' };
  
  let html = '<div class="review-timeline">';
  
  for (const seg of segments) {
    const icon = typeIcons[seg.type] || '📄';
    html += `
      <div class="review-segment ${seg.type}">
        <div class="seg-time">${seg.startTime.slice(0,5)} - ${seg.endTime.slice(0,5)}</div>
        <div class="seg-content">
          <span class="seg-icon">${icon}</span>
          <span class="seg-type">${seg.summary}</span>
          <span class="seg-density">${densityLabels[seg.density]}</span>
        </div>
        <div class="seg-bar" style="width:${Math.min(100, seg.charCount / 30)}%"></div>
      </div>
    `;
  }
  
  html += '</div>';
  
  // 统计概要
  const totalChars = segments.reduce((sum, s) => sum + s.charCount, 0);
  const typeStats = {};
  segments.forEach(s => { typeStats[s.type] = (typeStats[s.type] || 0) + 1; });
  
  html = `
    <div class="review-header">
      <div class="review-stat">📊 今日 ${segments.length} 段 · ${totalChars.toLocaleString()} 字</div>
      <div class="review-stat-types">
        ${typeStats.code ? `🔧 编码 ${typeStats.code} 段` : ''}
        ${typeStats.text ? `📝 文字 ${typeStats.text} 段` : ''}
        ${typeStats.chat ? `💬 聊天 ${typeStats.chat} 段` : ''}
      </div>
    </div>
  ` + html;
  
  container.innerHTML = html;
}
```

#### index.html 修改

在 Tools 面板 Tab 列表中新增（仅在授权后显示）：

```html
<!-- 动态插入，由 JS 控制显隐 -->
<button class="tab-btn" data-tab="tools-tab-content-review" id="tab-btn-review" style="display:none;">📝 回顾</button>
<div id="tools-tab-content-review" class="tab-content" style="display:none;"></div>
```

---

## 八、preload.js 修改

### 8.1 新增暴露 API

```javascript
// V2 Pillar C 新增
consentCheck: () => ipcRenderer.invoke('consent-check'),
consentRequest: () => ipcRenderer.invoke('consent-request'),
consentRevoke: () => ipcRenderer.invoke('consent-revoke'),
onConsentStatusChanged: (cb) => ipcRenderer.on('consent-status-changed', (_, data) => cb(data)),
```

---

## 九、main.js 修改

### 9.1 集成 Pillar C 模块

```javascript
// main.js 修改 (在 app.whenReady 中)

const { PrivacyConsentManager } = require('./src/consent/privacy-consent');
const { SensitiveFilter } = require('./src/cleaner/sensitive-filter');
const { ContentSegmenter } = require('./src/cleaner/content-segmenter');

app.whenReady().then(async () => {
  // ... 现有初始化 ...
  
  // V2 Pillar C: 安全授权管理
  const consentManager = new PrivacyConsentManager(store, mainWindow);
  consentManager.init();
  
  // V2 Pillar C: 内容分段器
  const contentSegmenter = new ContentSegmenter(store);
  
  // 修改 KeyboardRecorder 初始化：注入 Pillar C 状态
  const isContentEnabled = store.get('contentConsentGranted', false);
  keyboardRecorder.setContentMode(isContentEnabled);
  
  // 监听授权状态变化
  ipcMain.on('consent-status-changed', (_, data) => {
    keyboardRecorder.setContentMode(data.granted);
  });
  
  // TextConverter 转换完成后触发分段
  textConverter.on('conversion-complete', (date, convertedText) => {
    if (store.get('contentConsentGranted')) {
      contentSegmenter.segment(convertedText, date);
    }
  });
  
  // ... 继续现有初始化 ...
});
```

### 9.2 条件加载策略

**关键设计**: Pillar C 的模块代码始终存在于文件系统中，但其运行时行为由 `contentConsentGranted` 开关控制：

| 模块 | 未授权时 | 已授权时 |
|------|---------|---------|
| C0 ConsentManager | 正常运行（等待用户请求授权） | 正常运行 |
| C1 SensitiveFilter | 不执行（KeyboardRecorder 不调用） | 在 flush 前过滤 |
| C2 TextConverter | 正常运行（已有功能不变） | 增强：二次过滤 |
| C3 ContentSegmenter | 不执行（无触发） | 转换后自动分段 |
| C4a DailyReport | 正常运行（只有节奏维度） | 增强：加入内容维度 |
| C4b TodoExtractor | 正常运行（从 convertedText 提取） | 增强：从分段提取 |
| C4c 内容回顾 | 显示引导开启 | 渲染时间轴 |

---

## 十、存储设计

### 10.1 新增 Store Keys

| Key | 数据格式 | 大小估算 | 生命周期 | 归属 |
|-----|---------|---------|---------|------|
| `contentConsentGranted` | `boolean` | 1B | 永久 | C0 |
| `contentConsentGrantedAt` | `number` (timestamp) | 8B | 永久 | C0 |
| `contentConsentVersion` | `string` | ~5B | 永久 | C0 |
| `contentConsentRevokedAt` | `number` (timestamp) | 8B | 永久 | C0 |
| `customSensitiveKeywords` | `string[]` | ~500B | 永久 | C1 |
| `segments_YYYY-MM-DD` | `Array<Segment>` | ~5KB/天 | 7天滚动 | C3 |

### 10.2 文件系统存储

| 文件 | 归属 | 说明 |
|------|------|------|
| `keyboard_YYYY-MM-DD.txt` | 现有 | V2后内容已经过敏感过滤 |

### 10.3 清理策略

```javascript
// ContentSegmenter 中添加清理逻辑
async _cleanOldSegments() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  for (let i = 8; i < 40; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = `segments_${d.toISOString().split('T')[0]}`;
    this._store.delete(key);
  }
}
```

---

## 十一、安全性设计

### 11.1 安全原则

| 原则 | 实现 |
|------|------|
| **默认关闭** | `contentConsentGranted` 默认 `false` |
| **知情同意** | 双勾选确认 + 明确说明数据用途 |
| **纯本地存储** | 打字内容文件/分段数据仅存本地，不通过任何网络传输 |
| **随时可撤** | 设置中一键关闭，立即停止记录 |
| **敏感过滤** | 写入前自动过滤密码/token/密钥等 |
| **双重保险** | KeyboardRecorder 过滤 + TextConverter 二次过滤 |
| **传给AI的数据最小化** | 日报只传分段摘要+前100字预览，不传完整原文 |

### 11.2 数据最小化

传给 AI 的内容分段数据经过严格裁剪：

```javascript
// 传给 AI 的分段数据 (最小化)
{
  time: "10:05-10:42",
  type: "code",        // 只有类型标签
  lang: "en",          // 只有语言标签
  density: "high",     // 只有密度标签
  charCount: 2840,     // 只有字数
  summary: "10:05-10:42 编码 2840字",  // 纯本地生成的摘要
  preview: "const foo = bar; ..."      // 仅前100字
}
```

**不传给 AI 的数据**: 完整 lines 内容、原始按键记录、文件路径。

### 11.3 授权版本管理

```javascript
// 如果未来 Pillar C 的数据使用范围变化，需要重新授权
const CURRENT_CONSENT_VERSION = '1.0';

if (store.get('contentConsentVersion') !== CURRENT_CONSENT_VERSION) {
  // 新版本需要重新授权
  store.set('contentConsentGranted', false);
}
```

---

## 十二、性能考量

### 12.1 SensitiveFilter

**问题**: 每行文本都要进行正则匹配。

**缓解**:
1. 所有关键词编译为单个正则 (一次匹配)
2. KeyboardRecorder 每5秒 flush 一次，每次只有几行文本
3. 正则匹配是 O(n) 操作，对短字符串极快

**性能估算**: 正则匹配 ~100 行文本 < 1ms

### 12.2 ContentSegmenter

**问题**: 分段需要遍历整个转换后的文本。

**缓解**:
1. 仅在 TextConverter 完成后触发（每10分钟一次）
2. 纯规则匹配，无 AI 调用
3. 一天文本量预估 ~10KB，分段耗时 < 10ms

### 12.3 日报增强

**问题**: AI prompt 增加了内容维度，token 消耗增加。

**缓解**:
1. 只传分段摘要（~500字），不传原文
2. 与 Pillar A 的 AI 调用合并为一次
3. 一天仅1次 AI 调用

---

## 十三、测试策略

### 13.1 单元测试

| 模块 | 测试重点 |
|------|---------|
| SensitiveFilter | 各种敏感关键词匹配；密文行丢弃；长hash截断；中英文混合；边界情况 |
| ContentSegmenter | 时间分段正确性；类型投票准确性；语言检测；密度计算 |
| ConsentManager | 授权/撤回状态切换；双勾选验证；版本升级重新授权 |

### 13.2 安全测试

| 场景 | 验证点 |
|------|-------|
| 输入 "password=abc123" | 该行被替换为 [FILTERED] |
| 输入长hash串 | 被截断为 [HASH: N字符] |
| 输入纯星号行 | 被丢弃 |
| 未授权时使用 /report | 日报不包含内容维度 |
| 授权→撤回→检查 | 记录立即停止，已有文件保留 |
| 传给AI的数据 | 不含完整原文，只有摘要 |

### 13.3 集成测试

| 场景 | 验证点 |
|------|-------|
| 新用户首次使用 | Pillar C 所有功能不可用，Tools Tab 不显示"回顾" |
| 授权后打字 | 内容经过过滤后写入文件 |
| 10分钟自动转换后 | 自动分段，segments_ 存储正确 |
| 18:00 日报生成 | 包含节奏+内容双维度 |
| 回顾面板 | 时间轴正确渲染，统计数据准确 |

---

## 十四、实施计划

### Phase 6: 打字内容消费 (C0-C4)

| 步骤 | 工作项 | 预估 | 依赖 |
|------|--------|------|------|
| 6.1 | 新建 `privacy-consent.js` + 对话框 UI | 3h | 无 |
| 6.2 | 新建 `consent-preload.js` + `consent-dialog.html` | 1h | 6.1 |
| 6.3 | 新建 `sensitive-filter.js` | 2h | 无 |
| 6.4 | 修改 `keyboard-recorder.js` 接入过滤器 | 1.5h | 6.3 |
| 6.5 | 修改 `text-converter.js` 二次过滤 + 代码保留 | 1.5h | 6.3 |
| 6.6 | 修改 `text-converter/SKILL.md` 更新 prompt | 0.5h | 6.5 |
| 6.7 | 新建 `content-segmenter.js` | 3h | 无 |
| 6.8 | 修改 `main.js` 集成 Pillar C 模块 | 1h | 6.1-6.7 |
| 6.9 | 修改 `preload.js` 新增授权 API | 0.5h | 6.8 |
| 6.10 | 修改 `daily-report.js` 注入内容维度 | 2h | 6.7, Pillar A |
| 6.11 | 修改 `daily-report/SKILL.md` 更新 prompt | 0.5h | 6.10 |
| 6.12 | 修改 `todo-extractor.js` 分段提取 | 1h | 6.7 |
| 6.13 | 渲染进程：设置页授权开关 | 1h | 6.1 |
| 6.14 | 渲染进程：内容回顾 Tab | 3h | 6.7 |
| 6.15 | 修改 `index.html` + `styles.css` | 1h | 6.14 |
| 6.16 | 安全测试 + 集成联调 | 3h | 6.1-6.15 |
| | **Phase 6 合计** | **~25.5h** | |

### 总计

| Phase | 工时 | 新建文件 | 修改文件 |
|-------|------|---------|---------|
| Phase 6 (C0-C4) | ~25.5h | 5 | 9 |

---

## 十五、文件清单汇总

### 新建文件 (5个)

| 文件 | 模块 | 进程 | 说明 |
|------|------|------|------|
| `src/consent/privacy-consent.js` | C0 | 主 | 安全授权管理器 |
| `src/consent/consent-dialog.html` | C0 | 渲染 | 授权对话框UI |
| `src/consent/consent-preload.js` | C0 | 桥接 | 对话框预加载 |
| `src/cleaner/sensitive-filter.js` | C1 | 主 | 敏感信息过滤器 |
| `src/cleaner/content-segmenter.js` | C3 | 主 | 内容分段器 |

### 修改文件 (9个)

| 文件 | 修改内容 |
|------|---------|
| `main.js` | 集成 ConsentManager + ContentSegmenter (~20行) |
| `preload.js` | 新增 4个授权 API (~6行) |
| `src/recorder/keyboard-recorder.js` | 接入 SensitiveFilter + contentMode 开关 (~15行) |
| `src/recorder/pinyin-detector.js` | 边界处理微调 (~5行) |
| `src/skills/text-converter.js` | 二次过滤 + 触发分段 (~20行) |
| `src/skills/skills/text-converter/SKILL.md` | 增强代码保留指令 |
| `src/skills/daily-report.js` | 注入内容分段维度 (~30行) |
| `src/skills/skills/daily-report/SKILL.md` | 双维度 prompt |
| `src/skills/todo-extractor.js` | 从分段内容提取待办 (~20行) |
| `src/renderer.js` | 设置授权开关 + 回顾Tab (~50行) |
| `src/index.html` | 新增"回顾"Tab (2行) |
| `src/styles.css` | 回顾面板 `.review-*` 样式 (~40行) |

---

## 十六、风险 & 缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 敏感过滤遗漏 | 用户敏感数据泄露 | 双重过滤 + 关键词可扩展 + AI 只收摘要 |
| 用户不理解授权含义 | 误开启或误关闭 | 对话框清晰说明 + 随时可撤回 |
| 分段不准确 | 回顾面板信息不准 | 投票制类型判断 + 可容忍误差 |
| 日报 prompt 过长 | token 消耗增加 | 只传摘要不传原文，控制在 500 token 以内 |
| 本地文件积累 | 磁盘空间 | keyboard.txt 按天轮转；segments 7天滚动清理 |
| 授权版本升级 | 老用户需重新授权 | 版本号机制，升级时自动提示 |

---

## 附录: 与产品方案对照表

| 产品模块 | 技术模块 | 方案覆盖 | 备注 |
|---------|---------|---------|------|
| C0 安全协议弹窗 | PrivacyConsentManager | ✅ 完整 | 双勾选+版本管理 |
| C1 敏感过滤器 | SensitiveFilter | ✅ 完整 | 4种过滤规则+可扩展 |
| C2 拼音→中文转换 | TextConverter增强 | ✅ 完整 | 串联清洗管道+代码保留 |
| C3 内容分段器 | ContentSegmenter | ✅ 完整 | 时间/类型/语言/密度 |
| C4 日报增强 | DailyReport增强 | ✅ 完整 | A+C双维度 |
| C4 待办提取 | TodoExtractor增强 | ✅ 完整 | 从分段内容提取 |
| C4 内容回顾 | 回顾Tab | ✅ 完整 | 时间轴+统计 |
| 数据安全 | 默认关闭+双过滤+最小化 | ✅ 完整 | 多层安全保障 |
