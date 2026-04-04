# SpriteSheet 打瞌睡模板

这份模板用于给 `Bongo Cat` 的帧动画角色补一套“偶尔发困 / 打瞌睡”的美术资产，并保证和当前项目的加载逻辑兼容。

## 目录位置

默认动画角色目录：

```text
src/pet/spritesheets/default/
  sheet.json
  sheet.png
```

如果你只是给现有默认动画猫补图，直接改这两个文件即可。

## 先讲结论

如果你的目标是“猫猫偶尔犯困，但不是立刻睡着”，推荐把状态拆成两段：

- `drowsy`: 偶发的轻度犯困，播 1 次后回到 `idle`
- `sleep`: 长时间无操作后真正睡着，循环播放

这样视觉会自然很多，也更符合当前设计里的 `sleepy` 意图。

## 推荐 Row 规划

推荐把默认 8 行升级为 9 行：

| Row | State | 帧数 | 建议时长 | 说明 |
|-----|-------|------|----------|------|
| 0 | `idle` | 6 | 180-220ms | 常态呼吸 / 轻微晃动 |
| 1 | `idle-blink` | 3 | 60-100ms | 眨眼 |
| 2 | `typing-left` | 3 | 50-80ms | 左爪敲击 |
| 3 | `typing-right` | 3 | 50-80ms | 右爪敲击 |
| 4 | `click-react` | 4 | 100-140ms | 点击反应 |
| 5 | `happy` | 4 | 140-200ms | 开心 |
| 6 | `drowsy` | 4 | 220-320ms | 打瞌睡，播完回 `idle` |
| 7 | `sleep` | 4 | 400-650ms | 睡着循环 |
| 8 | `wake-up` | 3 | 120-180ms | 被唤醒后回 `idle` |

总图尺寸示例：

- 每帧 `300 x 300`
- 列数 `8`
- 行数 `9`
- 最终 `sheet.png`: `2400 x 2700`

## `drowsy` 应该怎么画

目标不是“已经睡着”，而是“快困了，偶尔点头”。

推荐 4 帧动作：

1. `drowsy-0`
   眼皮半垂，身体还基本直立
2. `drowsy-1`
   头部稍微向前点，耳朵和上半身轻微下沉
3. `drowsy-2`
   点头最深，眼睛几乎闭上，嘴巴可微张或小哈欠
4. `drowsy-3`
   微微回弹，但还没完全精神，方便衔接回 `idle`

## 出图要求

- 背景透明
- 每帧角色锚点一致，不要左右乱跳
- 键盘/桌面高度保持一致
- 猫的主体轮廓尽量稳定，变化集中在头、眼睛、耳朵、肩膀
- `tintable: true` 时，底色尽量用浅色中性色，方便后续染色

## 画面风格建议

结合当前项目设计，建议：

- 漫画感、可读性强
- 可爱但不要过幼
- 动作幅度小而明确
- `drowsy` 用“慢、软、沉”表达，不要夸张甩头

## AI 出图提示词

如果你用 AI 先出草图，可以先按“单行一组动作”去出，再手工拼成总表。

基础提示词：

```text
cute chibi bongo cat at a desk with keyboard, transparent background, consistent pose, soft warm colors, clean outline, flat-cartoon style, sleepy and drowsy motion sequence, same character design across frames
```

`drowsy` 行可加：

```text
4-frame animation sequence, cat getting sleepy, eyelids drooping, slow nodding, slight head tilt forward, subtle recovery, not fully asleep, transparent background
```

负面约束建议：

```text
no extra props, no text, no watermark, no camera movement, no background scene change, no character redesign, no different clothing
```

## 推荐 JSON 模板

如果你要加 `drowsy`，推荐把默认配置改成这样：

```json
{
  "frameWidth": 300,
  "frameHeight": 300,
  "columns": 8,
  "tintable": true,
  "states": {
    "idle":         { "row": 0, "frames": 6, "frameDuration": 200, "loop": true },
    "idle-blink":   { "row": 1, "frames": 3, "frameDuration": 80,  "loop": false },
    "typing-left":  { "row": 2, "frames": 3, "frameDuration": 60,  "loop": false },
    "typing-right": { "row": 3, "frames": 3, "frameDuration": 60,  "loop": false },
    "click-react":  { "row": 4, "frames": 4, "frameDuration": 120, "loop": false },
    "happy":        { "row": 5, "frames": 4, "frameDuration": 180, "loop": true },
    "drowsy":       { "row": 6, "frames": 4, "frameDuration": 280, "loop": false, "next": "idle" },
    "sleep":        { "row": 7, "frames": 4, "frameDuration": 500, "loop": true },
    "wake-up":      { "row": 8, "frames": 3, "frameDuration": 150, "loop": false, "next": "idle" }
  }
}
```

## 最省事的两种接入方式

### 方案 A：只补图，不改逻辑

适合先把资产流程跑通。

- 保持现有 `sheet.json`
- 先只提供当前已有的 8 行图
- 其中 `sleep` 行可以先画成“偏困倦”的版本

优点：不改代码  
缺点：`困了` 和 `睡着了` 会共用一个状态，表现力一般

### 方案 B：加 `drowsy` 行，再做逻辑触发

适合正式版本。

- `sheet.png` 扩成 9 行
- `sheet.json` 增加 `drowsy`
- 代码里让 `sleepy` intent 优先播 `drowsy`
- 长时间 idle 才进入 `sleep`

优点：语义清晰，动画更自然  
缺点：需要补一点点逻辑

## 当前占位图用途

现在项目里已经补一个真实存在的占位版 `sheet.png`，它的作用是：

- 让目录结构完整
- 让你能直接替换成正式图
- 不再依赖运行时 fallback 才看到动画

它不是最终美术，只是方便你先验证加载链路。
