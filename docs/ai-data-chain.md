# ChatCat AI 相关数据链路全景文档

> 目的：梳理当前项目内与 AI 相关的完整数据链路（聊天、技能、识图、润色、记忆、行为数据），并明确维护位置、存储位置与前后端边界。

## 1. 架构定位（先给结论）

ChatCat 当前是 **Electron 前后端一体单体应用**：
- Main 进程负责系统能力、IPC、存储、技能执行等：`main.js:19`, `main.js:293`, `main.js:454`
- Renderer 进程负责 UI 交互与部分 AI 调用：`src/renderer.js:226`, `src/chat/chat-ui.js:725`
- 两者通过 preload 桥接：`preload.js:3`

AI 调用是 **混合模式**：
- 聊天主链路：Renderer 直连（`AIClientRenderer`）`src/chat/ai-service.js:124`, `src/shared/ai-client-renderer.js:93`
- Skills/QuickPanel/OCR：Main 代理（`AIClientMain`）`src/skills/skill-engine.js:47`, `src/quick-panel/quick-panel-main.js:103`, `src/quick-panel/screenshot-ocr.js:130`

---

## 2. AI 入口与核心模块地图

### 2.1 聊天主入口
- `AIService`：`src/chat/ai-service.js:10`
  - 系统提示词组装：`_buildSystemPrompt()` `src/chat/ai-service.js:71`
  - 流式对话：`sendMessageStream()` `src/chat/ai-service.js:108`

### 2.2 AI 客户端（统一 HTTP 层）
- Renderer 侧：`AIClientRenderer`（聊天/记忆提取）`src/shared/ai-client-renderer.js:12`
  - 非流式：`complete()` `src/shared/ai-client-renderer.js:54`
  - 流式：`stream()` `src/shared/ai-client-renderer.js:93`
- Main 侧：`AIClientMain`（skills/quick panel/vision）`src/shared/ai-client-main.js:15`
  - 非流式：`complete()` `src/shared/ai-client-main.js:36`
  - 流式：`stream()` `src/shared/ai-client-main.js:75`
  - 识图：`vision()` `src/shared/ai-client-main.js:112`

### 2.3 聊天 UI 入口
- 用户发送消息：`ChatUI.sendMessage()` `src/chat/chat-ui.js:725`
- 优先进行 skill 匹配：`src/chat/chat-ui.js:743`

---

## 3. 系统提示词、模板提示词、skills 维护位置

## 3.1 系统提示词（聊天人格）
维护文件：`src/chat/personality.js`
- 人格常量：`PERSONALITIES` `src/chat/personality.js:9`
- 主系统提示词构建：`buildSystemPrompt()` `src/chat/personality.js:35`
- 场景模板消息（番茄/无聊/久坐）：`getPersonalityMessage()` `src/chat/personality.js:80`
- 情绪识别词典：`SENTIMENT_KEYWORDS` `src/chat/personality.js:110`

## 3.2 运行时动态注入
维护文件：`src/chat/ai-service.js`
- 注入节奏/行为实时数据：`src/chat/ai-service.js:77`
- 注入字段示例：状态、CPM、退格率、鼠标活跃、今日打字/心流/按键 `src/chat/ai-service.js:89`

## 3.3 Skills 定义与注册
- Skill 定义：`src/skills/skills/*/SKILL.md`
- 扫描注册：`SkillRegistry.init()` `src/skills/skill-registry.js:20`
- Frontmatter 解析：`_parseFrontmatter()` `src/skills/skill-registry.js:52`
- Renderer 路由匹配：`SkillRouter.match()` `src/skills/skill-router.js:36`
- Main 执行：`SkillEngine.execute()` `src/skills/skill-engine.js:30`
- IPC 接口：`skill-execute/skill-get-all-meta` `main.js:454`, `main.js:464`

> 现有 skill 文件：
> `src/skills/skills/daily-report/SKILL.md:1`  
> `src/skills/skills/text-converter/SKILL.md:1`  
> `src/skills/skills/todo-management/SKILL.md:1`  
> `src/skills/skills/weekly-report/SKILL.md:1`  
> `src/skills/skills/ui-style-guide/SKILL.md:1`

---

## 4. 用户 query 到 AI 响应的完整链路

## 4.1 聊天链路（默认）
1. 用户输入 + Enter/点击发送：`src/chat/chat-ui.js:93`, `src/chat/chat-ui.js:96`
2. 进入 `sendMessage()`：`src/chat/chat-ui.js:725`
3. 先进行 skill 匹配：`src/chat/chat-ui.js:743`
4. 未命中 skill 则进入 `AIService.sendMessageStream()`：`src/chat/chat-ui.js:759`, `src/chat/ai-service.js:108`
5. `AIService` 组装 messages（system + history）：`src/chat/ai-service.js:116`
6. 调用 `AIClientRenderer.stream()` 发请求：`src/chat/ai-service.js:124`, `src/shared/ai-client-renderer.js:93`
7. SSE 按 chunk 回传并实时渲染：`src/chat/chat-ui.js:760`, `src/shared/ai-client-renderer.js:197`
8. 完成后写入历史与情绪：`src/chat/ai-service.js:135`, `src/chat/ai-service.js:144`
9. 异步触发记忆提取：`src/chat/ai-service.js:147`

## 4.2 Skills 链路（命令/关键词）
1. `SkillRouter.match()` 命中：`src/skills/skill-router.js:36`
2. `ChatUI._executeSkill()` 走 IPC：`src/chat/chat-ui.js:797`, `src/skills/skill-router.js:72`
3. Main 接收 `skill-execute`：`main.js:454`
4. `SkillEngine.execute()` 读取 SKILL body + 拼上下文：`src/skills/skill-engine.js:37`, `src/skills/skill-engine.js:42`
5. 通过 `AIClientMain.complete()` 调模型：`src/skills/skill-engine.js:47`
6. 后处理（如写 convertedText、解析 todo）：`src/skills/skill-engine.js:53`, `src/skills/skill-engine.js:61`

---

## 5. 其他 AI 功能链路（识图、润色、总结、解释）

## 5.1 Quick Panel 文本能力（润色/总结/解释）
- Prompt 模板维护：`src/quick-panel/text-processor.js:7`
- Main 侧入口：`qp-process-text` `src/quick-panel/quick-panel-main.js:99`
- 通过 `AIClientMain.stream()` 流式返回：`src/quick-panel/quick-panel-main.js:103`

## 5.2 Quick Panel 问答
- Main 侧入口：`qp-ask` `src/quick-panel/quick-panel-main.js:127`
- 系统提示词位于 handler 内：`src/quick-panel/quick-panel-main.js:129`

## 5.3 截图识图/OCR
- 截图与区域选择：`src/quick-panel/screenshot-ocr.js:15`, `src/quick-panel/screenshot-ocr.js:77`
- 识图处理：`processImage()` `src/quick-panel/screenshot-ocr.js:130`
- 最终调用：`AIClientMain.vision()` `src/shared/ai-client-main.js:112`

---

## 6. 记忆（Memory）链路

维护文件：`src/chat/memory-manager.js`
- 记忆提取系统提示词：`EXTRACT_SYSTEM_PROMPT` `src/chat/memory-manager.js:11`
- 提取入口：`extractMemories()` `src/chat/memory-manager.js:47`
- 由聊天完成后 fire-and-forget 调用：`src/chat/ai-service.js:147`
- 持久化到 store：`setStore('aiMemories')` `src/chat/memory-manager.js:125`
- 上下文注入读取：`getTopMemories()` `src/chat/memory-manager.js:105`, `src/chat/ai-service.js:74`

---

## 7. 行为数据链路（打字记录、打字频率、节奏）

## 7.1 键盘全局事件来源
- 主进程启动输入 hook：`setupInputHook()` `main.js:602`
- Renderer 监听全局键盘事件入口：`preload.js:17`

## 7.2 打字频率/节奏信号（SignalCollector）
维护文件：`src/proactive/signal-collector.js`
- 核心参数：
  - 速度窗口 60s：`src/proactive/signal-collector.js:30`
  - 暂停阈值 15s：`src/proactive/signal-collector.js:28`
- CPM 计算：`_getTypingSpeed()` `src/proactive/signal-collector.js:178`
- 删除率：`_getRecentDeleteRate()` `src/proactive/signal-collector.js:185`
- 速度基线存储：`typingSpeedBaseline` `src/proactive/signal-collector.js:230`
- 事件发射：`typing-pause`/`typing-speed-change`/`typing-rhythm-change` `src/proactive/signal-collector.js:159`, `src/proactive/signal-collector.js:171`, `src/proactive/signal-collector.js:265`

## 7.3 打字内容记录（授权后）
维护文件：`src/recorder/keyboard-recorder.js`
- 内容记录开关：`setContentMode()` `src/recorder/keyboard-recorder.js:74`
- 键事件处理：`processKeydown()` `src/recorder/keyboard-recorder.js:87`
- 5秒 flush 到本地文件：`src/recorder/keyboard-recorder.js:289`, `src/recorder/keyboard-recorder.js:251`
- 文件命名：`keyboard_YYYY-MM-DD.txt` `src/recorder/keyboard-recorder.js:267`

授权联动：
- consent 改变时启停 recorder：`main.js:719`, `main.js:731`, `main.js:734`
- consent IPC 暴露：`preload.js:107`

---

## 8. 数据存储与持久化位置

统一存储为 `electron-store`（Main）：`main.js:19`, `main.js:293`, `main.js:295`

关键数据键：
- `chatHistory`：对话历史 `main.js:27`, `src/chat/ai-service.js:51`, `src/chat/ai-service.js:140`
- `aiMemories`：长期记忆 `main.js:43`, `src/chat/memory-manager.js:125`
- `skillsEnabled`：技能开关 `main.js:71`
- `proactiveConfig`：主动交互配置 `main.js:63`
- `typingSpeedBaseline`：速度基线 `src/proactive/signal-collector.js:199`, `src/proactive/signal-collector.js:230`
- `rhythmData_YYYY-MM-DD`：节奏日报数据（Renderer 周期写回）`src/renderer.js:380`

本地文件：
- 键盘原始记录文件：`keyboard_YYYY-MM-DD.txt` `src/recorder/keyboard-recorder.js:267`

---

## 9. IPC 链路总览（AI 相关）

preload 对外暴露：`preload.js:3`

关键通道：
- Store：`get-store` / `set-store` `main.js:294`, `main.js:295`
- Skills：`skill-execute` / `skill-get-all-meta` `main.js:454`, `main.js:464`
- QuickPanel：`qp-process-text` / `qp-ask` / `qp-recognize-image` `preload.js:83`, `preload.js:90`, `preload.js:93`
- Recorder：`recorder-get-status` / `recorder-update` `main.js:346`, `preload.js:45`
- Consent：`consent-check` / `consent-request` / `consent-revoke` `preload.js:107`

---

## 10. 当前链路中的重点事实与注意点

1. **`src/chat/ai-service.js` 是聊天主入口，但不是全项目唯一 AI 入口**。
   - skills、quick panel、vision 分别有自己的入口（见第 4、5 节）。

2. **skills 存在“新旧双轨”**。
   - 旧触发：`skill-trigger` `main.js:416`
   - 新系统：`skill-execute` `main.js:454`

3. **SKILL.md 格式存在不一致**。
   - 如 `weekly-report` 使用 `trigger` 结构：`src/skills/skills/weekly-report/SKILL.md:4`
   - 但 registry 当前解析的是 `commands/keywords/context` 顶层：`src/skills/skill-registry.js:99`, `src/skills/skill-registry.js:102`, `src/skills/skill-registry.js:105`

4. **行为数据主要本地闭环**。
   - store + 本地文件，当前未见完整远程埋点平台。

---

## 11. 架构迭代建议（仅结论）

- 短期：保持单体，先治理（日志规范、提示词版本化、skill 元数据校验）。
- 中期：为 `AIClientMain/AIClientRenderer` 增加统一网关出口，保持 OpenAI 兼容协议。
- 长期：若出现多端/多用户/集中治理需求，再拆独立 agent service。

关键接入点：
- `src/shared/ai-client-main.js:258`
- `src/shared/ai-client-renderer.js:64`
- `src/chat/ai-service.js:71`
- `src/skills/skill-engine.js:30`
- `main.js:19`

---

## 12. 文档更新建议

后续每次新增 AI 功能时，建议同步更新：
1. 功能入口文件与函数
2. 使用的系统提示词模板位置
3. 输入上下文来源与存储键
4. IPC 通道
5. 是否新增本地文件/远程上报
