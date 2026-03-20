# ChatCat AI Runtime 收敛设计文档

> 目标：为后续技术实现提供可执行设计，统一当前 ChatCat 中分散的聊天、Quick Panel、Skills、主动触发、定时任务、阈值触发等 AI 链路。  
> 核心思路：**按场景（Scene）区分触发源与系统提示词，再按配置矩阵按需加载额外数据、记忆、skills、能力与后处理逻辑。**

---

## 1. 背景与问题定义

当前 ChatCat 已经包含多条 AI 能力链路：

1. **聊天链路**
   - UI 入口：`src/chat/chat-ui.js:725`
   - 提示词拼装：`src/chat/ai-service.js:71`
   - Renderer 侧模型调用：`src/shared/ai-client-renderer.js:93`

2. **Skills 链路**
   - 路由：`src/skills/skill-router.js:36`
   - 执行：`src/skills/skill-engine.js:30`
   - Main 侧模型调用：`src/shared/ai-client-main.js:36`

3. **Quick Panel 链路**
   - 润色/总结/解释模板：`src/quick-panel/text-processor.js:6`
   - 问答：`src/quick-panel/quick-panel-main.js:127`
   - 识图：`src/quick-panel/screenshot-ocr.js:130`

4. **记忆链路**
   - 记忆提取：`src/chat/memory-manager.js:47`
   - 聊天结束后异步触发：`src/chat/ai-service.js:147`

5. **主动触发 / 阈值触发 / 定时触发**
   - 信号采集：`src/proactive/signal-collector.js:107`
   - 场景调度：`src/proactive/proactive-engine.js:218`
   - 定时执行：`src/skills/skill-scheduler.js:65`

这些链路在业务上是不同功能，但在技术上高度相似：
- 都需要定义触发源；
- 都需要决定当前是什么 AI 场景；
- 都需要拼装对应 prompt；
- 都需要按需加载上下文；
- 都需要走模型调用；
- 都需要做结果后处理与持久化。

### 当前主要问题

#### 1. Prompt 分散维护
- 聊天人格与系统提示词：`src/chat/personality.js:35`
- 聊天实时行为注入：`src/chat/ai-service.js:77`
- Quick Panel 模板：`src/quick-panel/text-processor.js:7`
- Memory 提取提示词：`src/chat/memory-manager.js:11`
- Skills 模板：`src/skills/skills/*/SKILL.md`

#### 2. Context 装配逻辑分散
- 聊天：`src/chat/ai-service.js:71`
- Skills：`src/skills/skill-engine.js:75`
- 主动场景：`src/proactive/proactive-engine.js:273`

#### 3. AI 出口分散
- Renderer：`src/shared/ai-client-renderer.js`
- Main：`src/shared/ai-client-main.js`

#### 4. 触发系统已有雏形，但未统一抽象
- 用户输入
- `/command`
- keyword 命中
- 定时任务
- 阈值触发（CPM/删除率/idle/clipboard）
- 主动场景

### 结论

当前最需要统一的不是“一个超级提示词”，而是：

1. **统一场景定义（Scene）**
2. **统一触发模型（Trigger）**
3. **统一上下文装配（Context Hub）**
4. **统一 Prompt Registry**
5. **统一模型调用网关（Model Gateway）**
6. **统一后处理、观测与治理**

---

## 2. 设计目标

### 2.1 目标

1. **按场景收敛 AI 调用**
   - 聊天、Quick Panel、Skills、OCR、Memory、主动触发统一进入 AI Runtime

2. **按配置矩阵动态注入数据**
   - 不是所有场景都带 memory / behavior / history / skills
   - 由 Scene 配置声明需要哪些上下文 Provider

3. **统一触发源模型**
   - 用户操作、系统信号、定时器、阈值事件统一为 Trigger

4. **统一 prompt 管理方式**
   - 允许 prompt 来源于 JS、Markdown、配置文件，但运行时通过 Registry 获取

5. **统一模型出口**
   - 先统一到 Runtime 内部的 Gateway
   - 后续可平滑迁移到独立 agent service

6. **为后续实现保留渐进式迁移路径**
   - 不要求一步到位重写全部现有链路

### 2.2 非目标

1. **不是把所有业务逻辑都改成 LLM 决策**
   - `/todo`、`/report` 这类确定性路由仍应保持规则优先

2. **不是所有场景都共享一套 memory**
   - 润色、OCR 等不应默认带聊天记忆

3. **不是所有主动提醒都必须调大模型**
   - 模板化可完成的提醒应继续走模板

4. **不是本阶段直接拆成独立后端服务**
   - 当前文档先面向单体内收敛设计

---

## 3. 核心设计原则

### 原则 1：Scene First，而不是 Entry First
当前系统是按入口文件组织 AI 能力；后续应按**场景 Scene**组织。

### 原则 2：Context 按需注入，而不是全量注入
上下文应由 Scene 的配置矩阵决定，不做“默认全塞”。

### 原则 3：Prompt、Context、Model、PostProcess 解耦
任何一个维度都不应硬编码绑死在单个业务入口。

### 原则 4：Deterministic First
规则能确定的路由不要让 LLM 再判断。

### 原则 5：Main 侧统一编排优先
Runtime 优先落在 Main 侧，Renderer 更适合做 UI 与输入采集。

### 原则 6：先收敛框架，再考虑独立服务
单体内统一 Runtime 是拆分 Agent Service 的前置条件。

---

## 4. 目标架构

## 4.1 总体架构图

```text
Trigger Source
  ↓
Trigger Bus
  ↓
Scene Resolver
  ↓
Runtime Policy Check
  ↓
Context Hub
  ↓
Prompt Registry
  ↓
Model Gateway
  ↓
Post Processor
  ↓
UI / Store / Notification / Next Trigger
```

## 4.2 模块划分

### 1) Trigger Bus
统一接收所有触发源：
- chat user message
- quick panel action
- skill command
- scheduler event
- proactive signal
- threshold event
- internal follow-up event

### 2) Scene Registry
维护所有 Scene 的元信息：
- 场景 ID
- 触发条件
- prompt 模板
- context providers
- memory policy
- capability policy
- model profile
- output mode
- post-processors

### 3) Context Hub
统一管理所有上下文 Provider：
- personality
- history
- memory
- behavior
- todo
- convertedText
- rawTyping
- clipboard
- image
- systemState
- proactiveState

### 4) Prompt Registry
统一返回某个 Scene 的 system prompt / user prompt 模板。

### 5) Model Gateway
统一执行 AI 请求：
- stream / complete / vision
- model fallback
- retry / timeout / error normalize

### 6) Post Processor
统一处理结果：
- 存历史
- 抽记忆
- 解析 todo
- 推送通知
- 写 metrics
- 触发后续 event

### 7) Observability & Governance
统一日志、指标、prompt version、scene usage、error reporting。

---

## 5. Trigger 模型设计

## 5.1 Trigger 数据结构

建议新增统一 Trigger 对象：

```ts
export type AITriggerSource =
  | 'chat'
  | 'quick-panel'
  | 'skill'
  | 'schedule'
  | 'signal'
  | 'proactive'
  | 'system';

export interface AITrigger<T = any> {
  id: string;
  source: AITriggerSource;
  type: string;
  payload: T;
  userInitiated: boolean;
  timestamp: number;
  priority?: 'low' | 'normal' | 'high';
  traceId?: string;
}
```

## 5.2 Trigger 示例

### 聊天输入
```ts
{
  source: 'chat',
  type: 'user-message',
  payload: { text: '今天有点累' },
  userInitiated: true
}
```

### Quick Panel 润色
```ts
{
  source: 'quick-panel',
  type: 'polish',
  payload: { text: '帮我润色这段话' },
  userInitiated: true
}
```

### 定时日报
```ts
{
  source: 'schedule',
  type: 'daily-report',
  payload: { date: '2026-03-19' },
  userInitiated: false
}
```

### 打字阈值触发
```ts
{
  source: 'signal',
  type: 'typing-rhythm-change',
  payload: { pattern: 'frustrated', currentSpeed: 180 },
  userInitiated: false
}
```

---

## 6. Scene 模型设计

## 6.1 Scene 是运行时的核心单位

每个 Scene 对应一种明确的 AI 使用场景，而不是某个 UI 入口。

### 推荐 Scene 列表（第一版）

#### Chat 类
- `chat.default`
- `chat.followup`
- `chat.proactive`

#### Quick Panel 类
- `quick.polish`
- `quick.summarize`
- `quick.explain`
- `quick.ask`
- `vision.ocr`

#### Skill 类
- `skill.text-converter`
- `skill.todo-management`
- `skill.daily-report`
- `skill.weekly-report`
- `skill.ui-style-guide`

#### Memory 类
- `memory.extract`

#### Proactive / System 类
- `proactive.scene-message`
- `system.agent-task`

## 6.2 Scene 配置结构

```ts
export interface SceneDefinition {
  id: string;
  category: 'chat' | 'quick' | 'skill' | 'vision' | 'memory' | 'proactive' | 'system';
  description: string;

  triggerMatchers: Array<{
    source: AITriggerSource;
    type: string;
  }>;

  prompt: {
    templateId: string;
    mode: 'chat' | 'instruction' | 'vision' | 'extract';
  };

  contextProviders: string[];
  modelProfile: string;
  outputMode: 'stream-text' | 'text' | 'markdown' | 'json';

  memoryPolicy: 'none' | 'read' | 'write' | 'read-write';
  capabilityPolicy: string[];
  postProcessors: string[];

  guards?: {
    requiresConsent?: boolean;
    quietHoursAware?: boolean;
    cooldownKey?: string;
    maxPerDay?: number;
  };
}
```

---

## 7. Prompt Registry 设计

## 7.1 Prompt 不再直接散落消费
Prompt Registry 负责根据 `templateId` 统一返回模板。

## 7.2 Prompt 来源类型

### A. JS Prompt
适用于：
- 聊天人格提示词
- Memory 提取 prompt
- Quick Panel 固定能力 prompt

例如：
- `src/chat/personality.js:35`
- `src/chat/memory-manager.js:11`
- `src/quick-panel/text-processor.js:7`

### B. Markdown Prompt
适用于：
- SKILL.md body

例如：
- `src/skills/skills/daily-report/SKILL.md:13`

## 7.3 推荐实现

建议新增目录：

```text
src/ai-runtime/
  prompts/
    chat/
    quick/
    system/
```

并保留兼容读取老文件的适配器：
- `chat/personality.js` 可先通过 adapter 暴露给 Prompt Registry
- `SKILL.md` 通过 SkillRegistry 暴露给 Prompt Registry
- `text-processor.js` 通过 adapter 暴露给 Prompt Registry

## 7.4 Prompt 版本管理

Prompt Registry 返回结果时应携带版本信息：

```ts
interface PromptBundle {
  templateId: string;
  version: string;
  system?: string;
  userTemplate?: string;
}
```

建议后续在日志中记录：
- sceneId
- templateId
- promptVersion

---

## 8. Context Hub 设计

## 8.1 设计目标
统一当前分散的上下文收集逻辑：
- `src/chat/ai-service.js:71`
- `src/skills/skill-engine.js:75`
- `src/proactive/proactive-engine.js:273`

## 8.2 Provider 接口

```ts
export interface ContextProvider {
  id: string;
  provide(input: {
    trigger: AITrigger;
    scene: SceneDefinition;
    runtimeInput?: any;
  }): Promise<Record<string, any>>;
}
```

## 8.3 推荐 Provider 列表

### 通用 Provider
- `personalityProvider`
- `historyProvider`
- `memoryProvider`
- `behaviorProvider`
- `systemStateProvider`

### 业务 Provider
- `todoProvider`
- `pomodoroProvider`
- `rawTypingProvider`
- `convertedTextProvider`
- `clipboardProvider`
- `imageProvider`
- `skillInputProvider`
- `proactiveSignalProvider`

## 8.4 场景注入矩阵（第一版）

| Scene | personality | history | memory | behavior | todo | rawTyping | convertedText | image | clipboard |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `chat.default` | 是 | 是 | 是 | 是 | 可选 | 否 | 否 | 否 | 否 |
| `chat.followup` | 是 | 是 | 是 | 是 | 可选 | 否 | 否 | 否 | 否 |
| `chat.proactive` | 是 | 少量 | 可选 | 是 | 可选 | 否 | 否 | 否 | 可选 |
| `quick.polish` | 否 | 否 | 否 | 否 | 否 | 否 | 否 | 否 | 否 |
| `quick.summarize` | 否 | 否 | 否 | 否 | 否 | 否 | 否 | 否 | 否 |
| `quick.explain` | 否 | 否 | 否 | 否 | 否 | 否 | 否 | 否 | 否 |
| `quick.ask` | 轻量 | 可选 | 否 | 否 | 否 | 否 | 否 | 否 | 否 |
| `vision.ocr` | 否 | 否 | 否 | 否 | 否 | 否 | 否 | 是 | 否 |
| `skill.text-converter` | 否 | 否 | 否 | 否 | 否 | 是 | 否 | 否 | 否 |
| `skill.todo-management` | 否 | 否 | 否 | 否 | 是 | 是 | 是 | 否 | 否 |
| `skill.daily-report` | 否 | 否 | 否 | 否 | 是 | 是 | 是 | 否 | 否 |
| `memory.extract` | 否 | 单轮 | 否 | 否 | 否 | 否 | 否 | 否 | 否 |

### 重要约束
1. **Quick Panel 润色/总结/解释默认不带记忆和行为数据**
2. **Vision/OCR 默认不带聊天 history**
3. **Skill 场景只读取声明的上下文 Provider**
4. **聊天场景才默认带长期记忆**

---

## 9. Capability / Skill 注入策略

## 9.1 设计原则
Skill 不应默认对所有 Scene 开放。

## 9.2 建议 capabilityPolicy

### `chat.default`
允许：
- 对话能力
- todo 意图理解
- 轻量 action 建议

### `quick.polish` / `quick.summarize` / `quick.explain`
允许：
- 纯文本处理
- 禁止调用业务 skills

### `vision.ocr`
允许：
- 图片理解
- 禁止读取 memory / todo / history

### `skill.*`
允许：
- 当前目标 skill 的 body 与声明上下文
- 禁止跨 skill 隐式调用其他业务 skill

---

## 10. Memory Policy 设计

## 10.1 Memory 分为两类

### A. Conversation Memory
用于聊天人格与用户长期信息
- 当前来源：`src/chat/memory-manager.js:25`
- 适合场景：`chat.default` / `chat.followup`

### B. Task Context Memory
用于任务型场景的局部上下文，不应落为长期人格记忆
- 如日报、待办提取、OCR、润色等

## 10.2 Scene 级策略

| Policy | 含义 |
|---|---|
| `none` | 不读不写 memory |
| `read` | 只读长期记忆，不写新记忆 |
| `write` | 不读长期记忆，只写结果 |
| `read-write` | 读长期记忆，且允许写新记忆 |

### 推荐默认值
- `chat.default` → `read-write`
- `chat.followup` → `read-write`
- `chat.proactive` → `read`
- `quick.*` → `none`
- `vision.ocr` → `none`
- `skill.*` → `none`
- `memory.extract` → `write`

---

## 11. Model Gateway 设计

## 11.1 目标
统一当前 Main / Renderer 两套 AI Client 出口。

## 11.2 现状
- Renderer：`src/shared/ai-client-renderer.js`
- Main：`src/shared/ai-client-main.js`

## 11.3 建议方向

### 短期
保留两套 client，但在上层增加 `ModelGateway` 封装：

```ts
interface ModelGateway {
  runText(scene, request): Promise<Result>
  runStream(scene, request): AsyncGenerator<string>
  runVision(scene, request): Promise<Result>
}
```

### 中期
将编排统一迁到 Main：
- Renderer 仅通过 IPC 发起 Runtime 请求
- Main 内部统一调用 AIClientMain

### 长期
将 ModelGateway 替换为独立 agent service 网关

## 11.4 Model Profile
建议引入 profile 概念，而不是各处硬编码 temperature/maxTokens：

```ts
const MODEL_PROFILES = {
  'chat-stream': { stream: true, temperature: 0.8, maxTokens: 500 },
  'quick-polish': { stream: true, temperature: 0.3, maxTokens: 800 },
  'skill-report': { stream: false, temperature: 0.5, maxTokens: 2000 },
  'memory-extract': { stream: false, temperature: 0.3, maxTokens: 200 },
  'vision-ocr': { stream: false, temperature: 0.2, maxTokens: 2000 }
};
```

---

## 12. Runtime 执行流程

## 12.1 核心接口

```ts
interface AIRuntimeRequest {
  sceneId: string;
  trigger: AITrigger;
  input?: any;
}

interface AIRuntime {
  run(req: AIRuntimeRequest): Promise<AIRuntimeResult>;
  runStream?(req: AIRuntimeRequest): AsyncGenerator<string>;
}
```

## 12.2 执行步骤

```text
1. 接收 trigger
2. SceneResolver 决定 sceneId
3. 读取 SceneDefinition
4. 执行 guards（权限/冷却/quiet hours/consent）
5. ContextHub 按 scene.contextProviders 装配上下文
6. PromptRegistry 获取 prompt 模板
7. PromptComposer 生成最终 messages/request
8. ModelGateway 执行模型调用
9. PostProcessor 处理结果
10. 输出到 UI / Store / Notification / Scheduler
```

## 12.3 Post Processor 类型

- `persistChatHistory`
- `extractMemory`
- `parseTodo`
- `saveConvertedText`
- `sendNotification`
- `recordMetrics`
- `emitNextTrigger`

---

## 13. Trigger Bus 与调度统一设计

## 13.1 统一触发总线
建议新增 Trigger Bus，使以下来源统一进入 Runtime：

- Chat UI
- Quick Panel
- SkillRouter
- SkillScheduler
- ProactiveEngine
- SignalCollector threshold event

## 13.2 与现有模块关系

### 聊天
- 现有：`ChatUI.sendMessage()` 直接调 `AIService`
- 目标：`ChatUI.sendMessage()` → `emitTrigger(chat:user-message)` → Runtime

### Skills
- 现有：`SkillRouter.execute()` → `skill-execute`
- 目标：`SkillRouter` 保留匹配逻辑，但命中后 emit `skill:invoke`

### 定时任务
- 现有：`SkillScheduler._triggerRegistrySkill()` 直接执行 skill `src/skills/skill-scheduler.js:107`
- 目标：Scheduler 只负责 emit trigger

### 主动场景
- 现有：`ProactiveEngine._processSignal()` 自己找 scene `src/proactive/proactive-engine.js:218`
- 目标：ProactiveEngine 更偏向 Trigger Producer + Notification Consumer

---

## 14. 推荐代码组织

建议新增目录：

```text
src/ai-runtime/
  index.ts / index.js
  runtime.js                # AIRuntime 主入口
  trigger-bus.js            # Trigger Bus
  scene-registry.js         # Scene 定义注册
  scene-resolver.js         # Trigger -> Scene
  prompt-registry.js        # Prompt 获取与版本管理
  prompt-composer.js        # messages/request 组装
  model-gateway.js          # 统一 AI 出口
  model-profiles.js         # 模型配置
  post-processors/
    persist-chat-history.js
    extract-memory.js
    parse-todo.js
    save-converted-text.js
    record-metrics.js
  context/
    context-hub.js
    providers/
      personality-provider.js
      history-provider.js
      memory-provider.js
      behavior-provider.js
      todo-provider.js
      raw-typing-provider.js
      converted-text-provider.js
      image-provider.js
      clipboard-provider.js
  scenes/
    chat-scenes.js
    quick-scenes.js
    skill-scenes.js
    memory-scenes.js
    proactive-scenes.js
```

---

## 15. 与现有代码的映射关系

## 15.1 第一阶段保留原文件，只做 Runtime 接管

### 现有聊天入口
- `src/chat/ai-service.js`
- 未来角色：变成 `chat.default` 的薄适配层

### 现有 SkillEngine
- `src/skills/skill-engine.js`
- 未来角色：变成 `skill.*` Scene 的薄适配层或被 Runtime 吸收

### 现有 QuickPanelManager
- `src/quick-panel/quick-panel-main.js`
- 未来角色：产生 Trigger，消费结果流

### 现有 ProactiveEngine
- `src/proactive/proactive-engine.js`
- 未来角色：信号判断与通知策略仍保留，但 AI 生成能力改调 Runtime

---

## 16. 推荐迁移计划

## Phase 1：先引入 Scene Registry / Context Hub / Prompt Registry

### 目标
不改业务入口，只统一“定义层”。

### 任务
1. 建立 `SceneDefinition` 与 `SceneRegistry`
2. 建立 `ContextHub` 与基础 Provider
3. 建立 `PromptRegistry`
4. 建立 `ModelProfile`
5. 让聊天 / skill / quick panel 从 Registry 取配置

### 预期结果
- 入口还在原位置
- 但 prompt/context/model 配置不再散写

## Phase 2：统一 Runtime 主入口

### 目标
新增 `runAI(sceneId, trigger, input)`

### 任务
1. 聊天走 Runtime
2. Quick Panel 走 Runtime
3. SkillEngine 走 Runtime
4. Memory extract 走 Runtime

### 预期结果
- 编排收敛
- 业务入口保留，但内部不再直接拼 prompt

## Phase 3：统一 Trigger Bus

### 目标
把用户、系统、定时、阈值触发统一成 AITrigger。

### 任务
1. ChatUI -> emit trigger
2. Scheduler -> emit trigger
3. ProactiveEngine -> emit trigger
4. Signal threshold -> emit trigger

## Phase 4：统一 Main 侧编排

### 目标
Renderer 变薄，Main 统一编排 + AI 调用。

### 任务
1. 聊天流式从 Renderer 直连改为 Main 代理
2. Runtime 全部落 Main
3. Renderer 只消费 UI stream

## Phase 5：可选拆分独立 Agent Service

### 前提
只有在 Runtime 已收敛后再做。

---

## 17. 观测与治理要求

## 17.1 日志字段
每次 Runtime 调用至少记录：
- traceId
- trigger.source
- trigger.type
- sceneId
- modelProfile
- promptVersion
- contextProviders
- latencyMs
- success/failure
- errorCode

## 17.2 指标
- `runtime_request_total`
- `runtime_request_latency_ms`
- `runtime_error_total`
- `scene_usage_total`
- `scene_memory_write_total`
- `scene_trigger_drop_total`

## 17.3 Prompt 治理
- 每个 Scene 的 prompt 需要 version
- SKILL.md 建议补 `version` 字段
- Quick Panel 模板也需要 templateId/version

## 17.4 安全与隐私治理
- behavior/rawTyping/image 等敏感数据必须通过 Scene 白名单注入
- OCR / polish 等默认不带 chat memory
- 触发时需校验 consent / quiet hours / daily quota

---

## 18. 风险与规避

## 风险 1：做成 God Object
**规避**：按 registry / provider / gateway / post-processor 拆模块。

## 风险 2：上下文过载
**规避**：严格执行 Scene 注入矩阵，不允许默认全量注入。

## 风险 3：把规则路由改成 LLM 路由
**规避**：命令、定时任务、技能命中仍由规则路由，LLM 只负责场景内推理与生成。

## 风险 4：主动触发成本过高
**规避**：模板优先，必要时才调 Runtime AI Scene。

## 风险 5：迁移跨度过大
**规避**：分阶段替换，不做一次性重构。

---

## 19. 第一版落地建议（最小可实施）

### 第一批应优先收敛的场景
1. `chat.default`
2. `quick.polish`
3. `quick.ask`
4. `skill.todo-management`
5. `skill.daily-report`
6. `memory.extract`

### 第一批应优先抽象的 Provider
1. `historyProvider`
2. `memoryProvider`
3. `behaviorProvider`
4. `todoProvider`
5. `rawTypingProvider`
6. `convertedTextProvider`

### 第一批应优先收敛的后处理器
1. `persistChatHistory`
2. `extractMemory`
3. `parseTodo`
4. `saveConvertedText`
5. `recordMetrics`

---

## 20. 最终结论

本方案是合理的，而且与当前 ChatCat 现有能力演进方向高度一致。

### 本方案的核心不是：
- 把所有 AI 能力塞进 `src/chat/ai-service.js`
- 用一个超级 prompt 处理所有任务

### 本方案的核心是：
- 用 **Scene** 统一表达“当前 AI 在做什么”
- 用 **Trigger** 统一表达“为什么会触发”
- 用 **Context Matrix** 统一表达“该加载哪些数据”
- 用 **Runtime** 统一表达“如何执行、记录、治理”

### 推荐执行策略
1. 先统一定义层（Scene / Prompt / Context）
2. 再统一运行时入口
3. 再统一 Trigger Bus
4. 再统一 Main 侧编排
5. 最后视需求拆独立 Agent Service

该顺序风险最低，也最适合在当前代码基础上稳步落地。
