# ChatCat 开发调试辅助文档

> 这是一份为开发者和 AI 助手（如 Dev Assistant Skill）准备的精简架构上下文文档，用于快速了解当前项目的结构、关键文件和近期改动。

## 一、项目架构概览 (ChatCat V2)

ChatCat 是一个基于 Electron 的桌面宠物与生产力工具，分为主进程 (`main.js`) 和渲染进程 (`src/renderer.js` 等)。
核心功能分为三大 Pillar（支柱）：

1. **Pillar A: 行为节奏智能 (Rhythm Analyzer)**
   - **特点**: 无需用户授权，零内容采集。纯粹基于用户的键鼠频率、时间停顿等物理行为推断工作节奏（专注、卡壳、疲劳等）。
   - **产出数据**: `rhythmData_{date}` (存放当日心流时长、打字频率等)。

2. **Pillar B: 轻办公AI (Quick Panel)**
   - **特点**: 用户主动触发（划选文本、截图等），即用即抛。
   - **主要模块**: `src/quick-panel/`。包含截图 OCR、快捷多模态处理等。

3. **Pillar C: 打字内容消费 (Content Processing)**
   - **特点**: **必须经过用户安全授权** (`contentConsentGranted`) 才能开启。
   - **处理管线**:
     1. **键盘记录**: `KeyboardRecorder` 记录原始按键（带拼音推断）。
     2. **敏感过滤**: `SensitiveFilter` 在写入本地前和提交给 AI 前进行两道过滤，去除密码、长 Token 等。
     3. **AI 转换**: 后台定时任务 `TextConverter` 将带有拼音的键盘记录转换为可读中文。
     4. **内容分段**: `ContentSegmenter` 根据时间间隔和文本密度自动分为 Code、Text、Chat 段落，存入 `segments_{date}`。
     5. **智能消费**: `DailyReport`（结合 A 与 C 的数据生成双维度日报）和 `TodoExtractor`（提取待办）。

## 二、关键文件分布

### 主进程 (Main Process)
- `main.js`: 入口文件。负责初始化各模块（Recorder, Store, ConsentManager 等）和统筹 IPC 通信。
- `preload.js`: 暴露 `electronAPI` 给渲染进程。
- `src/consent/privacy-consent.js`: **Pillar C** 授权管理器。控制打字记录是否开启。
- `src/cleaner/`: **清洗管道**。包含 `sensitive-filter.js` 和 `content-segmenter.js`。
- `src/recorder/keyboard-recorder.js`: 键盘事件记录器，受 `contentMode` 开关控制。

### 渲染进程 (Renderer Process)
- `src/index.html`: 主 UI 界面，包含宠物区域、聊天设置面板 (chat)、生产力面板 (tools) 和互动面板 (fun)。
- `src/renderer.js`: UI 逻辑总入口。包含了面板拖拽、授权界面刷新 (`setupContentReviewTab`) 等功能。
- `src/styles-*.css`: 样式文件。`styles-pillar-c.css` 负责新版的打字记录器和回顾面板样式。
- `src/recorder/type-recorder.js`: **记录器与回顾面板** 控制类，负责拉取本地记录在前端显示预览。

### 技能引擎 (Skill Engine)
- `src/skills/skill-engine.js`: Skill 的执行引擎，负责解析 `SKILL.md`，组装 Prompt，请求 AI。
- `src/skills/skills/`: 各个 Skill 的定义目录。比如 `daily-report/SKILL.md` 等。

## 三、近期架构调整 (Pillar C)

最近刚完成的内容重构重点：

1. **移除了主动录制按钮**：
   - 以前用户可以在 "打字记录器" 面板手动点击 "录制"。
   - **现在**: 录制的启停完全由**隐私授权** (`consent-check`) 控制。当用户在回顾面板点击「了解并开启记录授权」并同意后，主进程自动开启 `KeyboardRecorder`，并在每次启动应用时检查授权自动开启。

2. **内容回顾面板合并**：
   - 原先独立的 `tab-content-review` (📝 回顾) 被合并到了 `tab-tools-recorder` 内部的底部。
   - `renderer.js` 中的 `setupContentReviewTab()` 负责将时间轴和统计数字渲染到 `#recorder-review-section` 中。
   - 统计数字（X 段 X 字）是由后台每10分钟执行一次的 `TextConverter -> ContentSegmenter` 异步生成的。如果在界面上看到 0 段 0 字，是因为还没到下一个 10 分钟调度或今天没有打字数据。

## 四、UI 设置架构详解

### 4.1 面板与 Tab 结构

项目有 **3 个可见面板**（漫画气泡风格），通过 `#toolbar` 的 4 个按钮触发：

| 按钮 | `data-action` | 面板 ID | 说明 |
|---|---|---|---|
| 💬 | `chat` | `#chat-container` | 聊天 + 设置 |
| 📋 | `tools` | `#tools-container` | 生产力工具 |
| ⚡ | `quick-panel` | 无 DOM（独立窗口） | Quick Panel (IPC 调用) |
| 🎮 | `fun` | `#fun-container` | 角色与宠物 |

**聊天面板** (`#chat-container`) 的 2 个 Tab：
- `tab-chat` — 聊天消息 + 输入框
- `tab-settings` — **设置页面** (本节重点)

**工具面板** (`#tools-container`) 的 6 个 Tab：
`tools-pomodoro`(🍅专注) / `tools-todo`(📝待办) / `tools-recorder`(⌨打字记录器) / `tools-clipboard`(📋剪贴板) / `tools-sysinfo`(📊系统信息) / `tools-rhythm`(🎵节奏仪表盘)

**娱乐面板** (`#fun-container`) 的 6 个 Tab + 登录屏：
`fun-character`(👤角色) / `fun-status`(🐱状态) / `fun-shop`(🛒商店) / `fun-owned`(📦已有) / `fun-connection`(🌐联机) / `fun-leaderboard`(🏆排行榜)

### 4.2 Tab 切换机制

- **Tools / Fun 面板**: 由 `renderer.js` 中的 `setupTabbedPanel()` 函数统一处理（通用 tab 切换逻辑）
- **Chat 面板**: Tab 切换由 `ChatUI.switchTab()` **独立实现**，不走 `setupTabbedPanel`
- 切换方式：`.tab-content { display: none }` / `.tab-content.active { display: block }`

### 4.3 设置面板 (`#tab-settings`) 的完整设置项

#### A. AI 服务配置

| 设置项 | 元素 ID | 类型 | Store Key |
|---|---|---|---|
| AI服务预设 | `#setting-preset` | `<select>` | `apiPreset` |
| API基础地址 | `#setting-api-url` | `<input text>` | `apiBaseUrl` |
| 模型(下拉) | `#setting-model` | `<select>` | `modelName` |
| 模型(自定义) | `#setting-model-custom` | `<input text>` | `modelName` |
| API密钥 | `#setting-api-key` | `<input password>` | `apiKey` |
| 测试连接 | `#test-connection-btn` / `#test-connection-status` | button + span | — |
| 识图模型 | `#setting-vision-model` | `<input text>` | `visionModel` |
| 不透明度 | `#setting-opacity` / `#opacity-value` | range + span | `opacity` |
| 猫咪性格 | `#setting-personality` | `<select>` | `catPersonality` |

**预设切换逻辑** (`API_PRESETS` 定义在 `renderer.js`):
- 预设选项: `custom`, `openai`, `claude`, `deepseek`, `openrouter`, `gemini`, `openclaw`
- `ChatUI.populateModels()` 根据预设动态填充模型列表、控制 URL 输入框显隐、切换下拉/自定义输入

#### B. 记忆管理

| 元素 ID | 说明 |
|---|---|
| `#memory-list` | 动态渲染记忆条目 (`_renderMemoryList()`) |
| `#memory-clear-btn` | 清除所有记忆 |

#### C. 技能设置

| 设置项 | 元素 ID | Store Key |
|---|---|---|
| 文本转换器开关 | `#skill-text-converter` (checkbox) | `skillsEnabled.textConverter` |
| 日报开关 | `#skill-daily-report` (checkbox) | `skillsEnabled.dailyReport` |
| 日报时间 | `#skill-report-hour` (number) | `dailyReportHour` |
| 日报存放路径 | `#daily-report-dir` (readonly) + `#daily-report-dir-btn` | `dailyReportOutputDir` |
| 待办提取器开关 | `#skill-todo-extractor` (checkbox) | `skillsEnabled.todoExtractor` |
| 待办提醒间隔 | `#todo-remind-interval` (number, 分钟) | `todoRemindInterval` |

#### D. 主动交互

| 设置项 | 元素 ID | Store Key (嵌套在 `proactiveConfig`) |
|---|---|---|
| 启用开关 | `#proactive-enabled` (checkbox) | `enabled` |
| 每日频率 | `#proactive-max-daily` (range 1-15) / `#proactive-freq-value` | `maxDailyInteractions` |
| 安静时段 | `#quiet-start` + `#quiet-end` (number) | `quietHours.start/end` |
| 场景开关 | `#scene-info/care/efficiency/chat` (checkbox) | `enabledSceneTypes` |

#### E. 底部保存

`#settings-save` 按钮，sticky 定位在底部。

### 4.4 设置数据流

```
[用户修改 UI] → 点击保存 → ChatUI.setupSettingsEvents() → 
  window.electronAPI.setStore(key, value) →
  ipcRenderer.invoke('set-store', key, value) →
  main.js: ipcMain.handle('set-store') → store.set(key, value)
```

```
[页面加载/切换到 settings tab] → ChatUI.loadSettings() →
  window.electronAPI.getStore(key) →
  ipcRenderer.invoke('get-store', key) →
  main.js: ipcMain.handle('get-store') → store.get(key) → 返回值填入 DOM
```

### 4.5 脏检查机制

- `ChatUI._snapshotSettings()`: 进入 settings tab 时拍摄当前所有控件值的快照
- `ChatUI._isSettingsDirty()`: 逐字段比较当前 DOM 值与快照，任一不同返回 `true`
- **触发点**: 切换离开 settings tab 时、关闭面板时；如果脏则弹出 `confirm()` 提示保存

### 4.6 设置面板样式

- **主样式文件**: `src/styles.css`
- 关键选择器: `.setting-group`(设置项布局)、`.setting-actions`(保存按钮)、`.setting-section-title`(分区标题)、`.memory-*`(记忆列表)
- 设计风格: 漫画风 — 白底 + `3px solid #222` 边框 + `22px` 圆角 + `3px 3px 0 #222` 阴影
- `styles-pillar-c.css` 只负责内容回顾面板，与设置页无关

### 4.7 关键代码位置一览

| 需求 | 文件 | 位置 |
|---|---|---|
| 设置面板 HTML | `src/index.html` | `#tab-settings` 区域 |
| 设置读取/保存/脏检查 | `src/chat/chat-ui.js` | `loadSettings()`, `setupSettingsEvents()`, `_snapshotSettings()`, `_isSettingsDirty()` |
| 预设定义 (`API_PRESETS`) | `src/renderer.js` | 约第 45-77 行 |
| store 默认值 | `main.js` | `new Store({ defaults: {...} })` 约第 18-86 行 |
| IPC 桥接 | `preload.js` | `getStore()`, `setStore()` |
| store IPC handler | `main.js` | `ipcMain.handle('get-store')`, `ipcMain.handle('set-store')` |
| 设置面板样式 | `src/styles.css` | `.setting-group` 等，约第 582-701 行 |

## 五、调试与修改指南

- **如果你需要修改界面 (UI/CSS)**: 找 `src/index.html`、`src/renderer.js` (尤其是结尾的 `setup*` 函数) 以及 `src/styles-pillar-c.css`。
- **如果你需要修改设置页面**: 改 `src/index.html`(HTML) + `src/chat/chat-ui.js`(读取/保存/脏检查) + `main.js`(store defaults)。**新增设置项需要同时改 4 处**：HTML、`loadSettings()`、保存逻辑、`_snapshotSettings()` + `_isSettingsDirty()`。
- **如果你需要修改记录管线 (Recording/Filtering)**: 找 `src/recorder/keyboard-recorder.js` 和 `src/cleaner/sensitive-filter.js`。
- **如果你需要修改技能提示词或逻辑 (Skills)**: 找 `src/skills/skills/` 下的 `SKILL.md` 文件，如果涉及到代码逻辑（如日报组装上下文），去改 `src/skills/daily-report.js` 等 `.js` 文件。
- **IPC 通道问题**: 在 `main.js` 找 `ipcMain.handle` 或 `ipcMain.on`，在 `preload.js` 中找 `ipcRenderer.invoke`。