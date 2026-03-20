---
name: proj-visual-explainer
description: "项目统一可视化入口。当用户需要创建或迭代交互式 HTML 可视化页面（架构图、流程图、技术复盘、项目回顾、幻灯片等）时触发。本技能完成前置检查（visual-explainer 安装检测）、风格选择交互、意图→最佳呈现方式推导，再路由到正确的执行路径。触发关键词：可视化、架构图、流程图、图表、diagram、HTML 页面、技术复盘、项目回顾、Warm Signal、visual explainer、create page、新建图表、迭代图表、diff review、project recap、slides、幻灯片、plan review、fact check。"
---

# 项目可视化表达技能

## 概述

本技能是项目可视化体系的**统一入口**。它做三件事：

1. **前置检查** — 确认 visual-explainer 技能已安装、工作目录就绪
2. **交互引导** — 推导最佳呈现方式、确认视觉风格
3. **路由执行** — 选择正确命令 + 加载风格规范 + 调用工具生成

核心价值：用户只需描述"我要做什么"，技能自动推导呈现方式、选择命令、加载规范、执行任务。

---

## Phase 0: 前置检查（每次必执行）

### Step 1 — 检测 visual-explainer 技能

本技能依赖 `visual-explainer` 作为底层渲染引擎。**每次调用前必须确认它已安装**。

检测方法：在 `use_skill` 的 `<available_skills>` 列表中查找 `visual-explainer`。

- **已安装** → 继续 Step 2
- **未安装** → **立即告知用户**：

  ```
  [前置检查] visual-explainer 技能未安装。

  这是本项目可视化体系的底层渲染引擎，必须先安装才能使用。

  安装方式：
  1. CodeBuddy 插件市场 → 搜索 "visual-explainer" → 安装
  2. 或联系项目管理员确认技能配置

  安装完成后请重新触发可视化任务。
  ```

  **提醒后立即停止**，不继续后续 Phase。

### Step 2 — 确认工作目录

工作目录为 `{REPO_ROOT}/diagrams/`。确认该目录存在，不存在则创建：

```bash
mkdir -p {REPO_ROOT}/diagrams
```

**变量定义**（后续所有路径使用这些变量）：

| 变量 | 值 |
|------|-----|
| `{REPO_ROOT}` | 项目根目录 |
| `{DIAGRAMS_DIR}` | `{REPO_ROOT}/diagrams` |
| `{SKILL_DIR}` | `{REPO_ROOT}/.claude/skills/proj-visual-explainer` |

---

## Phase 1: 意图分析 + 呈现方式推导

### Step 1 — 理解用户意图

从用户描述中提取：
- **主题**：要可视化什么内容
- **受众**：给谁看（团队内部 / 对外展示 / 汇报）
- **动作**：新建 / 迭代 / 审查 / 回顾

### Step 2 — 推导最佳呈现方式

根据意图，推导**最适合的呈现形式**。不要让用户自己选命令，而是由技能自动推荐：

| 意图特征 | 推荐呈现方式 | 路由到 |
|----------|-------------|--------|
| 需要多章节深度阐述（架构设计、技术复盘、设计方案） | **专题长页** | create-topic / update-topic |
| 只需展示一个概念（架构图、流程图、ER 图、状态机） | **独立图表** | generate-web-diagram |
| 需要逐页叙事演示（技术分享、项目汇报、评审） | **幻灯片** | generate-slides |
| 审查代码变更 | **diff 审查页** | diff-review |
| 审查方案可行性 | **方案审查页** | plan-review |
| 了解项目全貌 | **项目快照** | project-recap |
| 特性实现规划 | **实现计划** | generate-visual-plan |
| 校验文档准确性 | **事实校验** | fact-check |

**推导后向用户确认**（简短一句话）：

```
我建议用「专题长页」来呈现这个架构设计方案，适合多章节深度阐述。可以吗？
```

用户同意后继续。

### Step 3 — 确认视觉风格

**如果用户已指定风格**（如"用 Warm Signal"、"用深色风格"）→ 直接使用，跳到 Phase 2。

**如果用户未指定风格** → 根据呈现方式推荐，并**询问用户确认**：

#### 专题长页 / 独立图表推荐

```
视觉风格推荐：

1. [推荐] Warm Signal — 温暖暖棕 + 橙红点缀，适合技术文档长阅读
   已有骨架脚本可一键生成，开发效率最高
2. Blueprint — 蓝图/工程图纸风，适合系统架构
3. Editorial — 杂志排版风，适合产品展示
4. Paper-ink — 纸质简约黑白，适合数据报告
5. Monochrome terminal — 终端仿生风，适合开发者文档

请选择风格（输入编号或名称，默认 1）：
```

#### 幻灯片推荐

```
幻灯片风格推荐：

1. [推荐] Warm Signal — 温暖暖棕 + 橙红点缀，与项目现有页面统一
2. Midnight Editorial — 深色杂志风，适合对外展示
3. Terminal Mono — 终端仿生，适合技术分享
4. Swiss Clean — 瑞士极简，适合正式汇报

请选择风格（输入编号或名称，默认 1）：
```

#### 直通命令（diff-review / plan-review / project-recap / generate-visual-plan / fact-check）

这些命令有完善的内置样式，**不询问风格**，直接使用 visual-explainer 内置。

---

## Phase 2: 执行路由

### Phase 2A: 新建专题页（create-topic）

适用于需要多章节深度阐述的内容（架构设计、技术复盘、设计方案等）。

#### Step 1 — 生成骨架

`create_topic.sh` 支持通过 `--style` 参数选择风格模板：

```bash
# 使用默认风格（warm-signal）
cd {REPO_ROOT} && bash {SKILL_DIR}/scripts/create_topic.sh --name {Name}

# 指定风格模板
bash {SKILL_DIR}/scripts/create_topic.sh --name {Name} --style warm-signal

# 查看所有可用风格
bash {SKILL_DIR}/scripts/create_topic.sh --list-styles
```

生成的文件：
- `{DIAGRAMS_DIR}/{Name}.html` — 基于所选风格模板的 HTML 骨架（含 region 标记）
- `{DIAGRAMS_DIR}/{Name}.md` — 大纲骨架（SSOT 数据源）

如需自定义 section 结构：

```bash
bash {SKILL_DIR}/scripts/create_topic.sh --name {Name} \
  --title "标题" --subtitle "副标题" \
  --sections "章节1:s-id1:LABEL1,章节2:s-id2:LABEL2"
```

**如果所需风格的模板不存在**：

1. 在 `{SKILL_DIR}/scripts/templates/` 下创建 `{style}.html`（页面主模板）和 `{style}.section.html`（section 片段模板）
2. 模板中使用 `{{占位符}}` 标记动态区域（参考 `warm-signal.html` 的格式）
3. 然后通过 `--style {style}` 参数使用新模板

#### Step 2 — 完善 md 内容（SSOT）

在 `{DIAGRAMS_DIR}/{Name}.md` 中填写各章节详细内容。此阶段专注"说什么"，与用户对齐思路和信息。

**关键**：md 完善前不要急于修改 html。先确认内容再可视化。

#### Step 3 — 加载组件库 + 风格规范 + 填充 HTML

内容确认后，**始终读取通用组件库和主题化指南**：

```
read_file("{SKILL_DIR}/references/COMPONENT_REFERENCE.md")   # 通用组件 HTML 片段
read_file("{SKILL_DIR}/references/THEMING_GUIDE.md")          # CSS 变量约定 + 主题化方法
```

然后根据选定的风格加载具体主题：

1. **如果 Warm Signal** → 额外读取：

   ```
   read_file("{SKILL_DIR}/references/VISUAL_STYLE_WARM_SIGNAL.md")
   ```

2. **如果已有模板的其他风格** → 额外读取对应的 `VISUAL_STYLE_{风格名}.md`

3. **如果全新风格** → 参考 `THEMING_GUIDE.md` 中"创建新风格主题的步骤"，先定义 CSS 变量块

最后，将 md 中确认的内容提炼为可视化语言，从组件库复制 HTML 结构，注入风格主题的 CSS 变量，更新到 html 对应 section。

   调用时的约束传递：
   - 输出到 `{DIAGRAMS_DIR}/` 目录
   - html 必须保持 region 注释完整
   - 单文件交付（CSS/JS 内联）

---

### Phase 2B: 迭代已有专题页（update-topic）

#### Step 1 — 修改 md（SSOT 先行）

内容变更先在 `{DIAGRAMS_DIR}/{Name}.md` 中完成。

#### Step 2 — 定位目标 section

```bash
# 查看全部 section 行号
bash {SKILL_DIR}/scripts/locate_sections.sh {DIAGRAMS_DIR}/{Name}

# 定位指定 section
bash {SKILL_DIR}/scripts/locate_sections.sh {DIAGRAMS_DIR}/{Name} <section-id>
```

#### Step 3 — 精准读取 html 目标区域

根据定位结果，用 `read_file` 的 offset + limit 精准读取目标 section。**禁止完整读取超过 500 行的 html**。

#### Step 4 — 更新 html 目标 section

将 md 新内容提炼后更新 html 中对应 section。确保：
- region 注释不被破坏
- 只修改目标 section，不影响其他区域
- 风格与页面其他部分一致

---

### Phase 2C: 独立图表（generate-web-diagram）

为任意主题生成轻量级 HTML 图表（架构图、流程图、序列图、ER 图、状态机、思维导图等）。

#### 执行步骤

1. 确认主题和图表类型
2. **如果 Warm Signal** → 读取风格规范，在生成时注入风格约束：

   ```
   使用以下 Warm Signal 风格变量体系（而非默认配色）：
   - 背景：--bg: #faf8f5（暖白），--surface: #ffffff
   - 主强调色：--accent: #c2410c（橙红）
   - 字体：Inter + Noto Sans SC + JetBrains Mono
   - 圆角：12px
   - 支持 light/dark 双主题
   ```

3. 调用 `visual-explainer` 的 generate-web-diagram 命令
4. **输出目录覆盖**：生成到 `{DIAGRAMS_DIR}/` 而非默认的 `~/.agent/diagrams/`

---

### Phase 2D: 幻灯片（generate-slides）

生成杂志级别的幻灯片演示文档。

#### 执行步骤

1. 确认演示主题、受众、叙事结构
2. 根据 Phase 1 Step 3 确认的风格，调用 `visual-explainer` 的 generate-slides 命令
3. 输出到 `{DIAGRAMS_DIR}/` 目录

#### 可用预设对照

| 预设 | 来源 | 调性 | 推荐场景 |
|------|------|------|----------|
| **Warm Signal** | 项目自有 | 温暖暖棕 + 橙红 | 技术分享、架构评审 |
| Midnight Editorial | visual-explainer 内置 | 深色杂志风 | 产品发布、对外展示 |
| Terminal Mono | visual-explainer 内置 | 终端仿生 | 开发者演示 |
| Swiss Clean | visual-explainer 内置 | 瑞士极简 | 正式汇报 |

---

### Phase 2E: 直通命令

以下命令有完善的内置流程和样式，**不需要项目风格覆盖**。直接调用 visual-explainer 即可。

**通用适配**：输出到 `{DIAGRAMS_DIR}/` 而非 `~/.agent/diagrams/`。

#### diff-review
- 输入：分支名、commit hash、HEAD、PR 号、range（默认 main）
- 产出：执行摘要 + KPI 仪表盘 + 模块架构 + 前后对比 + 代码审查 + 决策日志

#### plan-review
- 输入：方案文件路径 + 可选代码库路径
- 产出：方案摘要 + 影响仪表盘 + 架构对比 + 风险评估 + 理解差距分析

#### project-recap
- 输入：时间窗口（`2w`/`30d`/`3m`，默认 2 周）
- 产出：项目身份 + 架构快照 + 近期活动 + 决策日志 + 状态仪表盘

#### generate-visual-plan
- 输入：特性请求描述
- 产出：状态机 + API 设计 + 边缘用例 + 测试需求 + 实现计划

#### fact-check
- 输入：目标文档路径
- 产出：声明提取 + 源码验证 + 原地修正 + 验证摘要

---

## 视觉风格体系

### 项目风格（模板驱动）

风格模板存放在 `{SKILL_DIR}/scripts/templates/` 目录下，每个风格由两个文件组成：

```
templates/
├── {style}.html            ← 页面主模板（CSS/JS/布局结构）
└── {style}.section.html    ← section 片段模板（循环生成章节）
```

模板中使用 `{{占位符}}` 标记动态区域，`create_topic.py` 负责替换。可用占位符：

| 占位符 | 用途 | 出现位置 |
|--------|------|----------|
| `{{TITLE}}` | 页面标题 | 页面模板 |
| `{{SUBTITLE}}` | 副标题 | 页面模板 |
| `{{NAV_LOGO}}` | 导航栏 Logo | 页面模板 |
| `{{HERO_LABEL}}` | Hero 区 section-label | 页面模板 |
| `{{NAV_LINKS}}` | 导航链接 HTML | 页面模板 |
| `{{HERO_STATS}}` | Hero 统计区 HTML | 页面模板 |
| `{{SECTIONS}}` | 所有 section 拼接结果 | 页面模板 |
| `{{FOOTER_TEXT}}` | 页脚文本 | 页面模板 |
| `{{DATE}}` | 生成日期 | 页面模板 |
| `{{SECTION_ID}}` | section 的 id | section 模板 |
| `{{SECTION_ALT_CLASS}}` | 交替背景 class | section 模板 |
| `{{SECTION_LABEL}}` | section 的大写标签 | section 模板 |
| `{{SECTION_HEADING}}` | section 的中文标题 | section 模板 |

已有风格模板：

| 风格 | 模板文件 | 风格规范 | 调性 | 适用场景 |
|------|----------|----------|------|----------|
| **warm-signal** | `templates/warm-signal.html` | `references/VISUAL_STYLE_WARM_SIGNAL.md` | 温暖暖棕 + 橙红 | 专题页、架构图、技术复盘 |

使用任何风格时，必须先读取通用组件库和主题化指南，再读取具体风格规范：

```
# 通用（始终读取）
read_file("{SKILL_DIR}/references/COMPONENT_REFERENCE.md")    # 风格无关的组件 HTML 片段
read_file("{SKILL_DIR}/references/THEMING_GUIDE.md")           # CSS 变量约定 + 主题接入方法

# 风格专属（按需读取）
read_file("{SKILL_DIR}/references/VISUAL_STYLE_WARM_SIGNAL.md")  # Warm Signal 的 CSS 变量实现
```

### visual-explainer 内置风格

| 风格 | 调性 | 适用场景 |
|------|------|----------|
| Blueprint | 蓝图/工程图纸 | 技术架构、系统设计 |
| Editorial | 杂志排版 | 项目报告、产品展示 |
| Paper-ink | 纸质简约黑白 | 进度回顾、数据报告 |
| Monochrome terminal | 终端仿生 | 开发者文档、CLI 工具 |

### 沉淀新风格

新增风格只需创建模板文件，无需修改 Python 代码：

1. 在 `{SKILL_DIR}/scripts/templates/` 创建 `{style}.html` 页面主模板（参考 `warm-signal.html` 的占位符用法）
2. 在 `{SKILL_DIR}/scripts/templates/` 创建 `{style}.section.html` section 片段模板
3. （可选）在 `{SKILL_DIR}/references/` 创建 `VISUAL_STYLE_{风格名}.md` 风格规范文件
4. 更新本技能的「已有风格模板」表格
5. 验证：`bash {SKILL_DIR}/scripts/create_topic.sh --list-styles` 确认新风格已被识别

---

## 工作目录规范

### 文件组织

```
diagrams/                          ← 可视化工作目录（输出）
├── {主题名}.md                    ← 内容数据源（SSOT）
├── {主题名}.html                  ← 可视化呈现（单文件交付）
├── references/                    ← 参考素材（截图、视频等）
└── serve.sh                       ← 本地预览脚本

scripts/                           ← 生成工具目录
├── create_topic.sh                ← 入口脚本
├── create_topic.py                ← 模板驱动骨架生成器
├── locate_sections.sh             ← section 行号定位工具
└── templates/                     ← 风格模板目录
    ├── warm-signal.html           ← Warm Signal 页面主模板
    ├── warm-signal.section.html   ← Warm Signal section 片段模板（含组件速查注释）
    └── {style}.html               ← 新增风格只需在此添加模板

references/                        ← 风格规范 + 组件参考
├── COMPONENT_REFERENCE.md         ← 通用组件速查手册（风格无关的 HTML 片段）
├── THEMING_GUIDE.md               ← 风格主题化指南（CSS 变量约定 + 主题接入方法）
├── VISUAL_STYLE_WARM_SIGNAL.md    ← Warm Signal 风格规范（CSS 变量实现 + 设计规则）
├── _Test_Template.html            ← 组件全览在线预览页（所有组件实例，Warm Signal 风格）
└── _Test_Template.md              ← 组件全览大纲
```

### 核心约定

| 约定 | 要点 |
|------|------|
| **md 为 SSOT** | md 文件是内容权威来源，所有内容改动先在 md 完成，再提炼到 html |
| **先对齐再可视化** | 先在 md 中对齐内容和思路，确认后再提炼到 html |
| **双文件体系** | `{name}.md`（说什么）+ `{name}.html`（怎么呈现），前缀一致 |
| **单文件交付** | CSS + JS 全部内联，不依赖外部框架，一个 HTML 文件即可完整展示 |

命名规则：PascalCase 或 snake_case，主题名简洁明确，md 和 html 前缀一致。

### 本地预览

```bash
cd {DIAGRAMS_DIR} && bash serve.sh
# 默认 http://localhost:8080
```

---

## Region 注释规范

每个章节必须用 region 注释标记边界：

```html
<!-- #region section-id -->
<section id="section-id">
  ...
</section>
<!-- #endregion section-id -->
```

Region 注释的作用：
1. **脚本定位**：`locate_sections.sh` 通过 grep 提取行号
2. **精准读取**：大文件迭代时只读取目标 section（offset + limit）
3. **IDE 折叠**：VSCode 等 IDE 支持 region 折叠

**超大文件迭代规则**：当 HTML 超过 500 行时，**禁止完整读取**，必须走定位路径：

```
1. locate_sections.sh 获取行号 → 2. 精准读取目标 section → 3. 修改目标区域
```

---

## 工具速查

### 项目脚本工具

| 工具 | 命令 | 用途 | 适用风格 |
|------|------|------|----------|
| 骨架生成 | `bash {SKILL_DIR}/scripts/create_topic.sh --name {Name}` | 新建专题长页 html + md | 所有已注册风格（默认 warm-signal） |
| 指定风格 | `bash {SKILL_DIR}/scripts/create_topic.sh --name {Name} --style {style}` | 指定风格模板 | 所有已注册风格 |
| 列出风格 | `bash {SKILL_DIR}/scripts/create_topic.sh --list-styles` | 查看可用风格模板 | - |
| section 定位 | `bash {SKILL_DIR}/scripts/locate_sections.sh {DIAGRAMS_DIR}/{Name}` | 实时提取行号 | 所有风格 |
| 定位指定 section | `bash {SKILL_DIR}/scripts/locate_sections.sh {DIAGRAMS_DIR}/{Name} <id>` | 精准定位 | 所有风格 |
| 本地预览 | `cd {DIAGRAMS_DIR} && bash serve.sh` | HTTP 预览 | - |

### visual-explainer 命令

| 命令 | 触发方式 | 说明 |
|------|----------|------|
| generate-web-diagram | 调用 `visual-explainer` 技能 | 独立图表生成 |
| generate-slides | 调用 `visual-explainer` 技能 | 幻灯片生成 |
| diff-review | 调用 `visual-explainer` 技能 | git diff 可视化审查 |
| plan-review | 调用 `visual-explainer` 技能 | 方案 vs 代码对比 |
| project-recap | 调用 `visual-explainer` 技能 | 项目心理模型快照 |
| generate-visual-plan | 调用 `visual-explainer` 技能 | 可视化实现计划 |
| fact-check | 调用 `visual-explainer` 技能 | 文档准确性校验 |

---

## HTML 编写规范

### 章节类型

| 类型 | 说明 | 建议 class |
|------|------|-----------|
| hero | 首屏，核心 KPI | `.hero`, `.hero-stats` |
| section | 正文章节 | `.section`, `.section-alt` |
| appendix | 附录、参考资料 | `.appendix` |

### 共享资源组织

```html
<!DOCTYPE html>
<html>
<head>
  <!-- #region css -->
  <style>...</style>
  <!-- #endregion css -->
</head>
<body>
  <!-- #region nav -->
  <nav class="topnav">...</nav>
  <!-- #endregion nav -->

  <!-- #region hero -->
  <header class="hero">...</header>
  <!-- #endregion hero -->

  <!-- Content sections... -->

  <!-- #region footer -->
  <footer>...</footer>
  <!-- #endregion footer -->

  <!-- #region scripts -->
  <script>...</script>
  <!-- #endregion scripts -->
</body>
</html>
```

### 组件与主题系统

本技能采用**组件 + 主题分离**架构：组件库定义 HTML 结构和语义类名（风格无关），风格主题定义 CSS 变量的实际色值。两者通过 CSS 变量接口组合。

```
通用组件（HTML 结构 + 语义类名）
    × 风格主题（CSS 变量实际色值）
    = 最终页面
```

在创建或填充 HTML 内容时，**必须先读取组件库和主题化指南**：

```
read_file("{SKILL_DIR}/references/COMPONENT_REFERENCE.md")   # 通用组件 HTML 片段
read_file("{SKILL_DIR}/references/THEMING_GUIDE.md")          # CSS 变量约定 + 主题化方法
```

#### 三层参考文件

| 文件 | 内容 | 何时读取 |
|------|------|----------|
| `COMPONENT_REFERENCE.md` | 通用组件 HTML 代码片段（风格无关） | 始终 |
| `THEMING_GUIDE.md` | CSS 变量接口约定 + 主题化方法 | 始终 |
| `VISUAL_STYLE_{风格名}.md` | 具体风格的 CSS 变量实现 + 设计规则 | 按选定风格读取 |

#### 可用组件一览

| 分类 | 组件 | 类名 | 适用场景 |
|------|------|------|----------|
| **布局** | 卡片网格 | `.card-grid--2/3/4` | 多列展示 |
| | 对比网格 | `.compare-grid` | 左右对比 |
| | 子章节 | `.subsection` | 内容分组 |
| **数据** | 表格 | `.table-wrap` | 结构化数据 |
| | KPI 卡片 | `.kpi-row` | 大数字指标 |
| | 柱状图 | `.bar-chart` | CSS 数据可视化 |
| **流程** | 流程图(CSS) | `.flow` + `.fn--{color}` | 横向流水线 |
| | 洞察卡片 | `.insight-item` | 带序号发现 |
| **SVG** | 流水线图 | `.pipeline-wrap` | 复杂模块流程 |
| | 架构图 | `.arch-diagram` | 系统架构关系 |
| | 数据流图 | `.arch-diagram` | 多层交互链路 |
| **交互** | 标签页 | `.tabs` | 多面板切换 |
| | 折叠面板 | `<details>` | 展开/收起 |
| | 参考卡片 | `.ref-card` | 可折叠图片 |
| | 图片灯箱 | `.img-overlay` | 全屏查看 |
| **内容** | Callout | `.callout--{color}` | 7 种提示框 |
| | 徽章 | `.badge--{color}` | 8 种标签 |
| | Lead 文本 | `.lead` | 引导段落 |
| | 视频容器 | `.video-wrap` | 嵌入视频 |

#### 颜色系统（8 色）

| 变量 | 色调 | 语义 |
|------|------|------|
| `--accent` | 橙红 | 核心/主强调 |
| `--blue` | 蓝 | 信息/技术 |
| `--green` | 绿 | 成功/稳定 |
| `--amber` | 琥珀 | 警告/建议 |
| `--red` | 红 | 错误/告警 |
| `--teal` | 青绿 | 基础设施 |
| `--purple` | 紫 | 新功能/生成 |
| `--cyan` | 青 | 辅助/专项 |

每种颜色都有 `--{color}-dim` 底色变体（6-8% 透明度），用于 badge 背景、hover、callout 底色。

#### 在线预览

组件全览的在线预览页面：`{SKILL_DIR}/references/_Test_Template.html`

---

## 检查清单

每次任务完成前核对：

- [ ] md 内容是否已更新（SSOT 原则）
- [ ] html 中 region 注释是否完整
- [ ] html 风格是否与页面整体一致
- [ ] 未破坏其他 section 的内容（迭代时）
- [ ] 输出文件在 `{DIAGRAMS_DIR}/` 目录下（而非 `~/.agent/diagrams/`）
