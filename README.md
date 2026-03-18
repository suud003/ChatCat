# ChatCat 🐱 Desktop Pet & Productivity AI

一款基于 Electron 的桌面宠物 + 生产力 AI 工具。猫咪陪你写代码，同时默默分析你的工作节奏、帮你处理文本、整理日报。

![Electron](https://img.shields.io/badge/Electron-35-blue) ![License](https://img.shields.io/badge/license-MIT-green)

## ✨ 核心特性

### 🐱 桌面宠物

- **Sprite 角色** — 基于 [bongo.cat](https://github.com/Externalizable/bongo.cat) (MIT) 的分层 PNG 合成，猫爪跟随你的键鼠动作
- **9 种皮肤** — Classic / Orange / Pink / Blue / Green / Purple / Golden / Shadow / Inverted
- **AI 聊天** — 漫画气泡风格，流式响应，支持 OpenAI / Claude / DeepSeek / Gemini / OpenRouter / OpenClaw
- **主动互动** — 19 个场景 (里程碑庆祝、关系加深、日报提醒、心流守护等)，猫咪不只是装饰
- **透明窗口** — 置顶、可拖拽、可缩放、系统托盘支持

---

## 🏗️ V2 三支柱架构

ChatCat V2 围绕三个功能支柱构建，层次分明、隐私明确：

### ⚡ Pillar A — 行为节奏智能

> **零内容采集**，仅凭键鼠频率推断工作状态

| 能力 | 说明 |
|------|------|
| 状态推断 | 7 种状态：`flow`(心流) / `stuck`(卡壳) / `reading`(阅读) / `chatting`(聊天) / `typing`(打字) / `away`(离开) / `idle`(空闲) |
| 节奏仪表盘 | 实时状态 / 今日统计 / 小时热力图 / 智能洞察 |
| AI 上下文注入 | 猫咪聊天时自动感知你的工作节奏（CPM、退格率、鼠标活跃度等） |
| 节奏场景 | 心流守护 / 卡壳检测 / 休息提醒 |

### 🔧 Pillar B — 轻办公 AI (Quick Panel)

> 用户主动触发，即用即抛

| 能力 | 说明 |
|------|------|
| 全局快捷键 | `⌘⇧Space` 一键唤出独立面板 |
| 截图 OCR | 全屏截图 → 选区裁剪 → Vision API 文字识别（多显示器支持） |
| 文本处理 | 划选文本 → 润色 / 翻译 / 摘要 |
| 快捷问答 | 输入问题 → 流式 SSE 返回结果 |
| 剪贴板识图 | 复制图片 → 猫咪气泡提示 → 一键跳转 OCR |

### 🔒 Pillar C — 打字内容消费

> **必须经过用户隐私授权** 才能开启，双勾确认制

```
用户授权 → KeyboardRecorder 自动启动 → SensitiveFilter 过滤
  → TextConverter AI转换 → ContentSegmenter 分段
  → DailyReport 日报 / TodoExtractor 待办提取
```

| 能力 | 说明 |
|------|------|
| 隐私授权 | 弹窗双勾确认，随时可撤销，授权状态联动录制启停 |
| 敏感过滤 | 密码 / 身份证 / 手机号 / 银行卡 / API Key 等自动脱敏 |
| 内容分段 | 按时间间隔+文本密度自动分为 `code` / `text` / `chat` 段落 |
| AI 日报 | 结合 Pillar A 节奏数据 + Pillar C 内容数据，生成双维度日报 |
| 待办提取 | 从打字内容中自动识别待办事项 |
| 内容回顾 | 时间线视图 + 段落统计 |

---

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 开发模式运行
npm run dev

# 正常运行
npm start

# 构建 macOS
npm run build:mac

# 构建 Windows
npm run build
```

## ⚙️ 配置

点击工具栏 ⚙️ 齿轮图标进入设置：

| 分类 | 配置项 |
|------|--------|
| **AI 服务** | 预设选择 / API 地址 / 模型 / API Key / 连接测试 |
| **识图模型** | Quick Panel 截图 OCR 使用的 Vision 模型 |
| **猫咪性格** | 影响 AI 回复的语气风格 |
| **技能开关** | 文本转换器 / 日报生成 / 待办提取（各自可独立开关） |
| **主动交互** | 启用开关 / 每日频率 / 安静时段 / 场景类型筛选 |

---

## 📂 项目结构

```
ChatCat/
├── main.js                         # 主进程入口
├── preload.js                      # IPC 桥接 (electronAPI)
├── src/
│   ├── renderer.js                 # 渲染进程入口（UI 总逻辑）
│   ├── index.html                  # 主界面 HTML
│   ├── styles.css                  # 主样式
│   ├── styles-pillar-c.css         # Pillar C 回顾面板样式
│   │
│   ├── shared/                     # ⭐ AI 统一客户端
│   │   ├── ai-client-main.js       #   主进程: complete/stream/vision
│   │   └── ai-client-renderer.js   #   渲染进程: complete/stream
│   │
│   ├── chat/                       # 聊天模块
│   │   ├── ai-service.js           #   AI 服务 (内部用 AIClientRenderer)
│   │   ├── chat-ui.js              #   聊天 UI + 设置面板
│   │   ├── memory-manager.js       #   记忆管理
│   │   └── todo-parser.js          #   对话待办解析
│   │
│   ├── quick-panel/                # ⚡ Pillar B: Quick Panel
│   │   ├── quick-panel-main.js     #   主进程: 窗口管理 + IPC
│   │   ├── quick-panel-renderer.js #   面板 UI
│   │   ├── quick-panel.html        #   面板 HTML
│   │   ├── screenshot-ocr.js       #   截图 OCR
│   │   ├── screenshot-overlay.*    #   截图选区覆层
│   │   └── text-processor.js       #   文本润色/翻译/摘要
│   │
│   ├── recorder/                   # 键盘记录
│   │   ├── keyboard-recorder.js    #   键盘事件记录 (受授权控制)
│   │   ├── type-recorder.js        #   记录器面板 UI
│   │   └── pinyin-detector.js      #   拼音推断
│   │
│   ├── cleaner/                    # 🔒 Pillar C: 清洗管道
│   │   ├── sensitive-filter.js     #   敏感信息过滤
│   │   └── content-segmenter.js    #   内容分段器
│   │
│   ├── consent/                    # 🔒 隐私授权
│   │   ├── privacy-consent.js      #   授权管理器
│   │   ├── consent-dialog.*        #   授权弹窗
│   │   └── consent-preload.js
│   │
│   ├── proactive/                  # 主动交互引擎
│   │   ├── proactive-engine.js     #   主引擎
│   │   ├── signal-collector.js     #   键盘信号采集
│   │   ├── mouse-signal-collector.js  # 鼠标信号采集
│   │   ├── rhythm-analyzer.js      #   ⚡ Pillar A: 状态机
│   │   ├── composite-signal-engine.js # 组合信号引擎
│   │   └── scenes/                 #   19 个交互场景
│   │
│   ├── skills/                     # 技能引擎
│   │   ├── skill-engine.js         #   技能执行引擎
│   │   ├── daily-report.js         #   日报生成
│   │   ├── text-converter.js       #   文本转换
│   │   ├── todo-extractor.js       #   待办提取
│   │   └── skills/                 #   技能定义 (SKILL.md)
│   │
│   ├── widgets/                    # UI 组件
│   │   └── rhythm-dashboard.js     #   节奏仪表盘
│   │
│   ├── pet/                        # 宠物精灵渲染
│   ├── input/                      # 输入处理
│   ├── multiplayer/                # 联机功能
│   └── utils/                      # 工具函数
│
├── docs/
│   └── dev-module-context.md       # 📖 详细开发文档
│
├── server/                         # 联机服务端
└── assets/                         # 图标资源
```

---

## 🔧 开发指南

### AI 请求规范

**所有 AI API 调用必须通过统一客户端，禁止各模块单独手写 fetch！**

```
主进程 → AIClientMain (src/shared/ai-client-main.js)
  ├── complete()  — 非流式 (skills)
  ├── stream()    — 流式 SSE (Quick Panel)
  └── vision()    — 图片识别 (截图 OCR)

渲染进程 → AIClientRenderer (src/shared/ai-client-renderer.js)
  ├── complete()  — 非流式 (memory, todo)
  └── stream()    — 流式 async generator (聊天)
```

### 新增设置项 Checklist

新增用户可配置的设置项，**必须同时修改 4 处**：

1. **`src/index.html`** — `#tab-settings` 中添加 HTML 表单元素
2. **`src/chat/chat-ui.js`** — 4 个子步骤:
   - 构造函数 `getElementById()` 绑定 DOM
   - `loadSettings()` 加载值
   - `setupSettingsEvents()` 保存按钮逻辑
   - `_snapshotSettings()` + `_isSettingsDirty()` 脏检查
3. **`main.js`** — `new Store({ defaults })` 添加默认值
4. **(可选) `preload.js`** — 如需新 IPC 通道

### Tab 切换机制

- **Chat 面板** → `ChatUI.switchTab()` 独立实现
- **Tools / Fun 面板** → `renderer.js` 中 `setupTabbedPanel()` 统一处理

### 设置数据流

```
UI 修改 → 保存按钮 → electronAPI.setStore() → IPC → main.js → store.set()
页面加载 → loadSettings() → electronAPI.getStore() → IPC → main.js → store.get() → 填入 DOM
```

### 常见修改指引

| 我想改... | 去看... |
|-----------|---------|
| AI 聊天逻辑 | `src/chat/ai-service.js` |
| 设置页面 | `src/index.html` + `src/chat/chat-ui.js` + `main.js` |
| Quick Panel | `src/quick-panel/` |
| 键盘记录 & 过滤 | `src/recorder/keyboard-recorder.js` + `src/cleaner/` |
| 技能 Prompt | `src/skills/skills/*/SKILL.md` |
| 技能执行逻辑 | `src/skills/*.js` |
| 主动交互场景 | `src/proactive/scenes/` |
| 节奏分析 | `src/proactive/rhythm-analyzer.js` |
| IPC 通道 | `main.js` (handler) + `preload.js` (bridge) |
| 宠物外观 | `src/pet/` |

> 💡 更详细的模块上下文和代码位置索引见 [`docs/dev-module-context.md`](docs/dev-module-context.md)

---

## 🛠️ 技术栈

| 技术 | 用途 |
|------|------|
| [Electron 35](https://www.electronjs.org/) | 桌面应用框架 |
| Canvas 2D | 宠物精灵渲染 |
| OpenAI-compatible API | AI 聊天 / 技能 / OCR (流式 SSE) |
| [uiohook-napi](https://github.com/nickhall/uiohook-napi) | 全局键鼠 Hook |
| [electron-store](https://github.com/sindresorhus/electron-store) | 本地持久化存储 |
| [electron-builder](https://www.electron.build/) | 打包构建 (macOS DMG / Windows NSIS) |

## 📜 Credits

Cat sprites from [bongo.cat](https://github.com/Externalizable/bongo.cat) by Externalizable (MIT License).
