# 风格主题化指南

> 本文件定义 CSS 变量约定和风格主题化方法。
> 任何视觉风格只需实现本文件定义的变量接口，即可驱动 `COMPONENT_REFERENCE.md` 中的所有组件。

---

## 1. 架构概览

```
┌─────────────────────────────┐
│  通用组件（HTML + CSS 结构）  │  ← COMPONENT_REFERENCE.md
│  使用 var(--xxx) 变量        │     所有组件的 HTML 代码片段
├─────────────────────────────┤
│  CSS 变量接口（本文件定义）   │  ← 必须实现的变量清单
│  风格无关的语义变量约定       │
├─────────────────────────────┤
│  具体风格实现                │  ← VISUAL_STYLE_{风格名}.md
│  提供变量的实际色值/字体/阴影  │     例：VISUAL_STYLE_WARM_SIGNAL.md
└─────────────────────────────┘
```

**核心思想**：组件只依赖语义变量（如 `--accent`），不依赖具体色值（如 `#c2410c`）。更换风格 = 更换 `:root` 变量块。

---

## 2. 必须实现的 CSS 变量

任何风格主题必须在 `:root` 中提供以下变量，才能完整驱动所有组件。

### 2.1 语义色（8 色系统 + dim 变体）

| 变量 | 语义 | dim 变体 | dim 用途 |
|------|------|----------|----------|
| `--accent` | 主强调色 | `--accent-dim` | badge 背景、hover、hero 渐变 |
| `--blue` | 信息/技术 | `--blue-dim` | badge 背景、分组框填充 |
| `--green` | 成功/稳定 | `--green-dim` | badge 背景、状态指示 |
| `--amber` | 警告/建议 | `--amber-dim` | badge 背景、注意提示 |
| `--red` | 错误/告警 | `--red-dim` | badge 背景、错误指示 |
| `--teal` | 基础设施 | `--teal-dim` | badge 背景、辅助分组 |
| `--purple` | 新功能/生成 | `--purple-dim` | badge 背景、特殊标记 |
| `--cyan` | 辅助/专项 | `--cyan-dim` | badge 背景、次要信息 |

**dim 变体规则**：
- Light mode：原色 + 6-8% 透明度（`rgba(r,g,b, 0.06)`）
- Dark mode：原色亮色变体 + 6-8% 透明度（`rgba(r,g,b, 0.08)`）
- 也可以可选提供 `--accent-light` 作为浅色变体

### 2.2 表面/背景色

| 变量 | 语义 | 用于 |
|------|------|------|
| `--bg` | 页面背景 | `body` 背景 |
| `--bg-warm` | 交替区块背景 | `.section-alt` |
| `--surface` | 卡片/面板背景 | card, table-wrap, details, callout |
| `--surface2` | 次级面板背景 | 表头, 主题切换按钮 |

### 2.3 边框

| 变量 | 语义 | 用于 |
|------|------|------|
| `--border` | 默认边框 | 所有组件边框 |
| `--border-bright` | 增强边框 | hover/active 状态 |

### 2.4 文本

| 变量 | 语义 | 用于 |
|------|------|------|
| `--text` | 主文本 | h1-h4, strong, 正文 |
| `--text-mid` | 次级文本 | callout 正文, detail-body |
| `--text-dim` | 辅助文本 | 注释, 标签, 描述 |

### 2.5 字体

| 变量 | 语义 |
|------|------|
| `--font-body` | 正文字体族（含中文回退） |
| `--font-mono` | 等宽字体族 |

### 2.6 装饰

| 变量 | 语义 |
|------|------|
| `--shadow` | 默认阴影 |
| `--shadow-lg` | 增强阴影（hover） |
| `--radius` | 统一圆角半径 |

---

## 3. Dark Mode 变量覆盖

所有风格都建议支持 light/dark 双主题。Dark mode 通过 `[data-theme="dark"]` 选择器覆盖变量。

### 3.1 覆盖规则

```css
:root {
  /* Light mode 变量 */
}
[data-theme="dark"] {
  /* Dark mode 覆盖 */
}
```

### 3.2 Dark mode 的通用原则

| 维度 | Light → Dark 变化 |
|------|-------------------|
| 背景 | 浅色 → 深色 |
| 文本 | 深色 → 浅色 |
| 语义色 | 保持色相，**提亮**以在深色背景上可读 |
| dim 变体 | alpha 值从 0.06 调整到 0.08（深色背景需稍高透明度） |
| 阴影 | 加深（`rgba(0,0,0,0.2)` 级别） |
| 边框 | 保持低对比度但可见 |

### 3.3 主题切换 JS（通用模板）

```js
// 防闪烁（放在 <head> 的 <script> 中）
(function(){
  var t = localStorage.getItem('theme');
  if (t === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
})();

// 切换按钮事件
document.getElementById('themeToggle').addEventListener('click', function() {
  var html = document.documentElement;
  var isDark = html.getAttribute('data-theme') === 'dark';
  if (isDark) {
    html.removeAttribute('data-theme');
    localStorage.setItem('theme', 'light');
  } else {
    html.setAttribute('data-theme', 'dark');
    localStorage.setItem('theme', 'dark');
  }
});
```

---

## 4. 创建新风格主题的步骤

### 4.1 最小可行风格

只需提供一个 `:root` 变量块 + `[data-theme="dark"]` 覆盖：

```css
:root {
  /* 字体 */
  --font-body: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* 表面 */
  --bg: #ffffff;
  --bg-warm: #f8f9fa;
  --surface: #ffffff;
  --surface2: #f1f3f5;

  /* 边框 */
  --border: rgba(0, 0, 0, 0.08);
  --border-bright: rgba(0, 0, 0, 0.16);

  /* 文本 */
  --text: #212529;
  --text-mid: #495057;
  --text-dim: #868e96;

  /* 8 色语义 */
  --accent: #e8590c;       --accent-dim: rgba(232, 89, 12, 0.06);
  --blue: #1971c2;         --blue-dim: rgba(25, 113, 194, 0.06);
  --green: #2f9e44;        --green-dim: rgba(47, 158, 68, 0.06);
  --amber: #e67700;        --amber-dim: rgba(230, 119, 0, 0.06);
  --red: #c92a2a;          --red-dim: rgba(201, 42, 42, 0.06);
  --teal: #0c8599;         --teal-dim: rgba(12, 133, 153, 0.06);
  --purple: #7048e8;       --purple-dim: rgba(112, 72, 232, 0.06);
  --cyan: #1098ad;         --cyan-dim: rgba(16, 152, 173, 0.06);

  /* 装饰 */
  --shadow: 0 1px 3px rgba(0,0,0,0.04);
  --shadow-lg: 0 4px 24px rgba(0,0,0,0.08);
  --radius: 12px;
}

[data-theme="dark"] {
  --bg: #1a1b1e;
  --bg-warm: #25262b;
  --surface: #2c2e33;
  --surface2: #373a40;
  --border: rgba(255, 255, 255, 0.08);
  --border-bright: rgba(255, 255, 255, 0.16);
  --text: #e9ecef;
  --text-mid: #adb5bd;
  --text-dim: #868e96;
  /* 语义色提亮 + dim 调高 */
  --accent: #ff922b;       --accent-dim: rgba(255, 146, 43, 0.08);
  --blue: #74c0fc;         --blue-dim: rgba(116, 192, 252, 0.08);
  --green: #69db7c;        --green-dim: rgba(105, 219, 124, 0.08);
  --amber: #ffd43b;        --amber-dim: rgba(255, 212, 59, 0.08);
  --red: #ff6b6b;          --red-dim: rgba(255, 107, 107, 0.08);
  --teal: #38d9a9;         --teal-dim: rgba(56, 217, 169, 0.08);
  --purple: #9775fa;       --purple-dim: rgba(151, 117, 250, 0.08);
  --cyan: #3bc9db;         --cyan-dim: rgba(59, 201, 219, 0.08);
  --shadow: 0 1px 3px rgba(0,0,0,0.3);
  --shadow-lg: 0 4px 24px rgba(0,0,0,0.4);
}
```

### 4.2 风格定制维度

在满足最小变量接口后，风格可以在以下维度做差异化：

| 维度 | 变化方式 | 示例 |
|------|----------|------|
| **色调基底** | 改变 `--bg`、`--surface` 的色相 | 暖棕 / 冷灰 / 纯白 / 深蓝 |
| **主强调色** | 改变 `--accent` | 橙红 / 蓝 / 绿 / 紫 |
| **字体组合** | 改变 `--font-body`、`--font-mono` | serif / sans-serif / monospace 主导 |
| **圆角大小** | 改变 `--radius` | 0px(硬朗) / 8px / 12px / 20px(圆润) |
| **阴影风格** | 改变 `--shadow` 系列 | 无阴影 / 微阴影 / 深阴影 |
| **边框对比度** | 改变 `--border` 的 alpha | 低对比(0.06) / 中对比(0.12) / 高对比(0.2) |
| **排版尺度** | 额外覆盖 h1-h4 的 font-size | 紧凑 / 标准 / 大气 |

### 4.3 可选扩展变量

风格可以额外定义自己专属的变量（如治理专用 badge），不影响通用组件：

```css
/* Warm Signal 专属：治理语义 badge */
.badge--agent { background: var(--red-dim); color: var(--red); }
.badge--skill { background: var(--green-dim); color: var(--green); }
.badge--hook  { background: var(--amber-dim); color: var(--amber); }
```

这些扩展在组件参考中不列出，只在风格规范文件中记录。

---

## 5. 已有风格主题

| 风格 | 色调 | 主强调色 | 字体 | 规范文件 |
|------|------|----------|------|----------|
| **Warm Signal** | 暖棕 | 橙红 `#c2410c` | Inter + Noto Sans SC + JetBrains Mono | `VISUAL_STYLE_WARM_SIGNAL.md` |

### 新增风格检查清单

新增一个风格主题时，确保：

- [ ] `:root` 中包含 2.1-2.6 全部变量
- [ ] `[data-theme="dark"]` 覆盖全部变量
- [ ] 在 `references/_Test_Template.html` 上验证全部组件渲染正常（替换 CSS 变量块即可）
- [ ] 创建 `VISUAL_STYLE_{风格名}.md` 记录完整设计规则
- [ ] 在 `scripts/templates/` 创建 `{style}.html` 和 `{style}.section.html` 模板
- [ ] 更新 SKILL.md 的「已有风格模板」表格

---

## 6. 组件与风格的组合流程

```
1. 从 COMPONENT_REFERENCE.md 复制组件 HTML
    ↓
2. 选择风格主题
    ↓
3. 从 VISUAL_STYLE_{风格}.md 获取 :root 变量块
    ↓
4. 将变量块 + 通用组件 CSS 合并到 <style> 中
    ↓
5. 组件自动获得该风格的视觉表现
```

### 实操示例

假设要创建一个 Blueprint 蓝图风格的架构图页面：

1. **复制组件**：从 COMPONENT_REFERENCE.md 复制 Hero + Card Grid + SVG 架构图
2. **定义蓝图风格变量**：
   ```css
   :root {
     --bg: #0f172a;  /* 深蓝底 */
     --surface: #1e293b;
     --accent: #38bdf8;  /* 天蓝强调 */
     --font-body: 'JetBrains Mono', monospace;  /* 全 mono */
     --radius: 4px;  /* 硬朗直角 */
     /* ... 其余变量 ... */
   }
   ```
3. **结果**：同样的 HTML 组件，自动呈现为蓝图风格

---

## 7. 风格主题最佳实践

### 7.1 保持语义一致

同一个 `--accent` 在所有组件中表达相同含义（主强调）。不要让 card 用 `--accent` 表示"信息"而 callout 用它表示"警告"。

### 7.2 dim 变体保持低对比

`--{color}-dim` 的 alpha 保持在 6-8%，这样 badge、hover、callout 底色才不会过于突兀。

### 7.3 阴影与边框二选一

有些风格偏好阴影（如 Warm Signal），有些偏好清晰边框（如 Blueprint）。通过调整 `--shadow` 和 `--border` 的对比度来控制。

### 7.4 响应式断点保持一致

所有风格使用相同的响应式断点（768px），确保组件布局行为一致：

```css
@media (max-width: 768px) {
  .card-grid--2, .card-grid--3, .card-grid--4 { grid-template-columns: 1fr; }
  .flow { flex-direction: column; }
  .compare-grid { grid-template-columns: 1fr; }
}
```

### 7.5 Transition 时间保持一致

所有风格使用相同的 transition 时间范围（0.15-0.3s），确保交互体验一致。
