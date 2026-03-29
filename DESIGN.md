# Design System — ChatCat

## Product Context
- **What this is:** Electron 桌面宠物 + AI 助手应用，一只能感知你工作状态并主动提供帮助的桌面猫
- **Who it's for:** 20-30 岁知识工作者，对萌和趣味性有感知，日常使用 AI 工具但嫌麻烦
- **Space/industry:** 桌面宠物 × 不侵入式 AI 助手（Shimeji / Bongo Cat meets Grammarly）
- **Project type:** Electron 桌面应用（全屏透明窗口覆盖，非 Web）

## Aesthetic Direction
- **Direction:** Playful-Editorial — 漫画风基底 + 情感化动画表现力
- **Decoration level:** Intentional — 2px 黑边框和漫画阴影构成统一的「面板」语言，不额外装饰
- **Mood:** 一只真正有表情的同伴，不是带猫图标的工具。轻松、温暖、偶尔俏皮，但不幼稚
- **Core emotion:** 「被理解」——猫注意到了你在做什么，在正确的时刻出现

## Typography
- **Display/Hero:** DM Sans 700 — 圆润几何感与漫画风天然匹配，不会显得孩子气
- **Body:** DM Sans 400 — 友好但专业，中文回退到 -apple-system, 'PingFang SC', 'Microsoft YaHei'
- **UI/Labels:** DM Sans 500
- **Data/Tables:** DM Sans (tabular-nums) — 统计数字对齐
- **Code:** JetBrains Mono 400 — 代码块和内联代码
- **Loading:** Google Fonts CDN `https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500`
- **Scale:**
  - `--text-xs`: 11px（标签、徽章）
  - `--text-sm`: 12px（气泡文字、按钮、注释）
  - `--text-base`: 13px（正文基准）
  - `--text-md`: 14px（次级标题）
  - `--text-lg`: 16px（面板标题）
  - `--text-xl`: 20px（区块标题）
  - `--text-2xl`: 28px（数据大字）
  - `--text-3xl`: 36px（Hero）

## Color
- **Approach:** Restrained + warm — 猫是唯一的色彩主角，UI 保持黑白漫画底色

### Cat Palette（角色专属）
| Token | Hex | Usage |
|-------|-----|-------|
| `--cat-body` | #f4c89a | 猫身体主色、暖强调 |
| `--cat-body-light` | #ffe8d6 | 猫身体高光、暖背景 |
| `--cat-outline` | #d4a574 | 猫轮廓、毛发细节 |
| `--cat-ear-inner` | #ffb5b5 | 耳朵内侧粉色 |
| `--cat-nose` | #e8998d | 鼻子、腮红 |

### UI Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `--ink` | #222222 | 边框、标题、最强文字 |
| `--text` | #333333 | 正文 |
| `--text-muted` | #888888 | 次要文字、占位符 |
| `--text-light` | #aaaaaa | 最弱文字、disabled |
| `--bg` | #faf9f7 | 页面背景（微暖白） |
| `--surface` | #ffffff | 卡片/面板背景 |
| `--surface-sunken` | #f5f3f0 | 凹陷区域（输入框底色） |
| `--accent-blue` | #4facfe | 交互强调（打字高亮、链接、选中态） |
| `--accent-blue-soft` | rgba(79,172,254,0.15) | 蓝色背景 |

### Semantic Colors
| Token | Hex | Soft | Usage |
|-------|-----|------|-------|
| `--success` | #34c759 | rgba(52,199,89,0.12) | 完成、已复制 |
| `--warning` | #f5a623 | rgba(245,166,35,0.12) | 额度即将用尽 |
| `--error` | #ff4757 | rgba(255,71,87,0.12) | 网络失败、处理错误 |
| `--info` | #4facfe | rgba(79,172,254,0.12) | 提示、检测到内容 |

### Dark Mode Strategy
- 表面重绘：`--bg: #1a1a1e`, `--surface: #2a2a2e`, `--surface-raised: #333338`
- 文字反转：`--ink: #e8e8e8`, `--text: #d4d4d4`
- 猫色降饱和 10-15%：`--cat-body: #c9a47a`, `--cat-body-light: #e0c8a8`
- 语义色不变，soft 背景降低透明度

## Spacing
- **Base unit:** 8px
- **Density:** Comfortable（桌面宠物不需要信息密度）
- **Scale:**
  - `2xs`: 2px
  - `xs`: 4px
  - `sm`: 8px（气泡 padding、按钮间距）
  - `md`: 16px（组件间距）
  - `lg`: 24px（区块间距）
  - `xl`: 32px
  - `2xl`: 48px（大区块分隔）
  - `3xl`: 64px

## Layout
- **Approach:** Overlay — 全屏透明窗口，猫和气泡是唯一可见元素
- **Bubble positioning:** 猫头顶，`left: 50%; transform: translateX(-50%)`，边界检测确保不超出屏幕
- **Panel:** 右侧固定面板（聊天、工具、设置），宽度 360px
- **Max bubble width:** 320px（L3）/ 360px（L2）
- **Border radius scale:**
  - `--radius-sm`: 4px（小元素、代码块）
  - `--radius-md`: 8px（输入框、Alert）
  - `--radius-lg`: 12px（卡片、面板）
  - `--radius-bubble`: 16px（气泡）
  - `--radius-btn`: 10px（按钮）
  - `--radius-full`: 9999px（圆形徽章）

## Comic System（漫画框架语言）
这是 ChatCat 的视觉签名——所有面板元素都像漫画格子。
- **边框:** `2px solid #222`
- **阴影:** `box-shadow: 2px 2px 0 #222`（固定偏移，不模糊——像印刷阴影）
- **气泡尾:** CSS border triangle，`5px solid transparent + border-top-color: #222`
- **按钮:** `1.5px solid #222`（比面板边框细一级）
- **分割线:** `2px solid #222`（与边框同规格）

## Motion
- **Approach:** Intentional — 不过度但有意义。每个动效都服务于「猫是活的」这个核心感知。
- **Easing:**
  - Enter: `cubic-bezier(0.22, 1, 0.36, 1)` — 快入慢出，像猫耳朵竖起
  - Exit: `cubic-bezier(0.55, 0, 1, 0.45)` — 慢入快出，像猫缩回
  - Move: `cubic-bezier(0.4, 0, 0.2, 1)` — 平滑过渡
- **Duration:**
  - Micro: 50-100ms（按钮反馈、toggles）
  - Short: 150-250ms（气泡内部切换、按钮 hover）
  - Medium: 250-400ms（气泡出现/消失、状态切换）
  - Long: 400-700ms（猫表情过渡、sleep 动画）
- **Button conventions:**
  - Hover: `transform: scale(1.05)` @ 150ms
  - Active: `transform: scale(0.97)` @ instant
  - 不使用 color 过渡——漫画风靠形变而非色变
- **Bubble conventions:**
  - FadeIn: `0.3s ease` + translateY(8px→0)
  - FadeOut: `2s ease`（长淡出 = 不突兀消失）
  - ShrinkToDot: `0.4s ease` + scale(1→0.1)

## Animation Intent System

### Intent 字典
调用方使用语义意图，不关心具体角色渲染器实现。

| Intent | 语义 | 触发场景 | 持续时间 | 自动恢复 |
|--------|------|---------|---------|---------|
| `curious` | 好奇/注意到了 | 剪贴板检测、新消息 | 1.5s | → idle |
| `working` | 忙碌/处理中 | AI 翻译/润色/解释中 | 持续到完成 | 手动 → proud/idle |
| `proud` | 得意/完成了 | AI 结果返回 | 2s | → idle |
| `sleepy` | 困倦/该休息了 | 疲劳提醒 | 3s | → idle |
| `alert` | 警觉/重要事 | 重要通知、错误 | 2s | → idle |
| `encouraging` | 鼓励/加油 | 专注鼓励、里程碑 | 2s | → idle |
| `idle` | 常态 | 无事件、气泡消失 | ∞ | 30s → sleep |

### 每种渲染器的映射

**Character (Canvas 程序绘制):**
| Intent | 实现 |
|--------|------|
| curious | `expressionState='surprised'` + 耳朵角度 +20° |
| working | 快速交替 typing + 键盘蓝色高亮 |
| proud | `expressionState='happy'` + bodyBob 振幅加大 |
| sleepy | 缓慢过渡到 sleep 状态 |
| alert | `expressionState='surprised'` + 双耳竖直 |
| encouraging | `expressionState='happy'` + 慢速 bodyBob |
| idle | `expressionState='normal'` + 正常节奏 |

**SpriteSheetCharacter (帧动画):**
| Intent | 实现 |
|--------|------|
| curious | 新增 `curious` 行（优先）/ fallback → `click-react` |
| working | `typing-left`/`typing-right` 快速交替 |
| proud | `happy` 行 |
| sleepy | `sleep` 行 |
| alert | `click-react` + 快速 `idle-blink` |
| encouraging | `happy` 行（frameDuration × 1.5 慢播） |
| idle | `idle` 行 |

### Notification × Animation 同步时序

```
t=0ms     信号触发
          ├── intent('curious')
          └── 气泡 fadeIn 开始 (300ms)

t=300ms   气泡完全可见
          └── curious 动画播放中

t=?       用户点击按钮（或 t=8000ms 自动消失）
          ├── 点击: intent('working') + 气泡切换为 loading
          └── 忽略: intent('idle') + 气泡 fadeOut (2000ms)

t=?+AI    AI 完成
          ├── intent('proud')
          └── 气泡显示结果 + [复制][关闭]

t=?+close 关闭/15s 超时
          └── intent('idle') + 气泡 fadeOut
```

### 扩展新 Intent 的规范
1. 在此文档的 Intent 字典中添加行
2. 为每种渲染器定义映射（如果现有状态可复用，注明 fallback）
3. 如果需要新的 SpriteSheet 行：在 `sheet.json` 中添加状态定义
4. 所有 intent 必须有自动恢复机制（timeout → idle），防止卡在非常态

## Emoji Usage Policy
- **克制使用**: 只在消息文案中使用，不在 UI 组件标签中堆砌
- **品质标准**: 只使用有明确语义的 emoji，避免装饰性堆砌
- **允许**: 在猫的对话文案中适度使用（1-2 个/条消息），匹配性格设定
- **禁止**: 按钮标签中 emoji + 文字的模式（如 "🌐 翻译"）应逐步迁移为纯文字或 .cat-icon 图标
- **替代方案**: 使用 `.cat-icon` 系统（sm/md/lg/xl 四种尺寸）替代 emoji，保持视觉统一
- **过渡策略**: 现有代码中的 emoji 按钮在重构时逐步替换，新代码优先使用 .cat-icon

## Notification Level Visual Language
| Level | 视觉 | 交互 | 持续时间 |
|-------|------|------|---------|
| L0 | 无可见元素，仅写入 feed | 无 | — |
| L1 | 猫头顶红色脉冲圆点 (10px, #ff4757) | 点击展开 | 持续到点击 |
| L2 | 纯文字气泡（border-radius: 16px） | 被动阅读 | 8s → fadeOut |
| L3 | 带按钮气泡 + bubble-l3 class | 按钮点击 | 8s → fadeOut / 用户操作后 15s |

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-25 | Playful-Editorial 美学方向 | 漫画风基底是产品签名，升级动画表现力而非改变美学 |
| 2026-03-25 | DM Sans + JetBrains Mono | 圆润字形匹配漫画风，tabular-nums 满足数据展示需求 |
| 2026-03-25 | 暖猫色谱（从代码提取） | 正式化已有的隐含配色，不是新发明 |
| 2026-03-25 | Intent-Based Animation | 语义意图层解耦调用方与渲染器，支持 3 种角色类透明切换 |
| 2026-03-25 | Intentional Motion | 与「不侵入式 AI」产品定位一致，猫与气泡同步但不过度 |
| 2026-03-25 | Emoji 克制策略 | 避免 Low 感的 emoji 堆砌，逐步迁移到 .cat-icon 系统 |
