# Cat Overlay 打瞌睡模板

这是方案 A 的美术管线：保留现有 `src/pet/sprites` 里的键盘/桌面/基础角色，只在上层叠一张“只有猫”的透明动画。

## 目录结构

```text
src/pet/cat-overlays/default/
  sheet.json
  sheet.png
```

## 适用场景

- 只想让中间猫动
- 不想重画键盘或乐器
- 经典 `SpriteCharacter` 皮肤继续沿用原有底图

## 资产要求

- 每帧 `300 x 300`
- 透明背景
- 只画猫，不画键盘/桌面/其他 UI
- 猫的位置锚点固定，和经典猫当前位置对齐
- 默认推荐只做 `drowsy` 一组

## 推荐状态

当前最小可用模板：

```json
{
  "frameWidth": 300,
  "frameHeight": 300,
  "columns": 4,
  "tintable": true,
  "states": {
    "drowsy": { "row": 0, "frames": 4, "frameDuration": 280, "loop": false }
  }
}
```

## `drowsy` 出图建议

4 帧推荐动作：

1. 眼皮下垂，身体还直立
2. 头稍微往前点
3. 点头最深，眼睛接近闭合
4. 轻微回弹，方便结束后回到普通静态猫

## AI 提示词建议

```text
cute chibi bongo cat only, transparent background, no keyboard, no desk, no props, same position across frames, sleepy drowsy motion, eyelids drooping, slight nodding, clean outline, flat-cartoon style
```

负面提示词：

```text
no background, no text, no watermark, no extra object, no keyboard, no instrument, no pose drift
```

## 代码接入方式

当前经典猫会：

- 底层先正常绘制 `src/pet/sprites`
- 触发 `sleepy` 或 idle 到达犯困阈值时
- 临时隐藏底层猫身体层
- 在最终 canvas 上叠加 `cat-overlays/default/sheet.png`

所以只要替换 `sheet.png`，不用改键盘素材。
