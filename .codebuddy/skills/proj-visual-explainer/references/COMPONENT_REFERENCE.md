# 通用组件速查手册

> **本文件是风格无关的 UI 组件库**。所有 HTML 代码片段使用 CSS 变量（`var(--xxx)`）而非硬编码色值，
> 可与任意视觉风格主题组合使用。
>
> **使用流程**：
> 1. 从本文件复制组件 HTML 结构
> 2. 从 `THEMING_GUIDE.md` 了解 CSS 变量约定和风格主题化方法
> 3. 从具体风格规范（如 `VISUAL_STYLE_WARM_SIGNAL.md`）获取 CSS 变量的实际色值
>
> 完整在线预览（Warm Signal 主题）：`references/_Test_Template.html`（与本文件同目录）

---

## 架构概述

```
┌─────────────────────────────────────────────────┐
│  组件库（本文件）                                 │
│  HTML 结构 + 语义类名 + CSS 变量占位符              │
│  风格无关，通用于所有主题                           │
├─────────────────────────────────────────────────┤
│  主题化指南（THEMING_GUIDE.md）                    │
│  CSS 变量约定 + 主题接入规则 + 组合方法             │
├─────────────────────────────────────────────────┤
│  具体风格规范（VISUAL_STYLE_{风格名}.md）           │
│  CSS 变量实际色值 + 风格专属设计规则                │
│  例：VISUAL_STYLE_WARM_SIGNAL.md                  │
└─────────────────────────────────────────────────┘
```

---

## 目录

| # | 组件 | 类名 | 分类 | 适用场景 |
|---|------|------|------|----------|
| 1 | [导航栏](#1-导航栏-topnav) | `.topnav` | 结构 | 页面顶部粘性导航 |
| 2 | [Hero 区](#2-hero-区-hero) | `.hero` | 结构 | 首屏大标题 + 统计数字 |
| 3 | [章节结构](#3-章节结构) | `section` | 结构 | 页面内容分块 |
| 4 | [卡片网格](#4-卡片网格-card-grid) | `.card-grid--2/3/4` | 布局 | 多列布局展示 |
| 5 | [对比网格](#5-对比网格-compare-grid) | `.compare-grid` | 布局 | 左右对比布局 |
| 6 | [子章节](#6-子章节-subsection) | `.subsection` | 布局 | 章节内分组 |
| 7 | [表格](#7-表格-table-wrap) | `.table-wrap` | 数据 | 结构化数据展示 |
| 8 | [KPI 卡片](#8-kpi-卡片-kpi-row) | `.kpi-row` | 数据 | 大数字指标 |
| 9 | [柱状图](#9-柱状图-bar-chart) | `.bar-chart` | 数据 | 纯 CSS 数据可视化 |
| 10 | [流程图](#10-流程图-flow) | `.flow` | 流程 | 纯 CSS 横向流程 |
| 11 | [洞察卡片](#11-洞察卡片-insight-item) | `.insight-item` | 流程 | 带序号的关键发现 |
| 12 | [SVG 流水线图](#12-svg-流水线图-pipeline-wrap) | `.pipeline-wrap` | SVG | 复杂流程 SVG |
| 13 | [SVG 架构图](#13-svg-架构图-arch-diagram) | `.arch-diagram` | SVG | 系统架构 SVG |
| 14 | [SVG 数据流图](#14-svg-数据流图) | `.arch-diagram` | SVG | 多层交互链路 SVG |
| 15 | [标签页](#15-标签页-tabs) | `.tabs` | 交互 | 多面板切换 |
| 16 | [折叠面板](#16-折叠面板-details) | `<details>` | 交互 | 展开/收起 |
| 17 | [参考卡片](#17-参考卡片-ref-card) | `.ref-card` | 交互 | 可折叠图片展示 |
| 18 | [图片灯箱](#18-图片灯箱-img-overlay) | `.img-overlay` | 交互 | 全屏查看图片 |
| 19 | [Callout 提示框](#19-callout-提示框) | `.callout--{color}` | 内容 | 语义提示 |
| 20 | [徽章](#20-徽章-badge) | `.badge--{color}` | 内容 | 状态标签 |
| 21 | [Lead 文本](#21-lead-文本) | `.lead` | 内容 | 引导性段落 |
| 22 | [视频容器](#22-视频容器-video-wrap) | `.video-wrap` | 内容 | 视频/占位符 |
| 23 | [Typography](#23-typography-层级) | `h1-h4`, `.lead` 等 | 内容 | 标题和文本层级 |

---

## CSS 变量约定

组件 HTML 中使用的 CSS 变量遵循统一约定。**任何风格主题只需实现这些变量，即可驱动所有组件**。

详细的变量清单和主题化方法见 `THEMING_GUIDE.md`。此处仅列出组件中最常用的：

### 颜色变量（8 色语义系统）

| 变量 | 语义 | 典型用途 |
|------|------|----------|
| `--accent` | 主强调 | 核心功能、入口节点、主 callout |
| `--blue` | 信息/技术 | 技术细节、架构说明 |
| `--green` | 成功/稳定 | 通过状态、最佳实践 |
| `--amber` | 警告/建议 | 注意事项、Beta 标签 |
| `--red` | 错误/告警 | 反模式、必须修复 |
| `--teal` | 基础设施 | 工具链、审计模块 |
| `--purple` | 新功能/生成 | 插件、代码生成 |
| `--cyan` | 辅助/专项 | 特殊标记、次要信息 |

每种颜色都有 `--{color}-dim` 底色变体，用于 badge 背景、hover 状态、callout 底色。

### 表面变量

| 变量 | 语义 |
|------|------|
| `--bg` | 页面背景 |
| `--bg-warm` | 交替背景区块 |
| `--surface` | 卡片/表格背景 |
| `--surface2` | 表头/次级面板背景 |
| `--border` | 默认边框 |
| `--border-bright` | hover/active 边框 |
| `--text` | 主文本 |
| `--text-mid` | 次级文本 |
| `--text-dim` | 辅助文本 |

### 其他变量

| 变量 | 语义 |
|------|------|
| `--font-body` | 正文字体族 |
| `--font-mono` | 等宽字体族 |
| `--shadow` | 默认阴影 |
| `--shadow-lg` | 增强阴影 |
| `--radius` | 统一圆角 |

---

## 1. 导航栏 (.topnav)

粘性导航栏，毛玻璃背景 + 滚动高亮 + 主题切换。

```html
<nav class="topnav">
  <span class="nav-logo">项目名</span>
  <a href="#hero">Overview</a>
  <a href="#s-section1">章节一</a>
  <a href="#s-section2">章节二</a>
  <button class="theme-toggle" id="themeToggle" title="Toggle Theme" aria-label="Toggle Theme">
    <span class="toggle-icon icon-sun">&#9728;</span>
    <span class="toggle-icon icon-moon">&#9790;</span>
  </button>
</nav>
```

**要点**：
- `nav-logo` 用 `--accent` 色显示项目名
- `a[href]` 链接对应页内 section id
- 主题切换按钮始终放最右侧（`margin-left: auto`）
- JS scrollspy 自动给当前可见 section 的链接添加 `.active`

**CSS 核心**（风格无关的结构 CSS）：

```css
.topnav {
  position: sticky; top: 0; z-index: 100;
  background: color-mix(in srgb, var(--bg) 85%, transparent);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
  padding: 0 32px; display: flex; align-items: center; height: 52px; gap: 4px;
  overflow-x: auto; scrollbar-width: none;
}
.topnav a {
  font-size: 13px; font-weight: 500; color: var(--text-dim); text-decoration: none;
  padding: 6px 14px; border-radius: 6px; white-space: nowrap; transition: all 0.2s;
}
.topnav a:hover { color: var(--text); background: var(--accent-dim); }
.topnav a.active { color: var(--accent); background: var(--accent-dim); font-weight: 600; }
.nav-logo { font-weight: 700; font-size: 14px; color: var(--accent); margin-right: 12px; }
```

---

## 2. Hero 区 (.hero)

首屏区域，居中布局，渐变背景。

```html
<header class="hero" id="hero">
  <div class="container">
    <p class="section-label">SECTION LABEL</p>
    <h1>主标题</h1>
    <p style="color:var(--text-dim);font-size:16px;font-family:var(--font-mono);
       font-weight:500;margin-bottom:16px">副标题 v1.0</p>
    <p class="lead" style="margin:0 auto 32px;text-align:center">
      引导描述文本，解释本页的用途和主要内容。
    </p>
    <div class="hero-stats">
      <div class="hero-stat">
        <div class="num" style="color:var(--accent)">42</div>
        <div class="label">Metric A</div>
      </div>
      <div class="hero-stat">
        <div class="num" style="color:var(--blue)">7</div>
        <div class="label">Metric B</div>
      </div>
      <div class="hero-stat">
        <div class="num" style="color:var(--green)">98%</div>
        <div class="label">Metric C</div>
      </div>
    </div>
  </div>
</header>
```

**要点**：
- `.num` 每个用不同语义色（从 8 色系统中选取）
- `.label` 自动大写 + 小字号
- hero-stats 最多 5 个统计项效果最佳
- 背景渐变使用 `--accent-dim` → 透明

**CSS 核心**：

```css
.hero {
  padding: 80px 0 64px; text-align: center;
  border-bottom: 1px solid var(--border);
  background: linear-gradient(180deg, var(--accent-dim) 0%, transparent 60%);
}
.hero-stats { display: flex; justify-content: center; gap: 40px; flex-wrap: wrap; }
.hero-stat .num {
  font-size: 36px; font-weight: 800; letter-spacing: -1px;
  font-variant-numeric: tabular-nums;
}
.hero-stat .label {
  font-size: 12px; font-weight: 500; color: var(--text-dim);
  text-transform: uppercase; letter-spacing: 1px;
}
```

---

## 3. 章节结构

### 标准章节

```html
<!-- #region section-id -->
<section id="section-id">
  <div class="container">
    <p class="section-label">SECTION LABEL</p>
    <h2>章节标题</h2>

    <div class="subsection">
      <h3>子章节标题</h3>
      <!-- 组件内容 -->
    </div>
  </div>
</section>
<!-- #endregion section-id -->
```

### 交替背景章节

```html
<!-- #region section-id -->
<section id="section-id" class="section-alt">
  <div class="container">
    <!-- section-alt 使用 --bg-warm 背景，区分相邻章节 -->
  </div>
</section>
<!-- #endregion section-id -->
```

**要点**：
- region 注释用于脚本定位和 IDE 折叠
- 偶数章节建议加 `section-alt` 交替背景
- `section-label` 全大写 mono 字体标签

---

## 4. 卡片网格 (.card-grid)

三种列数变体，`auto-fit` 响应式。

### 4.1 三列卡片（card-grid--3）+ 顶部色条

```html
<div class="card-grid card-grid--3">
  <div class="card" style="border-top:4px solid var(--accent)">
    <h3>标题一</h3>
    <p>描述内容，支持 <code>内联代码</code> 高亮。</p>
  </div>
  <div class="card" style="border-top:4px solid var(--blue)">
    <h3>标题二</h3>
    <p>每张卡片可独立配色。</p>
  </div>
  <div class="card" style="border-top:4px solid var(--teal)">
    <h3>标题三</h3>
    <p>hover 时自动提升阴影。</p>
  </div>
</div>
```

### 4.2 两列卡片（card-grid--2）

```html
<div class="card-grid card-grid--2">
  <div class="card" style="border-top:4px solid var(--green)">
    <h4>标题</h4>
    <p>两列布局适合对比场景。<br/>
    <span class="badge badge--green">LIVE</span> <span class="badge badge--blue">V2</span></p>
  </div>
  <div class="card" style="border-top:4px solid var(--purple)">
    <h4>标题</h4>
    <p>内部可嵌套 badge、code 等。<br/>
    <span class="badge badge--purple">NEW</span></p>
  </div>
</div>
```

### 4.3 四列卡片（card-grid--4）

```html
<div class="card-grid card-grid--4">
  <div class="card"><h4>模块 A</h4><p>紧凑布局</p></div>
  <div class="card"><h4>模块 B</h4><p>适合列表</p></div>
  <div class="card"><h4>模块 C</h4><p>信息密集</p></div>
  <div class="card"><h4>模块 D</h4><p>快速概览</p></div>
</div>
```

**顶部色条**：使用 `style="border-top:4px solid var(--{color})"` 添加语义色条。可用 8 色中任意一种。

**CSS 核心**：

```css
.card-grid { display: grid; gap: 16px; margin-top: 24px; }
.card-grid--2 { grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); }
.card-grid--3 { grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
.card-grid--4 { grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
.card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 24px;
  box-shadow: var(--shadow); transition: border-color 0.2s, box-shadow 0.2s;
}
.card:hover { border-color: var(--border-bright); box-shadow: var(--shadow-lg); }
```

---

## 5. 对比网格 (.compare-grid)

两列对比布局，常搭配卡片使用。

```html
<div class="compare-grid">
  <div class="card" style="border-top:4px solid var(--green)">
    <h4>方案 A</h4>
    <p><strong>优势</strong>：xxx<br/>
    <strong>劣势</strong>：xxx</p>
  </div>
  <div class="card" style="border-top:4px solid var(--blue)">
    <h4>方案 B</h4>
    <p><strong>优势</strong>：xxx<br/>
    <strong>劣势</strong>：xxx</p>
  </div>
</div>
```

**要点**：768px 以下自动转单列。

---

## 6. 子章节 (.subsection)

```html
<div class="subsection">
  <h3>子章节标题</h3>
  <!-- 任意组件 -->
</div>
```

**CSS**：`.subsection { margin-top: 40px; }` `.subsection:first-child { margin-top: 0; }`

---

## 7. 表格 (.table-wrap)

响应式表格，移动端可横向滚动。

```html
<div class="table-wrap">
  <table>
    <thead>
      <tr><th>Column A</th><th>Column B</th><th>Status</th><th>Note</th></tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Item 1</strong></td>
        <td><code>value_a</code></td>
        <td><span class="badge badge--green">OK</span></td>
        <td>说明文字</td>
      </tr>
      <tr>
        <td><strong>Item 2</strong></td>
        <td><code>value_b</code></td>
        <td><span class="badge badge--amber">WARN</span></td>
        <td>说明文字</td>
      </tr>
    </tbody>
  </table>
</div>
```

**要点**：
- 表头自动 mono 字体、大写
- 行 hover 显示淡色背景
- 内部可嵌套 badge、code、strong 等

---

## 8. KPI 卡片 (.kpi-row)

大数字指标卡片行，自动等分。

```html
<div class="kpi-row">
  <div class="kpi-card" style="border-top:3px solid var(--accent)">
    <div class="kpi-num" style="color:var(--accent)">1,173</div>
    <div class="kpi-label">Commits</div>
    <div class="kpi-desc">3 months total</div>
  </div>
  <div class="kpi-card" style="border-top:3px solid var(--green)">
    <div class="kpi-num" style="color:var(--green)">98.5%</div>
    <div class="kpi-label">Uptime</div>
    <div class="kpi-desc">last 30 days</div>
  </div>
  <div class="kpi-card" style="border-top:3px solid var(--blue)">
    <div class="kpi-num" style="color:var(--blue)">2.3s</div>
    <div class="kpi-label">Latency</div>
    <div class="kpi-desc">P50 avg</div>
  </div>
</div>
```

**要点**：
- `.kpi-num` 32px 超粗字重，等宽数字（`tabular-nums`）
- `.kpi-desc` 可选，补充描述
- 顶部 3px 色条区分指标类别
- 每行 3-5 个效果最佳

---

## 9. 柱状图 (.bar-chart)

纯 CSS 实现的柱状图。

```html
<div class="bar-chart">
  <div class="bar-item">
    <div class="bar-value">217</div>
    <div class="bar-fill" style="height:100%;background:var(--green)"></div>
    <div class="bar-label">feat</div>
  </div>
  <div class="bar-item">
    <div class="bar-value">120</div>
    <div class="bar-fill" style="height:55%;background:var(--red)"></div>
    <div class="bar-label">fix</div>
  </div>
  <div class="bar-item">
    <div class="bar-value">85</div>
    <div class="bar-fill" style="height:39%;background:var(--amber)"></div>
    <div class="bar-label">chore</div>
  </div>
</div>
```

**要点**：
- `height` 百分比相对于最高值计算（最高 = 100%）
- 每个 bar 用不同语义色
- `.bar-value` 显示在柱体上方，`.bar-label` 在下方

---

## 10. 流程图 (.flow)

纯 CSS 横向流程节点图，支持 8 种颜色变体。

### 10.1 基础流程

```html
<div class="flow">
  <div class="flow-node fn--accent">
    <div class="fn-name">Step 1</div>
    <div class="fn-sub">description</div>
  </div>
  <div class="flow-arrow">&rarr;</div>
  <div class="flow-node fn--blue">
    <div class="fn-name">Step 2</div>
    <div class="fn-sub">description</div>
  </div>
  <div class="flow-arrow">&rarr;</div>
  <div class="flow-node fn--green">
    <div class="fn-name">Step 3</div>
    <div class="fn-sub">description</div>
  </div>
</div>
```

### 10.2 颜色变体

| 类名 | 语义 | 典型用途 |
|------|------|----------|
| `fn--accent` | 入口/核心 | 流程起始点 |
| `fn--blue` | 处理/分析 | 中间处理步骤 |
| `fn--green` | 成功/输出 | 流程终点 |
| `fn--purple` | 执行/生成 | 代码生成、模型推理 |
| `fn--teal` | 审计/验证 | 安全检查、质量门 |
| `fn--amber` | 警告/分支 | 条件分支 |
| `fn--red` | 错误/告警 | 异常处理 |
| `fn--cyan` | 信息/辅助 | 日志、监控 |

**要点**：
- 768px 以下自动转纵排，箭头旋转 90 度
- 箭头使用 `&rarr;` HTML 实体
- `.fn-sub` 可选，mono 字体小字号

---

## 11. 洞察卡片 (.insight-item)

带序号徽章的关键发现条目。

```html
<div class="insight-item">
  <h4><span class="badge badge--accent">1</span> 洞察标题</h4>
  <p>洞察内容描述，解释为什么这个发现很重要。</p>
</div>
<div class="insight-item">
  <h4><span class="badge badge--blue">2</span> 第二个洞察</h4>
  <p>另一个关键发现的描述。</p>
</div>
<div class="insight-item">
  <h4><span class="badge badge--green">3</span> 第三个洞察</h4>
  <p>使用不同颜色 badge 表达序号。</p>
</div>
```

---

## 12. SVG 流水线图 (.pipeline-wrap)

用于展示模块间的处理流水线。包含箭头 marker、圆角矩形、虚线路径。

```html
<div class="pipeline-wrap">
  <svg viewBox="0 0 880 260" xmlns="http://www.w3.org/2000/svg">
    <!-- 定义箭头 marker（每种颜色一个） -->
    <defs>
      <marker id="arr-accent" markerWidth="10" markerHeight="8"
              refX="9" refY="4" orient="auto">
        <path d="M0,0 L10,4 L0,8" fill="var(--accent)"/>
      </marker>
      <marker id="arr-green" markerWidth="10" markerHeight="8"
              refX="9" refY="4" orient="auto">
        <path d="M0,0 L10,4 L0,8" fill="var(--green)"/>
      </marker>
      <marker id="arr-blue" markerWidth="10" markerHeight="8"
              refX="9" refY="4" orient="auto">
        <path d="M0,0 L10,4 L0,8" fill="var(--blue)"/>
      </marker>
    </defs>

    <!-- 节点：圆角矩形 + 标签 + 名称 + 描述 -->
    <rect x="10" y="90" width="120" height="60" rx="10"
          fill="var(--surface)" stroke="var(--accent)" stroke-width="2"/>
    <text x="70" y="116" text-anchor="middle"
          font-size="13" font-weight="700" fill="var(--accent)">Node A</text>
    <text x="70" y="134" text-anchor="middle"
          font-size="9" fill="var(--text-dim)" class="mono">description</text>

    <!-- 箭头连线 -->
    <line x1="130" y1="120" x2="178" y2="120"
          stroke="var(--accent)" stroke-width="2" marker-end="url(#arr-accent)"/>

    <!-- 下一个节点 -->
    <rect x="190" y="90" width="120" height="60" rx="10"
          fill="var(--surface)" stroke="var(--blue)" stroke-width="2"/>
    <text x="250" y="116" text-anchor="middle"
          font-size="13" font-weight="700" fill="var(--blue)">Node B</text>
    <text x="250" y="134" text-anchor="middle"
          font-size="9" fill="var(--text-dim)" class="mono">description</text>

    <!-- 虚线旁路路径 -->
    <path d="M70,150 L70,220 L250,220 L250,150"
          fill="none" stroke="var(--amber)" stroke-width="1.5"
          stroke-dasharray="6 3"/>
    <text x="160" y="216" text-anchor="middle"
          font-size="8" fill="var(--amber)" class="mono">bypass path</text>
  </svg>
</div>
```

### SVG 要素速查

| 要素 | 代码模式 | 说明 |
|------|----------|------|
| 箭头 marker | `<marker id="arr-{color}">` | 尖端对齐 `refX=9` |
| 节点矩形 | `<rect rx="10" stroke="var(--{color})" stroke-width="2"/>` | 10px 圆角 |
| 连线 | `<line marker-end="url(#arr-{color})"/>` | 带箭头 |
| 虚线 | `stroke-dasharray="6 3"` | 用于旁路/可选路径 |
| 标签文字 | `font-size="9" class="mono"` | mono 字体小字号 |
| 名称文字 | `font-size="13" font-weight="700"` | 粗体 |

---

## 13. SVG 架构图 (.arch-diagram)

用于展示系统架构、组件关系。包含嵌套分组框、虚线背景区域、多色节点。

```html
<div class="arch-diagram">
  <svg viewBox="0 0 900 300" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <marker id="a-arrow-accent" markerWidth="10" markerHeight="8"
              refX="9" refY="4" orient="auto">
        <path d="M0,0 L10,4 L0,8" fill="var(--accent)"/>
      </marker>
    </defs>

    <!-- 虚线分组背景 -->
    <rect x="20" y="20" width="860" height="80" rx="12"
          fill="var(--accent-dim)" stroke="var(--accent)"
          stroke-width="1" stroke-dasharray="4 2"/>
    <text x="50" y="42" font-size="10" font-weight="600"
          fill="var(--accent)" class="mono">GROUP LABEL</text>

    <!-- 组内节点 -->
    <rect x="40" y="50" width="180" height="40" rx="8"
          fill="var(--surface)" stroke="var(--accent)" stroke-width="1.5"/>
    <text x="130" y="74" text-anchor="middle"
          font-size="11" font-weight="600" fill="var(--accent)">Service A</text>

    <!-- 另一组（不同语义色） -->
    <rect x="20" y="120" width="860" height="80" rx="12"
          fill="var(--blue-dim)" stroke="var(--blue)"
          stroke-width="1" stroke-dasharray="4 2"/>
    <text x="50" y="142" font-size="10" font-weight="600"
          fill="var(--blue)" class="mono">INFRA LAYER</text>

    <!-- 跨组连线 -->
    <line x1="130" y1="90" x2="130" y2="148"
          stroke="var(--accent)" stroke-width="1.5"
          marker-end="url(#a-arrow-accent)"/>
  </svg>
</div>
```

### 分组框模板

```svg
<!-- 虚线分组背景（语义色 + dim 填充） -->
<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="12"
      fill="var(--{color}-dim)" stroke="var(--{color})"
      stroke-width="1" stroke-dasharray="4 2"/>
<text x="{x+30}" y="{y+22}" font-size="10" font-weight="600"
      fill="var(--{color})" class="mono">GROUP NAME</text>
```

---

## 14. SVG 数据流图

多层分区（Client / Server / LLM），弯曲路径 + 注释标签。

```html
<div class="arch-diagram">
  <svg viewBox="0 0 780 280" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <marker id="d-arr-blue" markerWidth="8" markerHeight="6"
              refX="8" refY="3" orient="auto">
        <path d="M0,0 L8,3 L0,6" fill="var(--blue)"/>
      </marker>
    </defs>

    <!-- 层背景（竖向标签用 rotate 旋转） -->
    <rect x="10" y="10" width="80" height="260" rx="6"
          fill="var(--blue-dim)" stroke="var(--blue)" stroke-width="1"/>
    <text x="50" y="145" text-anchor="middle" font-size="10"
          font-weight="600" fill="var(--blue)"
          transform="rotate(-90,50,145)" class="mono">CLIENT</text>

    <rect x="120" y="10" width="540" height="260" rx="6"
          fill="var(--green-dim)" stroke="var(--green)" stroke-width="1"/>
    <text x="390" y="28" text-anchor="middle" font-size="10"
          font-weight="600" fill="var(--green)" class="mono">SERVER</text>

    <!-- 节点和连线... -->

    <!-- 弯曲返回路径 -->
    <path d="M590,135 L590,210 L50,210 L50,170"
          fill="none" stroke="var(--green)" stroke-width="1.5"
          marker-end="url(#d-arr-blue)"/>
    <text x="320" y="228" text-anchor="middle"
          font-size="9" fill="var(--green)" class="mono">
      Response: {code, message}
    </text>
  </svg>
</div>
```

**层分区要点**：
- 竖向层标签使用 `transform="rotate(-90,cx,cy)"` 旋转
- 层背景使用 `{color}-dim` 填充 + 实线边框
- 弯曲路径用 `<path>` 的 L 命令（直角转弯）

---

## 15. 标签页 (.tabs)

多面板切换，支持同页面多组 Tab。

```html
<div class="tabs">
  <button class="tab-btn active" onclick="switchTab(event,'panel-a')">Tab A</button>
  <button class="tab-btn" onclick="switchTab(event,'panel-b')">Tab B</button>
  <button class="tab-btn" onclick="switchTab(event,'panel-c')">Tab C</button>
</div>
<div class="tab-panel active" id="panel-a">
  <p>面板 A 的内容，可包含任意组件。</p>
</div>
<div class="tab-panel" id="panel-b">
  <!-- 嵌套表格 -->
  <div class="table-wrap"><table>
    <thead><tr><th>Key</th><th>Value</th></tr></thead>
    <tbody><tr><td>A</td><td>1</td></tr></tbody>
  </table></div>
</div>
<div class="tab-panel" id="panel-c">
  <!-- 嵌套卡片 -->
  <div class="card-grid card-grid--3">
    <div class="card"><h4>Card 1</h4><p>Text</p></div>
    <div class="card"><h4>Card 2</h4><p>Text</p></div>
    <div class="card"><h4>Card 3</h4><p>Text</p></div>
  </div>
</div>
```

**要点**：
- 第一个 `tab-btn` 和对应 `tab-panel` 加 `.active`
- panel id 必须全页面唯一
- `switchTab` 通过 `closest('.tabs')` 隔离不同 Tab 组

**JS（通用）**：

```js
function switchTab(e, panelId) {
  var tabsBar = e.target.closest('.tabs');
  var parent = tabsBar.parentElement;
  tabsBar.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
  parent.querySelectorAll('.tab-panel').forEach(function(p) { p.classList.remove('active'); });
  e.target.classList.add('active');
  document.getElementById(panelId).classList.add('active');
}
```

---

## 16. 折叠面板 (details)

手风琴组件，CSS 三角箭头旋转动画。

### 16.1 基础折叠

```html
<details>
  <summary>点击展开标题</summary>
  <div class="detail-body">
    <p>折叠面板的内容。</p>
    <p>支持任意 HTML，包括段落、列表、表格等。</p>
  </div>
</details>
```

### 16.2 嵌套表格

```html
<details>
  <summary>带表格的折叠面板</summary>
  <div class="detail-body">
    <div class="table-wrap">
      <table>
        <thead><tr><th>Column</th><th>Value</th></tr></thead>
        <tbody>
          <tr><td>Row 1</td><td>Data</td></tr>
          <tr><td>Row 2</td><td>Data</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</details>
```

### 16.3 嵌套流程图

```html
<details>
  <summary>带流程图的折叠面板</summary>
  <div class="detail-body">
    <div class="flow">
      <div class="flow-node fn--accent"><div class="fn-name">Step 1</div></div>
      <div class="flow-arrow">&rarr;</div>
      <div class="flow-node fn--green"><div class="fn-name">Step 2</div></div>
    </div>
  </div>
</details>
```

---

## 17. 参考卡片 (.ref-card)

可折叠图片展示，V 型箭头 + 强调色标题。

```html
<details class="ref-card">
  <summary>参考：XXX 架构截图</summary>
  <div class="ref-body">
    <div class="ref-item">
      <span class="ref-item-label">Light Mode</span>
      <img src="references/screenshot-light.png" alt="Light mode screenshot"
           onclick="openImgOverlay(this.src)"/>
    </div>
    <div class="ref-item">
      <span class="ref-item-label">Dark Mode</span>
      <img src="references/screenshot-dark.png" alt="Dark mode screenshot"
           onclick="openImgOverlay(this.src)"/>
    </div>
  </div>
</details>
```

### 图片占位符

```html
<div style="width:100%;height:200px;
     background:linear-gradient(135deg,var(--accent-dim),var(--blue-dim));
     border-radius:8px;border:1px solid var(--border);
     display:flex;align-items:center;justify-content:center;
     color:var(--text-dim);font-family:var(--font-mono);font-size:14px">
  Image Placeholder (640x200)
</div>
```

---

## 18. 图片灯箱 (.img-overlay)

点击图片全屏查看，按 Escape 或点击蒙层关闭。

```html
<!-- 放在 </body> 前 -->
<div class="img-overlay" id="imgOverlay" onclick="closeImgOverlay()">
  <img id="overlayImg" src="" alt="Zoom view">
</div>
```

**触发方式**：在任意 `<img>` 标签上添加：

```html
<img src="path/to/image.png" alt="desc" onclick="openImgOverlay(this.src)"/>
```

**JS（通用）**：

```js
function openImgOverlay(src) {
  var o = document.getElementById('imgOverlay');
  document.getElementById('overlayImg').src = src;
  o.classList.add('active');
}
function closeImgOverlay() {
  document.getElementById('imgOverlay').classList.remove('active');
}
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeImgOverlay();
});
```

---

## 19. Callout 提示框

左侧色条提示框，颜色数量取决于风格主题支持的语义色数量。

```html
<div class="callout callout--accent">
  <strong>核心洞察</strong>：最重要的信息。
</div>

<div class="callout callout--blue">
  <strong>技术说明</strong>：补充技术细节。
</div>

<div class="callout callout--green">
  <strong>最佳实践</strong>：推荐做法。
</div>

<div class="callout callout--amber">
  <strong>注意事项</strong>：警告信息。
</div>

<div class="callout callout--red">
  <strong>反模式</strong>：禁止或错误做法。
</div>

<div class="callout callout--purple">
  <strong>战略方向</strong>：高层决策。
</div>

<div class="callout callout--teal">
  <strong>基础设施</strong>：工具链信息。
</div>
```

**语义约定**（推荐但不强制）：

| 颜色 | 语义 |
|------|------|
| accent | 核心洞察、最重要信息 |
| blue | 技术说明、补充解释 |
| green | 最佳实践、推荐做法 |
| amber | 注意事项、警告 |
| red | 反模式、禁止 |
| purple | 战略方向、高层决策 |
| teal | 基础设施、工具链 |

---

## 20. 徽章 (.badge)

语义色小标签。

```html
<span class="badge badge--accent">ACCENT</span>
<span class="badge badge--blue">BLUE</span>
<span class="badge badge--green">GREEN</span>
<span class="badge badge--amber">AMBER</span>
<span class="badge badge--red">RED</span>
<span class="badge badge--teal">TEAL</span>
<span class="badge badge--purple">PURPLE</span>
<span class="badge badge--cyan">CYAN</span>
```

---

## 21. Lead 文本

引导性大字段落。

```html
<p class="lead">
  这是 lead 样式的段落，字号 18px、行高 1.7、最大宽度 720px。
  适合用于章节开头的引导性描述。
</p>
```

---

## 22. 视频容器 (.video-wrap)

### 实际视频

```html
<div class="video-wrap">
  <video controls>
    <source src="references/demo.mp4" type="video/mp4">
  </video>
</div>
```

### 视频占位符

```html
<div class="video-wrap">
  <div style="width:100%;height:300px;
       background:linear-gradient(135deg,var(--surface2),var(--bg-warm));
       display:flex;align-items:center;justify-content:center;
       color:var(--text-dim);font-family:var(--font-mono)">
    <div style="text-align:center">
      <div style="font-size:48px;margin-bottom:8px">&#9654;</div>
      <div style="font-size:14px">Video Placeholder</div>
    </div>
  </div>
</div>
```

---

## 23. Typography 层级

```html
<h1>H1 — 大标题（页面级）</h1>
<h2>H2 — 章节标题</h2>
<h3>H3 — 子章节标题</h3>
<h4>H4 — 组件内标题</h4>
<p>Body text — 正文</p>
<p class="lead">Lead — 引导性段落</p>
<p class="section-label">SECTION LABEL — 章节标签</p>
<code>Inline code — 内联代码</code>
```

具体的字号、字重、字距由风格主题定义。

---

## 通用 JS 函数速查

以下 JS 函数是风格无关的通用行为逻辑：

```js
// 1. Tab 切换
function switchTab(e, panelId) { /* 见第 15 节 */ }

// 2. 图片灯箱
function openImgOverlay(src) { /* 见第 18 节 */ }
function closeImgOverlay() { /* 见第 18 节 */ }

// 3. Scrollspy 导航高亮
function updateNav() {
  var scrollY = window.scrollY + 80;
  var active = null;
  sections.forEach(function(s) { if (s.el.offsetTop <= scrollY) active = s; });
  navLinks.forEach(function(a) { a.classList.remove('active'); });
  if (active) active.link.classList.add('active');
}

// 4. 主题切换（localStorage 记忆）
btn.addEventListener('click', function() {
  var isDark = html.getAttribute('data-theme') === 'dark';
  if (isDark) { html.removeAttribute('data-theme'); localStorage.setItem('theme','light'); }
  else { html.setAttribute('data-theme','dark'); localStorage.setItem('theme','dark'); }
});
```

---

## 完整页面骨架速查

```
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>{标题}</title>
  <script>/* 防闪烁：读取 localStorage 设置主题 */</script>
  <link rel="preconnect" ...>  <!-- 字体预连接 -->
  <!-- #region css -->
  <style>
    /* 1. CSS 变量（由风格主题提供） */
    :root { --bg: ...; --accent: ...; /* 等 */ }
    [data-theme="dark"] { /* dark 覆盖 */ }

    /* 2. 通用组件 CSS（结构 + 布局） */
    /* 所有组件的 CSS 都引用 var(--xxx) 变量 */
  </style>
  <!-- #endregion css -->
</head>
<body>
  <!-- #region nav -->
  <nav class="topnav">...</nav>
  <!-- #endregion nav -->

  <!-- #region hero -->
  <header class="hero">...</header>
  <!-- #endregion hero -->

  <!-- #region {section-id} -->
  <section>...</section>
  <!-- #endregion {section-id} -->

  <!-- #region footer -->
  <footer class="footer">...</footer>
  <!-- #endregion footer -->

  <div class="img-overlay">...</div>

  <!-- #region scripts -->
  <script>/* Tab + Scrollspy + Theme Toggle + Image Overlay */</script>
  <!-- #endregion scripts -->
</body>
</html>
```

---

## 组件组合最佳实践

| 场景 | 推荐组合 |
|------|----------|
| 功能概览 | hero-stats + card-grid--3 + badge |
| 数据仪表盘 | kpi-row + bar-chart + table-wrap |
| 架构说明 | pipeline-wrap (SVG) + flow (CSS) + callout |
| 方案对比 | compare-grid + insight-item + badge |
| 参考资料 | ref-card + img-overlay + callout |
| 技术规格 | tabs + table-wrap + code + details |
| 状态汇报 | kpi-row + bar-chart + insight-item + callout |

---

## 组件嵌套规则

| 外层组件 | 可嵌套的内层组件 |
|----------|------------------|
| card | badge, code, strong, p, h3/h4 |
| tab-panel | 所有组件（card-grid, table-wrap, flow, callout 等） |
| detail-body | 所有组件（table-wrap, flow, card-grid 等） |
| callout | strong, code, badge, a |
| insight-item | badge, p, strong, code |
| compare-grid | card（含所有 card 内嵌组件） |
| section | subsection, 所有组件 |
