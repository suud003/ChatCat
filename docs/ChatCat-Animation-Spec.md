# ChatCat 功能-猫咪动画对照表

> 全量列出每个功能对应的猫咪动作，不含气泡/UI动画

---

## Intent 动画字典（底层动画能力）

| Intent | 语义 | 猫咪表现 | 持续 | 恢复 |
|--------|------|---------|------|------|
| `curious` | 好奇/注意到 | 耳朵竖起+角度偏转20°+惊讶表情 | 1.5s | → idle |
| `working` | 处理中 | 快速交替左右爪敲击 | 持续 | 手动结束 |
| `proud` | 完成/得意 | 开心表情+身体摇晃幅度加大 | 2s | → idle |
| `sleepy` | 困倦 | 缓慢进入睡眠状态 | 3s | → idle |
| `alert` | 警觉/重要 | 双耳笔直竖起+惊讶表情+耳朵偏转35° | 2s | → idle |
| `encouraging` | 鼓励/加油 | 开心表情+慢速身体摇晃 | 2s | → idle |
| `idle` | 常态 | 正常表情+正常呼吸节奏 | ∞ | 30s→sleep |

---

## 功能-动画全列表

### 一、用户输入

| # | 功能 | 动画名 | 猫咪动作描述 | 优先级 |
|---|------|--------|-------------|--------|
| 1 | 键盘打字 | typing-paw-alternate | 左右爪交替敲击键盘，键盘区域闪烁蓝色高亮 | ✅已有 |
| 2 | 鼠标点击 | click-paw-raise | 双爪同时抬高，表情切为惊讶，400ms后恢复 | ✅已有 |
| 3 | 鼠标点击表情 | click-emoji-float | 头顶随机浮出一个小表情图标并淡出(500ms) | ✅已有 |
| 4 | 空闲呼吸 | idle-breathe | 身体缓慢上下起伏，每3-5秒随机眨眼 | ✅已有 |
| 5 | 进入睡眠 | idle-to-sleep | 缓慢趴下，眼睛闭合，头顶飘出"zzZ" | ✅已有 |
| 6 | 睡眠中被唤醒 | sleep-wake-up | 从趴姿弹起，耳朵竖直，毛发微炸，迅速恢复正常 | **P0** |

### 二、AI 聊天

| # | 功能 | 动画名 | 猫咪动作描述 | 优先级 |
|---|------|--------|-------------|--------|
| 7 | 发送聊天消息 | chat-send-happy | 露出开心表情，身体轻微上弹一次 | ✅已有 |
| 8 | AI生成中 | chat-ai-thinking | 快速交替敲键盘，头顶出现"..."小图标 | **P0** |
| 9 | AI回复完成 | chat-ai-done | 停止打字，表情切为得意，身体摇晃幅度加大2秒 | **P0** |

### 三、剪贴板感知

| # | 功能 | 动画名 | 猫咪动作描述 | 优先级 |
|---|------|--------|-------------|--------|
| 10 | 检测到剪贴板新内容 | clipboard-curious | 耳朵突然竖起+角度偏转20°，表情惊讶，1.5秒恢复 | ✅已有 |
| 11 | 剪贴板处理中 | clipboard-working | 爪子飞速交替敲击，持续到AI返回 | ✅已有 |
| 12 | 剪贴板处理完成 | clipboard-proud | 表情切为开心/得意，身体得意摇晃2秒 | ✅已有 |
| 13 | 剪贴板处理失败 | clipboard-alert | 双耳笔直竖起，表情惊讶，耳朵偏转35°，2秒恢复 | ✅已有 |

### 四、打字情绪检测

| # | 功能 | 动画名 | 猫咪动作描述 | 优先级 |
|---|------|--------|-------------|--------|
| 14 | 挫折检测(速度骤降+频繁删除) | mood-frustrated | 表情变担忧，耳朵微微下垂，身体微缩 | **P0** |
| 15 | 匆忙检测(速度暴增) | mood-rushing | 表情变警觉，耳朵竖直，身体微微前倾 | **P0** |

### 五、工作阶段感知

| # | 功能 | 动画名 | 猫咪动作描述 | 优先级 |
|---|------|--------|-------------|--------|
| 16 | 早晨开工问候 | greeting-morning | 表情开心，身体欢快摇晃，一只爪子挥手 | **P0** |
| 17 | 每日启动问候 | daily-greeting | 挥手/跳跃欢迎动画 | **P0** |
| 18 | 午后低谷提醒 | phase-afternoon-slump | 表情困倦，动作变慢，眼睛半睁，打一个小哈欠 | **P1** |
| 19 | 收工前提醒 | phase-wrap-up | 表情骄傲，一只爪子竖大拇指 | **P1** |
| 20 | 加班提醒 | phase-overtime-care | 表情困倦，动作极慢，头一点一点地打瞌睡 | **P1** |
| 21 | 深夜关怀 | late-night-sleepy | 半睡状态，头一点一点，眼睛努力睁开又合上 | **P1** |

### 六、应用切换与闲聊

| # | 功能 | 动画名 | 猫咪动作描述 | 优先级 |
|---|------|--------|-------------|--------|
| 22 | 长时间idle闲聊邀请 | idle-chat-invite | 爪子轻轻拨弄面前的毛线球，偶尔抬头看用户 | **P1** |
| 23 | 检测到浏览器活跃 | app-switch-browser | 好奇歪头，耳朵一高一低 | **P1** |
| 24 | 检测到IDE活跃 | app-switch-ide | 头顶叠加一副小眼镜图标，表情认真 | **P1** |
| 25 | 从其他应用切回 | app-switch-welcome | 抬头注视，表情开心，耳朵竖起 | **P1** |

### 七、技能系统

| # | 功能 | 动画名 | 猫咪动作描述 | 优先级 |
|---|------|--------|-------------|--------|
| 26 | 技能执行开始 | skill-start-working | 进入专注打字模式，头顶出现对应技能小图标(放大镜/笔/清单) | **P0** |
| 27 | 技能执行完成 | skill-done-proud | 停止打字，表情得意，举起一只爪子比"OK" | **P0** |
| 28 | 文本转换(/convert) | skill-convert | 一爪按住文本，另一爪快速书写，完成后得意摇头 | **P1** |
| 29 | 日报生成(/report) | skill-report | 翻开小笔记本，爪子快速记录，完成后合上笔记本点头 | **P1** |
| 30 | Todo提取(/todo) | skill-todo-extract | 爪子从空中"拎出"一个条目，放到一侧 | **P2** |
| 31 | 周报生成 | skill-weekly | 面前铺开卷轴，双爪书写，完成后卷起举高 | **P2** |

### 八、番茄钟

| # | 功能 | 动画名 | 猫咪动作描述 | 优先级 |
|---|------|--------|-------------|--------|
| 32 | 开始专注 | pomo-focus-start | 戴上耳机(叠加图标)，表情变认真，进入专注姿势 | **P0** |
| 33 | 专注进行中 | pomo-focus-ongoing | 持续稳定打字，身边环绕淡蓝色专注光环 | **P1** |
| 34 | 专注完成 | pomo-focus-done | 摘下耳机，双爪举高欢呼，头顶爆出小星星粒子，表情骄傲 | **P0** |
| 35 | 休息开始 | pomo-break-start | 伸懒腰，打一个大哈欠，舒服地趴下 | **P1** |
| 36 | 休息结束 | pomo-break-end | 从趴姿弹起，抖抖身子，精神抖擞 | **P1** |
| 37 | 重置 | pomo-reset | 摘下耳机放一边，耸耸肩，恢复idle | **P2** |

### 九、Todo 列表

| # | 功能 | 动画名 | 猫咪动作描述 | 优先级 |
|---|------|--------|-------------|--------|
| 38 | 完成单个Todo | todo-check | 爪子在空中打勾✓，表情短暂开心 | **P0** |
| 39 | 完成全部Todo | todo-all-done | 站起来双爪鼓掌，头顶爆出彩纸粒子 | **P1** |

### 十、好感度系统

| # | 功能 | 动画名 | 猫咪动作描述 | 优先级 |
|---|------|--------|-------------|--------|
| 40 | 进入心流×2 | affection-flow-enter | 身边出现淡金色流光环绕，表情专注且满足 | **P1** |
| 41 | 退出心流 | affection-flow-exit | 金色流光缓慢消散(1秒)，恢复正常表情 | **P1** |
| 42 | 好感度升级 | affection-level-up | 全身短暂发光，向上跳跃一次，头顶爆出星星 | **P0** |
| 43 | 心情开心 | affection-mood-happy | 嘴角上扬，眼睛弯月牙，摇晃节奏加快 | **P1** |
| 44 | 心情低落 | affection-mood-bored | 耳朵下垂，眼睛半睁，动作变慢，偶尔叹气 | **P2** |
| 45 | 转生 | affection-rebirth | 全身金光包裹→缩为光球→炸开出现新形态→周围散落星尘 | **P3** |

### 十一、惊喜事件

| # | 功能 | 动画名 | 猫咪动作描述 | 优先级 |
|---|------|--------|-------------|--------|
| 46 | 礼物事件 | surprise-gift | 背后变出小礼盒，双爪推到屏幕前方 | **P1** |
| 47 | 亲昵事件 | surprise-nuzzle | 身体前倾，头部左右蹭动，脸颊出现粉色腮红 | **P1** |
| 48 | 特技事件 | surprise-trick | 原地后空翻一圈(旋转360°)，落地后得意摇尾巴 | **P2** |
| 49 | 秘密事件 | surprise-secret | 凑近屏幕，一只爪子放嘴边做"嘘"手势，表情害羞 | **P2** |
| 50 | 幸运事件 | surprise-lucky | 头顶出现四叶草/幸运星，旋转闪烁 | **P2** |

### 十二、扭蛋系统

| # | 功能 | 动画名 | 猫咪动作描述 | 优先级 |
|---|------|--------|-------------|--------|
| 51 | 投币 | gacha-coin-insert | 双爪捧金币，塞入扭蛋机，金币消失发出光效 | **P2** |
| 52 | 等待出球 | gacha-spinning | 紧张盯着扭蛋机，双爪握拳放胸前，身体微微发抖 | **P2** |
| 53 | 出球(N/R) | gacha-result-normal | 接住扭蛋打开，表情平淡点头 | **P2** |
| 54 | 出球(SR) | gacha-result-sr | 接住扭蛋打开，表情惊喜，小星星飞出 | **P2** |
| 55 | 出球(SSR) | gacha-result-ssr | 兴奋跳起，全身短暂金光，大量星星彩带爆炸 | **P2** |
| 56 | 出球(SSSR) | gacha-result-sssr | 激动原地转圈，全身彩虹光，烟花粒子持续3秒 | **P2** |
| 57 | 10连捂眼 | gacha-multi-peek | 紧张捂眼，从指缝偷看，最后一球猛地睁眼 | **P2** |
| 58 | 装备饰品 | accessory-equip | 饰品飞到身上对应位置闪烁固定，左右转头照镜子 | **P2** |
| 59 | 卸下饰品 | accessory-unequip | 饰品飞离，抖一抖身子 | **P3** |

### 十三、多人联机

| # | 功能 | 动画名 | 猫咪动作描述 | 优先级 |
|---|------|--------|-------------|--------|
| 60 | 远端打字 | mp-remote-typing | 小猫爪子交替敲击动画 | ✅已有 |
| 61 | 远端点击 | mp-remote-click | 小猫头顶浮出随机表情(500ms) | ✅已有 |
| 62 | 玩家加入 | mp-player-join | 小猫从屏幕边缘走入，fadeIn | ✅已有 |
| 63 | 玩家离开 | mp-player-leave | 小猫挥手告别，fadeOut | ✅已有 |
| 64 | 排名上升 | mp-rank-up | 对应小猫开心跳一下 | **P3** |
| 65 | 排名下降 | mp-rank-down | 对应小猫耸肩/叹气 | **P3** |

### 十四、其他

| # | 功能 | 动画名 | 猫咪动作描述 | 优先级 |
|---|------|--------|-------------|--------|
| 66 | 打字记录中 | recorder-live | 偶尔偏头看一眼预览区 | **P2** |
| 67 | 皮肤切换 | skin-change | 身上出现烟雾/闪光过渡(300ms)，散去后显示新皮肤 | **P2** |
| 68 | 关系加深 | relationship-deepen | 缓慢靠近屏幕中心，表情温柔 | **P2** |
| 69 | 隐私授权同意 | consent-granted | 点头表示感谢 | **P3** |
| 70 | 隐私授权拒绝 | consent-denied | 微微低头表示理解 | **P3** |

---

## 优先级统计

| 优先级 | 数量 | 说明 |
|--------|------|------|
| ✅已有 | **17** | 已实现，无需开发 |
| **P0** | **14** | 核心闭环：现有功能补齐猫咪反应，形成完整体验 |
| **P1** | **19** | 体验增强：主动场景表情 + 心流反馈 + 惊喜事件 |
| **P2** | **14** | 锦上添花：扭蛋特效 / 饰品 / 皮肤过渡 |
| **P3** | **6** | 远期规划：转生 / 联机排名 / 授权UI |

---

## P0 清单（14项，建议立即开发）

| # | 动画名 | 猫咪动作 | 所属模块 |
|---|--------|---------|---------|
| 6 | sleep-wake-up | 从趴姿弹起，耳朵竖直，毛发微炸 | 用户输入 |
| 8 | chat-ai-thinking | 快速交替敲键盘，头顶"..."小图标 | AI聊天 |
| 9 | chat-ai-done | 停止打字，得意表情，摇晃加大2秒 | AI聊天 |
| 14 | mood-frustrated | 表情担忧，耳朵下垂，身体微缩 | 打字情绪 |
| 15 | mood-rushing | 表情警觉，耳朵竖直，身体前倾 | 打字情绪 |
| 16 | greeting-morning | 开心摇晃，一只爪子挥手 | 工作阶段 |
| 17 | daily-greeting | 挥手/跳跃欢迎动画 | 工作阶段 |
| 26 | skill-start-working | 专注打字，头顶出现技能小图标 | 技能系统 |
| 27 | skill-done-proud | 得意表情，举爪比"OK" | 技能系统 |
| 32 | pomo-focus-start | 戴上耳机，表情认真，进入专注姿势 | 番茄钟 |
| 34 | pomo-focus-done | 摘耳机，双爪举高欢呼，星星粒子 | 番茄钟 |
| 38 | todo-check | 爪子空中打勾✓，表情短暂开心 | Todo |
| 42 | affection-level-up | 全身发光，跳跃一次，头顶星星 | 好感度 |

> **P0 的核心逻辑**：这 14 项功能的代码已经跑通，用户已经在使用，但猫咪没有任何反应。补齐这些动画就能让产品从"功能可用"变成"体验完整"。剪贴板感知场景（curious→working→proud）是目前唯一的完整标杆，P0 的目标是把这个标杆复制到所有核心功能上。

---

## AI 生图 Prompt 库 (推荐使用纯绿背景以完美抠图)

由于白猫在白底上极易在抠图时导致身体变成透明，强烈建议在生图时要求 AI 使用 **纯绿幕背景 (Chroma Key Green)**。
> **⚠️ 关键改动**：为了防止最下面一行的腿或边缘被裁切，加入了关于 **Padding、Safe Margin** 和避免裁剪的强制指令。

### 1. 睡眠唤醒 (sleep-wake-up)
> `A 2D animation sprite sheet of a cute Hachiware cat (Chiikawa style) waking up from sleep in shock. The cat jumps up from a lying position, ears stand straight up, fur slightly puffed. The sprite sheet MUST contain exactly 30 frames arranged in a perfectly uniform grid (such as 6 columns and 5 rows). ALL characters must be FULL-BODY, showing the complete legs, paws, and tail in every single frame. Keep a generous safe margin and wide padding around each cat. Do NOT crop or cut off any body parts at the edges of the grid. All frames MUST have the exact same size and perfectly aligned bounding boxes for easy cropping. Flat colors, clean line art, pure bright green background (RGB 0, 255, 0) for chroma keying, no overlapping between frames, game UI asset style, clear sequence.`

### 2. AI 思考中/快速打字 (chat-ai-thinking)
> `A 2D animation sprite sheet of a cute Hachiware cat (Chiikawa style) typing very fast on a keyboard with an intense thinking expression, a "..." thought bubble above its head. The sprite sheet MUST contain exactly 30 frames arranged in a perfectly uniform grid (such as 6 columns and 5 rows). ALL characters must be FULL-BODY, showing the complete legs, paws, and tail in every single frame. Keep a generous safe margin and wide padding around each cat. Do NOT crop or cut off any body parts at the edges of the grid. All frames MUST have the exact same size and perfectly aligned bounding boxes for easy cropping. Flat colors, clean line art, pure bright green background (RGB 0, 255, 0) for chroma keying, no overlapping between frames, game UI asset style, clear sequence.`

### 3. 开始专注/番茄钟 (pomo-focus-start)
> `A 2D animation sprite sheet of a cute Hachiware cat (Chiikawa style) putting on headphones, expression changing to serious and focused. The sprite sheet MUST contain exactly 30 frames arranged in a perfectly uniform grid (such as 6 columns and 5 rows). ALL characters must be FULL-BODY, showing the complete legs, paws, and tail in every single frame. Keep a generous safe margin and wide padding around each cat. Do NOT crop or cut off any body parts at the edges of the grid. All frames MUST have the exact same size and perfectly aligned bounding boxes for easy cropping. Flat colors, clean line art, pure bright green background (RGB 0, 255, 0) for chroma keying, no overlapping between frames, game UI asset style, clear sequence.`

### 4. 挫折/打字卡壳 (mood-frustrated)
> `A 2D animation sprite sheet of a cute Hachiware cat (Chiikawa style) showing a frustrated and worried expression. The cat's ears are drooping, body shrinking back, looking anxious. The sprite sheet MUST contain exactly 30 frames arranged in a perfectly uniform grid (such as 6 columns and 5 rows). ALL characters must be FULL-BODY, showing the complete legs, paws, and tail in every single frame. Keep a generous safe margin and wide padding around each cat. Do NOT crop or cut off any body parts at the edges of the grid. All frames MUST have the exact same size and perfectly aligned bounding boxes for easy cropping. Flat colors, clean line art, pure bright green background (RGB 0, 255, 0) for chroma keying, no overlapping between frames, game UI asset style, clear sequence.`

### 5. chat-ai-done
> `A 2D animation sprite sheet of a cute Hachiware cat (Chiikawa style) stopping typing, showing a proud and smug expression, swaying body side to side enthusiastically. The sprite sheet MUST contain exactly 30 frames arranged in a perfectly uniform grid (such as 6 columns and 5 rows). ALL characters must be FULL-BODY, showing the complete legs, paws, and tail in every single frame. Keep a generous safe margin and wide padding around each cat. Do NOT crop or cut off any body parts at the edges of the grid. All frames MUST have the exact same size and perfectly aligned bounding boxes for easy cropping. Flat colors, clean line art, pure bright green background (RGB 0, 255, 0) for chroma keying, no overlapping between frames, game UI asset style, clear sequence.`

### 6. mood-rushing
> `A 2D animation sprite sheet of a cute Hachiware cat (Chiikawa style) showing an alert expression, ears standing straight up, body leaning forward slightly. The sprite sheet MUST contain exactly 30 frames arranged in a perfectly uniform grid (such as 6 columns and 5 rows). ALL characters must be FULL-BODY, showing the complete legs, paws, and tail in every single frame. Keep a generous safe margin and wide padding around each cat. Do NOT crop or cut off any body parts at the edges of the grid. All frames MUST have the exact same size and perfectly aligned bounding boxes for easy cropping. Flat colors, clean line art, pure bright green background (RGB 0, 255, 0) for chroma keying, no overlapping between frames, game UI asset style, clear sequence.`

### 7. greeting-morning
> `A 2D animation sprite sheet of a cute Hachiware cat (Chiikawa style) looking very happy, swaying joyfully, waving one paw to say good morning. The sprite sheet MUST contain exactly 30 frames arranged in a perfectly uniform grid (such as 6 columns and 5 rows). ALL characters must be FULL-BODY, showing the complete legs, paws, and tail in every single frame. Keep a generous safe margin and wide padding around each cat. Do NOT crop or cut off any body parts at the edges of the grid. All frames MUST have the exact same size and perfectly aligned bounding boxes for easy cropping. Flat colors, clean line art, pure bright green background (RGB 0, 255, 0) for chroma keying, no overlapping between frames, game UI asset style, clear sequence.`

### 8. daily-greeting
> `A 2D animation sprite sheet of a cute Hachiware cat (Chiikawa style) jumping up happily and waving both paws to welcome the user. The sprite sheet MUST contain exactly 30 frames arranged in a perfectly uniform grid (such as 6 columns and 5 rows). ALL characters must be FULL-BODY, showing the complete legs, paws, and tail in every single frame. Keep a generous safe margin and wide padding around each cat. Do NOT crop or cut off any body parts at the edges of the grid. All frames MUST have the exact same size and perfectly aligned bounding boxes for easy cropping. Flat colors, clean line art, pure bright green background (RGB 0, 255, 0) for chroma keying, no overlapping between frames, game UI asset style, clear sequence.`

### 9. skill-start-working
> `A 2D animation sprite sheet of a cute Hachiware cat (Chiikawa style) typing very intensely and focused, with a small tool icon floating above its head. The sprite sheet MUST contain exactly 30 frames arranged in a perfectly uniform grid (such as 6 columns and 5 rows). ALL characters must be FULL-BODY, showing the complete legs, paws, and tail in every single frame. Keep a generous safe margin and wide padding around each cat. Do NOT crop or cut off any body parts at the edges of the grid. All frames MUST have the exact same size and perfectly aligned bounding boxes for easy cropping. Flat colors, clean line art, pure bright green background (RGB 0, 255, 0) for chroma keying, no overlapping between frames, game UI asset style, clear sequence.`

### 10. skill-done-proud
> `A 2D animation sprite sheet of a cute Hachiware cat (Chiikawa style) stopping typing, looking extremely proud, raising one paw to make an OK gesture. The sprite sheet MUST contain exactly 30 frames arranged in a perfectly uniform grid (such as 6 columns and 5 rows). ALL characters must be FULL-BODY, showing the complete legs, paws, and tail in every single frame. Keep a generous safe margin and wide padding around each cat. Do NOT crop or cut off any body parts at the edges of the grid. All frames MUST have the exact same size and perfectly aligned bounding boxes for easy cropping. Flat colors, clean line art, pure bright green background (RGB 0, 255, 0) for chroma keying, no overlapping between frames, game UI asset style, clear sequence.`

### 11. pomo-focus-done
> `A 2D animation sprite sheet of a cute Hachiware cat (Chiikawa style) taking off headphones, raising both paws cheering happily, with little star particles popping above its head. The sprite sheet MUST contain exactly 30 frames arranged in a perfectly uniform grid (such as 6 columns and 5 rows). ALL characters must be FULL-BODY, showing the complete legs, paws, and tail in every single frame. Keep a generous safe margin and wide padding around each cat. Do NOT crop or cut off any body parts at the edges of the grid. All frames MUST have the exact same size and perfectly aligned bounding boxes for easy cropping. Flat colors, clean line art, pure bright green background (RGB 0, 255, 0) for chroma keying, no overlapping between frames, game UI asset style, clear sequence.`

### 12. todo-check
> `A 2D animation sprite sheet of a cute Hachiware cat (Chiikawa style) drawing a checkmark in the air with its paw, showing a brief happy smile. The sprite sheet MUST contain exactly 30 frames arranged in a perfectly uniform grid (such as 6 columns and 5 rows). ALL characters must be FULL-BODY, showing the complete legs, paws, and tail in every single frame. Keep a generous safe margin and wide padding around each cat. Do NOT crop or cut off any body parts at the edges of the grid. All frames MUST have the exact same size and perfectly aligned bounding boxes for easy cropping. Flat colors, clean line art, pure bright green background (RGB 0, 255, 0) for chroma keying, no overlapping between frames, game UI asset style, clear sequence.`

### 13. affection-level-up
> `A 2D animation sprite sheet of a cute Hachiware cat (Chiikawa style) glowing briefly, jumping up once happily, with star particles bursting above its head. The sprite sheet MUST contain exactly 30 frames arranged in a perfectly uniform grid (such as 6 columns and 5 rows). ALL characters must be FULL-BODY, showing the complete legs, paws, and tail in every single frame. Keep a generous safe margin and wide padding around each cat. Do NOT crop or cut off any body parts at the edges of the grid. All frames MUST have the exact same size and perfectly aligned bounding boxes for easy cropping. Flat colors, clean line art, pure bright green background (RGB 0, 255, 0) for chroma keying, no overlapping between frames, game UI asset style, clear sequence.`

### 14. phase-afternoon-slump
> `A 2D animation sprite sheet of a cute Hachiware cat (Chiikawa style) looking sleepy, moving slowly with half-closed eyes, yawning slightly. The sprite sheet MUST contain exactly 30 frames arranged in a perfectly uniform grid (such as 6 columns and 5 rows). ALL characters must be FULL-BODY, showing the complete legs, paws, and tail in every single frame. Keep a generous safe margin and wide padding around each cat. Do NOT crop or cut off any body parts at the edges of the grid. All frames MUST have the exact same size and perfectly aligned bounding boxes for easy cropping. Flat colors, clean line art, pure bright green background (RGB 0, 255, 0) for chroma keying, no overlapping between frames, game UI asset style, clear sequence.`

### 15. phase-wrap-up
> `A 2D animation sprite sheet of a cute Hachiware cat (Chiikawa style) looking proud and accomplished, giving a thumbs up with one paw. The sprite sheet MUST contain exactly 30 frames arranged in a perfectly uniform grid (such as 6 columns and 5 rows). ALL characters must be FULL-BODY, showing the complete legs, paws, and tail in every single frame. Keep a generous safe margin and wide padding around each cat. Do NOT crop or cut off any body parts at the edges of the grid. All frames MUST have the exact same size and perfectly aligned bounding boxes for easy cropping. Flat colors, clean line art, pure bright green background (RGB 0, 255, 0) for chroma keying, no overlapping between frames, game UI asset style, clear sequence.`

### 16. phase-overtime-care
> `A 2D animation sprite sheet of a cute Hachiware cat (Chiikawa style) looking extremely tired, moving very slowly, nodding off and falling asleep while sitting. The sprite sheet MUST contain exactly 30 frames arranged in a perfectly uniform grid (such as 6 columns and 5 rows). ALL characters must be FULL-BODY, showing the complete legs, paws, and tail in every single frame. Keep a generous safe margin and wide padding around each cat. Do NOT crop or cut off any body parts at the edges of the grid. All frames MUST have the exact same size and perfectly aligned bounding boxes for easy cropping. Flat colors, clean line art, pure bright green background (RGB 0, 255, 0) for chroma keying, no overlapping between frames, game UI asset style, clear sequence.`

### 17. late-night-sleepy
> `A 2D animation sprite sheet of a cute Hachiware cat (Chiikawa style) in a half-asleep state, head nodding, struggling to keep eyes open. The sprite sheet MUST contain exactly 30 frames arranged in a perfectly uniform grid (such as 6 columns and 5 rows). ALL characters must be FULL-BODY, showing the complete legs, paws, and tail in every single frame. Keep a generous safe margin and wide padding around each cat. Do NOT crop or cut off any body parts at the edges of the grid. All frames MUST have the exact same size and perfectly aligned bounding boxes for easy cropping. Flat colors, clean line art, pure bright green background (RGB 0, 255, 0) for chroma keying, no overlapping between frames, game UI asset style, clear sequence.`

### 18. idle-chat-invite
> `A 2D animation sprite sheet of a cute Hachiware cat (Chiikawa style) gently playing with a ball of yarn in front of it, occasionally looking up. The sprite sheet MUST contain exactly 30 frames arranged in a perfectly uniform grid (such as 6 columns and 5 rows). ALL characters must be FULL-BODY, showing the complete legs, paws, and tail in every single frame. Keep a generous safe margin and wide padding around each cat. Do NOT crop or cut off any body parts at the edges of the grid. All frames MUST have the exact same size and perfectly aligned bounding boxes for easy cropping. Flat colors, clean line art, pure bright green background (RGB 0, 255, 0) for chroma keying, no overlapping between frames, game UI asset style, clear sequence.`

### 19. app-switch-browser
> `A 2D animation sprite sheet of a cute Hachiware cat (Chiikawa style) tilting its head curiously with one ear up and one ear down. The sprite sheet MUST contain exactly 30 frames arranged in a perfectly uniform grid (such as 6 columns and 5 rows). ALL characters must be FULL-BODY, showing the complete legs, paws, and tail in every single frame. Keep a generous safe margin and wide padding around each cat. Do NOT crop or cut off any body parts at the edges of the grid. All frames MUST have the exact same size and perfectly aligned bounding boxes for easy cropping. Flat colors, clean line art, pure bright green background (RGB 0, 255, 0) for chroma keying, no overlapping between frames, game UI asset style, clear sequence.`

### 20. app-switch-ide
> `A 2D animation sprite sheet of a cute Hachiware cat (Chiikawa style) wearing small reading glasses, looking very serious and focused. The sprite sheet MUST contain exactly 30 frames arranged in a perfectly uniform grid (such as 6 columns and 5 rows). ALL characters must be FULL-BODY, showing the complete legs, paws, and tail in every single frame. Keep a generous safe margin and wide padding around each cat. Do NOT crop or cut off any body parts at the edges of the grid. All frames MUST have the exact same size and perfectly aligned bounding boxes for easy cropping. Flat colors, clean line art, pure bright green background (RGB 0, 255, 0) for chroma keying, no overlapping between frames, game UI asset style, clear sequence.`

### 21. app-switch-welcome
> `A 2D animation sprite sheet of a cute Hachiware cat (Chiikawa style) looking up attentively with a happy expression and ears standing up. The sprite sheet MUST contain exactly 30 frames arranged in a perfectly uniform grid (such as 6 columns and 5 rows). ALL characters must be FULL-BODY, showing the complete legs, paws, and tail in every single frame. Keep a generous safe margin and wide padding around each cat. Do NOT crop or cut off any body parts at the edges of the grid. All frames MUST have the exact same size and perfectly aligned bounding boxes for easy cropping. Flat colors, clean line art, pure bright green background (RGB 0, 255, 0) for chroma keying, no overlapping between frames, game UI asset style, clear sequence.`

### 22. skill-convert
> `A 2D animation sprite sheet of a cute Hachiware cat (Chiikawa style) pressing down on a piece of paper with one paw while writing rapidly with the other, then shaking head proudly. The sprite sheet MUST contain exactly 30 frames arranged in a perfectly uniform grid (such as 6 columns and 5 rows). ALL characters must be FULL-BODY, showing the complete legs, paws, and tail in every single frame. Keep a generous safe margin and wide padding around each cat. Do NOT crop or cut off any body parts at the edges of the grid. All frames MUST have the exact same size and perfectly aligned bounding boxes for easy cropping. Flat colors, clean line art, pure bright green background (RGB 0, 255, 0) for chroma keying, no overlapping between frames, game UI asset style, clear sequence.`

### 23. skill-report
> `A 2D animation sprite sheet of a cute Hachiware cat (Chiikawa style) opening a small notebook, writing quickly with a paw, then closing it and nodding. The sprite sheet MUST contain exactly 30 frames arranged in a perfectly uniform grid (such as 6 columns and 5 rows). ALL characters must be FULL-BODY, showing the complete legs, paws, and tail in every single frame. Keep a generous safe margin and wide padding around each cat. Do NOT crop or cut off any body parts at the edges of the grid. All frames MUST have the exact same size and perfectly aligned bounding boxes for easy cropping. Flat colors, clean line art, pure bright green background (RGB 0, 255, 0) for chroma keying, no overlapping between frames, game UI asset style, clear sequence.`

### 24. pomo-focus-ongoing
> `A 2D animation sprite sheet of a cute Hachiware cat (Chiikawa style) typing steadily and calmly, surrounded by a faint blue glowing aura of focus. The sprite sheet MUST contain exactly 30 frames arranged in a perfectly uniform grid (such as 6 columns and 5 rows). ALL characters must be FULL-BODY, showing the complete legs, paws, and tail in every single frame. Keep a generous safe margin and wide padding around each cat. Do NOT crop or cut off any body parts at the edges of the grid. All frames MUST have the exact same size and perfectly aligned bounding boxes for easy cropping. Flat colors, clean line art, pure bright green background (RGB 0, 255, 0) for chroma keying, no overlapping between frames, game UI asset style, clear sequence.`

### 25. pomo-break-start
> `A 2D animation sprite sheet of a cute Hachiware cat (Chiikawa style) stretching its body, taking a big yawn, and comfortably lying down to rest. The sprite sheet MUST contain exactly 30 frames arranged in a perfectly uniform grid (such as 6 columns and 5 rows). ALL characters must be FULL-BODY, showing the complete legs, paws, and tail in every single frame. Keep a generous safe margin and wide padding around each cat. Do NOT crop or cut off any body parts at the edges of the grid. All frames MUST have the exact same size and perfectly aligned bounding boxes for easy cropping. Flat colors, clean line art, pure bright green background (RGB 0, 255, 0) for chroma keying, no overlapping between frames, game UI asset style, clear sequence.`

### 26. pomo-break-end
> `A 2D animation sprite sheet of a cute Hachiware cat (Chiikawa style) springing up from a lying position, shaking its body to wake up, looking energetic. The sprite sheet MUST contain exactly 30 frames arranged in a perfectly uniform grid (such as 6 columns and 5 rows). ALL characters must be FULL-BODY, showing the complete legs, paws, and tail in every single frame. Keep a generous safe margin and wide padding around each cat. Do NOT crop or cut off any body parts at the edges of the grid. All frames MUST have the exact same size and perfectly aligned bounding boxes for easy cropping. Flat colors, clean line art, pure bright green background (RGB 0, 255, 0) for chroma keying, no overlapping between frames, game UI asset style, clear sequence.`

### 27. todo-all-done
> `A 2D animation sprite sheet of a cute Hachiware cat (Chiikawa style) standing up and clapping both paws enthusiastically, with confetti bursting above. The sprite sheet MUST contain exactly 30 frames arranged in a perfectly uniform grid (such as 6 columns and 5 rows). ALL characters must be FULL-BODY, showing the complete legs, paws, and tail in every single frame. Keep a generous safe margin and wide padding around each cat. Do NOT crop or cut off any body parts at the edges of the grid. All frames MUST have the exact same size and perfectly aligned bounding boxes for easy cropping. Flat colors, clean line art, pure bright green background (RGB 0, 255, 0) for chroma keying, no overlapping between frames, game UI asset style, clear sequence.`

### 28. affection-flow-enter
> `A 2D animation sprite sheet of a cute Hachiware cat (Chiikawa style) showing a focused and satisfied expression, surrounded by a subtle golden glowing aura. The sprite sheet MUST contain exactly 30 frames arranged in a perfectly uniform grid (such as 6 columns and 5 rows). ALL characters must be FULL-BODY, showing the complete legs, paws, and tail in every single frame. Keep a generous safe margin and wide padding around each cat. Do NOT crop or cut off any body parts at the edges of the grid. All frames MUST have the exact same size and perfectly aligned bounding boxes for easy cropping. Flat colors, clean line art, pure bright green background (RGB 0, 255, 0) for chroma keying, no overlapping between frames, game UI asset style, clear sequence.`

### 29. affection-flow-exit
> `A 2D animation sprite sheet of a cute Hachiware cat (Chiikawa style) calming down as the golden glowing aura slowly dissipates, returning to a normal happy expression. The sprite sheet MUST contain exactly 30 frames arranged in a perfectly uniform grid (such as 6 columns and 5 rows). ALL characters must be FULL-BODY, showing the complete legs, paws, and tail in every single frame. Keep a generous safe margin and wide padding around each cat. Do NOT crop or cut off any body parts at the edges of the grid. All frames MUST have the exact same size and perfectly aligned bounding boxes for easy cropping. Flat colors, clean line art, pure bright green background (RGB 0, 255, 0) for chroma keying, no overlapping between frames, game UI asset style, clear sequence.`

### 30. affection-mood-happy
> `A 2D animation sprite sheet of a cute Hachiware cat (Chiikawa style) smiling with crescent moon eyes, swaying side to side happily at a fast pace. The sprite sheet MUST contain exactly 30 frames arranged in a perfectly uniform grid (such as 6 columns and 5 rows). ALL characters must be FULL-BODY, showing the complete legs, paws, and tail in every single frame. Keep a generous safe margin and wide padding around each cat. Do NOT crop or cut off any body parts at the edges of the grid. All frames MUST have the exact same size and perfectly aligned bounding boxes for easy cropping. Flat colors, clean line art, pure bright green background (RGB 0, 255, 0) for chroma keying, no overlapping between frames, game UI asset style, clear sequence.`

### 31. surprise-gift
> `A 2D animation sprite sheet of a cute Hachiware cat (Chiikawa style) pulling out a small gift box from behind its back and pushing it forward with both paws. The sprite sheet MUST contain exactly 30 frames arranged in a perfectly uniform grid (such as 6 columns and 5 rows). ALL characters must be FULL-BODY, showing the complete legs, paws, and tail in every single frame. Keep a generous safe margin and wide padding around each cat. Do NOT crop or cut off any body parts at the edges of the grid. All frames MUST have the exact same size and perfectly aligned bounding boxes for easy cropping. Flat colors, clean line art, pure bright green background (RGB 0, 255, 0) for chroma keying, no overlapping between frames, game UI asset style, clear sequence.`

### 32. surprise-nuzzle
> `A 2D animation sprite sheet of a cute Hachiware cat (Chiikawa style) leaning forward and rubbing its cheeks side to side affectionately, with pink blushes on its face. The sprite sheet MUST contain exactly 30 frames arranged in a perfectly uniform grid (such as 6 columns and 5 rows). ALL characters must be FULL-BODY, showing the complete legs, paws, and tail in every single frame. Keep a generous safe margin and wide padding around each cat. Do NOT crop or cut off any body parts at the edges of the grid. All frames MUST have the exact same size and perfectly aligned bounding boxes for easy cropping. Flat colors, clean line art, pure bright green background (RGB 0, 255, 0) for chroma keying, no overlapping between frames, game UI asset style, clear sequence.`

### 33. skill-todo-extract
> `A 2D animation sprite sheet of a cute Hachiware cat (Chiikawa style) reaching up to grab and pull out a list item from the air, placing it to the side. The sprite sheet MUST contain exactly 30 frames arranged in a perfectly uniform grid (such as 6 columns and 5 rows). ALL characters must be FULL-BODY, showing the complete legs, paws, and tail in every single frame. Keep a generous safe margin and wide padding around each cat. Do NOT crop or cut off any body parts at the edges of the grid. All frames MUST have the exact same size and perfectly aligned bounding boxes for easy cropping. Flat colors, clean line art, pure bright green background (RGB 0, 255, 0) for chroma keying, no overlapping between frames, game UI asset style, clear sequence.`

### 34. skill-weekly
> `A 2D animation sprite sheet of a cute Hachiware cat (Chiikawa style) rolling out a long scroll, writing with both paws, then rolling it back up and lifting it high. The sprite sheet MUST contain exactly 30 frames arranged in a perfectly uniform grid (such as 6 columns and 5 rows). ALL characters must be FULL-BODY, showing the complete legs, paws, and tail in every single frame. Keep a generous safe margin and wide padding around each cat. Do NOT crop or cut off any body parts at the edges of the grid. All frames MUST have the exact same size and perfectly aligned bounding boxes for easy cropping. Flat colors, clean line art, pure bright green background (RGB 0, 255, 0) for chroma keying, no overlapping between frames, game UI asset style, clear sequence.`

### 35. pomo-reset
> `A 2D animation sprite sheet of a cute Hachiware cat (Chiikawa style) taking off headphones and putting them aside, shrugging its shoulders, returning to normal. The sprite sheet MUST contain exactly 30 frames arranged in a perfectly uniform grid (such as 6 columns and 5 rows). ALL characters must be FULL-BODY, showing the complete legs, paws, and tail in every single frame. Keep a generous safe margin and wide padding around each cat. Do NOT crop or cut off any body parts at the edges of the grid. All frames MUST have the exact same size and perfectly aligned bounding boxes for easy cropping. Flat colors, clean line art, pure bright green background (RGB 0, 255, 0) for chroma keying, no overlapping between frames, game UI asset style, clear sequence.`

### 36. affection-mood-bored
> `A 2D animation sprite sheet of a cute Hachiware cat (Chiikawa style) with drooping ears and half-closed eyes, moving sluggishly and occasionally sighing. The sprite sheet MUST contain exactly 30 frames arranged in a perfectly uniform grid (such as 6 columns and 5 rows). ALL characters must be FULL-BODY, showing the complete legs, paws, and tail in every single frame. Keep a generous safe margin and wide padding around each cat. Do NOT crop or cut off any body parts at the edges of the grid. All frames MUST have the exact same size and perfectly aligned bounding boxes for easy cropping. Flat colors, clean line art, pure bright green background (RGB 0, 255, 0) for chroma keying, no overlapping between frames, game UI asset style, clear sequence.`

### 37. surprise-trick
> `A 2D animation sprite sheet of a cute Hachiware cat (Chiikawa style) doing a 360-degree backflip in place, landing perfectly and wagging its tail proudly. The sprite sheet MUST contain exactly 30 frames arranged in a perfectly uniform grid (such as 6 columns and 5 rows). ALL characters must be FULL-BODY, showing the complete legs, paws, and tail in every single frame. Keep a generous safe margin and wide padding around each cat. Do NOT crop or cut off any body parts at the edges of the grid. All frames MUST have the exact same size and perfectly aligned bounding boxes for easy cropping. Flat colors, clean line art, pure bright green background (RGB 0, 255, 0) for chroma keying, no overlapping between frames, game UI asset style, clear sequence.`

### 38. surprise-secret
> `A 2D animation sprite sheet of a cute Hachiware cat (Chiikawa style) leaning in close, putting one paw to its mouth in a shushing gesture, looking shy. The sprite sheet MUST contain exactly 30 frames arranged in a perfectly uniform grid (such as 6 columns and 5 rows). ALL characters must be FULL-BODY, showing the complete legs, paws, and tail in every single frame. Keep a generous safe margin and wide padding around each cat. Do NOT crop or cut off any body parts at the edges of the grid. All frames MUST have the exact same size and perfectly aligned bounding boxes for easy cropping. Flat colors, clean line art, pure bright green background (RGB 0, 255, 0) for chroma keying, no overlapping between frames, game UI asset style, clear sequence.`

### 39. surprise-lucky
> `A 2D animation sprite sheet of a cute Hachiware cat (Chiikawa style) looking up as a four-leaf clover floats and sparkles above its head. The sprite sheet MUST contain exactly 30 frames arranged in a perfectly uniform grid (such as 6 columns and 5 rows). ALL characters must be FULL-BODY, showing the complete legs, paws, and tail in every single frame. Keep a generous safe margin and wide padding around each cat. Do NOT crop or cut off any body parts at the edges of the grid. All frames MUST have the exact same size and perfectly aligned bounding boxes for easy cropping. Flat colors, clean line art, pure bright green background (RGB 0, 255, 0) for chroma keying, no overlapping between frames, game UI asset style, clear sequence.`

### 40. gacha-coin-insert
> `A 2D animation sprite sheet of a cute Hachiware cat (Chiikawa style) holding a gold coin with both paws and inserting it into an invisible slot. The sprite sheet MUST contain exactly 30 frames arranged in a perfectly uniform grid (such as 6 columns and 5 rows). ALL characters must be FULL-BODY, showing the complete legs, paws, and tail in every single frame. Keep a generous safe margin and wide padding around each cat. Do NOT crop or cut off any body parts at the edges of the grid. All frames MUST have the exact same size and perfectly aligned bounding boxes for easy cropping. Flat colors, clean line art, pure bright green background (RGB 0, 255, 0) for chroma keying, no overlapping between frames, game UI asset style, clear sequence.`

### 41. gacha-spinning
> `A 2D animation sprite sheet of a cute Hachiware cat (Chiikawa style) staring nervously, holding both paws in fists near its chest, shivering slightly in anticipation. The sprite sheet MUST contain exactly 30 frames arranged in a perfectly uniform grid (such as 6 columns and 5 rows). ALL characters must be FULL-BODY, showing the complete legs, paws, and tail in every single frame. Keep a generous safe margin and wide padding around each cat. Do NOT crop or cut off any body parts at the edges of the grid. All frames MUST have the exact same size and perfectly aligned bounding boxes for easy cropping. Flat colors, clean line art, pure bright green background (RGB 0, 255, 0) for chroma keying, no overlapping between frames, game UI asset style, clear sequence.`

### 42. gacha-result-normal
> `A 2D animation sprite sheet of a cute Hachiware cat (Chiikawa style) catching a gacha capsule, opening it, and nodding with a neutral expression. The sprite sheet MUST contain exactly 30 frames arranged in a perfectly uniform grid (such as 6 columns and 5 rows). ALL characters must be FULL-BODY, showing the complete legs, paws, and tail in every single frame. Keep a generous safe margin and wide padding around each cat. Do NOT crop or cut off any body parts at the edges of the grid. All frames MUST have the exact same size and perfectly aligned bounding boxes for easy cropping. Flat colors, clean line art, pure bright green background (RGB 0, 255, 0) for chroma keying, no overlapping between frames, game UI asset style, clear sequence.`

### 43. gacha-result-sr
> `A 2D animation sprite sheet of a cute Hachiware cat (Chiikawa style) catching a gacha capsule, opening it, and looking surprised as little stars fly out. The sprite sheet MUST contain exactly 30 frames arranged in a perfectly uniform grid (such as 6 columns and 5 rows). ALL characters must be FULL-BODY, showing the complete legs, paws, and tail in every single frame. Keep a generous safe margin and wide padding around each cat. Do NOT crop or cut off any body parts at the edges of the grid. All frames MUST have the exact same size and perfectly aligned bounding boxes for easy cropping. Flat colors, clean line art, pure bright green background (RGB 0, 255, 0) for chroma keying, no overlapping between frames, game UI asset style, clear sequence.`

### 44. gacha-result-ssr
> `A 2D animation sprite sheet of a cute Hachiware cat (Chiikawa style) jumping excitedly in a brief golden glow as massive star and confetti particles explode. The sprite sheet MUST contain exactly 30 frames arranged in a perfectly uniform grid (such as 6 columns and 5 rows). ALL characters must be FULL-BODY, showing the complete legs, paws, and tail in every single frame. Keep a generous safe margin and wide padding around each cat. Do NOT crop or cut off any body parts at the edges of the grid. All frames MUST have the exact same size and perfectly aligned bounding boxes for easy cropping. Flat colors, clean line art, pure bright green background (RGB 0, 255, 0) for chroma keying, no overlapping between frames, game UI asset style, clear sequence.`

### 45. gacha-result-sssr
> `A 2D animation sprite sheet of a cute Hachiware cat (Chiikawa style) spinning around wildly in excitement, glowing in rainbow colors with fireworks lasting for seconds. The sprite sheet MUST contain exactly 30 frames arranged in a perfectly uniform grid (such as 6 columns and 5 rows). ALL characters must be FULL-BODY, showing the complete legs, paws, and tail in every single frame. Keep a generous safe margin and wide padding around each cat. Do NOT crop or cut off any body parts at the edges of the grid. All frames MUST have the exact same size and perfectly aligned bounding boxes for easy cropping. Flat colors, clean line art, pure bright green background (RGB 0, 255, 0) for chroma keying, no overlapping between frames, game UI asset style, clear sequence.`

### 46. gacha-multi-peek
> `A 2D animation sprite sheet of a cute Hachiware cat (Chiikawa style) covering its eyes nervously, peeking through its fingers, then suddenly opening its eyes wide. The sprite sheet MUST contain exactly 30 frames arranged in a perfectly uniform grid (such as 6 columns and 5 rows). ALL characters must be FULL-BODY, showing the complete legs, paws, and tail in every single frame. Keep a generous safe margin and wide padding around each cat. Do NOT crop or cut off any body parts at the edges of the grid. All frames MUST have the exact same size and perfectly aligned bounding boxes for easy cropping. Flat colors, clean line art, pure bright green background (RGB 0, 255, 0) for chroma keying, no overlapping between frames, game UI asset style, clear sequence.`

### 47. accessory-equip
> `A 2D animation sprite sheet of a cute Hachiware cat (Chiikawa style) turning its head side to side to check itself in a mirror as a new accessory sparkles on it. The sprite sheet MUST contain exactly 30 frames arranged in a perfectly uniform grid (such as 6 columns and 5 rows). ALL characters must be FULL-BODY, showing the complete legs, paws, and tail in every single frame. Keep a generous safe margin and wide padding around each cat. Do NOT crop or cut off any body parts at the edges of the grid. All frames MUST have the exact same size and perfectly aligned bounding boxes for easy cropping. Flat colors, clean line art, pure bright green background (RGB 0, 255, 0) for chroma keying, no overlapping between frames, game UI asset style, clear sequence.`

### 48. recorder-live
> `A 2D animation sprite sheet of a cute Hachiware cat (Chiikawa style) tilting its head occasionally to glance sideways as if looking at a preview screen. The sprite sheet MUST contain exactly 30 frames arranged in a perfectly uniform grid (such as 6 columns and 5 rows). ALL characters must be FULL-BODY, showing the complete legs, paws, and tail in every single frame. Keep a generous safe margin and wide padding around each cat. Do NOT crop or cut off any body parts at the edges of the grid. All frames MUST have the exact same size and perfectly aligned bounding boxes for easy cropping. Flat colors, clean line art, pure bright green background (RGB 0, 255, 0) for chroma keying, no overlapping between frames, game UI asset style, clear sequence.`

### 49. skin-change
> `A 2D animation sprite sheet of a cute Hachiware cat (Chiikawa style) being covered in a puff of smoke and sparkles, emerging looking refreshed. The sprite sheet MUST contain exactly 30 frames arranged in a perfectly uniform grid (such as 6 columns and 5 rows). ALL characters must be FULL-BODY, showing the complete legs, paws, and tail in every single frame. Keep a generous safe margin and wide padding around each cat. Do NOT crop or cut off any body parts at the edges of the grid. All frames MUST have the exact same size and perfectly aligned bounding boxes for easy cropping. Flat colors, clean line art, pure bright green background (RGB 0, 255, 0) for chroma keying, no overlapping between frames, game UI asset style, clear sequence.`

### 50. relationship-deepen
> `A 2D animation sprite sheet of a cute Hachiware cat (Chiikawa style) slowly stepping closer to the screen with a very gentle and affectionate expression. The sprite sheet MUST contain exactly 30 frames arranged in a perfectly uniform grid (such as 6 columns and 5 rows). ALL characters must be FULL-BODY, showing the complete legs, paws, and tail in every single frame. Keep a generous safe margin and wide padding around each cat. Do NOT crop or cut off any body parts at the edges of the grid. All frames MUST have the exact same size and perfectly aligned bounding boxes for easy cropping. Flat colors, clean line art, pure bright green background (RGB 0, 255, 0) for chroma keying, no overlapping between frames, game UI asset style, clear sequence.`

### 51. affection-rebirth
> `A 2D animation sprite sheet of a cute Hachiware cat (Chiikawa style) wrapped in golden light, shrinking into an orb, then bursting out energetically with star dust scattering. The sprite sheet MUST contain exactly 30 frames arranged in a perfectly uniform grid (such as 6 columns and 5 rows). ALL characters must be FULL-BODY, showing the complete legs, paws, and tail in every single frame. Keep a generous safe margin and wide padding around each cat. Do NOT crop or cut off any body parts at the edges of the grid. All frames MUST have the exact same size and perfectly aligned bounding boxes for easy cropping. Flat colors, clean line art, pure bright green background (RGB 0, 255, 0) for chroma keying, no overlapping between frames, game UI asset style, clear sequence.`

### 52. accessory-unequip
> `A 2D animation sprite sheet of a cute Hachiware cat (Chiikawa style) shaking its body vigorously to take off an accessory. The sprite sheet MUST contain exactly 30 frames arranged in a perfectly uniform grid (such as 6 columns and 5 rows). ALL characters must be FULL-BODY, showing the complete legs, paws, and tail in every single frame. Keep a generous safe margin and wide padding around each cat. Do NOT crop or cut off any body parts at the edges of the grid. All frames MUST have the exact same size and perfectly aligned bounding boxes for easy cropping. Flat colors, clean line art, pure bright green background (RGB 0, 255, 0) for chroma keying, no overlapping between frames, game UI asset style, clear sequence.`

### 53. mp-rank-up
> `A 2D animation sprite sheet of a cute Hachiware cat (Chiikawa style) doing a happy little hop to celebrate a rank up. The sprite sheet MUST contain exactly 30 frames arranged in a perfectly uniform grid (such as 6 columns and 5 rows). ALL characters must be FULL-BODY, showing the complete legs, paws, and tail in every single frame. Keep a generous safe margin and wide padding around each cat. Do NOT crop or cut off any body parts at the edges of the grid. All frames MUST have the exact same size and perfectly aligned bounding boxes for easy cropping. Flat colors, clean line art, pure bright green background (RGB 0, 255, 0) for chroma keying, no overlapping between frames, game UI asset style, clear sequence.`

### 54. mp-rank-down
> `A 2D animation sprite sheet of a cute Hachiware cat (Chiikawa style) shrugging its shoulders and sighing in disappointment. The sprite sheet MUST contain exactly 30 frames arranged in a perfectly uniform grid (such as 6 columns and 5 rows). ALL characters must be FULL-BODY, showing the complete legs, paws, and tail in every single frame. Keep a generous safe margin and wide padding around each cat. Do NOT crop or cut off any body parts at the edges of the grid. All frames MUST have the exact same size and perfectly aligned bounding boxes for easy cropping. Flat colors, clean line art, pure bright green background (RGB 0, 255, 0) for chroma keying, no overlapping between frames, game UI asset style, clear sequence.`

### 55. consent-granted
> `A 2D animation sprite sheet of a cute Hachiware cat (Chiikawa style) nodding politely to show gratitude and agreement. The sprite sheet MUST contain exactly 30 frames arranged in a perfectly uniform grid (such as 6 columns and 5 rows). ALL characters must be FULL-BODY, showing the complete legs, paws, and tail in every single frame. Keep a generous safe margin and wide padding around each cat. Do NOT crop or cut off any body parts at the edges of the grid. All frames MUST have the exact same size and perfectly aligned bounding boxes for easy cropping. Flat colors, clean line art, pure bright green background (RGB 0, 255, 0) for chroma keying, no overlapping between frames, game UI asset style, clear sequence.`

### 56. consent-denied
> `A 2D animation sprite sheet of a cute Hachiware cat (Chiikawa style) bowing its head slightly to show understanding. The sprite sheet MUST contain exactly 30 frames arranged in a perfectly uniform grid (such as 6 columns and 5 rows). ALL characters must be FULL-BODY, showing the complete legs, paws, and tail in every single frame. Keep a generous safe margin and wide padding around each cat. Do NOT crop or cut off any body parts at the edges of the grid. All frames MUST have the exact same size and perfectly aligned bounding boxes for easy cropping. Flat colors, clean line art, pure bright green background (RGB 0, 255, 0) for chroma keying, no overlapping between frames, game UI asset style, clear sequence.`

