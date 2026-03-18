# ChatCat V2 — 技术方案总索引

> **版本**: v1.0 | **日期**: 2026-03-18  
> **目标**: 从「关怀型桌面宠物」→「懂你节奏的AI伙伴」  
> **三轮驱动**: 行为节奏智能 (A) + 轻办公AI (B) + 打字内容消费 (C)

---

## 📋 文档导航

| 文档 | 路径 | 内容 | 状态 |
|------|------|------|------|
| **产品综合方案** | [`v2-productivity-plan.html`](./v2-productivity-plan.html) | 三 Pillar 产品设计 + 交互方案 + 分期规划 | ✅ 完成 |
| **Pillar A 技术方案** | [`v2-pillar-a-tech-spec.md`](./v2-pillar-a-tech-spec.md) | 行为节奏智能 A1-A6 实现方案 | ✅ 完成 |
| **Pillar B 技术方案** | [`v2-pillar-b-tech-spec.md`](./v2-pillar-b-tech-spec.md) | 轻办公AI B1-B5 实现方案 | ✅ 完成 |
| **Pillar C 技术方案** | [`v2-pillar-c-tech-spec.md`](./v2-pillar-c-tech-spec.md) | 打字内容消费 C0-C4 实现方案 | ✅ 完成 |
| **V1 技术架构图** | [`architecture.html`](./architecture.html) | 当前 V1 的 Mermaid 架构图 | ✅ 参考 |

---

## 🏗️ 三 Pillar 全景

### 总体架构

```
┌────────────────────────────────────────────────────────────────────┐
│                     ChatCat V2 — 三轮驱动架构                       │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              Pillar A: 行为节奏智能 🎵                       │   │
│  │  零内容采集 · 键鼠频率+时间 · 纯规则驱动 · AI日报仅用数值    │   │
│  │  A1 鼠标信号 → A2 节奏分析 → A3 组合引擎                    │   │
│  │  A4 仪表盘 → A5 AI画像 → A6 增强场景                       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              Pillar B: 轻办公AI ✨                           │   │
│  │  热键呼出 · 润色/总结/解释 · 截图OCR · 快捷问答 · 拖拽到猫  │   │
│  │  B1 Quick Panel → B2 文本处理 → B3 截图OCR                  │   │
│  │  B4 快捷问答 → B5 拖拽+结果展示                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              Pillar C: 打字内容消费 📝  🔐 用户授权可选       │   │
│  │  默认关闭 · 安全协议授权 · 敏感过滤 · 内容分段 · 日报增强    │   │
│  │  C0 授权弹窗 → C1 敏感过滤 → C2 拼音转换 → C3 分段           │   │
│  │  C4a 日报增强 → C4b 待办提取 → C4c 内容回顾                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    共享基础设施                               │   │
│  │  main.js · preload.js · renderer.js · AI Service             │   │
│  │  Electron Store · uiohook · 通知系统 · 场景系统               │   │
│  └─────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────┘
```

### 隐私安全分级

| Pillar | 数据采集 | 隐私风险 | 是否需要授权 |
|--------|---------|---------|-------------|
| **A** 行为节奏 | 键鼠频率+时间 (纯数值) | ❌ 零风险 | 无需授权，默认启用 |
| **B** 轻办公AI | 用户主动输入的文本/截图 | ⚠️ 用户主动操作 | 无需授权（用户主动触发） |
| **C** 内容消费 | 打字内容 (键盘记录) | 🔐 需要授权 | **必须授权**，默认关闭 |

---

## 🗂️ 模块全景 (16个模块)

### Pillar A — 行为节奏智能 (6个模块)

| ID | 模块名 | 类型 | 文件 | Pillar A 技术方案章节 |
|----|--------|------|------|---------------------|
| A1 | 鼠标信号化 | 新建 | `src/proactive/mouse-signal-collector.js` | [三、A1](./v2-pillar-a-tech-spec.md#三a1-鼠标信号化-mouse-signal-collector) |
| A2 | 节奏分析器 | 新建 | `src/proactive/rhythm-analyzer.js` | [四、A2](./v2-pillar-a-tech-spec.md#四a2-节奏分析器-rhythm-analyzer) |
| A3 | 组合信号引擎 | 新建 | `src/proactive/composite-signal-engine.js` | [五、A3](./v2-pillar-a-tech-spec.md#五a3-组合信号引擎-composite-signal-engine) |
| A4 | 节奏仪表盘 | 新建 | `src/widgets/rhythm-dashboard.js` | [七、A4](./v2-pillar-a-tech-spec.md#七a4-节奏仪表盘-rhythm-dashboard) |
| A5 | AI节奏画像 | 修改 | `src/skills/daily-report.js` + SKILL.md | [八、A5](./v2-pillar-a-tech-spec.md#八a5-ai-节奏画像-日报周报) |
| A6 | 增强猫咪场景 | 新建 | `src/proactive/scenes/rhythm-scenes.js` | [九、A6](./v2-pillar-a-tech-spec.md#九a6-增强猫咪场景) |

### Pillar B — 轻办公AI (5个模块)

| ID | 模块名 | 类型 | 文件 | Pillar B 技术方案章节 |
|----|--------|------|------|---------------------|
| B1 | Quick Panel | 新建 | `src/quick-panel/quick-panel-main.js` + HTML/JS | [三、B1](./v2-pillar-b-tech-spec.md#三b1-quick-panel-浮窗) |
| B2 | 文本处理器 | 新建 | `src/quick-panel/text-processor.js` | [四、B2](./v2-pillar-b-tech-spec.md#四b2-文本处理器-text-processor) |
| B3 | 截图OCR | 新建 | `src/quick-panel/screenshot-ocr.js` | [五、B3](./v2-pillar-b-tech-spec.md#五b3-截图ocr引擎) |
| B4 | 快捷问答 | 复用QP | (集成在 B1 Quick Panel 中) | [六、B4](./v2-pillar-b-tech-spec.md#六b4-快捷问答-quick-qa) |
| B5 | 拖拽+结果 | 修改 | `src/renderer.js` 增加拖拽 | [七、B5](./v2-pillar-b-tech-spec.md#七b5-拖拽到猫--结果展示) |

### Pillar C — 打字内容消费 (5个模块)

| ID | 模块名 | 类型 | 文件 | Pillar C 技术方案章节 |
|----|--------|------|------|---------------------|
| C0 | 安全协议弹窗 | 新建 | `src/consent/privacy-consent.js` + HTML | [三、C0](./v2-pillar-c-tech-spec.md#三c0-安全协议弹窗-privacy-consent-dialog) |
| C1 | 敏感过滤器 | 新建 | `src/cleaner/sensitive-filter.js` | [四、C1](./v2-pillar-c-tech-spec.md#四c1-敏感信息过滤器-sensitive-filter) |
| C2 | 拼音转换增强 | 修改 | `src/skills/text-converter.js` | [五、C2](./v2-pillar-c-tech-spec.md#五c2-拼音中文转换增强) |
| C3 | 内容分段器 | 新建 | `src/cleaner/content-segmenter.js` | [六、C3](./v2-pillar-c-tech-spec.md#六c3-内容分段器-content-segmenter) |
| C4 | 下游消费 | 修改 | 日报/待办/回顾 | [七、C4](./v2-pillar-c-tech-spec.md#七c4-下游消费) |

---

## 📁 文件变更全景

### 新建文件 (20个)

| # | 文件路径 | Pillar | 模块 | 进程 |
|---|---------|--------|------|------|
| 1 | `src/proactive/mouse-signal-collector.js` | A | A1 | 渲染 |
| 2 | `src/proactive/rhythm-analyzer.js` | A | A2 | 渲染 |
| 3 | `src/proactive/composite-signal-engine.js` | A | A3 | 渲染 |
| 4 | `src/widgets/rhythm-dashboard.js` | A | A4 | 渲染 |
| 5 | `src/proactive/scenes/rhythm-scenes.js` | A | A6 | 渲染 |
| 6 | `src/skills/skills/weekly-report/SKILL.md` | A | A5 | 主 |
| 7 | `src/quick-panel/quick-panel-main.js` | B | B1 | 主 |
| 8 | `src/quick-panel/quick-panel.html` | B | B1 | 渲染 |
| 9 | `src/quick-panel/quick-panel-renderer.js` | B | B1 | 渲染 |
| 10 | `src/quick-panel/quick-panel-preload.js` | B | B1 | 桥接 |
| 11 | `src/quick-panel/text-processor.js` | B | B2 | 主 |
| 12 | `src/quick-panel/screenshot-ocr.js` | B | B3 | 主 |
| 13 | `src/quick-panel/screenshot-overlay.html` | B | B3 | 渲染 |
| 14 | `src/quick-panel/screenshot-overlay.js` | B | B3 | 渲染 |
| 15 | `src/quick-panel/screenshot-preload.js` | B | B3 | 桥接 |
| 16 | `src/consent/privacy-consent.js` | C | C0 | 主 |
| 17 | `src/consent/consent-dialog.html` | C | C0 | 渲染 |
| 18 | `src/consent/consent-preload.js` | C | C0 | 桥接 |
| 19 | `src/cleaner/sensitive-filter.js` | C | C1 | 主 |
| 20 | `src/cleaner/content-segmenter.js` | C | C3 | 主 |

### 修改文件 (12个)

| # | 文件路径 | 修改来源 | 主要变更 |
|---|---------|---------|---------|
| 1 | `main.js` | A+B+C | mousemove节流 + QP集成 + Consent集成 + 剪贴板图片 (~50行) |
| 2 | `preload.js` | A+B+C | 新增 ~12个 API (~15行) |
| 3 | `src/renderer.js` | A+B+C | V2模块初始化 + 拖拽接收 + 回顾Tab (~140行) |
| 4 | `src/index.html` | A+C | 新增"节奏"Tab + 新增"回顾"Tab (4行) |
| 5 | `src/styles.css` | A+B+C | rhythm-* + dam-* + review-* (~150行) |
| 6 | `src/proactive/proactive-engine.js` | A | 外部信号 + 场景注册 (~15行) |
| 7 | `src/skills/daily-report.js` | A+C | 注入节奏+内容维度 (~50行) |
| 8 | `src/skills/skills/daily-report/SKILL.md` | A+C | 双维度 prompt |
| 9 | `src/skills/text-converter.js` | C | 二次过滤 + 触发分段 (~20行) |
| 10 | `src/skills/skills/text-converter/SKILL.md` | C | 代码保留指令 |
| 11 | `src/skills/todo-extractor.js` | C | 分段内容提取 (~20行) |
| 12 | `src/recorder/keyboard-recorder.js` | C | 敏感过滤 + contentMode (~15行) |

### 变更统计

| 类别 | Pillar A | Pillar B | Pillar C | 总计 |
|------|---------|---------|---------|------|
| 新建文件 | 6 | 9 | 5 | **20** |
| 修改文件 | 7 | 5 | 9 | **12** (去重) |
| **总文件数** | | | | **32** |

---

## 🚀 分期交付计划

### Phase 总览

```
Phase 1 ──→ Phase 2 ──→ Phase 3 ──→ Phase 4 ──→ Phase 5 ──→ Phase 6
(A基础)     (B核心)      (B截图)     (A展示)      (A+B整合)   (C内容)
 13.5h       23.5h        14.5h       16h          3h          25.5h
  ├───── Pillar A ─────┤           ├── A ──┤   ├─ A+B ─┤
                        ├── Pillar B ──────┤             ├─ Pillar C ─┤
```

### 详细时间线

| Phase | 名称 | Pillar | 工时 | 核心交付物 | 依赖 |
|-------|------|--------|------|-----------|------|
| **Phase 1** | 行为节奏基础 | A | ~13.5h | A1鼠标信号 + A2节奏分析 + A3组合引擎 | 无 |
| **Phase 2** | 轻办公AI核心 | B | ~23.5h | B1 Quick Panel + B2文本处理 + B4问答 + B5拖拽 | 无 |
| **Phase 3** | 截图OCR | B | ~14.5h | B3截图引擎 + 多模态AI + 剪贴板图片 | Phase 2 |
| **Phase 4** | 节奏仪表盘+场景 | A | ~16h | A4仪表盘 + A5 AI画像 + A6七个场景 | Phase 1 |
| **Phase 5** | AI画像+反馈 | A+B | ~3h | 反馈闭环 + 处理历史优化 | Phase 2+4 |
| **Phase 6** | 打字内容消费 | C | ~25.5h | C0授权 + C1过滤 + C3分段 + C4日报增强 | Phase 1+4 |

### 工时汇总

| Pillar | Phase | 工时 |
|--------|-------|------|
| Pillar A | Phase 1 + 4 | ~29.5h |
| Pillar B | Phase 2 + 3 + 5(B) | ~41h |
| Pillar C | Phase 6 | ~25.5h |
| **总计** | **6 个 Phase** | **~96h** |

### 推荐执行顺序

Phase 1 和 Phase 2 **可以并行开发**（无依赖），建议：

```
Week 1:  Phase 1 (A基础) + Phase 2 (B核心) — 并行
Week 2:  Phase 3 (B截图) + Phase 4 (A展示) — 并行
Week 3:  Phase 5 (整合) + Phase 6 (C内容)
```

---

## 🔌 Pillar 间交叉引用

### A ↔ C: 节奏数据 + 内容数据 → 增强日报

```
Pillar A (Phase 4):
  RhythmAnalyzer → getDailySummary()
  CompositeEngine → getTodayFullData()
       │
       ├── rhythmData_{date} (store)
       │
Pillar C (Phase 6):
  ContentSegmenter → segment()
       │
       ├── segments_{date} (store)
       │
       ▼
  DailyReport (增强版):
    读取 rhythmData_{date} + segments_{date}
    → AI 生成 「节奏 + 内容」双维度日报
```

### A ↔ B: 节奏状态 → 猫咪行为 → AI交互

```
Pillar A:
  RhythmAnalyzer → state = 'stuck' (卡壳)
       │
       ├── 触发 A6 stuckComfortScene → 猫咪安慰气泡
       │
Pillar B:
       └── 猫咪气泡中可嵌入 Quick Panel 快捷入口
           "卡住了？要不要让我帮你看看？"  [打开 Quick Panel]
```

### B → C: 处理历史 → 回顾面板

```
Pillar B:
  Quick Panel 处理记录 → qpHistory (store)
       │
Pillar C:
       └── 回顾面板可同时展示：
           - 打字内容分段 (来自 C3)
           - Quick Panel 处理历史 (来自 B)
```

---

## 📊 Store Keys 全景

### Pillar A 新增

| Key | 类型 | 大小 | 生命周期 | 来源模块 |
|-----|------|------|---------|---------|
| `rhythmBaselines` | Array | ~5KB | 30天滚动 | A3 |
| `hourlyPatterns` | Object | ~2KB | 永久更新 | A3 |
| `rhythmData_YYYY-MM-DD` | Object | ~3KB/天 | 7天滚动 | A3 |
| `rhythmDailyReport_YYYY-MM-DD` | String | ~1KB/天 | 30天滚动 | A5 |

### Pillar B 新增

| Key | 类型 | 大小 | 生命周期 | 来源模块 |
|-----|------|------|---------|---------|
| `qpHistory` | Array | ~50KB | 50条上限 | B1 |
| `qpFeedback` | Array | ~2KB | 永久 | B5 |
| `quickPanelAutoHide` | Boolean | 1B | 永久 | B1 |
| `qpLastMode` | String | ~10B | 永久 | B1 |

### Pillar C 新增

| Key | 类型 | 大小 | 生命周期 | 来源模块 |
|-----|------|------|---------|---------|
| `contentConsentGranted` | Boolean | 1B | 永久 | C0 |
| `contentConsentGrantedAt` | Number | 8B | 永久 | C0 |
| `contentConsentVersion` | String | ~5B | 永久 | C0 |
| `customSensitiveKeywords` | Array | ~500B | 永久 | C1 |
| `segments_YYYY-MM-DD` | Array | ~5KB/天 | 7天滚动 | C3 |

---

## ⌨️ 热键总览

| 热键 | 功能 | 版本 | Pillar |
|------|------|------|--------|
| `Ctrl+Shift+C` | 显示窗口 + 打开聊天 | V1 (保持) | - |
| `Ctrl+Shift+Space` | Quick Panel 开关 | V2 新增 | B |
| `Ctrl+Shift+S` | 截图OCR | V2 新增 | B |
| `ESC` | 关闭 Quick Panel / 取消截图 | V2 新增 | B |
| `Ctrl+Enter` | Quick Panel 发送 | V2 新增 | B |

---

## 🧪 AI 调用清单

| 调用点 | 频率 | 模型 | token估算 | Pillar |
|--------|------|------|----------|--------|
| A5 日报 | 1次/天 | 便宜模型 | ~800 | A |
| A5 周报 | 1次/周 | 便宜模型 | ~1200 | A |
| B2 文本处理 | 按需 | 快速模型 | ~500/次 | B |
| B3 截图OCR | 按需 | Vision模型 | ~1000/次 | B |
| B4 快捷问答 | 按需 | 快速模型 | ~300/次 | B |
| C2 文本转换 | 每10分钟 | 便宜模型 | ~500/次 | C |
| C4a 增强日报 | 1次/天 | 便宜模型 | +200 (合并) | C |

**日常成本估算**: A5日报1次 + C2文本转换约10次/天 + B按需 ≈ 每天 ~15-20次 API 调用

---

## 🔧 开发环境要求

### 现有依赖 (无需新增)
- Electron 28+
- uiohook-napi (全局键鼠)
- electron-store (持久化)

### 可能需要新增的依赖
| 包 | 用途 | Phase |
|----|------|-------|
| 无 | Pillar A 纯计算，不需要额外包 | Phase 1+4 |
| 无 | Pillar B 使用 Electron 内置 API (BrowserWindow, desktopCapturer, clipboard) | Phase 2+3 |
| 无 | Pillar C 纯 JS 处理 | Phase 6 |

**V2 的所有功能均使用 Electron 内置 API + 纯 JavaScript 实现，无需新增第三方依赖。**

---

## 📐 新增目录结构

```
src/
├── quick-panel/          ← V2 Pillar B 新建
│   ├── quick-panel-main.js
│   ├── quick-panel.html
│   ├── quick-panel-renderer.js
│   ├── quick-panel-preload.js
│   ├── text-processor.js
│   ├── screenshot-ocr.js
│   ├── screenshot-overlay.html
│   ├── screenshot-overlay.js
│   └── screenshot-preload.js
│
├── consent/              ← V2 Pillar C 新建
│   ├── privacy-consent.js
│   ├── consent-dialog.html
│   └── consent-preload.js
│
├── cleaner/              ← V2 Pillar C 新建
│   ├── sensitive-filter.js
│   └── content-segmenter.js
│
├── proactive/
│   ├── mouse-signal-collector.js   ← V2 Pillar A 新建
│   ├── rhythm-analyzer.js          ← V2 Pillar A 新建
│   ├── composite-signal-engine.js  ← V2 Pillar A 新建
│   └── scenes/
│       └── rhythm-scenes.js        ← V2 Pillar A 新建
│
├── widgets/
│   └── rhythm-dashboard.js         ← V2 Pillar A 新建
│
└── skills/skills/
    └── weekly-report/
        └── SKILL.md                ← V2 Pillar A 新建
```

---

## ✅ 检查清单

### 开始 Phase 1 之前
- [ ] 确认 V1 代码库稳定，所有现有功能正常
- [ ] 创建 V2 开发分支
- [ ] 确认 AI API 配置正常

### 每个 Phase 完成时
- [ ] 所有新建文件已创建
- [ ] 所有修改文件已更新
- [ ] 手动测试核心场景
- [ ] 性能验证（内存、CPU）
- [ ] 与现有功能无冲突

### V2 全部完成时
- [ ] Phase 1-6 全部交付
- [ ] 三 Pillar 交叉功能正常（A→C日报增强等）
- [ ] 热键无冲突
- [ ] Pillar C 授权流程完整
- [ ] Store 清理策略正常运行
- [ ] 文档更新完成
