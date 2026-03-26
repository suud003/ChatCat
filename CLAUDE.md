# ChatCat Desktop Pet - Architecture & Development Standards
## 始终使用中文和用户交流
## Project Overview

ChatCat 是一个基于 Electron 的桌面宠物应用，支持 AI 聊天、生产力工具、节奏分析、多人联机等功能。

## Directory Structure

```
Bongocat/
├── main.js                     # 主进程入口
├── preload.js                  # Context Bridge (IPC 桥接)
├── package.json                # 依赖与脚本
├── assets/                     # 图标等静态资源
├── src/
│   ├── index.html              # 主窗口 HTML
│   ├── renderer.js             # 渲染进程入口
│   ├── styles.css              # 主样式
│   ├── styles-pillar-c.css     # V2 Pillar C 样式
│   ├── ai-runtime/             # AI Runtime (三阶段架构)
│   │   ├── index.js            # 导出入口
│   │   ├── runtime.js          # 执行编排器
│   │   ├── scene-registry.js   # 场景注册中心
│   │   ├── prompt-registry.js  # Prompt 模板管理 (带版本)
│   │   ├── model-profiles.js   # 模型参数配置
│   │   ├── trigger.js          # Trigger 定义
│   │   ├── trigger-bus.js      # 主进程 AI 调度中心
│   │   ├── trigger-bus-renderer.js  # 渲染进程 TriggerBus 代理
│   │   ├── scheduled-trigger-registry.js  # 定时器管理
│   │   ├── context/            # 上下文组装
│   │   │   ├── context-hub.js  # 可插拔上下文中心
│   │   │   └── providers/      # 上下文提供者
│   │   │       ├── personality-provider.js
│   │   │       ├── history-provider.js
│   │   │       ├── memory-provider.js
│   │   │       ├── behavior-provider.js
│   │   │       ├── todo-provider.js
│   │   │       ├── raw-typing-provider.js
│   │   │       ├── converted-text-provider.js
│   │   │       └── pomodoro-provider.js
│   │   └── scenes/             # 场景定义
│   │       ├── chat-scenes.js
│   │       ├── quick-scenes.js
│   │       ├── skill-scenes.js
│   │       ├── memory-scenes.js
│   │       └── proactive-scenes.js
│   ├── chat/                   # 聊天系统
│   │   ├── ai-service.js       # 聊天编排 (通过 TriggerBus)
│   │   ├── chat-ui.js          # 漫画气泡 UI + Tab 系统
│   │   ├── personality.js      # 性格定义
│   │   ├── memory-manager.js   # 长期记忆管理
│   │   ├── proactive-chat.js   # 主动消息
│   │   └── todo-parser.js      # Todo 提取
│   ├── skills/                 # 技能系统
│   │   ├── skill-registry.js   # SKILL.md 解析器
│   │   ├── skill-engine.js     # 技能执行 (通过 AIRuntime)
│   │   ├── skill-router.js     # 命令/关键词路由
│   │   ├── skill-scheduler.js  # 定时技能触发
│   │   ├── text-converter.js   # 文本转换技能
│   │   ├── daily-report.js     # 日报技能
│   │   ├── todo-extractor.js   # Todo 提取技能
│   │   └── skills/             # SKILL.md 定义文件
│   │       ├── text-converter/SKILL.md
│   │       ├── todo-management/SKILL.md
│   │       ├── ui-style-guide/SKILL.md
│   │       └── weekly-report/SKILL.md
│   ├── quick-panel/            # 快捷面板 (V2 Pillar B)
│   │   ├── quick-panel-main.js       # 主进程管理器
│   │   ├── quick-panel-renderer.js   # 渲染进程
│   │   ├── quick-panel-preload.js    # 面板 preload
│   │   ├── quick-panel.html          # 面板 HTML
│   │   ├── screenshot-ocr.js         # 截图 + OCR
│   │   ├── screenshot-overlay.html   # 截图叠加层
│   │   ├── screenshot-overlay.js
│   │   ├── screenshot-preload.js
│   │   └── text-processor.js         # 文本处理模式
│   ├── proactive/              # 主动引擎
│   │   ├── proactive-engine.js       # 主编排器
│   │   ├── signal-collector.js       # 信号收集
│   │   ├── timing-judge.js           # 时机判断
│   │   ├── notification-mgr.js       # 通知管理 (L0-L3)
│   │   ├── rhythm-analyzer.js        # 节奏分析
│   │   ├── composite-signal-engine.js # 复合信号
│   │   ├── user-profiler.js          # 用户画像
│   │   ├── mouse-signal-collector.js # 鼠标信号
│   │   └── scenes/                   # 主动场景
│   │       ├── typing-mood-detect.js (P0)
│   │       ├── work-phase-detect.js (P0)
│   │       ├── milestone-celebrate.js (P0)
│   │       ├── clipboard-aware.js (P1)
│   │       ├── calendar-aware.js (P1)
│   │       ├── idle-chat.js (P1)
│   │       ├── cat-self-report.js (P2)
│   │       ├── relationship-deepen.js (P2)
│   │       ├── rhythm-scenes.js (P2)
│   │       └── ... (classic scenes)
│   ├── recorder/               # 键盘/打字记录
│   │   ├── keyboard-recorder.js      # 主进程键盘记录
│   │   ├── type-recorder.js          # 渲染进程打字动画
│   │   └── pinyin-detector.js        # 拼音状态机
│   ├── pet/                    # 宠物角色系统
│   │   ├── character.js              # 基础角色接口
│   │   ├── pixel-character.js        # 像素角色
│   │   ├── spritesheet-character.js  # 精灵图角色
│   │   ├── live2d-character.js       # Live2D 角色
│   │   ├── affection-system.js       # 好感度系统
│   │   ├── surprise-events.js        # 随机惊喜事件
│   │   ├── pet-base-system.js        # 基地/升级系统
│   │   └── pet-base-items.js         # 基地物品定义
│   ├── multiplayer/            # 多人联机
│   │   ├── mp-client.js              # WebSocket 客户端
│   │   ├── embedded-server.js        # 内嵌 WebSocket 服务
│   │   ├── server-core.js            # 服务器核心
│   │   ├── protocol.js               # 消息协议
│   │   ├── connection-ui.js          # 连接 UI
│   │   ├── leaderboard-ui.js         # 排行榜
│   │   └── mini-cat-renderer.js      # 小猫渲染
│   ├── shared/                 # 共享模块
│   │   └── ai-client-main.js        # 统一 AI API 客户端
│   ├── ui/                     # UI 组件
│   │   └── panel-tab-transition.js   # Tab 切换动画
│   ├── widgets/                # 功能组件
│   │   ├── clipboard.js              # 剪贴板历史
│   │   ├── pomodoro.js               # 番茄钟
│   │   ├── rhythm-dashboard.js       # 节奏仪表盘
│   │   ├── system-info.js            # 系统信息
│   │   └── todo-list.js              # Todo 列表
│   ├── cleaner/                # V2 Pillar C 内容处理
│   │   ├── content-segmenter.js      # 内容分段
│   │   └── sensitive-filter.js       # 敏感词过滤
│   ├── consent/                # V2 Pillar C 隐私授权
│   │   ├── privacy-consent.js        # 授权管理器
│   │   ├── consent-dialog.js         # 对话框逻辑
│   │   ├── consent-dialog.html       # 对话框 UI
│   │   └── consent-preload.js        # 对话框 preload
│   ├── input/                  # 输入追踪
│   ├── icons/                  # 图标资源
│   ├── avatars/                # 头像资源
│   ├── illustrations/          # 插图资源
│   └── shop-items/             # 商店物品
├── docs/                       # 文档
├── diagrams/                   # 架构图
├── scripts/                    # 构建脚本
├── server/                     # 服务器
└── .github/workflows/          # CI/CD
```

## Core Architecture

### Process Model

- **主进程 (main.js)**: 窗口管理、全局输入钩子、TriggerBus 调度、Store 持久化、技能注册
- **渲染进程 (renderer.js)**: UI 渲染、角色动画、聊天交互、Widget 组件
- **IPC 桥接 (preload.js)**: 通过 contextBridge 暴露 `electronAPI`

### AI Runtime 三阶段架构

**Phase 1 - 定义层**:
- `SceneRegistry`: 集中管理所有 AI 场景定义
- `PromptRegistry`: Prompt 模板管理 (支持版本控制)
- `ModelProfiles`: 模型参数配置 (temperature, maxTokens 等)
- `ContextHub`: 可插拔上下文组装 (Provider 模式)

**Phase 2 - 执行层**:
- `AIRuntime`: 执行编排器
  - `run(trigger)` - 非流式执行
  - `runStream(trigger, onChunk)` - 流式执行
  - `vision(trigger)` - 多模态执行
- Prompt 模式: `instruction` | `chat` | `extract` | `vision`

**Phase 3 - 调度层**:
- `TriggerBus` (主进程): 中央 AI 调度器，优先级队列 (HIGH/NORMAL/LOW)，并发限制 (默认3)
- `TriggerBusRenderer` (渲染进程): 渲染端代理
- `ScheduledTriggerRegistry`: 定时器管理 (cron/interval 两种模式)

### AI 调用流程

```
渲染进程创建 AITrigger → IPC 提交到 TriggerBus → 优先级队列排队
→ AIRuntime 执行: 上下文组装 → Prompt 构建 → API 调用
→ 流式/非流式结果通过 IPC 推回渲染进程
```

### Scene 定义结构

```javascript
{
  id: 'chat.default',
  category: 'chat',
  description: 'Main chat scene',
  prompt: {
    templateId: 'chat-system-prompt',
    mode: 'chat'  // | 'instruction' | 'extract' | 'vision'
  },
  contextProviders: ['personality', 'history', 'memory', 'behavior', 'todo'],
  modelProfile: 'chat-stream',
  outputMode: 'stream-text',
  memoryPolicy: 'read-write',
  guards: { requiresConsent: false, quietHoursAware: false }
}
```

### Skill 定义结构 (SKILL.md)

```yaml
name: skill-name
description: Description
commands: [/command]
keywords: [keyword]
schedule:
  cronHour: 18  # 或 interval: 60
context: [rawTyping, convertedText, todos, pomodoroStats]
requiresAI: true
localHandler: null
maxTokens: 2000
temperature: 0.7
---

Skill prompt body goes here
```

### IPC Protocol 分类

| 类别 | Handler |
|------|---------|
| Store | `get-store`, `set-store` |
| 窗口控制 | `window-drag`, `set-ignore-mouse`, `move-to-display` |
| 录制 | `recorder-toggle`, `recorder-set-dir`, `recorder-get-status` |
| 剪贴板 | `clipboard-get-history`, `clipboard-copy`, `clipboard-clear` |
| 技能 | `skill-execute`, `skill-get-status`, `skill-get-all-meta` |
| 多人 | `mp-start-server`, `mp-stop-server`, `mp-get-server-status` |
| AI Runtime | `trigger-bus-submit`, `trigger-bus-get-result` |
| Quick Panel | `qp-process-text`, `qp-ask`, `qp-recognize-image` |
| 隐私授权 | `consent-check`, `consent-request`, `consent-revoke` |

### 窗口管理

- 单个全屏透明窗口覆盖当前显示器
- 多显示器支持：自动跟随猫咪切换窗口
- 透明区域点击穿透 (`setIgnoreMouseEvents`)
- 系统托盘图标 + 右键菜单
- 单实例锁 (`requestSingleInstanceLock`)

## V2 Three Pillars

- **Pillar A**: 节奏智能 - 行为分析、主动交互
- **Pillar B**: 快捷面板 - 截图 OCR、文本处理 (润色/解释/总结)
- **Pillar C**: 隐私与内容分析 - 授权管理、内容分段、敏感过滤

## Design System
Always read DESIGN.md before making any visual or UI decisions.
All font choices, colors, spacing, animation intents, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that doesn't match DESIGN.md.

## Coding Conventions

### Module System
- **主进程**: CommonJS (`require` / `module.exports`)
- **渲染进程**: ES Modules (`import` / `export`)

### Error Handling
- 统一 `try-catch` + `console.log/warn/error`
- 日志前缀: `[ModuleName] message`

### Async Pattern
- 全程使用 `async/await` 和 `Promise`
- 流式调用通过回调 `onChunk` 处理

### Naming Conventions
- 文件名: `kebab-case` (如 `ai-service.js`)
- 类名: `PascalCase` (如 `AIService`)
- 变量/函数: `camelCase`
- 常量: `UPPER_SNAKE_CASE`
- Store key: `camelCase`

### Logging
- 统一前缀格式: `[ModuleName] 消息内容`
- 示例: `[AIRuntime] Initialized: 16 scenes`
- 错误: `console.error('[ModuleName]', error)`

### New Feature Development Guidelines

1. **新增 AI 场景**: 在 `src/ai-runtime/scenes/` 中定义 scene，在 `scene-registry.js` 中注册
2. **新增上下文**: 在 `src/ai-runtime/context/providers/` 中实现 Provider，在 `context-hub.js` 中注册
3. **新增技能**: 在 `src/skills/skills/` 中创建 `SKILL.md`，使用 YAML frontmatter 定义
4. **新增主动场景**: 在 `src/proactive/scenes/` 中实现，在 `proactive-engine.js` 中注册
5. **新增 Widget**: 在 `src/widgets/` 中实现，在 `renderer.js` 中初始化
6. **新增 IPC**: 在 `main.js` 中添加 handler，在 `preload.js` 中暴露桥接

### Dependencies

- **Runtime**: `electron`, `electron-store`, `uiohook-napi`, `ws`, `bcryptjs`
- **Dev**: `electron-builder`, `sharp`
- **AI API**: 通过 `ai-client-main.js` 统一调用，支持 OpenAI/Claude/DeepSeek/Gemini/Ollama 等

### Build & Run

```bash
npm start          # 启动应用
npm run dev        # 开发模式 (开启 DevTools)
npm run build      # 构建 Windows 安装包
npm run build:mac  # 构建 macOS 安装包
npm run build:all  # 全平台构建
```

### Available Skills

- `/office-hours` - Office hours
- `/plan-ceo-review` - Plan CEO review
- `/plan-eng-review` - Plan engineering review
- `/plan-design-review` - Plan design review
- `/design-consultation` - Design consultation
- `/review` - Code review
- `/ship` - Ship code
- `/land-and-deploy` - Land and deploy
- `/canary` - Canary deployment
- `/benchmark` - Benchmarking
- `/browse` - Web browsing (**use this instead of mcp__claude-in-chrome__**)
- `/qa` - QA testing
- `/qa-only` - QA only
- `/design-review` - Design review
- `/setup-browser-cookies` - Setup browser cookies
- `/setup-deploy` - Setup deployment
- `/retro` - Retrospective
- `/investigate` - Investigate issues
- `/document-release` - Document release
- `/codex` - Codex
- `/cso` - CSO
- `/autoplan` - Auto planning
- `/careful` - Careful mode
- `/freeze` - Freeze
- `/guard` - Guard
- `/unfreeze` - Unfreeze
- `/gstack-upgrade` - Upgrade gstack
