# 设计：多人联机房间系统

由 /office-hours 生成于 2026-04-05
分支：main
仓库：suud003/ChatCat
状态：APPROVED
模式：Builder (bonus 功能)

## 问题陈述

ChatCat 已有基础联机功能（WebSocket 服务器/客户端、打字动画同步、多猫渲染），但采用单大厅模型 — 所有连接到同一服务器的用户都互相可见，无法创建私密房间只与特定好友一起玩。需要叠加一层房间管理层，支持创建房间、房间码邀请、房间隔离。

## 为什么这很酷

"群猫乱舞" — 多只猫在桌面上同时敲键盘，实时反映每位玩家的打字节奏。这是同事在看完 KM 文章后主动提出的愿望，属于视觉冲击力强、社交传播性高的 bonus 功能。

## 现有代码分析

### 已实现（可直接复用）

| 模块 | 文件 | 说明 |
|------|------|------|
| WebSocket 服务器 | `embedded-server.js` | 嵌入式 LAN 服务器，端口 9527 |
| 服务端逻辑 | `server-core.js` | 认证、状态同步、动作广播 |
| 通信协议 | `protocol.js` | JSON 消息协议，C2S 5 种 + S2C 7 种 |
| 客户端连接 | `mp-client.js` | 自动重连、心跳、状态节流 |
| 多猫渲染 | `mini-cat-renderer.js` | 皮肤同步、打字动画、拖拽定位，最多 10 只 |
| 连接 UI | `connection-ui.js` | 登录/连接/服务器管理 |
| 排行榜 | `leaderboard-ui.js` | 三种排序 |
| 输入追踪 | `input/tracker.js` | 全局键鼠事件 → 动画 + 多人广播 |
| 角色渲染 | `pet/pixel-character.js` | 30+ 皮肤，打字/点击/空闲动画 |

### 需新增

| 模块 | 说明 |
|------|------|
| 房间管理 | RoomManager — 创建/加入/离开/销毁房间 |
| 房间协议 | 4-5 个新消息类型 |
| 房间 UI | 在联机面板中嵌入房间操作界面 |
| 广播改造 | 按房间隔离广播，不再全局广播 |

## 约束

- 面向内部同事和朋友圈小范围使用，不追求公网大规模部署
- 房间数据不需要持久化（服务器重启可清空）
- 未加入房间的用户保持现有的全局可见行为（向后兼容）
- 不引入新的 npm 依赖

## 前提

1. 房间管理层加在现有嵌入式 LAN 服务器上，不需要独立云服务器
2. 房间隔离是核心需求 — 同一服务器上的不同房间互不可见
3. **未加入房间的用户保持全局可见**（连接即进入"大厅"，与当前行为一致）。加入房间后只看同房间成员
4. 邀请方式：6 位短码（如 A3K9X2）
5. 打字/点击动画同步、皮肤同步、多猫渲染 — 代码已有但需同步验证可靠性
6. 房间 UI 嵌入现有 Fun 面板"联机" tab

## 考虑的方案

### 方案 A: 在 server-core.js 中直接加房间

在 `MultiplayerServerCore` 类中加一个 `rooms: Map<roomId, Set<ws>>`，改 `_broadcast` 为按房间广播。优点改动最小；缺点房间逻辑和认证/排行榜混在一起，后续扩展困难。

### 方案 B: RoomManager 独立模块（推荐）

新建 `src/multiplayer/room-manager.js`，将房间生命周期从 `server-core.js` 抽离。`server-core` 持有 `this.roomManager`，广播方法改为接受 `roomId` 参数。

### 方案 C: 房间码 + 公网穿透

在 B 基础上加 TURN/STUN 或 frp 支持。对 bonus 功能来说过度工程。

## 推荐方案

方案 B — RoomManager 独立模块。相比方案 A 只多一个文件和一层间接调用，但换来：
- 关注点分离，房间逻辑和认证逻辑各自独立
- 后续加房间密码、人数上限、房间主题等不改动 server-core
- RoomManager 可独立单元测试

## 技术设计

### 新增文件

```
src/multiplayer/room-manager.js   # 房间管理模块 (CommonJS)
```

### 修改文件

```
src/multiplayer/protocol.js       # 新增房间相关消息类型
src/multiplayer/server-core.js    # 集成 RoomManager，改广播逻辑
src/multiplayer/mp-client.js      # 新增房间操作方法
src/multiplayer/connection-ui.js  # 新增房间创建/加入 UI
src/multiplayer/mini-cat-renderer.js  # 可能需要按房间过滤用户列表
src/renderer.js                   # 连接房间相关回调
main.js                           # 可能需要新增 IPC handler
preload.js                        # 暴露新 IPC
```

### RoomManager 类设计

```javascript
class RoomManager {
  constructor(opts = {}) {
    this.maxRooms = opts.maxRooms || 20;        // 最大房间数
    this.maxPerRoom = opts.maxPerRoom || 10;     // 每房间最大人数
    this.roomCodeLength = opts.roomCodeLength || 6;
    this.rooms = new Map();  // roomId → { id, code, host, members: Set<userId>, createdAt }
    this.codeToRoom = new Map();  // 短码 → roomId
    this.userToRoom = new Map();  // userId → roomId（快速查找用户所在房间）
  }

  // 成功返回 { roomId, code }，失败返回 { error: 'MAX_ROOMS_REACHED' }
  createRoom(hostUserId) → { roomId, code } | { error: string }

  // 成功返回 { roomId }，失败返回 { error: string }
  // 错误原因: 'ROOM_NOT_FOUND' | 'ROOM_FULL' | 'ALREADY_IN_ROOM' | 'INVALID_CODE'
  joinRoom(code, userId) → { roomId } | { error: string }

  // 返回 roomId 或 null（用户不在任何房间）
  leaveRoom(userId) → roomId | null

  // 返回房间对象或 null
  getRoomByUser(userId) → room | null

  // 返回房间对象或 null
  getRoomByCode(code) → room | null

  // 返回 userId 集合
  getRoomMembers(roomId) → Set<userId>

  // 房主离开时转移给最早加入的非房主成员；全员离开时销毁房间
  // 返回新的 host userId 或 null（房间已销毁）
  _transferHostIfNeeded(roomId) → userId | null

  // 内部方法
  generateCode() → string  // 6位大写字母+数字
}
```

**错误码枚举：**

| 错误码 | 触发场景 |
|--------|----------|
| `NOT_AUTHENTICATED` | 未认证用户尝试创建/加入房间 |
| `INVALID_CODE` | 输入的房间码不存在 |
| `ROOM_FULL` | 房间已满（达到 maxPerRoom） |
| `ALREADY_IN_ROOM` | 用户已在某房间，再次加入/创建 |
| `MAX_ROOMS_REACHED` | 服务器房间数达到上限 |
| `NOT_IN_ROOM` | 用户不在任何房间但尝试离开 |

**冲突处理：** 用户已在房间 X 时尝试加入房间 Y，返回 `ALREADY_IN_ROOM` 错误。客户端需要先调用 `leaveRoom()` 离开当前房间，再加入新房间。

### 新增协议消息

```javascript
// C2S
ROOM_CREATE:   'room:create',     // {} → 创建房间
ROOM_JOIN:     'room:join',       // { code } → 用房间码加入
ROOM_LEAVE:    'room:leave',      // {} → 离开当前房间

// S2C
ROOM_CREATED:      'room:created',      // { roomId, code, members: [{ userId, username, state }] }
ROOM_JOINED:       'room:joined',       // { roomId, code, members: [{ userId, username, state }] }
ROOM_LEFT:         'room:left',         // { userId, roomId }
ROOM_ERROR:        'room:error',        // { reason: 'INVALID_CODE' | 'ROOM_FULL' | ... }
ROOM_MEMBER_JOINED:'room:member-joined', // { userId, username, state, roomId }
ROOM_MEMBER_LEFT:  'room:member-left',   // { userId, roomId }
ROOM_DESTROYED:    'room:destroyed',     // { roomId, reason } — 房主解散或全员离开
```

**注意：** `members` 字段包含完整用户信息 `[{ userId, username, state }]`（含 skinId），
由 `server-core.js` 根据 RoomManager 的 userId 集合从 `this.clients` 中拼装。RoomManager
只负责 userId 管理，不持有用户状态引用。

### server-core.js 改造要点

1. 构造函数中初始化 `this.roomManager = new RoomManager()`
2. `handleMessage` 的 switch 中新增 `room:create`, `room:join`, `room:leave` 分支
3. **广播逻辑改造（核心）：** 新增 `_getBroadcastTargets(ws)` 方法，返回应接收消息的 ws 集合：
   ```javascript
   _getBroadcastTargets(ws) {
     const client = this.clients.get(ws);
     if (!client) return [];
     const room = this.roomManager.getRoomByUser(client.userId);
     if (!room) {
       // 未在房间 — 全局广播（现有行为）
       return [...this.clients.keys()];
     }
     // 在房间 — 只广播给同房间成员
     return [...this.clients.entries()]
       .filter(([_, c]) => room.members.has(c.userId))
       .map(([w]) => w);
   }
   ```
   `_broadcast(data)` 和 `_broadcastExcept(ws, data)` 内部改为调用 `_getBroadcastTargets()`。
4. **认证流程改造：** `_authenticateClient` 中认证成功后，通过 userId 查找该用户之前的房间。如果存在且房间还有其他成员，自动重新加入，snapshot 只含同房间用户。如果不存在或房间已销毁，发送全局 snapshot（现有行为）。
5. **断线处理：** `handleDisconnect` 中先调用 `roomManager.leaveRoom(client.userId)`（内部处理 host 转移和房间销毁），然后用 `_getBroadcastTargets` 通知相关用户。如果房间被销毁，向房间原成员广播 `room:destroyed`。

### mp-client.js 新增方法

```javascript
createRoom() → Promise<{ roomId, code, members }>
joinRoom(code) → Promise<{ roomId, code, members }>
leaveRoom() → Promise<void>
// 内部状态:
// this.currentRoom = { roomId, code }  // 当前所在房间
```

### mp-client.js 注意事项

`mp-client.js` 内部维护了一份独立的 C2S/S2C 常量副本（非从 protocol.js 导入）。新增房间消息类型时**必须同步修改 `mp-client.js` 中的常量**，否则客户端无法正确识别服务器消息。

### connection-ui.js UI 变更

在现有 `#tab-fun-connection` 面板中，连接成功后显示房间操作区：

- **未在房间时**：显示"创建房间"按钮 + "加入房间"输入框（输入 6 位短码）
- **在房间时**：显示房间码（可复制）+ 在线成员列表 + "离开房间"按钮
- 房间码显示为大号等宽字体，方便口头传达
- 加入房间输入框支持粘贴

### mini-cat-renderer.js 改造

当前 `addUser()` / `removeUser()` 不区分房间。需要确保只渲染同房间成员的猫。有两种方式：
- 方案 1：mp-client 在收到 `room:member-joined`/`room:member-left` 时调用 renderer 方法（推荐 — 改动最小）
- 方案 2：renderer 内部按 roomId 过滤（需要 renderer 知道当前房间）

### 数据流（创建房间完整流程）

```
用户点击"创建房间"
  → connection-ui.js 调用 mpClient.createRoom()
  → mp-client.js 发送 { type: 'room:create' }
  → server-core.js 收到，调用 roomManager.createRoom(userId)
  → server-core.js 回复 { type: 'room:created', roomId, code, members: [self] }
  → mp-client.js 更新 this.currentRoom
  → connection-ui.js 显示房间码 + 成员列表
  → 用户复制房间码发给好友

好友输入房间码点击"加入"
  → connection-ui.js 调用 mpClient.joinRoom(code)
  → mp-client.js 发送 { type: 'room:join', code }
  → server-core.js 调用 roomManager.joinRoom(code, userId)
  → server-core.js 回复创建者 { type: 'room:member-joined', userId, username, state }
  → server-core.js 回复加入者 { type: 'room:joined', roomId, code, members: [...] }
  → 加入者的 renderer 为已有成员添加 mini-cat
  → 创建者的 renderer 为加入者添加 mini-cat
  → 双方开始同步打字动画
```

### 广播隔离规则

| 消息类型 | 广播范围 |
|----------|----------|
| `user:action` (typing/click) | 在房间内→仅同房间；未在房间→全局 |
| `user:state` | 在房间内→仅同房间；未在房间→全局 |
| `user:joined` | 在房间内→仅同房间；未在房间→全局 |
| `user:left` | 在房间内→仅同房间；未在房间→全局 |
| `users:snapshot` | 认证时根据用户所在房间决定范围 |
| `leaderboard:data` | 请求-响应模式，直接发给请求者（不变） |
| `room:member-joined` | 仅同房间 |
| `room:member-left` | 仅同房间 |
| `room:destroyed` | 仅原房间成员 |

### 房间码生成规则

- 6 个字符，大写字母 + 数字（排除易混淆字符 O/0/I/1/L）
- 字符集: `ABCDEFGHJKMNPQRSTUVWXYZ23456789`（30 个字符）
- 碰撞检测: 生成后检查 `codeToRoom` 是否已存在，如存在则重新生成
- 30^6 ≈ 7.3 亿组合，碰撞概率极低

## 开放问题

1. 用户加入房间后又断线重连，是否自动回到之前的房间？（决定：是，通过 userId 查找之前所在房间，如房间仍存在则自动重新加入）
2. 房主断线后房间是否自动销毁？（决定：转移给最早加入的非房主成员。全员离开后自动销毁房间，向原成员广播 `room:destroyed`）
3. 排行榜是否需要按房间筛选？（建议：第一版保持全局不变）

## 成功标准

- 玩家可以创建房间并获得 6 位短码
- 好友输入短码可以加入同一房间
- 加入后桌面上只显示同房间内的猫
- 打字动画实时同步
- 离开房间后其他成员的猫消失
- 现有联机功能（认证、排行榜）不受影响

## 分发计划

此功能是 ChatCat Electron 应用的内置功能更新，通过现有 npm run build 打包分发，不需要额外的分发渠道。

## 下一步

1. 新建 `src/multiplayer/room-manager.js`，实现 RoomManager 类
2. 在 `protocol.js` 中添加房间相关消息类型
3. 改造 `server-core.js`，集成 RoomManager，改广播为按房间隔离
4. 在 `mp-client.js` 中添加 createRoom/joinRoom/leaveRoom 方法
5. 在 `connection-ui.js` 中添加房间操作 UI
6. 验证现有打字同步、多猫渲染模块的可靠性
7. 端到端测试：创建房间 → 好友加入 → 打字同步 → 离开

## 我注意到的关于你思考方式的事情

1. 你没有花时间去打磨产品定位或商业故事 — "总之就是做一个 bonus 功能确定要搞"，然后直接进入技术讨论。这在 bonus 功能场景下是对的：不值得在验证上花比实现更多的时间。
2. 你说同事反馈"想一起和朋友敲击键盘群猫乱舞"时，你把原文带上了。具体性比"同事们觉得联机很好玩"有用一百倍。
3. 你选择了方案 B（独立模块）而不是方案 A（最快），说明你在速度和代码质量之间做了合理的平衡 — 不是一味求快。
