# AI Runtime 统一架构：完成度回顾与架构总结

## 概述

PPT 分支已**成功完成设计文档中 Phase 1-5 的全部规划目标**。系统现在是一个**成熟的、集中式的 AI 编排平台**，具备统一触发、场景驱动路由、主进程执行和**提示词统一收口**的完整能力。

**状态**: Phase 1-5 全部完成

---

## 一、各阶段完成度清单

### Phase 1: 注册表基础层

- [x] `SceneRegistry` 包含 11+ 场景定义
- [x] `ContextHub` 包含 8 个可插拔上下文提供者
- [x] `PromptRegistry` 支持多源提示词解析
- [x] `ModelProfiles` 包含 11+ 预配置模型参数
- [x] Chat/Skill/Quick Panel 均从注册表读取配置

### Phase 2: Runtime 统一执行入口

- [x] `AIRuntime.run()` 和 `AIRuntime.runStream()` 完整实现
- [x] 场景解析器：触发器到场景的匹配路由
- [x] 守卫执行（用户同意、安静时段、冷却期、每日限额）
- [x] ContextHub 按场景声明的 provider 子集调用
- [x] 通过 PromptRegistry + PromptComposer 组装提示词
- [x] 模型网关路由（complete/stream/vision 三种模式）
- [x] 后处理器管线正常工作

### Phase 3: 统一触发总线

- [x] `AITrigger` 对象模型标准化
- [x] TriggerBus 实现优先级队列（HIGH/NORMAL/LOW）
- [x] 所有触发源统一发出 AITrigger：
  - 聊天 UI → `{source: 'chat', type: 'user-message'}`
  - Quick Panel → `{source: 'quick-panel', type: 'polish|ask'}`
  - 技能 → `{source: 'skill', type: 'invoke'}`
  - 定时任务 → `{source: 'schedule', type: 'daily-report'}`
  - 主动触发 → `{source: 'proactive', type: 'signal'}`
- [x] 端到端触发路由全部打通

### Phase 4: Renderer 进程瘦身

- [x] Runtime 完全运行在 Main 进程
- [x] `AIClientRenderer` 已删除（Renderer 零 HTTP）
- [x] `AIRuntimeRenderer` 已删除
- [x] Renderer 仅作为 IPC 薄适配层（`TriggerBusRenderer`）
- [x] 所有 AI 编排/决策在 Main 进程完成
- [x] 流式传输通过 IPC 事件正常工作

### Phase 5: 提示词统一收口（已完成）

- [x] 聊天系统提示词迁移到 PromptRegistry v2.0.0 resolver（`_buildChatSystemPromptFromContext`）
- [x] ContextHub 提供全部上下文数据（personality, memory, behavior, todo）
- [x] Renderer `AIService` 不再构建系统提示词，仅提交 `{ history }` 触发器
- [x] `personality-provider` / `behavior-provider` 改为从 electron-store 读取
- [x] 向后兼容：proactive-engine 仍可通过 `payload.systemPrompt` 透传
- [x] `CHAT_PERSONALITIES` 字典在 prompt-registry.js 中维护（需与 personality.js 保持同步）

---

## 二、当前架构（Phase 5 完成后）

### 第一层：定义层（无状态注册表）

```
SceneRegistry（11+ 场景）
├── chat.default, chat.followup, chat.proactive
│   └── chat.default/followup: contextProviders: [personality, history, memory, behavior, todo]
├── quick.polish, quick.summarize, quick.explain, quick.ask
├── skill.text-converter, skill.todo-management, skill.daily-report
├── memory.extract
└── vision.ocr

PromptRegistry（多源适配器）
├── JS 提示词（memory-extract, quick.*）
├── SKILL.md 提示词（按需加载）
├── Resolver 提示词（运行时动态生成）
│   └── chat-system-prompt v2.0.0: resolver:context-hub（从 ContextHub 数据构建）
└── 每个提示词的版本追踪

ModelProfiles（11 个配置）
├── chat-stream（temp=0.8, tokens=500）
├── quick-*（temp=0.3-0.5, tokens=800）
├── skill-*（temp 因场景而异）
├── memory-extract（temp=0.3, tokens=200）
└── vision-ocr（temp=0.2, tokens=2000）

ContextHub（8 个提供者）
├── personality, history, memory
├── behavior, todo, raw-typing
├── converted-text, pomodoro
└── image provider（视觉场景）
```

### 第二层：执行引擎

```
AITrigger（标准化请求对象）
├── id, type, sceneId, payload, priority

AIRuntime（编排引擎）
├── run() → 非流式完整执行
├── runStream(trigger, onChunk) → 流式执行
└── vision(trigger) → 多模态执行

模型网关（抽象层）
├── AIClientMain.complete()
├── AIClientMain.stream()
└── AIClientMain.vision()

后处理器（结果管线）
├── persist-chat-history（持久化聊天历史）
├── extract-memory（提取记忆）
├── parse-todo（解析待办）
├── save-converted-text（保存转换文本）
└── record-metrics（记录指标）
```

### 第三层：调度与编排

```
TriggerBus（Main 进程）
├── 优先级队列（HIGH/NORMAL/LOW）
├── N=3 并发控制
├── 流式 chunk 通过 IPC 推送
├── 结果缓存（5 分钟 TTL）
└── 事件发射供观察者使用

ScheduledTriggerRegistry（Main 进程）
├── Cron 定时（每天指定时刻）
├── Interval 定时（每 N 分钟）
├── 去重检查（防止重复执行）
└── 动态启用/禁用

TriggerBusRenderer（Renderer 进程）
├── submit() → IPC 调用
├── submitAndWait() → 轮询结果
├── submitAndStream() → 异步生成器
└── subscribeToUpdates() → 实时订阅
```

### 第四层：IPC 桥接

```
Main 进程
├── 创建 AIClientMain（HTTP 客户端）
├── 创建 AIRuntime（执行引擎）
├── 创建 TriggerBus（队列）
├── 创建 ScheduledTriggerRegistry（调度器）
└── 通过 IPC + preload 暴露接口

Renderer 进程
├── 使用 TriggerBusRenderer（IPC 适配器）
├── 提交 trigger → Main
├── 通过事件接收 chunk
└── 不进行任何直接 HTTP 调用
```

---

## 三、数据流与信息管理

### A. 消息/触发器流转（端到端）

```
用户输入（聊天/QuickPanel/技能/信号/定时）
    ↓
创建 AITrigger（id, type, sceneId, payload）
    ↓
TriggerBusRenderer.submitAndStream() [Renderer]
    ↓
IPC: trigger-bus-submit → Main 进程
    ↓
TriggerBus 接收并入队（按优先级排序）
    ↓
TriggerBus._drainQueue() 遵守 N=3 并发限制
    ↓
AIRuntime.runStream(trigger) 执行：
    ├─ 从 SceneRegistry 加载场景定义
    ├─ 提取 contextProviders 列表
    ├─ ContextHub.assembleContext() → 并行调用 provider（FIRST）
    ├─ PromptRegistry.getPrompt(templateId, { ...payload, _assembledContext })
    │   └─ v2.0.0 resolver 使用 _assembledContext 构建 system prompt
    ├─ _buildMessages() → 构建最终 messages 数组
    └─ AIClientMain.stream() → 调用 OpenAI API
    ↓
流式 chunk 通过回调返回
    ↓
TriggerBus 发送 IPC: trigger-chunk { correlationId, chunk }
    ↓
Renderer 通过监听器接收 → ChatUI 显示
    ↓
完成后：IPC trigger-completed { result }
    ↓
后处理器执行（持久化历史、提取记忆等）
    ↓
后台任务（LOW 优先级）按需入队
```

### B. 上下文组装（数据收集）

**聊天回合（场景: `chat.default`）**：
```
并行调用的上下文提供者（5 个）：
├── personality-provider → 从 store 读取 catPersonality / level / catMood
├── history-provider → 最近 N 条聊天记录（从 payload.history）
├── memory-provider → 从 store 读取长期记忆中的关键事实
├── behavior-provider → 从 store 读取 rhythmData_{date}（含实时行为信号）
└── todo-provider → 从 store 读取待办事项列表

结果：_assembledContext 传入 PromptRegistry v2.0.0 resolver
     → _buildChatSystemPromptFromContext(ctx) 构建完整 system prompt
```

**Quick Panel 请求（场景: `quick.polish`）**：
```
调用的上下文提供者：
├── （默认无 — Quick Panel 是无状态的）
```

**技能执行（场景: `skill.daily-report`）**：
```
调用的上下文提供者：
├── converted-text-provider → 之前技能运行的转换文本
├── raw-typing-provider → 原始键盘会话数据
├── todo-provider → 今天提取的待办事项
└── pomodoro-provider → 番茄钟会话信息
```

**设计原则**：场景定义**声明**需要加载哪些 provider
- 无静默数据泄漏
- 每个用例有明确的治理策略
- Token 效率（Quick Panel 不加载聊天历史）

---

## 四、提示词与系统提示词管理

### A. 聊天系统提示词构建流程（Phase 5）

```
数据流：

1. Renderer 持久化实时数据到 store：
   - affection.on('moodchange') -> setStore('catMood', mood)
   - setInterval(60s) -> setStore('rhythmData_{date}', { currentState, avgCPM, deleteRate, ... })

2. AIService 发送触发器（仅包含 history）：
   - { type: 'chat', sceneId: 'chat.default', payload: { history } }

3. AIRuntime 执行：
   - ContextHub.assembleContext(scene, { store, services }) -> FIRST
     |-- personality-provider: store.get('catPersonality'), store.get('level'), store.get('catMood')
     |-- memory-provider: store.get('memories')
     |-- behavior-provider: store.get('rhythmData_{date}') <- 优先从 store，services 作为 fallback
     |-- todo-provider: store.get('todoList')
   - PromptRegistry.getPrompt('chat-system-prompt', { ...payload, _assembledContext })
     |-- v2.0.0 resolver -> _buildChatSystemPromptFromContext(ctx)

4. 最终 messages 数组：
   [{ role: 'system', content: <完整提示词> }, ...history]
```

**最终系统提示词结构（由 `_buildChatSystemPromptFromContext` 生成）**：

```
[基础性格] You are ChatCat, a cute desktop pet cat. {CHAT_PERSONALITIES[personality].systemPromptFragment}
           Keep responses concise (1-3 sentences unless asked for more detail).
           内置能力说明（待办提醒等）

[等级深度] 根据 level 调整亲密度（<=2: 害羞, 3-4: 友好好奇, >=5: 深度纽带）

[心情状态] 根据 catMood（happy/normal/bored）描述当前情绪

[记忆部分] "关于用户的关键事实："
           - {memory_item_1}
           - {memory_item_2}

[行为数据] "--- 实时数据上下文 ---"
           当前状态 / 打字速度 / 退格率 / 鼠标活跃 / 今日打字时长 / 今日心流 / 按键数

[待办事项] "--- 主人的待办事项 ---"
           - [红高] 待办项1 (截止: xxx)
           - [黄中] 待办项2
```

### B. 提示词注册表查找

**注册来源**：

1. **JS 提示词**（注册表中的静态字符串）
   - `memory-extract` 提示词
   - `quick-polish`、`quick-explain`、`quick-summarize`、`quick-ask`
   - `vision-ocr`

2. **SKILL.md 提示词**（从技能定义动态加载）
   - 通过 PromptRegistry 适配器按需加载
   - 模板 ID 格式：`skill.{skillName}`
   - 从 markdown 正文提取

3. **Resolver 提示词**（运行时动态生成）
   - `chat-system-prompt` v2.0.0：接收 `_assembledContext`，调用 `_buildChatSystemPromptFromContext()`
   - 向后兼容：若 payload 含 `systemPrompt`，直接透传（供 proactive-engine 使用）
   - 可检查用户行为、当前时间等
   - 返回全新提示词（如日报模板）

### C. 系统提示词维护矩阵

| 组件 | 系统提示词位置 | 维护方式 |
|------|---------------|---------|
| **聊天** | `src/ai-runtime/prompt-registry.js` (v2.0.0 resolver) | 编辑 `_buildChatSystemPromptFromContext()` 或 `CHAT_PERSONALITIES` 字典 |
| **Quick Panel 润色** | `src/ai-runtime/prompt-registry.js` | `PromptRegistry.getPrompt('quick.polish')` |
| **Quick Panel 问答** | `src/ai-runtime/prompt-registry.js` | `PromptRegistry.getPrompt('quick.ask')` |
| **技能（日报）** | `src/skills/skills/daily-report/SKILL.md` | 编辑 SKILL.md 正文 |
| **记忆提取** | `src/ai-runtime/prompt-registry.js` | `PromptRegistry.getPrompt('memory-extract')` |
| **视觉/OCR** | `src/ai-runtime/prompt-registry.js` | `PromptRegistry.getPrompt('vision-ocr')` |
| **主动触发** | `src/proactive/proactive-engine.js` | 自建提示词透传 payload.systemPrompt（v2.0.0 向后兼容） |

> **核心原则**：所有提示词的 single source of truth 是 `PromptRegistry`。聊天提示词不再在 Renderer 构建，而是由 Main 进程的 ContextHub + PromptRegistry v2.0.0 resolver 统一生成。

### D. 用户输入格式

**聊天输入**：
```javascript
{
  type: 'chat',
  sceneId: 'chat.default',
  payload: {
    history: [...]  // 对话历史数组（Renderer 仅提交历史，不含 systemPrompt）
  }
}
```

**Quick Panel 输入**：
```javascript
{
  type: 'quick-text',
  sceneId: 'quick.polish',
  payload: {
    text: '需要处理的原始文本',
    mode: 'polish'  // 或 'summarize'、'explain'
  }
}
```

**技能输入**：
```javascript
{
  type: 'skill',
  sceneId: 'skill.todo-management',
  payload: {
    skillId: 'todo-management',
    userMessage: '提取今天的待办事项...'
  }
}
```

**定时输入**（自动生成）：
```javascript
{
  type: 'schedule',
  sceneId: 'skill.daily-report',
  payload: {
    date: '2026-03-20',
    triggerType: 'daily-cron'
  }
}
```

---

## 五、AI 服务管理框架

### A. 服务生命周期（main.js:840-979）

```javascript
1.  app.whenReady() → createMainWindow()
2.  创建 AIClientMain（HTTP 客户端）
3.  创建 AIRuntime（执行引擎）
4.  创建 TriggerBus（队列 + 并发）
    └─ 传入 webContents（用于 IPC 推送事件）
5.  创建 ScheduledTriggerRegistry
    └─ 传入 triggerBus（用于提交触发器）
6.  创建 QuickPanelManager
    └─ 传入 triggerBus（用于 AI 请求）
7.  TriggerBus.start()
    └─ 启用队列消费 + 清理定时器
8.  ScheduledTriggerRegistry.start()
    └─ 启用 cron 检查循环
9.  等待 SkillRegistry 就绪
10. AIRuntime.setServices(skillEngine, ...)
11. PromptRegistry.registerSkillPrompts()
12. 在 ScheduledTriggerRegistry 中注册定时技能
13. 挂载后处理钩子
    └─ triggerBus.on('trigger:completed', postProcess)
```

### B. 优先级系统（队列策略）

```
HIGH    → 聊天回复（用户发起，交互式）
         → 抢占 NORMAL/LOW

NORMAL  → 手动技能执行
         → Quick Panel 请求
         → 抢占 LOW

LOW     → 记忆提取（即发即忘）
         → 主动式 AI 生成
         → 在 HIGH/NORMAL 活跃时可无限排队等待
```

**并发控制**：N=3 同时执行
- 当 N=3 全部活跃时，新任务入队等待
- 高优先级任务在 NORMAL/LOW 完成时插队

### C. 后处理钩子

```javascript
triggerBus.on('trigger:completed', ({ trigger, result }) => {
  // 路由 1：文本转换输出
  if (trigger.payload.skillId === 'text-converter') {
    store.set(`convertedText_${dateKey}`, result);
    triggerBus.emit('post:text-saved');
  }

  // 路由 2：待办提取
  if (trigger.payload.skillId === 'todo-management') {
    const todos = skillEngine._parseTodosFromAI(result);
    webContents.send('todos-updated', todos);
  }

  // 路由 3：日报
  if (trigger.payload.skillId === 'daily-report') {
    store.set(`dailyReport_${dateKey}`, {
      content: result,
      generatedAt: Date.now()
    });
  }
});
```

### D. 错误与恢复策略

```
TriggerBus 故障：
├─ 降级回退：直接 IPC 调用（遗留路径）
└─ 结果：功能降级但可用

AIClientMain 故障：
├─ 错误返回给 Renderer
├─ Renderer 显示错误消息
└─ 用户可重试

ScheduledTriggerRegistry 故障：
├─ 记录错误日志
├─ 继续执行下一个调度
└─ 手动触发仍可用

场景未找到：
├─ 触发器立即失败
├─ 错误发送给 Renderer
└─ 通知用户
```

---

## 六、信息流全景图

```
┌─────────────────────────────────────────────────────────────────────┐
│                         RENDERER 进程                                │
│                                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   ChatUI     │  │ QuickPanel   │  │ SkillRouter  │              │
│  │              │  │   UI         │  │              │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                 │                 │                       │
│         ├──→ AIService ────┼──→ SkillScheduler                      │
│         │                 │                 │                       │
│         └─────┬───────────┴─────────────────┘                       │
│               │                                                      │
│         ┌─────↓──────────────────────┐                              │
│         │  TriggerBusRenderer        │                              │
│         │ ┌─ submitAndStream()       │                              │
│         │ ├─ submitAndWait()         │                              │
│         │ └─ subscribeToUpdates()    │                              │
│         └─────┬──────────────────────┘                              │
│               │ IPC 调用:                                            │
│               │ triggerBusSubmit(trigger, options)                   │
└───────────────┼──────────────────────────────────────────────────────┘
                │
        ╔═══════↓═════════════════════════════════════════════════════╗
        ║                      MAIN 进程                               ║
        ║                                                              ║
        ║  ┌──────────────────────────────────────────────────────┐   ║
        ║  │  TriggerBus（优先级队列）                              │   ║
        ║  │  ┌─ 接收并排队触发器（HIGH/NORMAL/LOW）               │   ║
        ║  │  ├─ 并发限制：N=3 同时调用                            │   ║
        ║  │  └─ 消费队列：高优先级先执行                           │   ║
        ║  └────────┬──────────────────────────────────────────────┘   ║
        ║           │                                                   ║
        ║  ┌────────↓──────────────────────────────────────────────┐   ║
        ║  │  AIRuntime.run() / runStream()                       │   ║
        ║  │  1. 从 SceneRegistry 加载场景定义                     │   ║
        ║  │  2. 提取 contextProviders 列表                       │   ║
        ║  │  3. ContextHub.assembleContext() [并行调用]           │   ║
        ║  │     └─ personality, history, memory, behavior...    │   ║
        ║  │  4. PromptRegistry.getPrompt(templateId)            │   ║
        ║  │  5. PromptComposer.buildMessages()                  │   ║
        ║  │  6. ModelGateway.stream() 或 .complete()            │   ║
        ║  └────────┬──────────────────────────────────────────────┘   ║
        ║           │                                                   ║
        ║  ┌────────↓──────────────────────────────────────────────┐   ║
        ║  │  AIClientMain                                        │   ║
        ║  │  ┌─ 统一 OpenAI 兼容 API 客户端                       │   ║
        ║  │  ├─ complete(options)                               │   ║
        ║  │  ├─ stream(options, onChunk)                        │   ║
        ║  │  └─ vision(options) [多模态]                         │   ║
        ║  │                                                      │   ║
        ║  │  调用 → OpenAI / Ollama / 自定义 API                  │   ║
        ║  └────────┬──────────────────────────────────────────────┘   ║
        ║           │                                                   ║
        ║  ┌────────↓──────────────────────────────────────────────┐   ║
        ║  │  后处理管线                                            │   ║
        ║  │  ├─ persist-chat-history（持久化聊天历史）              │   ║
        ║  │  ├─ extract-memory（提取记忆）                        │   ║
        ║  │  ├─ parse-todo（解析待办）                            │   ║
        ║  │  ├─ save-converted-text（保存转换文本）                │   ║
        ║  │  └─ record-metrics（记录指标）                        │   ║
        ║  └────────┬──────────────────────────────────────────────┘   ║
        ║           │                                                   ║
        ║  ┌────────↓──────────────────────────────────────────────┐   ║
        ║  │  ScheduledTriggerRegistry（后台）                     │   ║
        ║  │  ├─ 每 60 秒检查 cron 调度                            │   ║
        ║  │  ├─ 运行 interval 定时器                              │   ║
        ║  │  └─ 向 TriggerBus 提交新触发器                        │   ║
        ║  └──────────────────────────────────────────────────────┘   ║
        ║                                                              ║
        ╚══════════════════╤═════════════════════════════════════════╝
                           │
                IPC 事件（流式/结果）
                │
        ┌───────┴──────────┐
        │                  │
    trigger-chunk    trigger-completed
    {chunk}          {result}
        │                  │
        └──────────┬───────┘
                   │
┌──────────────────↓────────────────────────────────────────────────┐
│                 RENDERER：IPC 事件监听器                             │
│                                                                    │
│  ChatUI.onTriggerChunk() → 显示流式文本                           │
│  ChatUI.onTriggerCompleted() → 完成消息展示                       │
│  MemoryManager.onTriggerCompleted() → 存储提取的事实               │
│  TodoParser 从 parse-todo 处理器自动更新                           │
└────────────────────────────────────────────────────────────────────┘
```

---

## 七、模块与职责

### AI Runtime 核心模块（src/ai-runtime/）

| 模块 | 行数 | 职责 | 集成方式 |
|------|------|------|---------|
| `runtime.js` | 314 | 场景执行（提示词构建 → API 调用） | AIClientMain 作为唯一 HTTP 出口 |
| `trigger-bus.js` | 468 | 优先级队列 + 并发 + 流式传输 | Main 进程编排器 |
| `trigger-bus-renderer.js` | 245 | IPC 适配层 | Renderer 的 AI 网关 |
| `scene-registry.js` | 156 | 场景定义（只读） | Runtime 查找 |
| `prompt-registry.js` | ~430 | 提示词模板 + 惰性解析 + v2.0.0 chat resolver | Runtime 提示词获取 |
| `model-profiles.js` | 207 | 模型参数配置 | Runtime 模型设置 |
| `context/context-hub.js` | 146 | 可插拔数据提供者系统 | Runtime 上下文组装 |
| `context/providers/*.js` | ~800 | 8 个上下文源（personality, history 等） | ContextHub 调用 |
| `scenes/*.js` | ~500 | 自动注册 chat/quick/skill/memory/proactive 场景 | SceneRegistry 加载 |
| `scheduled-trigger-registry.js` | 324 | Cron/Interval 调度器 | Main 后台进程 |

### Renderer 侧 AI 模块（src/）

| 模块 | 角色 | AI 集成方式 | 优先级 |
|------|------|-----------|--------|
| `chat/ai-service.js` | 提交触发器 + 历史管理 | TriggerBusRenderer | HIGH |
| `chat/memory-manager.js` | 提取 + 存储记忆 | TriggerBusRenderer (LOW) | LOW |
| `chat/todo-parser.js` | 检测待办事项 | 直接 IPC（未走队列） | IMMEDIATE |
| `quick-panel/quick-panel-main.js` | 编排 QP AI 请求 | TriggerBusRenderer | NORMAL |
| `skills/skill-router.js` | 路由技能执行 | TriggerBusRenderer（降级回退 IPC） | NORMAL |
| `skills/skill-scheduler.js` | 技能状态追踪 | TriggerBusRenderer（即发即忘） | LOW |
| `proactive/proactive-engine.js` | 信号匹配 + 通知 | TriggerBusRenderer（可选） | LOW |
| `proactive/notification-mgr.js` | 通知分发 | TriggerBusRenderer（仅 L3） | LOW |

---

## 八、使用的设计模式

### 模式 1：场景优先执行

**旧方式**（重构前）：
```javascript
// 聊天直接构建提示词，发起 HTTP 请求
async sendMessage(text) {
  const prompt = buildChatPrompt(text);
  const response = await fetch('/api/chat', { prompt });
}
```

**新方式**（场景优先）：
```javascript
// 聊天创建触发器，Runtime 处理其余逻辑
async sendMessage(text) {
  const trigger = { type: 'chat', sceneId: 'chat.default', payload: { text } };
  await triggerBusRenderer.submitAndStream(trigger);
}
// Runtime 自动知道：场景 'chat.default' → 加载哪些上下文提供者、
// 使用哪个提示词模板、哪个模型配置、运行哪些后处理器
```

### 模式 2：声明式上下文注入

```javascript
// 场景声明需要的 provider；Hub 负责加载
scene = {
  id: 'chat.default',
  contextProviders: ['personality', 'history', 'memory', 'behavior', 'todo']
};

// Runtime 不硬编码加载哪些数据，使用场景声明
const context = await contextHub.assembleContext(scene);
// Hub 并行调用每个 provider，合并结果
```

### 模式 3：后处理器管线

```javascript
// 不再是：Runtime 依次调用历史保存、记忆提取、待办解析
// 而是：后处理器钩子在执行完成后触发

triggerBus.on('trigger:completed', async (event) => {
  // 任何模块都可以注册观察者
  memoryManager.onResultReady(event.result);
  todoParser.onResultReady(event.result);
  chatUI.onResultReady(event.result);
});
```

### 模式 4：即发即忘 + 优先级

```javascript
// 记忆提取不需要阻塞聊天
const memoryResult = await triggerBusRenderer.submitAndWait(
  { type: 'memory-extract', sceneId: 'memory.extract', ... },
  { priority: 'LOW' }
);
// 立即返回；提取在后台进行

// 聊天不等待：
await sendChatResponse(); // 聊天完成
// 同时：LOW 优先级的记忆提取在队列空闲时运行
```

---

## 九、提示词维护指南

### 各 AI 功能的提示词位置

```
1. 聊天系统提示词（Phase 5 统一收口）
   位置：src/ai-runtime/prompt-registry.js
   版本：v2.0.0（resolver:context-hub）
   构建函数：_buildChatSystemPromptFromContext(ctx)
   内容组成：性格片段 + 等级深度 + 心情状态 + 记忆 + 行为节奏数据 + 待办事项
   修改性格：编辑 CHAT_PERSONALITIES 字典（~第 285-306 行）
   修改提示词逻辑：编辑 _buildChatSystemPromptFromContext()（~第 315-408 行）
   数据来源：ContextHub 从 electron-store 组装（personality/memory/behavior/todo providers）
   注意：CHAT_PERSONALITIES 与 src/chat/personality.js 中的 PERSONALITIES 字典需保持同步
   向后兼容：若 payload 含 systemPrompt，直接透传（proactive-engine 使用此路径）

2. Quick Panel 提示词（润色/解释/总结）
   位置：src/ai-runtime/prompt-registry.js
   搜索：'quick-polish'、'quick-explain'、'quick-summarize'
   修改：直接更新注册表中的字符串
   版本：在 PromptBundle 中递增

3. Quick Panel 问答提示词
   位置：src/ai-runtime/prompt-registry.js
   搜索：'quick-ask'
   修改：更新 PromptBundle 的 system 内容
   版本：递增 version 字段

4. 记忆提取提示词
   位置：src/ai-runtime/prompt-registry.js
   搜索：'memory-extract'
   修改：更新 system + userTemplate
   格式：JSON 提取

5. 视觉/OCR 提示词
   位置：src/ai-runtime/prompt-registry.js
   搜索：'vision-ocr'
   修改：更新截图识别提示词
   模式：'vision'

6. 技能提示词（日报、待办管理等）
   位置：src/skills/skills/{skillName}/SKILL.md
   修改：编辑 markdown 正文
   格式：技能正文即系统提示词
   版本：在 SKILL.md 元数据中添加 SKILL_VERSION 字段

7. 主动触发提示词
   位置：src/proactive/proactive-engine.js
   说明：自建提示词通过 payload.systemPrompt 透传
   兼容：v2.0.0 resolver 的向后兼容路径自动处理

8. 待办提取（解析器）
   位置：src/chat/todo-parser.js（回退正则）
   逻辑：检查 AI 响应 + 正则匹配
   修改：按需调整正则表达式
   说明：主要通过 AIRuntime 的 AI 调用，正则仅作为备用
```

### 各用例的模型参数

```
聊天流式：
  temperature: 0.8（创造性）
  maxTokens: 500
  stream: true

Quick Panel（润色/解释/总结）：
  temperature: 0.3-0.5（确定性）
  maxTokens: 800
  stream: true

记忆提取：
  temperature: 0.3（事实性）
  maxTokens: 200
  stream: false

技能执行：
  temperature: 0.2-0.7（因场景而异）
  maxTokens: 500-2000
  stream: false

视觉/OCR：
  temperature: 0.2（事实性）
  maxTokens: 2000
  stream: false
```

---

## 十、已知差距与改进方向

### 差距 1：待办提取使用直接 IPC（未走队列）
- **原因**：需要即时响应以保证用户体验
- **位置**：`src/chat/todo-parser.js` 第 105 行
- **未来**：可实现"快速通道"队列层级
- **影响**：低（待办提取是次要功能）

### 差距 2：主动场景可同时触发所有匹配模板
- **问题**：如果 3 个场景匹配同一信号，3 个都会执行
- **缓解**：NotificationMgr 每日上限 8 条
- **未来**：增加场景冲突解决、去重逻辑
- **影响**：中等（边缘情况可能导致队列拥塞）

### 差距 3：系统提示词在高负载时可能过长
- **问题**：聊天系统提示词包含多个上下文段落
- **当前**：测试中未观察到 token 溢出
- **未来**：实现上下文预算管理（如裁剪最旧记忆）
- **影响**：低（实践中未出现）

### 差距 4：错误恢复机制较简单
- **当前**：TriggerBus 不可用时降级回退到遗留 IPC
- **未来**：更好的重试逻辑、熔断器模式
- **影响**：低（TriggerBus 运行稳定）

---

## 十一、下一阶段建议

### 短期（稳定性/打磨）
1. **增加遥测**：记录触发器类型分布、队列深度、每场景延迟
2. **实现场景冲突解决**：主动触发器去重
3. **上下文预算管理器**：限制记忆注入到 N 个 token
4. **待办解析改走 TriggerBus**：使用"快速通道"超时
5. **测试覆盖**：为所有触发源增加端到端测试

### 中期（功能扩展）
1. **Phase 5 准备**：设计 Agent Service 抽离方案（将 ModelGateway 独立）
2. **技能参数化**：支持运行时技能配置
3. **多模型支持**：不同场景路由到不同模型
4. **微调支持**：追踪指标，支持模型微调

### 长期（架构演进）
1. **分布式运行时**：支持多 worker 进程
2. **插件系统**：允许第三方技能注册场景/提示词
3. **可观测性**：完整的追踪、指标、告警
4. **成本追踪**：按用户、按功能的 token 用量统计

---

## 十二、验证清单

**所有阶段完成**
- [x] Phase 1：注册表已定义并加载
- [x] Phase 2：Runtime 通过场景查找执行
- [x] Phase 3：触发器标准化，总线排队处理
- [x] Phase 4：Renderer 瘦身，Main 掌控 AI
- [x] Phase 5：提示词统一收口，PromptRegistry 为唯一提示词来源

**Renderer 零 HTTP**
- [x] ai-client-renderer.js 已删除
- [x] 所有 Renderer AI 调用 → TriggerBusRenderer → IPC
- [x] AIClientMain 是唯一的 HTTP 出口

**优先级系统正常工作**
- [x] HIGH 优先级（聊天）排在 NORMAL（技能）前面
- [x] LOW 优先级（记忆）排在最后
- [x] N=3 并发限制生效

**流式传输正常**
- [x] ChatUI 实时接收 chunk
- [x] 异步生成器端到端工作
- [x] IPC chunk 事件可靠传递

**上下文注入干净**
- [x] 无静默数据加载（全部在场景中声明）
- [x] Quick Panel 上下文最小化（无聊天历史）
- [x] 技能仅加载声明的 provider

**提示词统一收口（Phase 5）**
- [x] 聊天系统提示词由 Main 进程 PromptRegistry v2.0.0 resolver 构建
- [x] Renderer AIService 不再构建系统提示词，仅提交 { history }
- [x] personality-provider / behavior-provider 从 electron-store 读取
- [x] 向后兼容 proactive-engine 的 payload.systemPrompt 透传

**提示词有版本追踪**
- [x] PromptRegistry 存储版本信息
- [x] 每次执行时记录日志
- [x] 支持多种来源（JS、SKILL.md、resolver）

---

## 总结

**AI Runtime 统一架构设计已在全部 5 个阶段完整实现。**

系统现在具备以下特征：
- **集中式** — 所有 AI 调用流经统一的 TriggerBus
- **场景驱动** — 行为通过场景定义声明
- **Main 进程编排** — Renderer 是轻薄 IPC 适配器
- **提示词统一收口** — PromptRegistry 为所有 AI 提示词的 single source of truth
- **可观测** — 事件驱动、可追踪的执行
- **可扩展** — 优先级队列、并发控制、后处理器
- **可维护** — 注册表取代硬编码

当前迭代无需进一步大规模重构。下一步重心应转向**稳定性、可观测性和未来 Agent Service 抽离准备**。
