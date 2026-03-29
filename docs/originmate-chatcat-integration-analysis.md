# OriginMate × ChatCat 产品文档整合分析

> **日期**: 2026-03-24  
> **背景**: 将 OriginMate PRD v1.0 (作者：思敏) 与 ChatCat 现有文档体系进行交叉对比，识别可吸收模块、冲突点与整合建议。  
> **结论先行**: OriginMate PRD 中约 **70% 的功能设计** 在 ChatCat 中已有对应实现或规划，但 OriginMate 在 **轻社交（串门机制）、Agent 提示词工程、邮箱集成、兜底策略、埋点体系** 五个方面贡献了高价值增量设计，建议直接吸收。

---

## 一、功能对照矩阵

### 1.1 ChatCat 已有 vs OriginMate 新增 vs 重叠

| 功能领域 | ChatCat 现状 | OriginMate 设计 | 对照结论 |
|---------|-------------|----------------|---------|
| **桌宠渲染** | Pixel/SpriteSheet/Live2D 三种类型，Canvas 渲染，29种皮肤 | Live2D 单一方案，120×120px 默认 | ✅ **ChatCat 已超越**。ChatCat 三种渲染管线更灵活 |
| **拖拽交互** | 已实现拖拽定位 | 拖拽+被拎起动画+边界吸附+位置记忆 | ⚠️ **OriginMate 更细致**。被拎起动画、边界吸附可借鉴 |
| **随机微动作** | 已有 idle 动画状态机(idle/blink/typing/click/happy/sleep/wake-up)，惊喜事件 | 7种微动作池(追光标/伸懒腰/打哈欠/张望/坐下/写字/喝咖啡)，30-120s随机 | ⚠️ **可互补**。OriginMate 的微动作池设计更具体 |
| **AI 对话** | 流式对话，多模型预设，漫画气泡 UI | 点击/快捷键/主动发起三入口，280×400px面板 | ✅ **ChatCat 已有**。入口设计一致 |
| **性格系统** | 4种模板(活泼/高冷/软萌/学者) | 4种模板(元气/佛系/毒舌/温柔) + **性格演化机制** | ⚠️ **OriginMate 更深入**。性格演化是高价值增量 |
| **长期记忆** | 自动提取用户信息，上限30条 | 三类记忆(事实/情境/情感)，SQLite本地，1000条上限，语义召回 | 🔴 **OriginMate 明显更强**。记忆分类+语义召回+时间衰减淘汰值得吸收 |
| **状态感知** | SignalCollector(键鼠频率+节奏+剪贴板)，节奏分析器(7种状态) | 每30s采集，4状态(focused/idle/sleeping/dialogue) | ✅ **ChatCat 已超越**。ChatCat 信号维度更丰富(含删除率/鼠标/工作阶段) |
| **主动交互** | ProactiveEngine + 36个场景 + L0-L3四级通知 + TimingJudge | 6种触发条件，每小时≤2次频率保护 | ✅ **ChatCat 已超越**。36场景 vs 6条规则 |
| **智能提醒/待办** | AI自然语言创建待办 + 到期提醒 + /todo命令 | 自然语言创建 + DDL追踪(按天数分级催促) + 待办上限50条 | ⚠️ **OriginMate 更细致**。DDL分级催促逻辑(>3天/2-3天/1天/当天/过期)是好设计 |
| **日历连接** | 已有 calendar-aware 场景(节日/季节/生日感知) | Google/Outlook OAuth2.0授权 + 早报+会议提醒+空档识别 | 🔴 **OriginMate 新增**。ChatCat 目前仅做日历感知，未接入真实日历数据 |
| **邮箱监控** | ❌ 无 | 静默监控+紧急度分级+VIP联系人+邮件→待办 | 🔴 **OriginMate 纯新增**。P1优先级 |
| **轻社交** | LAN WebSocket联机 + 排行榜 + 迷你猫渲染 | 好友系统(邀请码)+在线状态感知+桌宠串门+串门礼物+共办公小房间 | 🔴 **OriginMate 设计更完整**。串门机制和在线状态是核心差异 |
| **好感度/养成** | 按键+1亲密度，心流×2，转生系统，商店17件道具 | ❌ 无养成数值系统 | ✅ **ChatCat 独有**。OriginMate 明确说"不做需要投入精力的养成" |
| **番茄钟** | 标准番茄钟+专注陪伴动画+统计面板 | ❌ 无 | ✅ **ChatCat 独有** |
| **Quick Panel** | 截图OCR + 文本润色/解释/总结 + 全局快捷键 | 剪贴板感知(复制英文→翻译，长文→总结) P1 | ✅ **ChatCat 已超越**。Quick Panel 更完整 |
| **打字数据Skill** | 文本转换+日报生成+待办识别，SkillScheduler调度 | 早报晚报(P1) | ✅ **ChatCat 已有更完整的Skill体系** |
| **SKILL.md Agent系统** | 完整框架(Registry/Engine/Router/LocalHandlers) | ❌ 无对应概念 | ✅ **ChatCat 独有** |
| **成就/徽章** | 里程碑庆祝(连续登录/打字/转生) | 社畜徽章(P1) + 桌面截图分享(P1) | ⚠️ **可互补**。OriginMate 的徽章设计更社交化(可分享) |
| **皮肤商城** | 29种皮肤(内置) | 免费+付费皮肤+限时活动(P2) | ⚠️ **OriginMate 更商业化** |
| **剪贴板** | 剪贴板内容捕获+智能分类+重复检测 | 剪贴板感知(P1) 英文翻译/长文总结 | ✅ **ChatCat 已有** |
| **Agent架构** | AI Runtime 三阶段(Scene→Prompt→Context + AIRuntime + TriggerBus) | 四层架构(感知层→调度层→记忆层→任务层)，7个Agent | ⚠️ **互补**。两套架构思路不同但可融合 |
| **兜底策略** | TimingJudge禁止打扰规则 | 10种兜底场景(意图失败/LLM超时/持续不可用/日历失败/记忆损坏/崩溃恢复等) | 🔴 **OriginMate 大幅领先**。兜底策略体系化程度很高 |
| **埋点设计** | 主动推送触达率/点击率等指标 | 13+7个埋点事件 + 关键漏斗看板 | 🔴 **OriginMate 大幅领先**。系统化的埋点方案 |
| **隐私安全** | 三级隐私分级(零风险/用户主动/需授权) | 键鼠仅采集频率+本地存储加密+OAuth2.0+HTTPS | ✅ **两者一致**。理念相同 |
| **用户引导** | 渐进引导 Day 1-3(闲聊收集画像) | 引导流程(选外观→取名→选性格→引导任务4步) | ⚠️ **设计理念不同**。ChatCat 伪装闲聊更自然；OriginMate 更结构化 |

### 1.2 统计汇总

| 对照结论 | 数量 | 说明 |
|---------|------|------|
| ✅ ChatCat 已有/已超越 | 12 | 无需额外动作 |
| ⚠️ 可互补/OriginMate更细致 | 8 | 建议吸收 OriginMate 的具体设计 |
| 🔴 OriginMate 纯新增/大幅领先 | 5 | **高价值增量，优先吸收** |

---

## 二、高价值增量：建议直接吸收

### 2.1 🔴 轻社交系统（串门机制 + 在线状态感知）

**OriginMate 贡献**: 完整的轻社交设计，包括：
- **好友系统**: 邀请码添加，20人上限
- **在线状态**: 5种状态映射(奋笔疾书/摸鱼/忙碌/离开/已下线)，带颜色圆点
- **串门机制**: 好友桌宠自动来访1-3次/天，携带小礼物/纸条，专注时静默来访
- **隐私控制**: 隐身模式

**ChatCat 现状**: 仅有 LAN WebSocket 联机 + 排行榜 + 迷你猫渲染，本质是"共处一室"的在线展示，缺少"异步轻互动"。

**整合建议**:  
ChatCat V3 路线图中已规划"猫咪互访"(P2)，OriginMate 的串门设计可直接作为实现方案。具体：
1. 将 ChatCat 现有 WebSocket 联机协议扩展，增加 `visit_request` / `visit_event` 消息类型
2. 在线状态可复用 ChatCat 节奏分析器的 7 种状态，映射为面向好友的 5 种可读标签
3. 串门的"专注保护"逻辑直接复用 TimingJudge 的禁止打扰规则
4. 好友上限从联机模式区分：LAN 无限制，云端好友 MVP 20人

**优先级**: **P1**（产品定义稿中社交优先级为"可晒→可陪"，串门属于"可陪"阶段）

---

### 2.2 🔴 兜底策略体系

**OriginMate 贡献**: 10 种具体兜底场景 + 桌宠人格化兜底话术，如：
- LLM 超时："啊...我刚走神了，你再说一遍？"
- LLM 持续不可用：切换离线模式，保留本地功能
- 记忆库损坏："我好像忘了些事情...不好意思，能再告诉我你的名字吗？"
- 客户端崩溃：静默重启 + "抖一抖"复活动画

**ChatCat 现状**: TimingJudge 有禁止打扰规则，但缺少系统化的异常兜底设计。AI 链路失败时无优雅降级策略。

**整合建议**:  
1. 在 AI Runtime 执行层增加 `FallbackHandler`，对接 OriginMate 的 10 种兜底场景
2. 兜底话术按 ChatCat 的 4 种性格模板分别撰写（活泼猫/高冷猫/温柔猫/学者猫各一套）
3. 崩溃恢复逻辑 Electron 层已有 `app.on('will-quit')` 机制，补充桌宠复活动画即可

**优先级**: **P0**（稳定性直接影响留存，应尽快补齐）

---

### 2.3 🔴 系统化埋点设计

**OriginMate 贡献**: 
- 13 个 P0 核心埋点(app_launch → dialogue → reminder/todo → social → proactive)
- 7 个 P1 追加埋点(email/clipboard/achievement/screenshot)
- 关键漏斗定义：安装→引导完成→首次对话→首次创建提醒→连接日历→添加好友→7日回访
- 各节点目标转化率(引导≥85%, 对话≥90%, 日历≥40%, 好友≥30%)

**ChatCat 现状**: 有成功指标定义(留存/日均消息/使用率)，但缺少完整的前端埋点方案和漏斗看板。

**整合建议**:  
直接采用 OriginMate 的埋点 ID 体系(E001-E107)，适配 ChatCat 的功能命名：
1. E003 `dialogue_start` 的 `trigger_source` 扩展为 ChatCat 的入口(click/hotkey/proactive/skill/quick_panel)
2. 新增 ChatCat 独有埋点：`E200 skill_executed`、`E201 quick_panel_used`、`E202 pomodoro_completed`、`E203 prestige_triggered`
3. 漏斗起点改为 ChatCat 的核心路径：安装→首次打字→首次聊天→首次Skill→7日回访

**优先级**: **P0**（没有数据就没有迭代依据）

---

### 2.4 🔴 Agent 提示词工程（7 个 Agent 完整设计）

**OriginMate 贡献**: 7 个 Agent 的完整提示词设计，每个包含：
- Role（角色定义）
- Inputs（输入参数 JSON Schema）
- Action Path（行动路径步骤）
- Tool Use Rules（工具调用规范表）
- Output Specifications（输出 JSON 格式）
- Constraints（强约束条件）

重点 Agent：
- **对话主控 Agent**: 意图分类(10种) + 情感标签 + 性格语气约束 + 回复≤80字
- **记忆管理 Agent**: 三类记忆写入 + 语义向量召回 + 去重 + 时间衰减
- **状态感知 Agent**: 信号→状态映射规则 + 好友状态标签生成
- **提醒待办 Agent**: 自然语言时间提取 + DDL 分级催促 + 确认机制
- **日历 Agent**: 早报/会议提醒/晚报/空档识别 四种触发模式
- **邮件处理 Agent**: 紧急度打分规则 + 静默监控 + DDL 提取

**ChatCat 现状**: AI Runtime 三阶段架构(Scene→Prompt→Context)已经成熟，但 prompt 以 SKILL.md + personality.js 分散管理，缺少 OriginMate 这样结构化的 Agent 提示词工程。

**整合建议**:  
不替换 ChatCat 的 AI Runtime 架构，而是将 OriginMate 的 Agent 设计作为 **Scene 定义的标准模板**：
1. 每个 OriginMate Agent 对应 ChatCat 的一个 Scene 或 Scene Group
2. Agent 的 Inputs/Outputs JSON Schema 直接映射为 ChatCat Scene 的 `contextConfig` 和 `postProcess`
3. Agent 的 Constraints 写入对应 Scene 的 system prompt 尾部
4. 优先迁移：记忆管理 Agent（补强 ChatCat 记忆系统）和 提醒待办 Agent（补强 DDL 催促）

**优先级**: **P1**（架构已有，这是填充优质 prompt 内容）

---

### 2.5 🔴 日历/邮箱真实接入

**OriginMate 贡献**:
- **日历**: Google/Outlook OAuth2.0 授权，5分钟增量同步，早报/会议提醒/空档识别/晚报
- **邮箱**: 静默监控(每5min)，VIP 联系人高紧急立即提醒，中低紧急 idle 时汇报，DDL 提取→待办

**ChatCat 现状**: 仅有 calendar-aware 场景(通过时间/日期判断节日季节)，未接入真实日历 API。V3 路线图中"日历/邮件感知"列为 P2。

**整合建议**:  
1. 日历集成提升至 **P1**（OriginMate 数据表明日历连接率目标 ≥40%，说明用户需求强烈）
2. 技术方案：使用 Electron 的 `net` 模块 + OAuth2.0 PKCE flow 对接 Google Calendar API
3. 邮箱集成保持 **P1**（仅 IMAP 只读接入，符合 ChatCat "建议+确认" 原则）
4. 两项接入均走 ChatCat 的 AI Runtime → 对应新增 `calendar-sync` 和 `email-monitor` Scene

**优先级**: 日历 **P1**，邮箱 **P1**

---

## 三、可互补设计：建议融合

### 3.1 性格演化机制

**OriginMate 设计**: 性格随用户行为缓慢漂移，每周统计一次，5种行为→5种漂移方向。

**ChatCat 可融合方式**: 
- 在现有 4 种性格模板(活泼/高冷/软萌/学者)基础上，增加 `personalityDrift` 浮点参数
- 漂移维度：`care`(关心程度) / `humor`(幽默感) / `initiative`(主动性)
- 数据源：复用 `behaviorModel` 中已有的统计数据(avgTypingSpeed/dailyActivePattern/pushResponseRate)
- 漂移速度：与 OriginMate 一致，每周微调一次，用户无感知

### 3.2 记忆系统增强

**OriginMate 设计**: 三类记忆(事实/情境/情感)，语义向量召回 Top20，1000条上限，时间衰减淘汰。

**ChatCat 可融合方式**:
- ChatCat 当前记忆上限 30 条，可提升到 200 条（本地 SQLite 迁移，不再用 electron-store）
- 增加记忆分类标签：`fact` / `context` / `emotion`
- 召回从简单文本匹配升级为 embedding 向量相似度（可用本地 MiniLM 模型）
- 增加 OriginMate 的"用户可查看/删除记忆"功能（目前 ChatCat 无此入口）

### 3.3 DDL 分级催促

**OriginMate 设计**: 按距 DDL 天数分 5 级催促(>3天不提/2-3天日报提/1天专项提醒/当天紧急/过期温和催)。

**ChatCat 可融合方式**:
- 在现有 TODO 系统的 `deadline` 字段基础上，增加 `urgencyLevel` 计算
- 催促逻辑接入 ProactiveEngine 的 `time-trigger` 信号
- 催促话术按性格分化（参考 OriginMate 的四种性格语气模板）

### 3.4 引导流程互补

**OriginMate 设计**: 结构化 4 步引导(选外观→取名→选性格→任务引导)。

**ChatCat 现有**: Day 1-3 伪装闲聊渐进收集画像。

**融合建议**: 保持 ChatCat 的闲聊式引导（更自然），但吸收 OriginMate 的"选性格"步骤——在 Day 1 闲聊中自然嵌入性格选择："你希望我是什么样的呢？活泼一点还是安静一点？"

---

## 四、需要取舍的冲突点

### 4.1 北极星指标

| | ChatCat | OriginMate |
|---|---------|-----------|
| **北极星** | WAU-Resident（周活跃常驻用户数） | 日均桌宠在线时长（≥4h） |
| **侧重** | 用户粘性广度 | 单用户深度 |

**建议**: 采用 ChatCat 的 WAU-Resident 作为主指标，日均在线时长作为辅助观测指标。理由：
1. WAU 更能反映产品的用户基盘健康度
2. "日均在线时长≥4h" 对桌面应用来说门槛过高（用户可能频繁重启/锁屏），实操中数据噪声大
3. 两个指标正相关，优先追 WAU 不会牺牲在线时长

### 4.2 养成 vs 无养成

| | ChatCat | OriginMate |
|---|---------|-----------|
| **设计** | 深度数值养成(按键+1，转生，商店，道具倍率) | 明确不做养成("照顾宠物反而耽误工作") |

**建议**: 保持 ChatCat 的养成系统。理由：
1. 这是 ChatCat 相对所有竞品的独特差异化（增量游戏 + 桌宠）
2. ChatCat 的养成设计已规避了 Weyrdlets 的问题（不设饥饿/清洁等负担指标，只有正向收益）
3. 养成系统是"玩家乐趣线"的核心驱动力

### 4.3 渲染技术路线

| | ChatCat | OriginMate |
|---|---------|-----------|
| **方案** | Pixel + SpriteSheet + Live2D 三种 | 纯 Live2D |

**建议**: 保持 ChatCat 的三管线方案。理由：
1. Pixel/SpriteSheet 是 BongoCat 原生风格的延续，社区认知度高
2. Live2D 作为高端角色选项保留
3. 三管线更有利于 UGC 生态（SpriteSheet 创作门槛远低于 Live2D）

### 4.4 Agent 架构

| | ChatCat | OriginMate |
|---|---------|-----------|
| **架构** | AI Runtime 三阶段(Scene→Prompt→Context) + TriggerBus | 四层架构(感知层→调度层→记忆层→任务层) |
| **优势** | 已有代码实现，配置化驱动 | 职责分离更清晰，提示词设计更规范 |

**建议**: 保持 ChatCat 的 AI Runtime 架构作为执行基座，将 OriginMate 的四层模型作为 **逻辑概念分层**（不改代码架构，改文档描述）：
- OriginMate 感知层 = ChatCat 的 `SignalCollector` + `TriggerBus`
- OriginMate 调度层 = ChatCat 的 `AIRuntime` + `SceneRouter`
- OriginMate 记忆层 = ChatCat 的 `MemoryManager`（需增强）
- OriginMate 任务层 = ChatCat 的各 `Scene` + `SkillEngine`

### 4.5 社交定位

| | ChatCat | OriginMate |
|---|---------|-----------|
| **现状** | LAN 联机 + 排行榜（偏"同屏共处"） | 好友+在线状态+串门+共办公（偏"异步轻社交"） |

**建议**: 社交路线从 ChatCat 的"同屏共处"逐步升级为 OriginMate 的"异步轻社交"：
1. **Phase 1**: 保持现有 LAN 联机，增加在线状态标签（可晒）
2. **Phase 2**: 增加云端好友系统 + 串门机制（可陪）
3. **Phase 3**: 共办公小房间 + UGC 分享（可创）

---

## 五、整合后的统一路线图增量

基于以上分析，对 ChatCat 现有路线图的增量建议：

### V2.5 新增（2-3周）

| 来源 | 功能 | 优先级 | 说明 |
|------|------|--------|------|
| OriginMate | 兜底策略体系 | P0 | 10种异常场景 + 4性格×10场景兜底话术 |
| OriginMate | 前端埋点方案 | P0 | E001-E013 核心埋点 + 关键漏斗看板 |
| OriginMate | DDL 分级催促 | P0 | 待办系统增强，5级催促逻辑 |
| OriginMate | 记忆系统增强 | P1 | 三类记忆分类 + 用户可查看/删除 |

### V3.0 新增（4-6周）

| 来源 | 功能 | 优先级 | 说明 |
|------|------|--------|------|
| OriginMate | 性格演化 | P1 | 3维漂移参数，每周微调 |
| OriginMate | Agent 提示词迁移 | P1 | 记忆Agent + 待办Agent 的结构化prompt |
| OriginMate | 在线状态标签 | P1 | 节奏分析器→5种可读状态映射 |
| OriginMate | 日历真实接入 | P1 | Google Calendar OAuth2.0 + 早报/会议提醒 |

### V3.5 新增（4-6周）

| 来源 | 功能 | 优先级 | 说明 |
|------|------|--------|------|
| OriginMate | 串门机制 | P1 | 基于云端好友系统，1-3次/天异步来访 |
| OriginMate | 邮箱静默监控 | P1 | IMAP 只读 + 紧急度分级 + VIP |
| OriginMate | 共办公小房间 | P2 | 3-5人桌宠同场景 |
| OriginMate | P1 追加埋点 | P2 | E101-E107 |

---

## 六、OriginMate PRD 文档本身的归档建议

OriginMate PRD 作为独立产品文档，其价值已在本文档中被结构化提取。建议：

1. **归档位置**: `docs/references/v1.0-PRD-OriginMate.md`（作为参考文档保留）
2. **不建议直接替换** ChatCat 现有 PRD——因为 ChatCat PRD 包含已实现功能的详细技术描述，而 OriginMate PRD 是全新产品的 MVP 设计
3. **后续维护**: 本整合分析文档作为两份 PRD 的桥接文档，增量功能在 ChatCat PRD 的对应章节中补充

---

## 附录：OriginMate 竞品分析数据可直接引用

OriginMate PRD 中的竞品分析包含有价值的市场数据：
- BongoCat Steam 同时在线峰值超百万
- 逗逗 AI 累计用户破 900 万
- On-Together 上线首月即成为 Steam 热销榜常客
- 50% 远程工作者反馈孤独感是核心困扰

这些数据可更新到 ChatCat 的 v3-feature-review-and-roadmap.md 竞品调研章节。
