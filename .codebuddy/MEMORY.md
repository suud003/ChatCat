# ChatCat 项目长期记忆

> 最后更新: 2026-03-18

## 项目概况

ChatCat 是一个基于 Electron 的桌面宠物 + 生产力工具，分主进程 (`main.js`) 和渲染进程 (`src/renderer.js`)。
三大功能支柱: Pillar A (行为节奏智能)、Pillar B (轻办公AI/Quick Panel)、Pillar C (打字内容消费)。

## UI 设置架构

### 面板与 Tab

- 3 个可见面板: `#chat-container`(聊天+设置)、`#tools-container`(工具)、`#fun-container`(娱乐)
- Quick Panel 是独立 BrowserWindow，通过 IPC 调用
- **Chat 面板的 tab 切换由 `ChatUI.switchTab()` 独立实现**，不走 `setupTabbedPanel()`
- Tools/Fun 面板的 tab 切换由 `renderer.js` 中 `setupTabbedPanel()` 统一处理

### 设置页面位于 Chat 面板的第 2 个 tab (`#tab-settings`)

四个设置区域:
1. **AI 服务配置**: 预设(`apiPreset`)、API地址(`apiBaseUrl`)、模型(`modelName`)、API Key(`apiKey`)、识图模型(`visionModel`)、不透明度(`opacity`)、性格(`catPersonality`)
2. **记忆管理**: `#memory-list` + `#memory-clear-btn`
3. **技能设置**: 3 个 skill 开关 (`skillsEnabled`)、日报时间 (`dailyReportHour`)、日报目录 (`dailyReportOutputDir`)、待办间隔 (`todoRemindInterval`)
4. **主动交互**: `proactiveConfig` 对象 (enabled、maxDailyInteractions、quietHours、enabledSceneTypes)

### 新增设置项需要改 4 处

1. `src/index.html` — 添加 HTML 表单元素
2. `src/chat/chat-ui.js` — 构造函数绑定 DOM + `loadSettings()` 加载 + 保存逻辑 + `_snapshotSettings()` 和 `_isSettingsDirty()` 脏检查
3. `main.js` — `new Store({ defaults })` 添加默认值
4. (可选) `preload.js` — 如果需要新的 IPC 通道

### 设置数据流

```
UI → ChatUI.saveSettings() → electronAPI.setStore() → ipcRenderer.invoke('set-store') → main.js ipcMain.handle → store.set()
```

### 预设切换

`API_PRESETS` 定义在 `renderer.js` (~第 45-77 行)，预设: custom/openai/claude/deepseek/openrouter/gemini/openclaw。
`ChatUI.populateModels(presetKey, savedModel, savedUrl)` 根据预设动态填充模型列表、控制 URL 输入框显隐。

### 脏检查

`_snapshotSettings()` 进入 settings tab 时拍摄快照，`_isSettingsDirty()` 逐字段比较。离开 tab 或关闭面板时检查，脏则弹 confirm() 提示保存。

## 关键文件速查

| 需求 | 文件 |
|---|---|
| **AI 统一客户端 (主进程)** | `src/shared/ai-client-main.js` |
| **AI 统一客户端 (渲染进程)** | `src/shared/ai-client-renderer.js` |
| 设置面板 HTML | `src/index.html` (#tab-settings) |
| 设置读取/保存/脏检查 | `src/chat/chat-ui.js` |
| 预设定义 (API_PRESETS) | `src/renderer.js` (~第 45-77 行) |
| store 默认值 | `main.js` (~第 18-86 行) |
| IPC 桥接 | `preload.js` (getStore/setStore) |
| store IPC handler | `main.js` (get-store/set-store) |
| 设置面板样式 | `src/styles.css` (.setting-group 等，~第 582-701 行) |
| 内容回顾面板样式 | `src/styles-pillar-c.css` |
| Quick Panel 主逻辑 | `src/quick-panel/quick-panel-main.js` |
| 截图 OCR | `src/quick-panel/screenshot-ocr.js` |
| 隐私授权 | `src/consent/privacy-consent.js` |
| 敏感过滤 | `src/cleaner/sensitive-filter.js` |
| 技能引擎 | `src/skills/skill-engine.js` |

## AI 请求架构 (已统一)

所有 AI API 调用都通过统一客户端发出，SSE 解析逻辑只维护一份：

**主进程** (`src/shared/ai-client-main.js` — `AIClientMain`):
- `complete()` — 非流式 (skill-engine, daily-report, todo-extractor, text-converter)
- `stream()` — 流式 SSE (quick-panel 文本处理和问答)
- `vision()` — 图片识别 (screenshot-ocr)
- 使用 Electron `net.fetch`

**渲染进程** (`src/shared/ai-client-renderer.js` — `AIClientRenderer`):
- `complete()` — 非流式 (memory-manager, todo-parser)
- `stream()` — 流式 SSE async generator (ai-service 聊天)
- `testConnection()` — 测试连接
- 使用浏览器 `fetch`

**注入方式**: `main.js` 创建 `aiClient = new AIClientMain(store)`，通过构造函数注入各模块。
渲染进程由 `AIService` 内部创建 `AIClientRenderer`，通过 `aiService.client` 暴露给 memory-manager 和 todo-parser。

## 设计风格

漫画风: 白底 + `3px solid #222` 边框 + `22px` 圆角 + `3px 3px 0 #222` 阴影。
