# CodeBuddy 系统规则说明文档 (ChatCat 专属)

## 一、基本沟通原则
**核心规则：始终使用中文与用户交流。** 无论用户输入什么语言，你的回复都必须是清晰、专业、友好的中文。

## 二、项目背景与产品形态
### 2.1 产品定位
**ChatCat** 是一款基于 Electron 构建的 **AI 主动引导型桌面宠物+智能办公助手**。
它不是一个传统的点按式工具箱，而是一个“活”在桌面的虚拟猫咪，核心理念是：**主动观察、主动整理、主动关怀**。用户养这只猫，它会静默学习用户的习惯（打字节奏、停留时间等），在恰当的时机自动浮出气泡提供帮助。

### 2.2 核心价值
1. **主动感知与节奏推断** (Pillar A)：无感收集键鼠信号，分析心流与疲劳，建立打字速度基线。
2. **轻办公AI助手** (Pillar B)：划选文本、截图等随时唤起的快捷处理面板。
3. **内容消费管线** (Pillar C)：记录键盘输入 -> 本地脱敏 -> AI 转换成句 -> 分段统计 -> 自动生成日报/提取待办。
4. **增量养成与联机**：打字积累亲密度 -> 升级 -> 转生获得永久倍率；同时支持内嵌 WebSocket 的局域网/公网联机。

## 三、系统架构总览 (V2)
项目为标准的 Electron 架构，分为**主进程 (Main)** 和 **渲染进程 (Renderer)**。

### 3.1 主进程 (Main Process)
- **`main.js`**: 应用入口，负责初始化所有后台服务。
- **采集与处理管线**:
  - `uiohook-napi` 进行全局输入/鼠标轨迹捕获。
  - `KeyboardRecorder` 记录键盘日志。
  - `ContentSegmenter` (Pillar C) 进行内容按时间的智能分段。
  - `PrivacyConsentManager` (Pillar C) 严格管理内容记录的授权状态。
- **技能引擎 (Skill System)**: 
  - `SkillScheduler` 定时调度器，定期触发 AI 处理（如 `TextConverter`, `DailyReport`, `TodoExtractor`）。
  - `SkillEngine` 负责与 OpenAI-compatible 的服务进行实际的通信并记录结果。
- **联机后端**: `EmbeddedServer`，基于 `ws` 库的本地轻量级 WebSocket 游戏服务器。

### 3.2 渲染进程 (Renderer Process)
- **UI 结构 (`src/index.html` / `styles.css`)**: 
  - 左侧：猫咪动画渲染 (Canvas / Spritesheet)。
  - 右侧浮层面板：Chat（对话配置）、Tools（打字记录、回顾、系统监控、番茄钟、节奏看板等）、Fun（商店、角色、联机排行）。
- **逻辑总控 (`src/renderer.js`)**: 组装各个 UI Widget 并处理 IPC。
- **主动交互引擎 (`ProactiveEngine`)**: 基于规则引擎（共 30+ 场景，如久坐提醒、心流表扬、暴怒打字安抚等），结合用户数据择机让猫咪说话。
- **节奏智能 (`RhythmAnalyzer`)** (Pillar A): 前端处理高频键鼠信号，计算即时速度 (CPS) 并更新状态看板。

### 3.3 数据流与通信
- **IPC 通信**: 采用 `electronAPI` (`preload.js`) 桥接。例如：用户同意授权 -> renderer 发送信号 -> main 记录并更改状态 -> main 广播 `consent-status-changed` -> renderer 更新 UI。
- **本地存储 (`electron-store`)**: 所有数据（包括每日打字文本、段落数组、用户设置、AI记忆、宠物属性）全部本地持久化，键名按 `_{date}` 区分日期。

## 四、开发与调试规范
作为项目的专属代码助手，在排查问题时应遵循以下逻辑：
1. **涉及内容采集**：必须首先检查授权状态开关（Pillar C 改版后，`TypeRecorder` 和 `KeyboardRecorder` 深度依赖授权）。
2. **涉及 UI 刷新**：检查 IPC 监听器是否正确挂载在全局域，并调用了对应实例的刷新方法（例如不要在 `init` 局部作用域困死变量）。
3. **涉及功能堆叠**：倾向于复用现有的基础架构（例如利用已有的 `electron-store` key，利用 `SkillRegistry` 添加新的 agent skill，而不要硬写重复代码）。

**遇到疑难杂症，你可以调用内置的 `dev-assistant` skill 随时获取最新的增量重构上下文。**