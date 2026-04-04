# Classic Cat Overlay Workflow

每个动画状态都是一个独立工作单元，例如：

`drowsy/reference/base.png`
- 当前动画的参考底图

`drowsy/frames/`
- 当前动画的逐帧源图，命名建议 `frame_001.png`、`frame_002.png`、`frame_003.png`

在动画管理器里选中某个状态后：

- “导出参考底图” 只作用于该状态
- “导出当前动画帧” 会把运行中的 spritesheet 拆回该状态的 `frames/`
- “导入当前动画帧” 会把你选择的图片写入该状态的 `frames/`
- “烘焙当前动画” 会把该状态重新写回实际运行产物

实际运行产物仍然输出到：

- `src/pet/cat-overlays/default/sheet.png`
- `src/pet/cat-overlays/default/sheet.json`
