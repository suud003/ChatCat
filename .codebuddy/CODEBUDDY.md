# ChatCat - Codebuddy 项目治理文件 (Project Governance)

本文件是 ChatCat 项目的最高优先级 AI 治理配置。无论何时与本项目进行交互，Codebuddy 都将默认遵守以下所有架构规范与业务限制。

## 一、基本原则与调性
1. **纯中文交流**：无论用户输入什么语言，回复必须是清晰、专业、友好的中文。
2. **遵守现有架构**：遇到疑难杂症或需要新增功能时，**优先复用现有的基础架构**（如利用现有的 `electron-store` key，利用 `SceneRegistry` 添加新的场景，禁止硬写重复代码）。

## 二、项目形态与核心价值
**ChatCat** 是一款基于 Electron 构建的 **AI 主动引导型桌面宠物+智能办公助手**。分为三大核心支柱：

*   **Pillar A (行为节奏智能)**: 零内容采集，纯基于键鼠频率推断工作状态（心流、卡壳、闲置等）。
*   **Pillar B (Quick Panel 轻办公 AI)**: 独立唤起的快捷面板，提供截图 OCR、文本润色、快捷问答。
*   **Pillar C (打字内容消费)**: 必须严格遵循**隐私授权 (Privacy Consent)**，采集打字记录 -> 脱敏过滤 -> AI 转换 -> 提取待办/日报。

## 三、AI 技术栈与运行时系统 (Phase 5 架构)

本项目采用严格分层的 AI 运行时系统。**禁止任何模块单独手写 fetch 或直连 API！**

### 1. 统一 AI 客户端
*   **主进程**: `src/shared/ai-client-main.js` (`complete()`, `stream()`, `vision()`)
*   **渲染进程**: `src/shared/ai-client-renderer.js`

### 2. 场景化调用 (Scene System)
所有 AI 功能必须被抽象为一个“场景 (Scene)”。
*   场景在 `src/ai-runtime/scenes/` 目录下注册。
*   必须使用 `SceneRegistry.register()`。

### 3. 上下文注入矩阵 (Context Providers)
场景如果需要历史对话、猫咪性格、待办等数据，必须通过 `contextProviders` 声明。
**🚨 强制规范**：
必须使用定义好的常量枚举 `CONTEXT_PROVIDERS`，**禁止使用魔法字符串**。
```javascript
const { CONTEXT_PROVIDERS } = require('../context/provider-types');

SceneRegistry.register({
  id: 'my.new.scene',
  contextProviders: [
    CONTEXT_PROVIDERS.PERSONALITY,
    CONTEXT_PROVIDERS.BEHAVIOR
  ]
});
```

## 四、排查问题与开发规范
1. **涉及内容采集 (Pillar C)**：必须首先检查隐私授权状态（`PrivacyConsentManager`）。没有授权绝不能采集。
2. **涉及 UI 刷新**：检查 IPC 监听器是否正确挂载在全局域，并调用了对应实例的刷新方法。
3. **新增设置项**：必须同步修改 4 处：
    - `src/index.html` (DOM)
    - `src/chat/chat-ui.js` (绑定、加载、保存、脏检查)
    - `main.js` (`electron-store` 默认值)
    - `preload.js` (如涉及新 IPC)
4. **CSS 风格**：
    - 漫画风 (Manga Bubble): 白底 + `3px solid #222` 边框 + `22px` 圆角 + `3px 3px 0 #222` 阴影。
    - 保存按钮区: `position: sticky; bottom: 0`。

## 五、详细文档参考
完整的架构说明和设置项清单见：
*   `docs/dev-module-context.md`
*   `.codebuddy/skills/proj-visual-explainer` (用于生成架构可视化)