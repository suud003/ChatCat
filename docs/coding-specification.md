# ChatCat AI Runtime - 编码补充规范

> 基于上述规划文档的实施补充
> 用于指导 Team Agent 编码实施
> 最后更新: 2026-03-19

---

## 0. 编码前必读检查清单

### 环境确认

- [ ] 项目模块系统: **CommonJS for Main process** (`require()` / `module.exports`)
- [ ] src/ai-runtime/ 的所有文件都是 **Main 侧模块** (仅在 main.js 中 require)
- [ ] 不使用 ES6 import (与 preload.js 和 main.js 保持一致)
- [ ] 编码前已读本文档中的"关键决策"部分

### 主要修复项

| 需修复 | 文档位置 | 状态 |
|--------|---------|------|
| TriggerBus._genId() bug | team-impl-plan.md L1394 | ⚠️ 待修复 |
| IPC 桥接设计 | NEW (本文档 Section 1) | ✅ 新增 |
| main.js 集成点 | NEW (本文档 Section 2) | ✅ 新增 |
| 模块系统声明 | NEW (本文档 Section 3) | ✅ 新增 |

---

## 1. IPC 桥接设计 (Runtime ↔ Renderer)

### 问题

当前规划中，Runtime 在 Main 侧运行，但聊天/快速面板的 UI 在 Renderer 侧。需要定义 IPC 通信方式。

### 方案

#### 1a. 聊天链路 IPC 通信

**现有流程** (Renderer → Main):
```
ChatUI.sendMessage("你好") 
  → Renderer IPC 无直接处理
  → AIService.sendMessageStream() (Renderer 侧)
  → AIClientRenderer.stream() (fetch)
```

**改造后流程** (Renderer → Main → Renderer):
```
ChatUI.sendMessage("你好")
  → IPC: ipcRenderer.invoke('runtime-run', {
      sceneId: 'chat.default',
      trigger: {...},
      input: {userMessage: "你好"}
    })
  → Main: ipcMain.handle('runtime-run', (event, request) => {
      return runtime.run(request);  // AIRuntimeResult
    })
  → Renderer: 接收 result.content，显示
```

**代码实现** (在 main.js 中添加):

```javascript
// src/shared/ipc-runtime-handlers.js (新建)

const { ipcMain } = require('electron');

/**
 * 注册 AI Runtime IPC 处理器
 * @param {AIRuntime} runtime
 */
function registerRuntimeHandlers(runtime) {
  // 非流式调用 (Quick Panel、Skills、记忆提取)
  ipcMain.handle('runtime-run', async (event, request) => {
    try {
      const result = await runtime.run(request);
      return {
        success: result.success,
        content: result.content,
        error: result.error,
        meta: result.meta
      };
    } catch (err) {
      return {
        success: false,
        content: '',
        error: err.message,
        meta: { latencyMs: 0 }
      };
    }
  });

  // 流式调用 (聊天)
  ipcMain.handle('runtime-run-stream', async (event, request) => {
    try {
      let fullContent = '';
      for await (const chunk of runtime.runStream(request)) {
        fullContent += chunk;
        // 通过 event.sender 推送每个 chunk 回 Renderer
        event.sender.send('runtime-stream-chunk', chunk);
      }
      event.sender.send('runtime-stream-end', fullContent);
      return { success: true };
    } catch (err) {
      event.sender.send('runtime-stream-error', err.message);
      return { success: false, error: err.message };
    }
  });
}

module.exports = { registerRuntimeHandlers };
```

#### 1b. Renderer 侧改造

```javascript
// src/chat/ai-service.js (改造部分)

export class AIService {
  async *sendMessageStream(userMessage) {
    const trigger = {
      source: 'chat',
      type: 'user-message',
      payload: { text: userMessage },
      userInitiated: true,
    };

    // 调用 IPC
    const isSuccess = await window.electronAPI.invoke('runtime-run-stream', {
      trigger,
      input: { userMessage }
    });

    // 监听流式结果
    return new Promise((resolve, reject) => {
      const chunks = [];
      const removeChunkListener = window.electronAPI.on('runtime-stream-chunk', (chunk) => {
        chunks.push(chunk);
        yield chunk;  // 返回给 UI
      });
      const removeEndListener = window.electronAPI.on('runtime-stream-end', (fullContent) => {
        removeChunkListener();
        removeEndListener();
        resolve(fullContent);
      });
      const removeErrorListener = window.electronAPI.on('runtime-stream-error', (err) => {
        removeChunkListener();
        removeEndListener();
        removeErrorListener();
        reject(new Error(err));
      });
    });
  }
}
```

#### 1c. preload.js 中的 IPC 暴露

```javascript
// preload.js (添加)

const { ipcRenderer, contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 已有的 API...
  
  // 新增 Runtime API
  invoke: (channel, data) => ipcRenderer.invoke(channel, data),
  on: (channel, listener) => {
    const unsubscribe = () => ipcRenderer.removeListener(channel, listener);
    ipcRenderer.on(channel, (event, ...args) => listener(...args));
    return unsubscribe;
  },
});
```

---

## 2. main.js 集成点 (完整代码)

### 位置

在 `main.js` 第 690-780 行（现有 AIClientMain、SkillRegistry、QuickPanelManager、SkillEngine 的初始化处）之后添加。

### 代码 (替换现有的部分改造)

```javascript
// main.js 第 780-850 行

// ============ AI Runtime 初始化 ============

const { createAIRuntime } = require('./src/ai-runtime/index.js');
const { TriggerBus } = require('./src/ai-runtime/trigger-bus.js');
const { registerRuntimeHandlers } = require('./src/shared/ipc-runtime-handlers.js');

// 创建 Runtime 实例（需等 skillRegistry 初始化完成）
let runtime;
(async () => {
  try {
    runtime = createAIRuntime({
      store,
      aiClientMain: aiClient,
      skillRegistry: skillRegistry,  // 需在 skillRegistry.init() 之后
    });

    // 创建 Trigger Bus
    const triggerBus = new TriggerBus(runtime);

    // 注册 IPC 处理器
    registerRuntimeHandlers(runtime);

    // 注入到现有模块（这些模块需添加相应方法）
    // quickPanelManager.setTriggerBus(triggerBus);  // 如果 QPM 仍直接调用
    // skillEngine.setRuntime(runtime);
    // aiService.setTriggerBus(triggerBus);

    console.log('[Main] AI Runtime initialized successfully');
  } catch (err) {
    console.error('[Main] Failed to initialize AI Runtime:', err);
    // Runtime 初始化失败时，现有 AI 功能仍应继续工作
  }
})();

// 在 app.on('ready') 中确保 runtime 已初始化再启动 UI
app.on('ready', async () => {
  // ... 现有代码 ...
  
  // 确保 runtime 已初始化
  await new Promise(resolve => {
    const checkInterval = setInterval(() => {
      if (runtime) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 100);
    setTimeout(() => {
      clearInterval(checkInterval);
      resolve();  // 超时后仍继续，允许 Runtime 初始化失败时继续工作
    }, 5000);
  });
  
  // ... 现有代码 ...
});

// ============ /AI Runtime 初始化 ============
```

### 关键细节

1. **async IIFE**: Runtime 初始化是异步的，需在独立的 async 函数中进行
2. **等待 skillRegistry**: `createAIRuntime()` 需要 `skillRegistry` 已初始化
3. **错误隐容**: Runtime 初始化失败不应阻塞整个应用（保持兼容性）
4. **lazy 初始化**: runtime 对象可能在 createRuntimeHandlers 调用时还未完成初始化，需要 getter 或回调

---

## 3. 模块系统声明

### 所有 src/ai-runtime/ 文件必须使用 CommonJS

#### ✅ 正确示例

```javascript
// src/ai-runtime/scene-registry.js

class SceneRegistry {
  constructor() {
    this._scenes = new Map();
  }
  
  register(scene) {
    // ...
  }
}

module.exports = { SceneRegistry };
```

#### ❌ 错误示例 (禁止)

```javascript
// ❌ 不要用 ES6 import/export
export class SceneRegistry { }
export default SceneRegistry;
```

### 为什么

- Main 侧 (main.js, preload.js) 统一用 CommonJS
- 必须保持一致，否则 require() 会失败
- Renderer 侧的 ES6 modules 是单独的构建目标

---

## 4. 关键决策与权衡

### 4.1 IPC 通信模式选择

**选定方案**: `ipcRenderer.invoke()` + `ipcRenderer.on()` + `event.sender.send()`

**为什么**:
- invoke() 支持 async/await，更现代
- on() 支持流式推送（逐 chunk 推送）
- 与现有 IPC 模式兼容

**替代方案**:
- ❌ RPC 库（如 comlink）— 过度复杂
- ❌ WebSocket — 电子应用中不推荐
- ✅ 原生 IPC + 回调 — 选中

### 4.2 Runtime 初始化时机

**选定方案**: main.js 应用初始化时创建，但不阻塞应用启动

**为什么**:
- 允许 Runtime 初始化失败时应用仍可工作（向后兼容）
- SkillRegistry 是异步初始化，Runtime 需等待

### 4.3 现有模块改造策略

**选定方案**: 薄适配层（QuickPanelManager、SkillEngine 保持现有接口，内部改用 Runtime）

**代替方案**:
- ❌ 完全重写 — 风险太大
- ❌ 双路由（新旧 AI 并行） — 维护成本高
- ✅ 薄适配层 — 选中

**具体**: 

```javascript
// quick-panel-main.js 中的改造示例

ipcMain.handle('qp-process-text', async (event, mode, text) => {
  // 创建 Trigger
  const trigger = {
    source: 'quick-panel',
    type: mode,  // 'polish' | 'summarize' | 'explain'
    payload: { text },
    userInitiated: true,
  };

  // 通过 Runtime 处理
  const result = await runtime.run({
    sceneId: `quick.${mode}`,
    trigger,
    input: { text },
  });

  // 返回给 Renderer
  return result.content;
});
```

---

## 5. 关键修复清单

### 5.1 修复 TriggerBus._genId() bug

**原文** (team-impl-plan.md L1394):
```javascript
_genId() {
  return `${trigger.source}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  // ❌ trigger 未定义！
}
```

**正确版本**:
```javascript
_genId() {
  return `trigger-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}
```

### 5.2 ContextHub 超时策略

**改造 ContextHub.gather()**:

```javascript
async gather(scene, trigger, runtimeInput, timeout = 5000) {
  const providerIds = scene.contextProviders || [];
  
  // 为每个 Promise 添加超时
  const withTimeout = (promise, timeoutMs) => {
    return Promise.race([
      promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Provider timeout: ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  };

  const results = await Promise.all(
    providerIds.map(id => {
      const provider = this._providers.get(id);
      if (!provider) {
        console.warn(`[ContextHub] Unknown provider: ${id}`);
        return Promise.resolve({});
      }
      
      // 每个 provider 单独超时 (总超时的 80%)
      return withTimeout(
        provider.provide({ trigger, scene, runtimeInput }),
        timeout * 0.8
      ).catch(err => {
        console.warn(`[ContextHub] Provider ${id} timeout/error:`, err.message);
        return {};  // 返回空，继续执行其他 provider
      });
    })
  );

  return Object.assign({}, ...results);
}
```

### 5.3 PostProcessor 异常处理

**改造 AIRuntime.run()**:

```javascript
// 后处理步骤（第 7 步）
const postContext = { scene, trigger, input, contextData, result, traceId, store };
const postErrors = [];

for (const processorId of scene.postProcessors) {
  const handler = this._postProcessors.get(processorId);
  if (!handler) {
    console.warn(`[AIRuntime] Unknown post-processor: ${processorId}`);
    continue;
  }

  try {
    await handler(postContext);
  } catch (e) {
    // 记录错误但继续（不阻塞其他处理器）
    console.warn(`[AIRuntime] PostProcessor ${processorId} failed:`, e.message);
    postErrors.push({ processor: processorId, error: e.message });
  }
}

// 返回时包含 post 处理错误（调试用）
return {
  success: result.success && postErrors.length === 0,
  content: result.content,
  error: result.error || (postErrors.length > 0 ? `Post-processing errors: ${postErrors.map(e => e.error).join(', ')}` : null),
  meta: {
    traceId,
    sceneId: scene.id,
    modelProfile: scene.modelProfile,
    promptVersion: promptBundle.version,
    latencyMs: Date.now() - startTime,
    postProcessorErrors: postErrors,  // 可选，用于调试
  }
};
```

---

## 6. 测试框架设置

### 6.1 Jest 配置 (新建)

```javascript
// jest.config.js (项目根目录)

module.exports = {
  testEnvironment: 'node',  // Main process 测试
  testMatch: ['**/__tests__/**/*.js', '**/*.test.js'],
  collectCoverageFrom: [
    'src/ai-runtime/**/*.js',
    '!src/ai-runtime/**/*.test.js',
    '!src/ai-runtime/index.js',  // Factory 可能覆盖不到所有代码
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    }
  }
};
```

### 6.2 Mock 设置 (新建)

```javascript
// src/ai-runtime/__mocks__/mock-store.js

class MockStore {
  constructor(initialData = {}) {
    this.data = initialData;
  }
  
  get(key) {
    return this.data[key];
  }
  
  set(key, value) {
    this.data[key] = value;
  }
}

module.exports = MockStore;
```

### 6.3 单元测试模板 (示例)

```javascript
// src/ai-runtime/__tests__/scene-registry.test.js

const { SceneRegistry } = require('../scene-registry.js');

describe('SceneRegistry', () => {
  let registry;
  
  beforeEach(() => {
    registry = new SceneRegistry();
  });

  test('register() 和 get() 正常工作', () => {
    const scene = {
      id: 'chat.default',
      category: 'chat',
      description: 'Test scene',
    };
    
    registry.register(scene);
    expect(registry.get('chat.default')).toEqual(scene);
  });

  test('get() 不存在的场景返回 null', () => {
    expect(registry.get('nonexistent')).toBeNull();
  });
});
```

### 6.4 package.json 脚本

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "devDependencies": {
    "jest": "^29.0.0"
  }
}
```

---

## 7. 编码检查清单（每个模块完成时）

### 通用检查

- [ ] 所有 class 都导出：`module.exports = { ClassName }`
- [ ] 所有公开方法都有 JSDoc 注释
- [ ] 处理了所有 null/undefined 情况
- [ ] 错误消息包含上下文（如 provider ID）
- [ ] 日志使用 `[ModuleName]` prefix

### T1 (Scene Registry)

- [ ] SceneRegistry.register/get/findByTriggerMatcher 都工作正常
- [ ] SceneResolver.resolve() 正确排序多个匹配
- [ ] 所有 16 个场景都能注册和查询
- [ ] 50+ 个单元测试通过

### T2 (Prompt Registry)

- [ ] 支持 3 种适配器：Personality、TextProcessor、SkillRegistry
- [ ] {{variable}} 替换正确
- [ ] 所有现有提示词都能迁移
- [ ] PromptComposer.compose() 生成的 messages 与现有逻辑一致

### T3 (Context Hub)

- [ ] 所有 10 个 Provider 并行执行不超时
- [ ] Provider 失败不阻塞其他 Provider
- [ ] 返回值格式一致

### T4 (Model Gateway)

- [ ] 所有 10+ 个 profile 配置都生效
- [ ] run/runStream/runVision 正常工作
- [ ] 参数覆盖（overrides）正确应用

### T5 (Runtime Core)

- [ ] run() 和 runStream() 走通完整流程
- [ ] 所有 6 个 PostProcessor 执行正确
- [ ] Guard 检查生效
- [ ] 日志包含 traceId 和 latencyMs

### T6 (Trigger Bus + 适配)

- [ ] TriggerBus.emit() 正确转发到 Runtime
- [ ] 所有 5 条现有链路无功能退化
- [ ] IPC 通信正常工作
- [ ] 回归测试全部通过

---

## 8. 常见编码问题与解决方案

### 问题 1: require() 循环依赖

**症状**: `Cannot find module` 或 undefined module

**解决**:
```javascript
// ❌ 错误：在文件顶部 require
const { ContextHub } = require('../context/context-hub.js');
class AIRuntime {
  constructor(contextHub) { }  // 循环依赖
}

// ✅ 正确：通过 constructor 注入
class AIRuntime {
  constructor({ contextHub }) {
    this._contextHub = contextHub;
  }
}
```

### 问题 2: async Provider 超时

**症状**: ContextHub.gather() 永不返回

**解决**: 见上面 Section 5.2

### 问题 3: PostProcessor 中访问 store

**症状**: `Cannot read property 'get' of undefined`

**解决**:
```javascript
// ✅ 正确：从 postContext 获取 store
async function persistChatHistory(postContext) {
  const { store, result } = postContext;  // ← 从这里获取
  store.set('chatHistory', [...]);
}
```

### 问题 4: 提示词变量未替换

**症状**: 最终 message 中仍有 `{{variable}}`

**解决**: 确保 PromptComposer._resolveVariable() 处理了所有情况：
```javascript
_resolveVariable(varName, contextData) {
  // 支持嵌套如 'memory.topFacts'
  const [key, ...rest] = varName.split('.');
  let value = contextData[key];
  
  for (const subKey of rest) {
    value = value?.[subKey];
  }
  
  return typeof value === 'string' ? value : JSON.stringify(value || '');
}
```

---

## 9. 集成测试计划

### 测试场景 1: 聊天链路 (完整 end-to-end)

```javascript
// src/ai-runtime/__tests__/integration-chat.test.js

const { createAIRuntime } = require('../index.js');
const MockStore = require('../__mocks__/mock-store.js');

describe('Chat Integration', () => {
  let runtime, mockStore;
  
  beforeEach(async () => {
    mockStore = new MockStore({
      apiBaseUrl: 'http://localhost:8000/v1',
      apiKey: 'test-key',
      modelName: 'gpt-3.5-turbo',
    });
    
    runtime = createAIRuntime({
      store: mockStore,
      aiClientMain: mockAIClient,  // Mock
      skillRegistry: mockRegistry,
    });
  });

  test('chat.default 场景完整流程', async () => {
    const trigger = {
      id: 'test-1',
      source: 'chat',
      type: 'user-message',
      payload: { text: 'hello' },
      userInitiated: true,
      timestamp: Date.now(),
    };

    const result = await runtime.run({
      sceneId: 'chat.default',
      trigger,
      input: { userMessage: 'hello' },
    });

    expect(result.success).toBe(true);
    expect(result.content).toBeTruthy();
    expect(result.meta.traceId).toBeTruthy();
    expect(result.meta.latencyMs).toBeGreaterThan(0);
  });
});
```

### 测试场景 2: 上下文采集 (各 Provider 独立)

```javascript
// src/ai-runtime/__tests__/context-hub.test.js

test('所有 Provider 并行执行', async () => {
  const hub = new ContextHub();
  
  // 注册各 Provider
  hub.registerProvider(new PersonalityProvider());
  hub.registerProvider(new HistoryProvider());
  hub.registerProvider(new MemoryProvider());
  // ... 其他
  
  const scene = {
    contextProviders: ['personality', 'history', 'memory', 'behavior'],
  };

  const startTime = Date.now();
  const context = await hub.gather(scene, mockTrigger);
  const elapsed = Date.now() - startTime;

  expect(context.personality).toBeDefined();
  expect(context.history).toBeDefined();
  expect(context.memory).toBeDefined();
  expect(context.behavior).toBeDefined();
  expect(elapsed).toBeLessThan(1000);  // 应该并行，不超过 1 秒
});
```

---

## 10. 部署检查清单

### Code Review 前

- [ ] 所有单元测试通过 (`npm test`)
- [ ] 代码覆盖率 >70%
- [ ] 无 console.error (仅保留关键错误)
- [ ] JSDoc 注释完整

### 集成测试前

- [ ] T1-T4 代码 review 通过
- [ ] T5 编译无错误
- [ ] 所有 mock 配置正确

### 上线前

- [ ] 回归测试通过
- [ ] 性能基准 (latency ±10% from original)
- [ ] IPC 通信正常
- [ ] 错误日志清晰

---

## 11. 参考：完整的模块导入树

```javascript
// src/ai-runtime/index.js (工厂函数)

const { SceneRegistry } = require('./scene-registry.js');
const { SceneResolver } = require('./scene-resolver.js');
const { PromptRegistry } = require('./prompt-registry.js');
const { PromptComposer } = require('./prompt-composer.js');
const { ContextHub } = require('./context/context-hub.js');
const { PersonalityProvider } = require('./context/providers/personality-provider.js');
// ... 10 个 Provider
const { ModelGateway } = require('./model-gateway.js');
const { AIRuntime } = require('./runtime.js');
const { persistChatHistory, extractMemory, ... } = require('./post-processors');

function createAIRuntime({ store, aiClientMain, skillRegistry }) {
  // 1. 创建各组件
  // 2. 注册所有配置
  // 3. 返回 runtime 实例
}

module.exports = { createAIRuntime };
```


