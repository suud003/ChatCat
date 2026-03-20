# Warm Signal — 视觉风格规范

**风格名**：Warm Signal
**调性**：温暖、专业、低对比度的暖棕色调，搭配橙红色点缀。适合技术文档、治理体系、架构说明等需要长时间阅读的内容。
**已应用**：`ai-governance-guide.html`（治理框架指南）、`AIBotAgentService_Design.html`（架构设计方案）

---

## 1. HTML 骨架

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{页面标题}</title>
<!-- 防闪烁：在 CSS 渲染前同步读取 localStorage 设定主题 -->
<script>
(function(){var t=localStorage.getItem('theme');if(t==='dark')document.documentElement.setAttribute('data-theme','dark');})();
</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&family=Noto+Sans+SC:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>/* Warm Signal Theme CSS */</style>
</head>
<body>
  <nav class="topnav">...</nav>
  <header class="hero">...</header>
  <section>...</section>
  <footer class="footer">...</footer>
  <script>/* Scrollspy + Theme Toggle */</script>
</body>
</html>
```

**关键点**：
- 防闪烁脚本放在 `<head>` 最前面，CSS 加载前执行
- Google Fonts 引入三个字族：Inter（正文）、JetBrains Mono（代码）、Noto Sans SC（中文）
- 所有 CSS 和 JS 内联，单文件交付，不依赖外部框架

---

## 2. 字体

```css
--font-body: 'Inter', 'Noto Sans SC', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', 'SF Mono', Consolas, monospace;
```

- 正文使用 Inter + Noto Sans SC 覆盖中英文
- 代码、标签、导航使用 JetBrains Mono
- Google Fonts 引入字重：`Inter:wght@300;400;500;600;700;800` + `JetBrains+Mono:wght@400;500;600` + `Noto+Sans+SC:wght@300;400;500;600;700`

---

## 3. 排版

| 元素 | 大小 | 字重 | 字距 | 行高 |
|------|------|------|------|------|
| h1 | 48px | 800 | -2px | 1.1 |
| h2 | 32px | 700 | -1px | 1.2 |
| h3 | 20px | 600 | -0.3px | — |
| section-label | 12px mono | 600 | 2px (uppercase) | — |
| lead | 18px | 400 | — | 1.7 |
| body | 16px (default) | 400 | — | 1.6 |
| 表格 / detail-body | 14px | 400 | — | 1.7 |
| badge | 10px mono | 600 | 0.5px (uppercase) | — |

### 全局 reset

```css
* { margin:0; padding:0; box-sizing:border-box; }
html { scroll-behavior: smooth; }
body {
  font-family: var(--font-body); color: var(--text); background: var(--bg);
  -webkit-font-smoothing: antialiased; line-height: 1.6;
}
```

### 响应式断点

768px 以下：h1 缩至 32px，h2 缩至 24px，hero 缩小内边距，网格改单列，流程图转纵排。

```css
@media (max-width: 768px) {
  .container { padding: 0 16px; }
  h1 { font-size: 32px; }
  h2 { font-size: 24px; }
  .hero { padding: 48px 0 40px; }
  .hero-stats { gap: 24px; }
  .card-grid--2, .card-grid--3, .card-grid--4 { grid-template-columns: 1fr; }
  .flow { flex-direction: column; align-items: stretch; }
  .flow-arrow { transform: rotate(90deg); text-align: center; padding: 4px 0; }
  section { padding: 36px 0; }
}
```

---

## 4. 色彩体系

### Light Mode

| 变量 | 色值 | 用途 |
|------|------|------|
| `--bg` | `#faf8f5` | 页面背景 |
| `--bg-warm` | `#f5f0e8` | 暖色背景区块 |
| `--surface` | `#ffffff` | 卡片/表格/展开面板背景 |
| `--surface2` | `#faf6f0` | 表头/次级面板背景 |
| `--border` | `rgba(120, 80, 40, 0.08)` | 默认边框 |
| `--border-bright` | `rgba(120, 80, 40, 0.16)` | hover/active 边框 |
| `--text` | `#2c2418` | 主文本（深暖棕） |
| `--text-mid` | `#5c5244` | 次级文本 |
| `--text-dim` | `#8a7e6e` | 辅助文本/注释 |
| `--accent` | `#c2410c` | 主强调色（橙红） |
| `--accent-light` | `#fb923c` | 浅强调色 |
| `--accent-dim` | `rgba(194, 65, 12, 0.06)` | 强调色底色（hover/code 背景） |
| `--blue` | `#1d4ed8` | 目录名/信息标签 |
| `--blue-dim` | `rgba(29, 78, 216, 0.06)` | 蓝色底色 |
| `--green` | `#15803d` | 成功/通过/兼容 |
| `--green-dim` | `rgba(21, 128, 61, 0.06)` | 绿色底色 |
| `--red` | `#b91c1c` | 错误/必须/Agent 标签 |
| `--red-dim` | `rgba(185, 28, 28, 0.06)` | 红色底色 |
| `--purple` | `#7c3aed` | 插件/IDE 专属标签 |
| `--purple-dim` | `rgba(124, 58, 237, 0.06)` | 紫色底色 |
| `--amber` | `#b45309` | 警告/Hook/建议 |
| `--amber-dim` | `rgba(180, 83, 9, 0.06)` | 琥珀色底色 |
| `--cyan` | `#0e7490` | 专项/辅助标签 |
| `--cyan-dim` | `rgba(14, 116, 144, 0.06)` | 青色底色 |
| `--teal` | `#0f766e` | 流程节点辅助色 |
| `--teal-dim` | `rgba(15, 118, 110, 0.06)` | 蓝绿底色 |

### Dark Mode

通过 `[data-theme="dark"]` 选择器覆盖（由 JS 控制，不依赖 `prefers-color-scheme`）。深色模式的背景转为暖棕深色，文本转为暖白，所有彩色提亮并降低透明底色亮度：

| 变量 | Dark 色值 |
|------|-----------|
| `--bg` | `#1a1714` |
| `--bg-warm` | `#211e19` |
| `--surface` | `#252119` |
| `--surface2` | `#2c2720` |
| `--border` | `rgba(200, 170, 120, 0.08)` |
| `--border-bright` | `rgba(200, 170, 120, 0.16)` |
| `--text` | `#e8e0d4` |
| `--text-dim` | `#8a7e6e` |
| `--text-mid` | `#b5a998` |
| `--accent` | `#fb923c` |
| `--accent-light` | `#fdba74` |
| `--accent-dim` | `rgba(251, 146, 60, 0.08)` |
| `--blue` | `#60a5fa` |
| `--green` | `#4ade80` |
| `--red` | `#f87171` |
| `--purple` | `#a78bfa` |
| `--amber` | `#fbbf24` |
| `--cyan` | `#22d3ee` |
| `--teal` | `#2dd4bf` |

所有 `*-dim` 变量的 alpha 值在 Dark Mode 下统一为 `0.08`。

### 阴影

```css
/* Light */
--shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03);
--shadow-lg: 0 4px 24px rgba(0,0,0,0.06);

/* Dark */
--shadow: 0 1px 3px rgba(0,0,0,0.2);
--shadow-lg: 0 4px 24px rgba(0,0,0,0.3);
```

### 圆角

```css
--radius: 12px;
```

统一 12px 圆角用于卡片、表格容器、展开面板、代码块、callout、SVG 图容器。Badge 用 4px。

---

## 5. 布局

```css
.container { max-width: 1100px; margin: 0 auto; padding: 0 32px; }
section { padding: 56px 0; border-bottom: 1px solid var(--border); }
section:last-child { border-bottom: none; }
```

- 内容区最大宽度 1100px，水平居中
- 章节间用 1px 暖色半透明边框分隔，56px 纵向间距
- 响应式 768px 以下 container 收窄到 16px 内边距，section 缩到 36px

---

## 6. 组件规范

### 6.1 导航栏 (.topnav)

吸顶毛玻璃导航栏，包含 logo、章节链接、主题切换按钮。

```css
.topnav {
  position: sticky; top: 0; z-index: 100;
  background: color-mix(in srgb, var(--bg) 85%, transparent);
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
  padding: 0 32px; display: flex; align-items: center; height: 52px; gap: 4px;
  overflow-x: auto; scrollbar-width: none;  /* 横向可滚动但隐藏滚动条 */
}
.topnav::-webkit-scrollbar { display: none; }
```

**链接样式**：

```css
.topnav a {
  font-size: 13px; font-weight: 500; color: var(--text-dim); text-decoration: none;
  padding: 6px 14px; border-radius: 6px; white-space: nowrap;
  transition: all 0.2s; letter-spacing: -0.2px;
}
.topnav a:hover { color: var(--text); background: var(--accent-dim); }
.topnav a.active { color: var(--accent); background: var(--accent-dim); font-weight: 600; }
```

**左侧 Logo**：

```css
.topnav .nav-logo {
  font-weight: 700; font-size: 14px; color: var(--accent); margin-right: 12px;
  letter-spacing: -0.5px; flex-shrink: 0;
}
```

**HTML 结构**：

```html
<nav class="topnav">
  <span class="nav-logo">{项目名}</span>
  <a href="#section1">章节一</a>
  <a href="#section2">章节二</a>
  <!-- ... -->
  <button class="theme-toggle" id="themeToggle" title="切换明/暗主题" aria-label="切换主题">
    <span class="toggle-icon icon-sun">☀</span>
    <span class="toggle-icon icon-moon">☾</span>
  </button>
</nav>
```

**设计要点**：
- 52px 高度，flex 横排，溢出时横向滚动（隐藏滚动条）
- `color-mix(in srgb, var(--bg) 85%, transparent)` + `backdrop-filter: blur(12px)` 实现毛玻璃效果
- 活跃项由 JS scrollspy 动态添加 `.active` 类
- Logo 和主题切换按钮分别在两端（logo flex-shrink:0 + 按钮 margin-left:auto）

### 6.2 主题切换 (.theme-toggle)

iOS 风格的药丸型滑动开关，内嵌太阳/月亮图标。

```css
.theme-toggle {
  margin-left: auto; flex-shrink: 0;
  width: 44px; height: 26px; border-radius: 13px;
  border: 1.5px solid var(--border-bright);
  background: var(--surface2); cursor: pointer;
  position: relative; transition: background 0.3s, border-color 0.3s;
  display: flex; align-items: center; padding: 0 3px;
}
.theme-toggle::before {
  content: ''; display: block;
  width: 20px; height: 20px; border-radius: 50%;
  background: var(--accent);
  transition: transform 0.3s cubic-bezier(0.4,0,0.2,1);
  transform: translateX(0);
}
[data-theme="dark"] .theme-toggle::before {
  transform: translateX(16px);
}
```

**图标**：

```css
.theme-toggle .toggle-icon {
  position: absolute; top: 50%; transform: translateY(-50%);
  font-size: 13px; line-height: 1; pointer-events: none;
  transition: opacity 0.2s;
}
.theme-toggle .icon-sun { left: 5px; opacity: 1; }
.theme-toggle .icon-moon { right: 5px; opacity: 0.4; }
[data-theme="dark"] .theme-toggle .icon-sun { opacity: 0.4; }
[data-theme="dark"] .theme-toggle .icon-moon { opacity: 1; }
```

**设计要点**：
- 44x26px 药丸型，20px 圆形滑块用 accent 色
- 亮色模式：滑块在左，太阳亮月亮暗；暗色模式：滑块平移 16px 到右，月亮亮太阳暗
- 滑块动画使用 `cubic-bezier(0.4,0,0.2,1)` 缓动，0.3s
- 图标使用 Unicode 字符：☀（太阳）和 ☾（月亮），免图标库

### 6.3 章节标签 (.section-label)

每个章节顶部的全大写等宽标签，用于标识章节类型。截图中标注的 `ARCHITECTURE DESIGN`、`SCENARIO`、`COMPONENTS` 等。

```css
.section-label {
  font-family: var(--font-mono); font-size: 12px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 2px; color: var(--accent);
  margin-bottom: 8px;
}
```

**HTML 用法**：

```html
<p class="section-label">ARCHITECTURE DESIGN</p>
<h1>AIBotAgentService</h1>
```

**设计要点**：
- JetBrains Mono 等宽体，12px，600 字重
- 全大写 + 2px 字距，呈现工程图纸标注感
- 统一使用 accent 色（橙红），是视觉锚点

### 6.4 Hero 区 (.hero)

页面入口区域，居中排列，包含 section-label、h1 标题、副标题、lead 描述、统计数字。

```css
.hero {
  padding: 80px 0 64px; text-align: center;
  border-bottom: 1px solid var(--border);
  background: linear-gradient(180deg, var(--accent-dim) 0%, transparent 60%);
}
.hero h1 { margin-bottom: 16px; }
.hero .lead { margin: 0 auto 32px; text-align: center; }
```

**统计数字**：

```css
.hero-stats { display: flex; justify-content: center; gap: 40px; flex-wrap: wrap; }
.hero-stat { text-align: center; }
.hero-stat .num {
  font-size: 36px; font-weight: 800; letter-spacing: -1px;
  font-variant-numeric: tabular-nums;
}
.hero-stat .label {
  font-size: 12px; font-weight: 500; color: var(--text-dim);
  text-transform: uppercase; letter-spacing: 1px; margin-top: 2px;
}
```

**HTML 结构**：

```html
<header class="hero" id="overview">
  <div class="container">
    <p class="section-label">ARCHITECTURE DESIGN</p>
    <h1>AIBotAgentService</h1>
    <p style="color:var(--text-dim);font-size:16px;font-family:var(--font-mono);
       font-weight:500;margin-bottom:16px;">架构设计方案 v2.0</p>
    <p class="lead">通用的 AI 角色语义交互服务……</p>
    <div class="hero-stats">
      <div class="hero-stat">
        <div class="num" style="color:var(--accent)">7</div>
        <div class="label">核心组件</div>
      </div>
      <!-- 更多统计项... -->
    </div>
  </div>
</header>
```

**设计要点**：
- 80px 顶部间距，accent-dim 到透明的从上到下渐变背景
- 副标题用 mono 字体 + text-dim 色，视觉层级低于 h1
- 统计数字 36px/800 超粗字重，每个数字用不同的语义色（accent/blue/teal/green），下方配 12px uppercase label
- `font-variant-numeric: tabular-nums` 保证数字等宽对齐

### 6.5 卡片 (.card)

白底圆角卡片，可选顶部色条。

```css
.card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 24px;
  box-shadow: var(--shadow); transition: border-color 0.2s, box-shadow 0.2s;
}
.card:hover { border-color: var(--border-bright); box-shadow: var(--shadow-lg); }
.card h3 { margin-bottom: 6px; }
.card p { font-size: 14px; color: var(--text-dim); line-height: 1.6; }
```

**顶部色条变体**（内联 style）：

```html
<div class="card" style="border-top: 4px solid var(--accent);">...</div>
<div class="card" style="border-top: 4px solid var(--blue);">...</div>
<div class="card" style="border-top: 4px solid var(--green);">...</div>
```

**设计要点**：
- 24px 内边距，12px 圆角
- hover 时边框从 8% 加深到 16%，阴影从 shadow 升级到 shadow-lg
- 顶部 4px 色条用于区分卡片类别（如一组 3 张卡片分别用 accent/blue/green）

### 6.6 卡片网格 (.card-grid)

```css
.card-grid { display: grid; gap: 16px; margin-top: 24px; }
.card-grid--2 { grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); }
.card-grid--3 { grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
.card-grid--4 { grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
```

- 间距 16px，使用 `auto-fit` 自动响应
- 768px 以下全部转为单列

### 6.7 Badge (.badge)

语义色小标签，用于表头序号、状态标识等。

```css
.badge {
  display: inline-block; font-family: var(--font-mono); font-size: 10px; font-weight: 600;
  padding: 2px 8px; border-radius: 4px; letter-spacing: 0.5px; text-transform: uppercase;
  vertical-align: middle;
}
```

**语义变体**（通用）：

| 类名 | 背景 | 文字 | 语义 |
|------|------|------|------|
| `.badge--accent` | accent-dim | accent | 主强调 |
| `.badge--blue` | blue-dim | blue | 信息 |
| `.badge--green` | green-dim | green | 成功/兼容 |
| `.badge--amber` | amber-dim | amber | 警告/建议 |
| `.badge--red` | red-dim | red | 错误/必须 |
| `.badge--teal` | teal-dim | teal | 辅助 |
| `.badge--purple` | purple-dim | purple | 插件/IDE |
| `.badge--cyan` | cyan-dim | cyan | 专项 |

**语义变体**（治理专用，见 governance guide）：

| 类名 | 等同于 | 用途 |
|------|--------|------|
| `.badge--agent` | red | Agent 标签 |
| `.badge--skill` | green | Skill 标签 |
| `.badge--hook` | amber | Hook 标签 |
| `.badge--plugin` | purple | 插件标签 |
| `.badge--must` | red | 必须 |
| `.badge--should` | amber | 建议 |
| `.badge--optional` | blue | 可选 |

### 6.8 展开面板 (details/summary)

手风琴组件，CSS 实现三角箭头旋转动画。

```css
details {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); margin-bottom: 10px;
  box-shadow: var(--shadow); overflow: hidden;
}
details[open] { border-color: var(--border-bright); }
summary {
  padding: 16px 20px; cursor: pointer; font-weight: 600; font-size: 15px;
  display: flex; align-items: center; gap: 10px; list-style: none;
  transition: background 0.15s; user-select: none;
}
summary::-webkit-details-marker { display: none; }
summary::before {
  content: ''; width: 0; height: 0; flex-shrink: 0;
  border-left: 6px solid var(--text-dim);
  border-top: 4px solid transparent;
  border-bottom: 4px solid transparent;
  transition: transform 0.2s;
}
details[open] summary::before { transform: rotate(90deg); }
summary:hover { background: var(--accent-dim); }
.detail-body {
  padding: 0 20px 20px; font-size: 14px; line-height: 1.7; color: var(--text-mid);
}
.detail-body p { margin-bottom: 8px; }
```

**设计要点**：
- 三角箭头用 CSS border 实现（`border-left: 6px solid`），展开时旋转 90 度
- summary hover 显示 accent-dim 淡橙背景
- 展开时边框加深到 border-bright

### 6.9 参考卡片 (.ref-card)

可展开的参考资料卡片，包含图片的特殊手风琴。使用 V 型箭头（非三角），accent 色标题。

```css
.ref-card {
  margin: 20px 0; border: 1px solid var(--border); border-radius: var(--radius);
  background: var(--surface); box-shadow: var(--shadow); overflow: hidden;
}
.ref-card summary {
  padding: 16px 24px; font-size: 15px; font-weight: 600; color: var(--accent);
  cursor: pointer; list-style: none; display: flex; align-items: center; gap: 10px;
  transition: background 0.2s;
}
.ref-card summary::-webkit-details-marker { display: none; }
.ref-card summary::before {
  content: ''; display: inline-block; width: 8px; height: 8px;
  border-right: 2px solid var(--accent); border-bottom: 2px solid var(--accent);
  transform: rotate(-45deg); transition: transform 0.25s ease; flex-shrink: 0;
}
.ref-card[open] summary::before { transform: rotate(45deg); }
.ref-card summary:hover { background: var(--accent-dim); }
.ref-card .ref-body {
  padding: 0 24px 24px; display: flex; flex-direction: column; gap: 24px;
}
.ref-card .ref-item { display: flex; flex-direction: column; gap: 8px; }
.ref-card .ref-item-label {
  font-size: 13px; font-weight: 600; color: var(--text-mid);
  letter-spacing: 0.5px; text-transform: uppercase;
}
```

**图片样式**（含 hover 放大效果）：

```css
.ref-card .ref-item img {
  width: 100%; border-radius: 8px; border: 1px solid var(--border);
  box-shadow: var(--shadow);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  cursor: zoom-in;
}
.ref-card .ref-item img:hover {
  transform: scale(1.02); box-shadow: var(--shadow-lg);
}
```

**HTML 结构**：

```html
<details class="ref-card">
  <summary>参考：XXX 架构图</summary>
  <div class="ref-body">
    <div class="ref-item">
      <span class="ref-item-label">来源一</span>
      <img src="references/xxx.png" alt="描述" onclick="openImgOverlay(this.src)"/>
    </div>
  </div>
</details>
```

**设计要点**：
- V 型箭头（`border-right + border-bottom`）代替三角，展开时从 -45 度旋转到 45 度
- 标题使用 accent 色，区别于普通 details 的主文本色
- 图片 hover 微放大 1.02x + 阴影增强
- 图片点击触发全屏灯箱

### 6.10 图片全屏灯箱 (.img-overlay)

点击图片后的全屏查看效果。

```css
.img-overlay {
  display: none; position: fixed; inset: 0; z-index: 9999;
  background: rgba(0,0,0,0.85); backdrop-filter: blur(8px);
  align-items: center; justify-content: center;
  cursor: zoom-out; padding: 32px;
}
.img-overlay.active { display: flex; }
.img-overlay img {
  max-width: 95vw; max-height: 92vh; border-radius: 12px;
  box-shadow: 0 12px 48px rgba(0,0,0,0.4);
}
```

**HTML + JS**：

```html
<div class="img-overlay" id="imgOverlay" onclick="closeImgOverlay()">
  <img id="overlayImg" src="" alt="放大查看">
</div>
<script>
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
</script>
```

**设计要点**：
- 85% 黑色蒙层 + `backdrop-filter: blur(8px)` 模糊背景
- 图片最大 95vw x 92vh，12px 圆角，大阴影
- 点击蒙层或按 Escape 关闭
- 通过 `display: none/flex` 切换显隐

### 6.11 表格 (.table-wrap > table)

```css
.table-wrap {
  overflow-x: auto; background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); box-shadow: var(--shadow);
}
table { width: 100%; border-collapse: collapse; font-size: 14px; }
th {
  text-align: left; padding: 12px 16px;
  font-family: var(--font-mono); font-size: 11px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 1.5px; color: var(--text-dim);
  background: var(--surface2); border-bottom: 2px solid var(--border);
  white-space: nowrap;
}
td { padding: 12px 16px; border-bottom: 1px solid var(--border); vertical-align: top; }
tbody tr:last-child td { border-bottom: none; }
tbody tr:hover { background: var(--accent-dim); }
code {
  font-family: var(--font-mono); font-size: 0.88em;
  background: var(--accent-dim); color: var(--accent);
  padding: 2px 6px; border-radius: 4px;
}
```

**设计要点**：
- 外层容器有圆角 + 阴影 + `overflow-x: auto`（移动端横向滚动）
- 表头：surface2 暖色背景，11px mono 全大写 + 1.5px 字距
- 行 hover 显示 accent-dim 淡橙背景
- 内联 `code` 标签：accent-dim 背景 + accent 文字色 + 4px 圆角

### 6.12 Tab 系统

用于在同一区域内切换不同面板内容。

```css
.tabs {
  display: flex; gap: 2px; margin-bottom: 0;
  border-bottom: 2px solid var(--border); padding: 0;
}
.tab-btn {
  font-family: var(--font-body); font-size: 13px; font-weight: 600;
  padding: 10px 18px; background: none; border: none;
  color: var(--text-dim); cursor: pointer;
  border-bottom: 2px solid transparent; margin-bottom: -2px;
  transition: all 0.2s; white-space: nowrap;
}
.tab-btn:hover { color: var(--text); }
.tab-btn.active { color: var(--accent); border-bottom-color: var(--accent); }
.tab-panel { display: none; padding: 20px 0; }
.tab-panel.active { display: block; }
```

**HTML 结构**：

```html
<div class="tabs">
  <button class="tab-btn active" onclick="switchTab(event,'panel-a')">标签 A</button>
  <button class="tab-btn" onclick="switchTab(event,'panel-b')">标签 B</button>
</div>
<div class="tab-panel active" id="panel-a">面板 A 内容</div>
<div class="tab-panel" id="panel-b">面板 B 内容</div>
```

**设计要点**：
- 底部 2px 边线分隔，活跃 tab 显示 accent 色底线和文字
- `margin-bottom: -2px` 使活跃 tab 底线覆盖容器底线
- 切换逻辑支持同页面多组 Tab（通过 `closest('.tabs')` 隔离）

### 6.13 流程图 (.flow)

纯 CSS 实现的水平流程节点图。

```css
.flow { display: flex; align-items: center; gap: 0; flex-wrap: wrap; padding: 16px 0; }
.flow-node {
  background: var(--surface); border: 2px solid var(--border); border-radius: 10px;
  padding: 10px 16px; text-align: center; min-width: 100px; flex-shrink: 0;
}
.flow-node .fn-name { font-size: 13px; font-weight: 600; }
.flow-node .fn-sub { font-size: 11px; color: var(--text-dim); font-family: var(--font-mono); }
.flow-arrow {
  font-family: var(--font-mono); color: var(--text-dim);
  padding: 0 8px; font-size: 16px; flex-shrink: 0;
}
.flow-branch { display: flex; flex-direction: column; gap: 6px; align-items: center; }
.flow-branch-label {
  font-family: var(--font-mono); font-size: 10px; color: var(--text-dim); letter-spacing: 0.5px;
}
```

**颜色变体**（8 色全集）：

```css
.fn--red    { border-color: var(--red); }    .fn--red .fn-name    { color: var(--red); }
.fn--green  { border-color: var(--green); }  .fn--green .fn-name  { color: var(--green); }
.fn--blue   { border-color: var(--blue); }   .fn--blue .fn-name   { color: var(--blue); }
.fn--amber  { border-color: var(--amber); }  .fn--amber .fn-name  { color: var(--amber); }
.fn--purple { border-color: var(--purple); } .fn--purple .fn-name { color: var(--purple); }
.fn--cyan   { border-color: var(--cyan); }   .fn--cyan .fn-name   { color: var(--cyan); }
.fn--teal   { border-color: var(--teal); }   .fn--teal .fn-name   { color: var(--teal); }
.fn--accent { border-color: var(--accent); } .fn--accent .fn-name { color: var(--accent); }
```

**HTML 用法**：

```html
<div class="flow">
  <div class="flow-node fn--accent"><div class="fn-name">InputAnalyzer</div><div class="fn-sub">意图识别</div></div>
  <div class="flow-arrow">→</div>
  <div class="flow-node fn--blue"><div class="fn-name">LLM</div><div class="fn-sub">推理</div></div>
</div>
```

**设计要点**：
- 节点 10px 圆角，语义色 2px 描边
- 箭头用 mono 字体的 `→` 字符
- 响应式 768px 以下转纵排，箭头旋转 90 度

### 6.14 Callout

带左侧色条的提示/注意框。

```css
.callout {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 20px 24px; margin: 16px 0;
  font-size: 14px; line-height: 1.7; color: var(--text-mid);
  box-shadow: var(--shadow);
}
.callout--accent { border-left: 4px solid var(--accent); }
.callout--blue   { border-left: 4px solid var(--blue); }
.callout--green  { border-left: 4px solid var(--green); }
.callout--amber  { border-left: 4px solid var(--amber); }
.callout--teal   { border-left: 4px solid var(--teal); }
.callout--red    { border-left: 4px solid var(--red); }
.callout strong  { color: var(--text); }
```

### 6.15 代码块 (.code-block)

始终深色背景的代码块（不跟随主题切换）。

```css
.code-block {
  background: #1e1e1e; color: #d4d4d4;
  font-family: var(--font-mono); font-size: 13px;
  padding: 16px 20px; border-radius: var(--radius);
  overflow-x: auto; line-height: 1.7; margin: 12px 0;
}
.code-block .comment { color: #6a9955; }  /* 注释：绿 */
.code-block .hl      { color: #dcdcaa; }  /* 高亮：黄 */
.code-block .kw      { color: #c586c0; }  /* 关键字：粉紫 */
.code-block .str     { color: #ce9178; }  /* 字符串：棕橙 */
```

### 6.16 目录树 (.tree)

用于展示文件/配置目录结构。

```css
.tree {
  font-family: var(--font-mono); font-size: 14px; line-height: 2;
  padding: 20px; background: var(--surface);
  border: 1px solid var(--border); border-radius: var(--radius);
  white-space: pre; overflow-x: auto;
}
.tree .dir  { color: var(--blue); font-weight: 600; }       /* 目录名 */
.tree .file { color: var(--text); }                          /* 文件名 */
.tree .anno { color: var(--text-dim); font-size: 12px; }     /* 注释 */
.tree .key  { color: var(--accent); font-weight: 600; }      /* 配置键 */
.tree .val  { color: var(--text-mid); }                       /* 配置值 */
.tree .cmt  { color: var(--text-dim); font-size: 12px; }     /* 行注释 */
.tree .indent { padding-left: 24px; display: block; }         /* 缩进层级 */
```

### 6.17 SVG 架构图容器 (.arch-diagram)

承载 SVG 绘制的架构图的外层容器。

```css
.arch-diagram {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 32px 24px;
  box-shadow: var(--shadow); overflow-x: auto; margin: 16px 0;
  display: flex; justify-content: center;
}
.arch-diagram svg { width: 100%; height: auto; max-width: 75rem; }
.arch-diagram svg text { font-family: var(--font-body); }
.arch-diagram svg .mono { font-family: var(--font-mono); }
```

### 6.18 Footer (.footer)

```css
.footer {
  text-align: center; padding: 40px 32px;
  font-size: 12px; color: var(--text-dim);
  font-family: var(--font-mono); letter-spacing: 0.3px;
}
```

**格式**：一行摘要信息，用 `&mdash;` 和 `&middot;` 分隔关键指标。

```html
<footer class="footer">
  {项目名} v{版本} &mdash; {指标1} &middot; {指标2} &middot; Generated {日期}
</footer>
```

---

## 7. SVG 数据流详图

用于绘制节点间双向通信的 SVG 架构图（如链路 A 的 DS ↔ aiproxy ↔ aibot）。

### 7.1 节点 (Node)

```svg
<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="10"
      fill="var(--surface)" stroke="var(--{color})" stroke-width="2"/>
```

- 圆角 10px，白色填充，语义色 2px 描边
- 内部结构（从上到下）：
  - `NODE {n}` 标签：11px mono/700，语义色
  - 名称：16px/700，主文本色
  - 分隔线：0.5px `--border` 色
  - 描述文字：11px `--text-mid`
  - 底部注释：10px mono，语义色

### 7.2 SVG 箭头标记 (marker)

用于组件关系概览图中的连线箭头（`marker-end` / `marker-start`）。

```svg
<defs>
  <marker id="arrow-{color}" markerWidth="10" markerHeight="8"
          refX="9" refY="4" orient="auto" overflow="visible">
    <path d="M0,0 L10,4 L0,8" fill="var(--{color})"/>
  </marker>
  <marker id="arrow-{color}-start" markerWidth="10" markerHeight="8"
          refX="1" refY="4" orient="auto" overflow="visible">
    <path d="M10,0 L0,4 L10,8" fill="var(--{color})"/>
  </marker>
</defs>
```

- `refX=9` / `refX=1` 确保箭头尖端对齐线段端点
- 双向线段同时使用 `marker-start` + `marker-end`
- 虚线连接使用 `stroke-dasharray="6 3"`

### 7.3 双向箭头（数据流详图专用）

每对节点之间绘制上下两条水平箭头，上行和下行用不同颜色区分方向。

```
上行（左→右）：accent 或 blue
下行（右→左）：blue 或 amber
```

**箭头结构**：`<line>` 线段 + `<polygon>` 三角形箭头头 + 协议标签

#### 关键对齐规则（防止空隙和溢出）

箭头的三角形尖端和线段端点必须**精确对齐**目标节点的边界，不留空隙也不溢出：

```
向右箭头（→）：
  线段：x1 = 源节点右边界, x2 = 三角形底边 x
  三角形：尖端 x = 目标节点左边界, 底边 x = 尖端 - 12px

向左箭头（←）：
  线段：x1 = 源节点左边界, x2 = 三角形底边 x
  三角形：尖端 x = 目标节点右边界, 底边 x = 尖端 + 12px
```

**示例**（DS 右边界 280 → aiproxy 左边界 365）：

```svg
<!-- 上行（→）：线段终点到三角底边，三角尖端对齐目标左边界 -->
<line x1="280" y1="124" x2="353" y2="124" stroke="var(--accent)" stroke-width="2"/>
<polygon points="353,118 365,124 353,130" fill="var(--accent)"/>

<!-- 下行（←）：线段起点从源节点左边界，三角尖端对齐目标右边界 -->
<line x1="365" y1="152" x2="292" y2="152" stroke="var(--blue)" stroke-width="2"/>
<polygon points="292,146 280,152 292,158" fill="var(--blue)"/>
```

**三角形尺寸**：底边宽 12px（y 方向 ±6px），高度 12px（x 方向）。

#### 协议标签

箭头上方或下方放置协议名称标签：

```svg
<rect x="{label_x}" y="{label_y}" width="60" height="14" rx="4"
      fill="var(--{color})" opacity="0.13"/>
<text x="{center_x}" y="{text_y}" text-anchor="middle"
      font-size="9" font-weight="600" fill="var(--{color})" class="mono">Protobuf</text>
```

### 7.4 背景条带

节点区域使用三色渐变背景条带，从左到右对应三个节点的语义色：

```svg
<linearGradient id="flow-bg-a" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.06"/>
  <stop offset="50%" stop-color="var(--blue)" stop-opacity="0.06"/>
  <stop offset="100%" stop-color="var(--amber)" stop-opacity="0.06"/>
</linearGradient>
<rect x="0" y="{y}" width="{full_width}" height="{h}" rx="12" fill="url(#flow-bg-a)"/>
```

### 7.5 底部图例

数据流图例放在节点图下方，白色面板内：

- 面板：`surface2` 填充 + `border` 描边 + 10px 圆角
- 每行：短色线 + 描述文本（10px `--text-mid`）+ proto 字段示例（9px mono 语义色）

### 7.6 虚线分组框

SVG 中用虚线矩形框标识逻辑分组（如"语音服务"群组）：

```svg
<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="14"
      fill="none" stroke="var(--text-dim)" stroke-width="1.5"
      stroke-dasharray="8 4" opacity="0.5"/>
<text x="{right}" y="{top}" text-anchor="end"
      font-size="10" fill="var(--text-dim)" font-style="italic">分组名</text>
```

---

## 8. 交互与动效

### 8.1 Transition 汇总

所有交互动效统一使用 CSS transition，不使用 @keyframes 动画：

| 组件 | 属性 | 时长 | 缓动 |
|------|------|------|------|
| 导航链接 | `all` | 0.2s | ease (default) |
| 主题切换滑块 | `transform` | 0.3s | `cubic-bezier(0.4,0,0.2,1)` |
| 主题切换容器 | `background, border-color` | 0.3s | ease |
| 主题切换图标 | `opacity` | 0.2s | ease |
| 卡片 | `border-color, box-shadow` | 0.2s | ease |
| summary | `background` | 0.15s | ease |
| summary 箭头 | `transform` | 0.2s | ease |
| ref-card summary | `background` | 0.2s | ease |
| ref-card V 型箭头 | `transform` | 0.25s | ease |
| ref-card 图片 | `transform, box-shadow` | 0.3s | ease |
| Tab 按钮 | `all` | 0.2s | ease |

**设计原则**：
- 0.15-0.3s 范围内，不超过 0.3s
- 主题切换滑块使用 Material Design 缓动曲线
- hover 反馈用较短的 0.15-0.2s
- 展开/收起动效用 0.2-0.25s

### 8.2 Hover 效果

| 元素 | 效果 |
|------|------|
| 导航链接 | 文字变深（text-dim → text）+ accent-dim 背景 |
| 卡片 | 边框加深（border → border-bright）+ 阴影放大（shadow → shadow-lg） |
| 表格行 | accent-dim 淡橙背景 |
| summary | accent-dim 淡橙背景 |
| ref-card 图片 | 微放大 `scale(1.02)` + shadow-lg |
| Tab 按钮 | 文字变深（text-dim → text） |

---

## 9. JavaScript 行为

### 9.1 Scrollspy（导航高亮）

滚动时自动高亮对应的导航链接。

```js
var navLinks = document.querySelectorAll('.topnav a[href^="#"]');
var sections = [];
navLinks.forEach(function(a) {
  var sec = document.querySelector(a.getAttribute('href'));
  if (sec) sections.push({ el: sec, link: a });
});

function updateNav() {
  var scrollY = window.scrollY + 80;  // 80px 偏移（导航栏高度 52px + 余量）
  var active = null;
  sections.forEach(function(s) {
    if (s.el.offsetTop <= scrollY) active = s;
  });
  navLinks.forEach(function(a) { a.classList.remove('active'); });
  if (active) active.link.classList.add('active');
}
window.addEventListener('scroll', updateNav, { passive: true });
updateNav();
```

**要点**：
- 使用 `{ passive: true }` 优化滚动性能
- 偏移量 80px = 导航栏 52px + 28px 余量
- 初始化时调用一次 `updateNav()` 设置初始状态

### 9.2 主题切换（localStorage 记忆）

```js
(function() {
  var html = document.documentElement;
  var saved = localStorage.getItem('theme');
  if (saved === 'dark') {
    html.setAttribute('data-theme', 'dark');
  } else {
    html.removeAttribute('data-theme');
  }
  var btn = document.getElementById('themeToggle');
  if (btn) {
    btn.addEventListener('click', function() {
      var isDark = html.getAttribute('data-theme') === 'dark';
      if (isDark) {
        html.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
      } else {
        html.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
      }
    });
  }
})();
```

**要点**：
- **默认暖色（light）**，仅当 localStorage 存储了 `dark` 才应用暗色
- 不依赖 `prefers-color-scheme`，完全由用户手动切换
- 防闪烁：`<head>` 中的内联脚本在 CSS 渲染前同步读取 localStorage
- CSS 使用 `[data-theme="dark"]` 选择器覆盖变量（非 media query）

### 9.3 Tab 切换

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

**要点**：
- 通过 `closest('.tabs')` 定位到当前 Tab 组，支持同页面多组 Tab
- Tab 按钮和面板的 active 状态通过 `.active` 类控制

---

## 10. 设计原则

1. **暖色基底**：所有灰色都带暖棕色调（`#2c2418` 而非纯黑，`#8a7e6e` 而非纯灰），创造温暖的阅读体验
2. **低对比度层次**：背景、表面、边框之间的对比度很低（0.06-0.16 alpha），视觉舒适
3. **色彩节制**：主强调只用一个橙红色（accent），其余颜色作为语义标签使用
4. **dim 底色系统**：每个颜色都配一个 6-8% 透明度的底色变量，用于 badge 背景、hover 状态、code 标签
5. **暗色模式对称**：保持相同的语义色彩映射，只调整亮度和透明度
6. **边界精确对齐**：SVG 中箭头三角形尖端必须精确触碰目标节点边界，线段从源节点边界出发到三角形底边，中间不留空隙
7. **单文件交付**：CSS + JS 全部内联，不依赖外部框架，一个 HTML 文件即可完整展示
8. **渐进式信息披露**：通过 details/summary 手风琴和 Tab 系统，将深层信息折叠，避免页面过长
9. **微妙动效**：所有 transition 控制在 0.15-0.3s，hover 反馈即时但不抢眼
10. **语义色一致**：同一概念在所有组件中使用相同的语义色（如 accent 始终是橙红，blue 始终是信息色）

---

## 11. 可复用 CSS 变量速查

完整的 `:root` 变量块，可直接复制到新页面：

```css
:root {
  --font-body: 'Inter', 'Noto Sans SC', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'SF Mono', Consolas, monospace;
  --bg: #faf8f5;
  --bg-warm: #f5f0e8;
  --surface: #ffffff;
  --surface2: #faf6f0;
  --border: rgba(120, 80, 40, 0.08);
  --border-bright: rgba(120, 80, 40, 0.16);
  --text: #2c2418;
  --text-dim: #8a7e6e;
  --text-mid: #5c5244;
  --accent: #c2410c;
  --accent-light: #fb923c;
  --accent-dim: rgba(194, 65, 12, 0.06);
  --blue: #1d4ed8;
  --blue-dim: rgba(29, 78, 216, 0.06);
  --green: #15803d;
  --green-dim: rgba(21, 128, 61, 0.06);
  --red: #b91c1c;
  --red-dim: rgba(185, 28, 28, 0.06);
  --purple: #7c3aed;
  --purple-dim: rgba(124, 58, 237, 0.06);
  --amber: #b45309;
  --amber-dim: rgba(180, 83, 9, 0.06);
  --cyan: #0e7490;
  --cyan-dim: rgba(14, 116, 144, 0.06);
  --teal: #0f766e;
  --teal-dim: rgba(15, 118, 110, 0.06);
  --shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03);
  --shadow-lg: 0 4px 24px rgba(0,0,0,0.06);
  --radius: 12px;
}
[data-theme="dark"] {
  --bg: #1a1714; --bg-warm: #211e19; --surface: #252119; --surface2: #2c2720;
  --border: rgba(200,170,120,0.08); --border-bright: rgba(200,170,120,0.16);
  --text: #e8e0d4; --text-dim: #8a7e6e; --text-mid: #b5a998;
  --accent: #fb923c; --accent-light: #fdba74; --accent-dim: rgba(251,146,60,0.08);
  --blue: #60a5fa; --blue-dim: rgba(96,165,250,0.08);
  --green: #4ade80; --green-dim: rgba(74,222,128,0.08);
  --red: #f87171; --red-dim: rgba(248,113,113,0.08);
  --purple: #a78bfa; --purple-dim: rgba(167,139,250,0.08);
  --amber: #fbbf24; --amber-dim: rgba(251,191,36,0.08);
  --cyan: #22d3ee; --cyan-dim: rgba(34,211,238,0.08);
  --teal: #2dd4bf; --teal-dim: rgba(45,212,191,0.08);
  --shadow: 0 1px 3px rgba(0,0,0,0.2); --shadow-lg: 0 4px 24px rgba(0,0,0,0.3);
}
```
