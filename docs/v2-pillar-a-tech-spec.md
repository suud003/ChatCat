# ChatCat V2 — Pillar A 行为节奏智能 · 技术实现方案

> **版本**: v1.0 | **日期**: 2026-03-18 | **对应产品方案**: v2-productivity-plan.html  
> **范围**: Phase 1 (A1-A3 信号基础) + Phase 4 (A4-A6 展示 & 场景)

---

## 一、现状分析 & 差距识别

### 1.1 现有能力盘点

| 能力 | 现状 | 代码位置 | V2需求 |
|------|------|---------|--------|
| 键盘频率采集 | ✅ 已有，CPM/退格率/节奏/7天基线 | `signal-collector.js` | 增强：增加 rhythm state |
| 鼠标点击事件 | ⚠️ main→renderer 已发送，但**未消费** | `main.js:546` → `input/tracker.js` | **新建** mouse-signal-collector |
| 鼠标移动事件 | ⚠️ main→renderer 已发送，但**未消费** | `main.js:552` → `preload.js:20` | **新建** mouse-signal-collector |
| 打字节奏分析 | ✅ 初步有 frustrated/rushing/steady | `signal-collector.js:227-260` | 增强：五态识别 + 持续时长 |
| 7天速度基线 | ✅ 已有 500样本滑动窗口 | `signal-collector.js:182-223` | 增强：增加鼠标维度基线 |
| 场景触发系统 | ✅ 30+场景，标准化结构 | `proactive/scenes/*.js` | 新增 7个节奏场景 |
| 通知系统 (L0-L3) | ✅ 完善的四级通知 | `notification-mgr.js` | 复用，无需修改 |
| 日报生成 | ✅ 基于内容的AI日报 | `skills/daily-report.js` | 增强：增加节奏数据维度 |
| 仪表盘UI | ❌ 不存在 | - | **新建** rhythm-dashboard |
| Tools面板Tab系统 | ✅ 已有 setupTabbedPanel | `index.html` + `renderer.js` | 新增"节奏"Tab |

### 1.2 IPC 通道现状

当前 `global-mousemove` 和 `global-click` 的数据路径：

```
uiohook (main.js)
  ├── click event → mainWindow.send('global-click', { button, x, y })
  │                   └── preload 暴露 → onGlobalClick(callback)
  │                         └── InputTracker.setupListeners() → character.triggerClick()  ← 仅触发动画!
  │
  └── mousemove event → mainWindow.send('global-mousemove', { x, y })
                          └── preload 暴露 → onGlobalMousemove(callback)
                                └── 🚫 无任何消费者!
```

**结论**: 鼠标数据已经通过 IPC 到达渲染进程，但只用于触发猫咪点击动画，`mousemove` 完全浪费。V2 的 A1 模块直接在渲染进程消费这些已有 IPC 通道即可，**无需修改 main.js 和 preload.js**。

---

## 二、模块设计

### 2.1 模块依赖关系

```
┌──────────────────────────────────────────────────────────┐
│                   Layer 3: 展示 & 反馈                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │ A4: 节奏仪表盘│  │ A5: AI节奏画像│  │ A6: 增强猫咪场景 │  │
│  │ (Dashboard) │  │ (日报/周报)  │  │ (7个新场景)      │  │
│  └──────┬──────┘  └──────┬──────┘  └────────┬────────┘  │
│         │                │                   │           │
├─────────┼────────────────┼───────────────────┼───────────┤
│         │       Layer 2: 行为推断              │           │
│         │  ┌──────────────────────┐          │           │
│         └──┤ A2: 节奏分析器        ├──────────┘           │
│            │ (Rhythm Analyzer)    │                      │
│            └──────────┬───────────┘                      │
│                       │                                  │
│            ┌──────────┴───────────┐                      │
│            │ A3: 组合信号引擎      │                      │
│            │ (Composite Engine)   │                      │
│            └──────────┬───────────┘                      │
│                       │                                  │
├───────────────────────┼──────────────────────────────────┤
│              Layer 1: 信号采集                             │
│  ┌─────────────────┐  │  ┌──────────────────┐           │
│  │ A1: 鼠标信号化   │──┘  │ SignalCollector   │           │
│  │ (Mouse Signal)  │     │ (现有，增强)       │           │
│  └────────┬────────┘     └────────┬─────────┘           │
│           │                       │                      │
│     onGlobalClick          onGlobalKeydown               │
│     onGlobalMousemove                                    │
└──────────────────────────────────────────────────────────┘
```

### 2.2 数据流

```
[每次键盘/鼠标事件]
  │
  ├─→ A1:MouseSignalCollector → 30秒快照 { clicksPerMin, moveDistance, moveSpeed, isStill }
  │                                │
  ├─→ SignalCollector(现有) → { typingSpeed, deleteRate, keyIntervals, baseline }
  │                                │
  └────────────────────────────────┼──→ A3:CompositeSignalEngine
                                   │      ├─→ 实时活跃度评分 (0-100)
                                   │      ├─→ 时段模式统计
                                   │      └─→ 个人基线管理
                                   │
                                   └──→ A2:RhythmAnalyzer
                                          ├─→ 五态识别: flow/stuck/reading/chatting/away
                                          ├─→ 状态持续时长
                                          └─→ emit('rhythm-state-change', { state, duration, signals })
                                                │
                                                ├─→ A4: Dashboard实时更新
                                                ├─→ A5: 日报数据收集
                                                └─→ A6: 场景触发
```

---

## 三、A1: 鼠标信号化 Mouse Signal Collector

### 3.1 文件信息

| 属性 | 值 |
|------|-----|
| **文件路径** | `src/proactive/mouse-signal-collector.js` |
| **模块类型** | ES Module (渲染进程) |
| **依赖** | `window.electronAPI.onGlobalClick`, `window.electronAPI.onGlobalMousemove` |
| **消费者** | A2 RhythmAnalyzer, A3 CompositeSignalEngine |

### 3.2 类设计

```javascript
export class MouseSignalCollector {
  constructor() {
    // 配置
    this._snapshotIntervalMs = 30000;  // 30秒快照周期
    this._stillThresholdMs = 60000;    // 60秒无任何输入判定为静止
    
    // 点击数据
    this._clickTimestamps = [];        // 30秒窗口内的点击时间戳
    this._lastClickTime = 0;
    
    // 移动数据
    this._lastPosition = null;         // { x, y, time }
    this._moveDistanceAccum = 0;       // 累计移动距离(px)
    this._moveSegments = [];           // 移动片段 [{distance, duration}]
    
    // 最新快照
    this._currentSnapshot = null;
    
    // 事件
    this._listeners = {};
  }

  init() {
    window.electronAPI.onGlobalClick((data) => this._onClick(data));
    window.electronAPI.onGlobalMousemove((data) => this._onMousemove(data));
    
    // 每30秒输出一次快照
    this._timer = setInterval(() => this._emitSnapshot(), this._snapshotIntervalMs);
  }
  
  destroy() {
    if (this._timer) clearInterval(this._timer);
  }
}
```

### 3.3 核心方法

#### `_onClick(data)`

```javascript
_onClick(data) {
  const now = Date.now();
  this._clickTimestamps.push(now);
  this._lastClickTime = now;
  
  // 只保留30秒窗口
  const cutoff = now - 30000;
  this._clickTimestamps = this._clickTimestamps.filter(t => t > cutoff);
}
```

#### `_onMousemove(data)`

```javascript
_onMousemove(data) {
  const now = Date.now();
  const { x, y } = data;
  
  if (this._lastPosition) {
    const dx = x - this._lastPosition.x;
    const dy = y - this._lastPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const dt = now - this._lastPosition.time;
    
    // 过滤噪声：距离 <2px 或 时间差 <10ms 忽略
    if (distance >= 2 && dt >= 10) {
      this._moveDistanceAccum += distance;
      this._moveSegments.push({ distance, duration: dt });
      
      // 只保留30秒数据
      // 用简单的总量追踪即可，不需要逐条过滤（每次快照时清零）
    }
  }
  
  this._lastPosition = { x, y, time: now };
}
```

> **性能注意**: `mousemove` 事件频率极高（每秒可达60-120次）。这里只做简单的加减运算，不分配新对象，不做 IPC。对 `_moveSegments` 设置上限（如500条），超出时取平均后压缩。

#### `_emitSnapshot()`

```javascript
_emitSnapshot() {
  const now = Date.now();
  
  // 计算点击频率
  const recentClicks = this._clickTimestamps.filter(t => t > now - 30000);
  const clicksPerMin = recentClicks.length * 2; // 30秒窗口 × 2 = 每分钟
  
  // 计算移动速度
  const totalDuration = this._moveSegments.reduce((sum, s) => sum + s.duration, 0);
  const moveSpeed = totalDuration > 0 
    ? (this._moveDistanceAccum / totalDuration) * 1000  // px/s
    : 0;
  
  // 判断是否完全静止 (无点击 + 无移动)
  const lastActivity = Math.max(this._lastClickTime, this._lastPosition?.time || 0);
  const isStill = (now - lastActivity) > this._stillThresholdMs;
  
  const snapshot = {
    clicksPerMin,
    moveDistance: Math.round(this._moveDistanceAccum),
    moveSpeed: Math.round(moveSpeed * 10) / 10,
    isStill,
    timestamp: now
  };
  
  this._currentSnapshot = snapshot;
  this._emit('mouse-snapshot', snapshot);
  
  // 重置累积量
  this._moveDistanceAccum = 0;
  this._moveSegments = [];
}
```

### 3.4 公开接口

```javascript
// 给 A2/A3 同步读取最新快照
get snapshot() { return this._currentSnapshot; }
get isStill() { return this._currentSnapshot?.isStill ?? true; }
get clicksPerMin() { return this._currentSnapshot?.clicksPerMin ?? 0; }
```

### 3.5 EventEmitter (复用 SignalCollector 的模式)

```javascript
on(event, fn) { ... }
off(event, fn) { ... }
_emit(event, data) { ... }
```

与 SignalCollector 保持一致的简单 EventEmitter 实现，不引入外部库。

---

## 四、A2: 节奏分析器 Rhythm Analyzer

### 4.1 文件信息

| 属性 | 值 |
|------|-----|
| **文件路径** | `src/proactive/rhythm-analyzer.js` |
| **模块类型** | ES Module (渲染进程) |
| **依赖** | MouseSignalCollector, SignalCollector |
| **消费者** | A4 Dashboard, A5 AI画像, A6 场景 |

### 4.2 五态模型

| 状态 | ID | 键盘信号 | 鼠标信号 | 时间条件 | 置信度计算 |
|------|----|---------|---------|---------|-----------|
| 🔥 心流 | `flow` | CPM > baseline×1.1 且稳定 (σ < 30%) + 退格率 < 8% | 低活跃 (鼠标不频繁) | 持续 > 20min | `min(1.0, duration / 30min × 0.8 + speedStability × 0.2)` |
| 😣 卡壳 | `stuck` | CPM < baseline×0.5 + 退格率 > 15% | 不限 | 持续 > 2min | `speedDrop × 0.5 + deleteRate × 0.5` |
| 📖 阅读 | `reading` | 无打字 > 3min | 有鼠标移动 (非静止) | 持续 > 3min | `0.9 if mousActive && !typing` |
| 💬 聊天 | `chatting` | 短促打字 (burst < 20字) + 频繁暂停 (5-30秒) | 不限 | 3次以上短促周期 | `burstCount / 5 (max 1.0)` |
| 💤 离开 | `away` | 无键盘 | 无鼠标 | > 30min 无任何输入 | `1.0` |

### 4.3 类设计

```javascript
export class RhythmAnalyzer {
  constructor(signalCollector, mouseSignalCollector) {
    this._signalCollector = signalCollector;  // 现有键盘信号
    this._mouseCollector = mouseSignalCollector; // A1 鼠标信号
    
    // 当前状态
    this._currentState = 'idle';     // 初始状态
    this._stateStartTime = Date.now();
    this._confidence = 0;
    
    // 状态历史 (用于仪表盘时间线)
    this._stateHistory = [];         // [{ state, startTime, endTime, signals }]
    this._maxHistorySize = 500;      // 保留约4小时的30秒粒度数据
    
    // 心流检测
    this._flowCandidate = false;     // 是否在心流候选期
    this._flowCandidateStart = 0;
    this._highSpeedStreak = 0;       // 连续高速打字周期计数
    
    // 聊天模式检测
    this._typingBursts = [];         // 短促打字事件 [{time, charCount, pauseAfter}]
    
    // 配置
    this._analyzeIntervalMs = 30000; // 每30秒分析一次
    
    // 事件
    this._listeners = {};
  }

  init() {
    // 每30秒执行一次状态分析
    this._timer = setInterval(() => this._analyze(), this._analyzeIntervalMs);
    
    // 监听键盘节奏变化（来自 SignalCollector）
    this._signalCollector.on('typing-rhythm-change', (data) => {
      this._onTypingRhythmChange(data);
    });
    
    // 监听打字暂停
    this._signalCollector.on('typing-pause', (data) => {
      this._onTypingPause(data);
    });
    
    // 监听鼠标快照
    this._mouseCollector.on('mouse-snapshot', (snapshot) => {
      this._onMouseSnapshot(snapshot);
    });
  }
}
```

### 4.4 核心分析逻辑 `_analyze()`

```javascript
_analyze() {
  const now = Date.now();
  const typing = this._signalCollector.isTyping;
  const speed = this._signalCollector.typingSpeed;
  const baseline = this._signalCollector.speedBaseline;
  const mouseSnapshot = this._mouseCollector.snapshot;
  const mouseActive = mouseSnapshot && !mouseSnapshot.isStill;
  const lastKeyTime = this._signalCollector._lastKeyTime;
  const timeSinceKey = now - lastKeyTime;
  
  let newState = this._currentState;
  let confidence = 0;
  
  // === 离开检测 (最高优先级) ===
  if (timeSinceKey > 30 * 60 * 1000 && (mouseSnapshot?.isStill ?? true)) {
    newState = 'away';
    confidence = 1.0;
  }
  // === 阅读/思考检测 ===
  else if (!typing && timeSinceKey > 3 * 60 * 1000 && mouseActive) {
    newState = 'reading';
    confidence = 0.9;
  }
  // === 心流检测 ===
  else if (typing && baseline > 0) {
    const speedRatio = speed / baseline;
    const deleteRate = this._getRecentDeleteRate();
    
    if (speedRatio > 1.1 && deleteRate < 0.08) {
      if (!this._flowCandidate) {
        this._flowCandidate = true;
        this._flowCandidateStart = now;
      }
      const flowDuration = now - this._flowCandidateStart;
      if (flowDuration > 20 * 60 * 1000) { // 持续20分钟以上
        newState = 'flow';
        confidence = Math.min(1.0, (flowDuration / (30 * 60 * 1000)) * 0.8 + 0.2);
      }
    } else {
      this._flowCandidate = false;
    }
    
    // === 卡壳检测 ===
    if (speedRatio < 0.5 && deleteRate > 0.15) {
      const stuckDuration = now - this._stateStartTime;
      if (stuckDuration > 2 * 60 * 1000 || this._currentState === 'stuck') {
        newState = 'stuck';
        confidence = Math.min(1.0, (1 - speedRatio) * 0.5 + deleteRate * 2);
      }
    }
    
    // === 聊天模式检测 ===
    if (this._detectChattingPattern()) {
      newState = 'chatting';
      confidence = Math.min(1.0, this._typingBursts.length / 5);
    }
  }
  
  // 状态切换处理
  if (newState !== this._currentState) {
    this._onStateChange(newState, confidence);
  }
  
  // 无论是否切换，都发出当前状态快照（给仪表盘用）
  this._emit('rhythm-tick', {
    state: this._currentState,
    confidence: this._confidence,
    duration: now - this._stateStartTime,
    signals: {
      avgCPM: speed,
      deleteRate: this._getRecentDeleteRate(),
      mouseActive: mouseActive,
      baselineDeviation: baseline > 0 
        ? `${speed > baseline ? '+' : ''}${Math.round((speed - baseline) / baseline * 100)}%`
        : 'N/A'
    }
  });
}
```

### 4.5 状态切换

```javascript
_onStateChange(newState, confidence) {
  const now = Date.now();
  const prevState = this._currentState;
  const prevDuration = now - this._stateStartTime;
  
  // 记录前一个状态到历史
  if (prevState !== 'idle') {
    this._stateHistory.push({
      state: prevState,
      startTime: this._stateStartTime,
      endTime: now,
      duration: prevDuration
    });
    if (this._stateHistory.length > this._maxHistorySize) {
      this._stateHistory.shift();
    }
  }
  
  // 更新当前状态
  this._currentState = newState;
  this._stateStartTime = now;
  this._confidence = confidence;
  
  // 发出状态变更事件
  this._emit('rhythm-state-change', {
    state: newState,
    prevState,
    prevDuration,
    confidence,
    timestamp: now
  });
  
  // 特殊事件：心流结束
  if (prevState === 'flow' && newState !== 'flow') {
    this._emit('flow-ended', {
      duration: prevDuration,
      avgCPM: this._signalCollector.typingSpeed
    });
  }
}
```

### 4.6 聊天模式检测

```javascript
_detectChattingPattern() {
  const now = Date.now();
  // 清除5分钟前的数据
  this._typingBursts = this._typingBursts.filter(b => now - b.time < 5 * 60 * 1000);
  
  // 需要至少3次短促打字+暂停的循环
  return this._typingBursts.length >= 3;
}

_onTypingPause(data) {
  // 如果暂停前的打字时间较短（<30秒），且暂停在5-30秒，记录为一次 "burst"
  if (data.continuousWorkMinutes < 0.5 && data.pauseDurationMs >= 5000 && data.pauseDurationMs <= 30000) {
    this._typingBursts.push({
      time: Date.now(),
      speed: data.typingSpeed,
      pauseAfter: data.pauseDurationMs
    });
  }
}
```

### 4.7 公开接口

```javascript
get currentState() { return this._currentState; }
get stateDuration() { return Date.now() - this._stateStartTime; }
get confidence() { return this._confidence; }
get stateHistory() { return [...this._stateHistory]; }

// 获取今日汇总（给A5日报用）
getDailySummary() {
  const today = new Date().toISOString().split('T')[0];
  const todayHistory = this._stateHistory.filter(h => {
    return new Date(h.startTime).toISOString().split('T')[0] === today;
  });
  
  const summary = {
    flowSessions: [],
    stuckEvents: [],
    totalFlowMinutes: 0,
    totalActiveMinutes: 0,
    stateBreakdown: {}
  };
  
  for (const h of todayHistory) {
    const minutes = h.duration / 60000;
    summary.stateBreakdown[h.state] = (summary.stateBreakdown[h.state] || 0) + minutes;
    
    if (h.state === 'flow') {
      summary.flowSessions.push({
        start: new Date(h.startTime).toTimeString().slice(0, 5),
        end: new Date(h.endTime).toTimeString().slice(0, 5),
        durationMin: Math.round(minutes)
      });
      summary.totalFlowMinutes += minutes;
    }
    if (h.state === 'stuck') {
      summary.stuckEvents.push({
        time: new Date(h.startTime).toTimeString().slice(0, 5),
        durationMin: Math.round(minutes)
      });
    }
    if (h.state !== 'away') {
      summary.totalActiveMinutes += minutes;
    }
  }
  
  return summary;
}
```

---

## 五、A3: 组合信号引擎 Composite Signal Engine

### 5.1 文件信息

| 属性 | 值 |
|------|-----|
| **文件路径** | `src/proactive/composite-signal-engine.js` |
| **模块类型** | ES Module (渲染进程) |
| **依赖** | SignalCollector, MouseSignalCollector |
| **消费者** | A2 RhythmAnalyzer, A4 Dashboard, A5 AI画像 |

### 5.2 核心能力

#### (1) 个人基线管理

增强现有 SignalCollector 的7天速度基线，加入鼠标维度：

```javascript
export class CompositeSignalEngine {
  constructor(signalCollector, mouseSignalCollector) {
    this._signalCollector = signalCollector;
    this._mouseCollector = mouseSignalCollector;
    
    // 活跃度评分
    this._hourlyActivity = new Array(24).fill(null).map(() => ({
      typingMinutes: 0,
      avgCPM: 0,
      peakCPM: 0,
      deleteRate: 0,
      clicks: 0,
      mouseDist: 0,
      idleMinutes: 0,
      activityScore: 0
    }));
    
    // 历史基线 (30天滚动)
    this._dailyBaselines = [];     // [{ date, avgCPM, avgClicks, avgMouseDist, ... }]
    
    // 时段模式
    this._hourlyPatterns = {};     // { hour: { avgCPM, avgActivity, sampleCount } }
    
    // 今日追踪
    this._todayDate = '';
    this._todayTypingCount = 0;
    this._todayFlowMinutes = 0;
  }
  
  async init() {
    // 从 store 加载历史基线
    const saved = await window.electronAPI.getStore('rhythmBaselines');
    if (saved) {
      this._dailyBaselines = saved;
      // 清除30天前的数据
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      this._dailyBaselines = this._dailyBaselines.filter(
        b => new Date(b.date).getTime() > thirtyDaysAgo
      );
    }
    
    // 加载时段模式
    const patterns = await window.electronAPI.getStore('hourlyPatterns');
    if (patterns) this._hourlyPatterns = patterns;
    
    // 每30秒更新活跃度
    this._timer = setInterval(() => this._updateHourlyActivity(), 30000);
    
    // 每天结束保存基线
    this._dailyTimer = setInterval(() => this._checkDayEnd(), 60000);
  }
}
```

#### (2) 活跃度评分

```javascript
_calculateActivityScore(hour) {
  const data = this._hourlyActivity[hour];
  if (!data) return 0;
  
  // 归一化各维度到 0-100
  const typingScore = Math.min(100, data.typingMinutes / 50 * 100);  // 50分钟打字=满分
  const clickScore = Math.min(100, data.clicks / 200 * 100);         // 200次点击=满分
  const moveScore = Math.min(100, data.mouseDist / 50000 * 100);     // 50000px移动=满分
  
  // 加权计算
  return Math.round(typingScore * 0.5 + clickScore * 0.3 + moveScore * 0.2);
}
```

#### (3) 时段模式学习

```javascript
// 返回历史上每个小时的平均活跃度，用于发现最佳工作时段
getBestWorkingHours() {
  const hourScores = [];
  for (let h = 0; h < 24; h++) {
    const pattern = this._hourlyPatterns[h];
    if (pattern && pattern.sampleCount >= 3) { // 至少3天数据
      hourScores.push({ hour: h, avgScore: pattern.avgActivity });
    }
  }
  return hourScores.sort((a, b) => b.avgScore - a.avgScore).slice(0, 3);
}
```

#### (4) 个性化休息提醒阈值

```javascript
// 计算个人的连续工作时长P90
getPersonalizedRestThreshold() {
  if (this._dailyBaselines.length < 3) return 90; // 默认90分钟
  
  const workStreaks = this._dailyBaselines
    .map(b => b.longestStreak || 60)
    .sort((a, b) => a - b);
  
  const p90Index = Math.floor(workStreaks.length * 0.9);
  return workStreaks[p90Index] || 90;
}
```

### 5.3 数据持久化

| Key | 格式 | 清理策略 |
|-----|------|---------|
| `rhythmBaselines` | `[{ date, avgCPM, avgClicks, avgMouseDist, longestStreak, totalFlow, bestHour }]` | 30天滚动 |
| `hourlyPatterns` | `{ "9": { avgCPM, avgActivity, sampleCount }, ... }` | 不限 |
| `rhythmData_YYYY-MM-DD` | 当日完整逐小时活跃度数据 | 7天滚动 |

### 5.4 公开接口

```javascript
get todayActivity() { return this._hourlyActivity; }
get todayTypingCount() { return this._todayTypingCount; }
get todayFlowMinutes() { return this._todayFlowMinutes; }

getActivityScore(hour) { ... }
getBestWorkingHours() { ... }
getPersonalizedRestThreshold() { ... }
getBaselineComparison() { ... }  // 返回「今天 vs 7天平均」对比数据
getTodayFullData() { ... }        // 给A5日报用的完整数据包
```

---

## 六、SignalCollector 增强

### 6.1 需要修改的内容

在现有 `signal-collector.js` 中增加以下内容：

#### 新增信号类型

| 信号名 | 触发条件 | 数据 |
|--------|---------|------|
| `rhythm-state-change` | RhythmAnalyzer 状态变化时（桥接） | `{ state, prevState, confidence }` |
| `flow-ended` | 心流状态结束时（桥接） | `{ duration, avgCPM }` |
| `activity-tick` | 每30秒 | `{ score, hour, signals }` |

#### 实现方式

**不直接修改 SignalCollector**，而是让 ProactiveEngine 同时监听 RhythmAnalyzer 的事件。这样保持 SignalCollector 的单一职责：

```javascript
// 在 renderer.js 的 init() 中
// 将 RhythmAnalyzer 的事件桥接到 ProactiveEngine
rhythmAnalyzer.on('rhythm-state-change', (data) => {
  proactiveEngine.processExternalSignal('rhythm-state-change', data);
});
rhythmAnalyzer.on('flow-ended', (data) => {
  proactiveEngine.processExternalSignal('flow-ended', data);
});
```

### 6.2 ProactiveEngine 新增方法

在 `proactive-engine.js` 中新增：

```javascript
// 接收来自 RhythmAnalyzer 等外部模块的信号
processExternalSignal(signalName, data) {
  // 复用现有的场景匹配逻辑
  this._processSignal(signalName, data);
}
```

当前 `_processSignal` 已经是通用的信号→场景匹配器，只要新场景的 `signal` 字段匹配即可。

---

## 七、A4: 节奏仪表盘 Rhythm Dashboard

### 7.1 文件信息

| 属性 | 值 |
|------|-----|
| **文件路径** | `src/widgets/rhythm-dashboard.js` |
| **模块类型** | ES Module (渲染进程) |
| **依赖** | RhythmAnalyzer, CompositeSignalEngine |
| **挂载位置** | Tools 面板新增 Tab「🎵 节奏」 |

### 7.2 UI 结构

```
#tools-tab-rhythm
├── .rhythm-realtime (实时状态区)
│   ├── 当前状态图标 + 名称 + 持续时长
│   ├── CPM 指示器
│   ├── 退格率指示器
│   └── 鼠标活跃度指示器
│
├── .rhythm-summary (今日概要)
│   ├── 总活跃时长
│   ├── 心流时长
│   ├── 总打字次数
│   └── 最长连续时长
│
├── .rhythm-hourly (每小时活跃度柱状图)
│   └── 24个柱子, 颜色深浅表示活跃度
│
├── .rhythm-timeline (状态时间线)
│   └── 水平彩色条: flow=绿 | stuck=红 | reading=蓝 | chatting=橙 | away=灰
│
└── .rhythm-insights (智能洞察)
    └── 2-3条 insight 卡片
```

### 7.3 实现要点

```javascript
export class RhythmDashboard {
  constructor(container, rhythmAnalyzer, compositeEngine) {
    this._container = container;
    this._analyzer = rhythmAnalyzer;
    this._engine = compositeEngine;
    this._updateTimer = null;
  }
  
  init() {
    this._render();
    
    // 每30秒刷新（与分析周期同步）
    this._updateTimer = setInterval(() => this._update(), 30000);
    
    // 监听状态变化，实时更新状态指示器
    this._analyzer.on('rhythm-tick', (data) => {
      this._updateRealtimeSection(data);
    });
  }
  
  _render() {
    this._container.innerHTML = `
      <div class="rhythm-dashboard">
        <div class="rhythm-realtime">
          <div class="rhythm-state-display">
            <span class="rhythm-state-icon">⏳</span>
            <div class="rhythm-state-info">
              <div class="rhythm-state-name">等待中</div>
              <div class="rhythm-state-detail">开始打字后将显示状态</div>
            </div>
          </div>
          <div class="rhythm-meters">
            <div class="rhythm-meter">
              <span class="meter-label">打字速度</span>
              <div class="meter-bar"><div class="meter-fill" id="meter-cpm"></div></div>
              <span class="meter-value" id="val-cpm">0 CPM</span>
            </div>
            <div class="rhythm-meter">
              <span class="meter-label">退格率</span>
              <div class="meter-bar"><div class="meter-fill" id="meter-delete"></div></div>
              <span class="meter-value" id="val-delete">0%</span>
            </div>
            <div class="rhythm-meter">
              <span class="meter-label">鼠标活跃</span>
              <div class="meter-bar"><div class="meter-fill" id="meter-mouse"></div></div>
              <span class="meter-value" id="val-mouse">0</span>
            </div>
          </div>
        </div>
        
        <div class="rhythm-summary" id="rhythm-summary">
          <!-- 动态填充 -->
        </div>
        
        <div class="rhythm-hourly-title">活跃度曲线</div>
        <div class="rhythm-hourly" id="rhythm-hourly">
          <!-- 24个柱子 -->
        </div>
        <div class="rhythm-hourly-labels">
          <span>0</span><span>4</span><span>8</span><span>12</span><span>16</span><span>20</span><span>24</span>
        </div>
        
        <div class="rhythm-insights" id="rhythm-insights">
          <!-- 动态生成洞察卡片 -->
        </div>
      </div>
    `;
    
    this._renderHourlyBars();
  }
}
```

### 7.4 洞察生成（纯本地规则，0 token）

```javascript
_generateInsights() {
  const insights = [];
  const summary = this._analyzer.getDailySummary();
  const bestHours = this._engine.getBestWorkingHours();
  
  // 心流洞察
  if (summary.flowSessions.length > 0) {
    const longest = summary.flowSessions.sort((a, b) => b.durationMin - a.durationMin)[0];
    insights.push({
      icon: '🔥',
      text: `${longest.start}-${longest.end} 进入心流状态，连续高速输出 ${longest.durationMin} 分钟`
    });
  }
  
  // 最佳时段洞察
  if (bestHours.length > 0) {
    const best = bestHours[0];
    insights.push({
      icon: '💡',
      text: `你的最佳打字时段是 ${best.hour}:00-${best.hour + 1}:00，建议安排重要创作任务`
    });
  }
  
  // 基线对比洞察
  const comparison = this._engine.getBaselineComparison();
  if (comparison.speedDelta > 0.15) {
    insights.push({
      icon: '📈',
      text: `今天打字速度比平时快 ${Math.round(comparison.speedDelta * 100)}%，状态不错！`
    });
  }
  
  return insights;
}
```

### 7.5 index.html 修改

在 Tools 面板的 Tab 列表中新增：

```html
<!-- 在 tools-tabs 容器中新增 -->
<button class="tab-btn" data-tab="tools-tab-rhythm">🎵 节奏</button>

<!-- 新增 Tab 内容区 -->
<div id="tools-tab-rhythm" class="tab-content" style="display:none;"></div>
```

### 7.6 CSS 新增

在 `styles.css` 中新增 `.rhythm-*` 系列样式（详见附录 CSS 部分）。设计风格与现有面板一致：漫画气泡白底 + 圆角 + 简洁配色。

---

## 八、A5: AI 节奏画像 (日报/周报)

### 8.1 修改文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/skills/daily-report.js` | **修改** | 增加节奏数据维度 |
| `src/skills/skills/daily-report/SKILL.md` | **修改** | 更新 prompt 模板 |
| `src/skills/skills/weekly-report/SKILL.md` | **新建** | 周报技能定义 |

### 8.2 日报增强方案

现有日报流程：`KeyboardRecorder → TextConverter → DailyReport → AI生成`

V2 增强：**在 DailyReport 的 AI prompt 中注入节奏数据**

```javascript
// daily-report.js 修改
async execute() {
  // ... 现有逻辑：获取 convertedText ...
  
  // V2新增: 获取节奏数据（通过 IPC 从渲染进程获取）
  const rhythmData = await this._getFromRenderer('get-rhythm-daily-data');
  
  // 构建增强版 prompt
  const prompt = this._buildPromptV2(convertedText, rhythmData, context);
  // ... 调用 AI ...
}
```

#### 新增 IPC 通道

```
渲染进程 (CompositeSignalEngine.getTodayFullData())
  ↑ ipcMain.handle('get-rhythm-daily-data')
  ↑ mainWindow.webContents.send('request-rhythm-data')
```

**方案选择**: 由于节奏数据在渲染进程中，但 DailyReport 在主进程运行，需要一个 IPC 桥接。

推荐做法：**让渲染进程定期将节奏数据存入 store，主进程读取**：

```javascript
// 渲染进程: 每小时保存一次节奏数据到 store
setInterval(async () => {
  const data = compositeEngine.getTodayFullData();
  await window.electronAPI.setStore(`rhythmData_${todayDate}`, data);
}, 60 * 60 * 1000);

// 主进程 daily-report.js: 读取
const rhythmData = store.get(`rhythmData_${today}`);
```

### 8.3 传给 AI 的数据格式

```json
{
  "date": "2026-03-17",
  "hourlyActivity": [
    { "hour": 9, "typingMin": 12, "avgCPM": 180, "peakCPM": 320,
      "delRate": 0.05, "clicks": 45, "mouseDist": 8200, "idleMin": 8,
      "activityScore": 65 },
    ...
  ],
  "flowSessions": [
    { "start": "10:05", "end": "10:42", "avgCPM": 310, "durationMin": 37 }
  ],
  "stuckEvents": [
    { "time": "14:22", "durationMin": 8, "speedDrop": "55%", "deleteRate": "22%" }
  ],
  "totalTypingMin": 185,
  "totalFlowMin": 37,
  "longestStreak": 42,
  "bestHour": 10,
  "baselineComparison": "+18% vs 7-day avg"
}
```

### 8.4 AI Prompt 模板

```
你是 ChatCat 🐱，一只懂用户工作节奏的AI猫咪。
根据以下纯数值节奏数据（不含任何打字内容），用温暖的猫咪语气生成日报。

要求：
1. 200字以内
2. 突出心流时段和成就感
3. 如果有卡壳事件，用安慰的语气
4. 给出1条基于数据的具体建议
5. 用猫咪的口吻（喵～、爪爪、~等）

节奏数据：
{rhythmDataJSON}
```

### 8.5 周报 Skill

**新建文件**: `src/skills/skills/weekly-report/SKILL.md`

```markdown
---
id: weekly-report
name: 周报生成
trigger:
  keywords: [周报, weekly, 本周总结]
  commands: [/weekly]
  schedule: "sunday-18:00"
---

## TASK
基于最近7天的节奏数据生成周报。

## DATA
- 读取 rhythmData_{date} (最近7天)
- 读取 rhythmBaselines (7天基线)

## PROMPT
你是 ChatCat 🐱。根据以下7天的工作节奏数据，生成周报：
1. 本周总览（总活跃时长、心流时长、趋势）
2. 每日亮点（选3个最突出的日子）
3. 节奏趋势（是在变好还是变差）
4. 下周建议（基于数据）
```

---

## 九、A6: 增强猫咪场景

### 9.1 文件信息

| 属性 | 值 |
|------|-----|
| **文件路径** | `src/proactive/scenes/rhythm-scenes.js` |
| **模块类型** | ES Module (渲染进程) |
| **注册方式** | 在 ProactiveEngine 中 import 并注册 |

### 9.2 七个新场景定义

```javascript
// src/proactive/scenes/rhythm-scenes.js

export const flowGuardScene = {
  id: 301,
  name: 'flow-guard',
  type: 'efficiency',
  level: 'L1',
  signal: 'flow-ended',           // 由 RhythmAnalyzer 触发
  condition: (ctx) => {
    return ctx.data.duration > 20 * 60 * 1000; // 心流超过20分钟
  },
  getMessage: (ctx, personality) => {
    const min = Math.round(ctx.data.duration / 60000);
    const messages = {
      lively: `🔥 哇！你刚才连续心流了 ${min} 分钟！太棒了！✨`,
      cool: `...刚才 ${min} 分钟的心流，不错。`,
      soft: `${min} 分钟的心流呢～好厉害 🌸`,
      scholar: `记录到 ${min} 分钟心流状态，平均 CPM ${ctx.data.avgCPM}，效率极佳。`
    };
    return messages[personality] || messages.lively;
  },
  cooldown: 30 * 60 * 1000  // 30分钟
};

export const stuckComfortScene = {
  id: 302,
  name: 'stuck-comfort',
  type: 'care',
  level: 'L1',
  signal: 'rhythm-state-change',
  condition: (ctx) => {
    return ctx.data.state === 'stuck' && ctx.data.confidence > 0.6;
  },
  getMessage: (ctx, personality) => {
    const messages = {
      lively: `卡住了？没关系！摸摸头，休息一下再来 🐾`,
      cool: `...看起来遇到困难了。起来走走？`,
      soft: `好像卡住了呢...要不要站起来伸伸懒腰？🌸`,
      scholar: `检测到效率下降，退格率偏高。建议暂停5分钟，换个思路。`
    };
    return messages[personality] || messages.lively;
  },
  cooldown: 30 * 60 * 1000
};

export const personalizedRestScene = {
  id: 303,
  name: 'personalized-rest',
  type: 'care',
  level: 'L2',
  signal: 'long-work',            // 复用现有信号
  condition: async (ctx) => {
    // 读取个性化休息阈值
    const threshold = ctx.compositeEngine?.getPersonalizedRestThreshold() || 90;
    return ctx.data.continuousWorkMinutes >= threshold;
  },
  getMessage: (ctx, personality) => {
    const min = ctx.data.continuousWorkMinutes;
    const messages = {
      lively: `你已经连续工作 ${min} 分钟了！比你平时还久哦，该休息啦！🎉`,
      cool: `${min} 分钟了。该停了。`,
      soft: `工作了 ${min} 分钟呢～比平时都努力，但也要照顾身体哦 🌸`,
      scholar: `连续工作 ${min} 分钟，超过个人 P90 阈值。建议进行 5-10 分钟的休息。`
    };
    return messages[personality] || messages.lively;
  },
  cooldown: 60 * 60 * 1000  // 1小时
};

export const dailySurpassScene = {
  id: 304,
  name: 'daily-surpass',
  type: 'info',
  level: 'L1',
  signal: 'activity-tick',        // 由 CompositeEngine 每30秒触发
  condition: async (ctx) => {
    // 检查今日打字量/心流是否超过昨天
    const yesterday = await window.electronAPI.getStore(
      `rhythmData_${getYesterdayDate()}`
    );
    if (!yesterday) return false;
    
    const todayFlow = ctx.compositeEngine?.todayFlowMinutes || 0;
    const yesterdayFlow = yesterday.totalFlowMin || 0;
    
    return todayFlow > yesterdayFlow && todayFlow > 10; // 至少10分钟心流才触发
  },
  getMessage: (ctx, personality) => {
    const messages = {
      lively: `📈 今天的心流时长已经超越昨天了！继续加油！✨`,
      cool: `...比昨天强了。`,
      soft: `今天比昨天还厉害呢～真棒 🌸`,
      scholar: `今日心流时长已超越昨日记录，趋势向好。`
    };
    return messages[personality] || messages.lively;
  },
  cooldown: 24 * 60 * 60 * 1000  // 每天最多一次
};

export const bestHourScene = {
  id: 305,
  name: 'best-hour-reminder',
  type: 'efficiency',
  level: 'L0',                    // 静默提示
  signal: 'time-trigger',
  condition: (ctx) => {
    const bestHours = ctx.compositeEngine?.getBestWorkingHours() || [];
    return bestHours.length > 0 && bestHours[0].hour === ctx.data.hour;
  },
  getMessage: (ctx, personality) => {
    return `🌅 你的黄金工作时间到了！历史数据显示这个小时你效率最高～`;
  },
  cooldown: 24 * 60 * 60 * 1000
};

export const welcomeBackScene = {
  id: 306,
  name: 'welcome-back',
  type: 'chat',
  level: 'L1',
  signal: 'rhythm-state-change',
  condition: (ctx) => {
    // 从 away 状态回来
    return ctx.data.prevState === 'away' && ctx.data.state !== 'away';
  },
  getMessage: (ctx, personality) => {
    const awayMin = Math.round(ctx.data.prevDuration / 60000);
    const messages = {
      lively: `欢迎回来！你离开了 ${awayMin} 分钟～想你了 🐱`,
      cool: `...回来了。${awayMin}分钟。`,
      soft: `你回来啦～等了你 ${awayMin} 分钟呢 🌸`,
      scholar: `欢迎回来。离开时长：${awayMin}分钟。准备好继续工作了吗？`
    };
    return messages[personality] || messages.lively;
  },
  cooldown: 30 * 60 * 1000
};

export const quietCompanionScene = {
  id: 307,
  name: 'quiet-companion',
  type: 'care',
  level: 'L0',                    // 仅改变猫咪动画，不弹气泡
  signal: 'rhythm-state-change',
  condition: (ctx) => {
    return ctx.data.state === 'reading' && ctx.data.confidence > 0.8;
  },
  getMessage: (ctx, personality) => {
    return null; // L0 且返回 null 表示只触发动画，不显示文字
  },
  cooldown: 10 * 60 * 1000
};

// 导出所有场景
export const rhythmScenes = [
  flowGuardScene,
  stuckComfortScene,
  personalizedRestScene,
  dailySurpassScene,
  bestHourScene,
  welcomeBackScene,
  quietCompanionScene
];
```

### 9.3 场景注册

在 `proactive-engine.js` 的场景加载中添加：

```javascript
import { rhythmScenes } from './scenes/rhythm-scenes.js';

// 在 init() 或 constructor 中
this._scenes = [
  ...existingScenes,
  ...rhythmScenes
];
```

### 9.4 上下文注入

场景的 `condition` 函数需要访问 A2/A3 模块。需要在 ProactiveEngine 的信号处理中注入上下文：

```javascript
// proactive-engine.js 修改
_processSignal(signalName, data) {
  for (const scene of this._scenes) {
    if (scene.signal !== signalName) continue;
    
    // V2: 注入新的上下文
    const ctx = {
      data,
      // 现有上下文
      affection: this._affectionSystem,
      personality: this._personality,
      // V2 新增
      compositeEngine: this._compositeEngine,  // A3
      rhythmAnalyzer: this._rhythmAnalyzer      // A2
    };
    
    // ... 继续现有逻辑
  }
}
```

---

## 十、renderer.js 初始化顺序

### 10.1 新增初始化代码

在 `renderer.js` 的 `init()` 函数中，插入以下代码（在 ProactiveEngine 初始化之前）：

```javascript
async function init() {
  // ... 现有初始化（角色、好感度、输入追踪、AI服务等）...
  
  // ========== V2 Pillar A: 行为节奏智能 ==========
  
  // A1: 鼠标信号化
  const { MouseSignalCollector } = await import('./proactive/mouse-signal-collector.js');
  const mouseSignalCollector = new MouseSignalCollector();
  mouseSignalCollector.init();
  
  // A3: 组合信号引擎 (依赖 SignalCollector + MouseSignalCollector)
  const { CompositeSignalEngine } = await import('./proactive/composite-signal-engine.js');
  const compositeEngine = new CompositeSignalEngine(signalCollector, mouseSignalCollector);
  await compositeEngine.init();
  
  // A2: 节奏分析器 (依赖 SignalCollector + MouseSignalCollector)
  const { RhythmAnalyzer } = await import('./proactive/rhythm-analyzer.js');
  const rhythmAnalyzer = new RhythmAnalyzer(signalCollector, mouseSignalCollector);
  rhythmAnalyzer.init();
  
  // A4: 节奏仪表盘 (依赖 A2 + A3)
  const { RhythmDashboard } = await import('./widgets/rhythm-dashboard.js');
  const rhythmDashContainer = document.getElementById('tools-tab-rhythm');
  const rhythmDashboard = new RhythmDashboard(rhythmDashContainer, rhythmAnalyzer, compositeEngine);
  rhythmDashboard.init();
  
  // 将 A2/A3 注入 ProactiveEngine
  proactiveEngine.setRhythmModules(rhythmAnalyzer, compositeEngine);
  
  // 桥接 RhythmAnalyzer 事件到 ProactiveEngine
  rhythmAnalyzer.on('rhythm-state-change', (data) => {
    proactiveEngine.processExternalSignal('rhythm-state-change', data);
  });
  rhythmAnalyzer.on('flow-ended', (data) => {
    proactiveEngine.processExternalSignal('flow-ended', data);
  });
  
  // 定期保存节奏数据到 store（给主进程日报用）
  setInterval(async () => {
    const today = new Date().toISOString().split('T')[0];
    const data = compositeEngine.getTodayFullData();
    const summary = rhythmAnalyzer.getDailySummary();
    await window.electronAPI.setStore(`rhythmData_${today}`, {
      ...data,
      ...summary,
      date: today
    });
  }, 5 * 60 * 1000); // 每5分钟保存一次
  
  // ========== 继续现有初始化 ==========
  // ... (ProactiveEngine init, Skills, etc.) ...
}
```

---

## 十一、存储设计

### 11.1 新增 Store Keys

| Key | 数据格式 | 大小估算 | 生命周期 |
|-----|---------|---------|---------|
| `rhythmBaselines` | `Array<DailyBaseline>` | ~5KB (30天) | 30天滚动 |
| `hourlyPatterns` | `Object<hour, Pattern>` | ~2KB | 永久更新 |
| `rhythmData_YYYY-MM-DD` | `DailyRhythmData` | ~3KB/天 | 7天滚动 |
| `rhythmDailyReport_YYYY-MM-DD` | `string` (AI报告) | ~1KB/天 | 30天滚动 |

### 11.2 清理策略

```javascript
// 在 compositeEngine._checkDayEnd() 中
async _cleanOldData() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  // 清理超过7天的日粒度节奏数据
  for (let i = 8; i < 40; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = `rhythmData_${d.toISOString().split('T')[0]}`;
    await window.electronAPI.setStore(key, undefined);
  }
}
```

---

## 十二、性能考量

### 12.1 mousemove 事件处理

**问题**: `mousemove` 事件频率极高，uiohook 每秒可触发 60-120 次。

**解决方案**:

1. **主进程节流 (推荐)**: 在 `main.js` 的 mousemove 处理中加入节流：

```javascript
// main.js 修改
let lastMousemoveTime = 0;
uIOhook.on('mousemove', (e) => {
  const now = Date.now();
  if (now - lastMousemoveTime < 50) return; // 50ms节流 = 最高20fps
  lastMousemoveTime = now;
  
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('global-mousemove', { x: e.x, y: e.y });
  }
});
```

2. **渲染进程内部**: MouseSignalCollector 只做简单加法运算，无内存分配，性能无忧。

### 12.2 定时器管理

| 定时器 | 周期 | 模块 |
|--------|------|------|
| MouseSignalCollector._timer | 30s | A1 |
| RhythmAnalyzer._timer | 30s | A2 |
| CompositeSignalEngine._timer | 30s | A3 |
| CompositeSignalEngine._dailyTimer | 60s | A3 |
| RhythmDashboard._updateTimer | 30s | A4 |
| 节奏数据存储 | 5min | renderer.js |

**优化**: 可以统一为一个 30s 的主定时器，然后分发到各模块。但鉴于定时器数量不多（6个），且各自独立，暂不合并。

### 12.3 内存估算

| 数据结构 | 大小 | 生命周期 |
|---------|------|---------|
| clickTimestamps (30s窗口) | ~50 entries × 8B = 400B | 实时 |
| moveSegments (30s窗口) | ~600 entries × 16B = 10KB | 每30s清零 |
| stateHistory (500条) | 500 × 40B = 20KB | 会话内 |
| hourlyActivity (24小时) | 24 × 60B = 1.5KB | 每天重置 |
| speedSamples (现有, 500条) | 500 × 16B = 8KB | 7天滚动 |

总计: **< 50KB** 内存开销，完全可接受。

---

## 十三、测试策略

### 13.1 单元测试要点

| 模块 | 测试重点 |
|------|---------|
| A1 MouseSignalCollector | 快照计算准确性；高频 mousemove 下不崩溃；isStill 判定正确 |
| A2 RhythmAnalyzer | 五态切换逻辑；状态持续时长计算；心流20分钟阈值边界；聊天模式检测 |
| A3 CompositeSignalEngine | 活跃度评分 0-100 范围；基线7天滑动窗口；P90 休息阈值计算 |
| A6 rhythm-scenes | 每个场景的 condition 函数；人格化消息正确性；cooldown 逻辑 |

### 13.2 集成测试

| 场景 | 验证点 |
|------|-------|
| 正常工作20分钟 | 应检测到心流状态，心流结束后触发 flow-guard 场景 |
| 快速删除+慢速打字 | 应检测到 stuck 状态，触发 stuck-comfort 场景 |
| 30分钟无操作后回来 | 应先进入 away，回来后触发 welcome-back |
| 鼠标移动但不打字 5分钟 | 应进入 reading 状态，触发 quiet-companion |
| 仪表盘实时刷新 | 每30秒 CPM/退格率/鼠标指标应更新 |

---

## 十四、实施计划

### Phase 1: 信号基础 (A1 + A2 + A3)

| 步骤 | 工作项 | 预估 | 依赖 |
|------|--------|------|------|
| 1.1 | 新建 `mouse-signal-collector.js` | 2h | 无 |
| 1.2 | 修改 `main.js` 加 mousemove 节流 | 0.5h | 无 |
| 1.3 | 新建 `rhythm-analyzer.js` 五态分析 | 4h | 1.1 |
| 1.4 | 新建 `composite-signal-engine.js` | 3h | 1.1 |
| 1.5 | 修改 `renderer.js` 初始化V2模块 | 1h | 1.1-1.4 |
| 1.6 | 修改 `proactive-engine.js` 支持外部信号 | 1h | 1.3 |
| 1.7 | 单元测试 + 联调 | 2h | 1.1-1.6 |
| | **Phase 1 合计** | **~13.5h** | |

### Phase 4: 展示 & 场景 (A4 + A5 + A6)

| 步骤 | 工作项 | 预估 | 依赖 |
|------|--------|------|------|
| 4.1 | 新建 `rhythm-dashboard.js` | 4h | Phase 1 |
| 4.2 | 修改 `index.html` + `styles.css` | 2h | 4.1 |
| 4.3 | 新建 `rhythm-scenes.js` (7个场景) | 3h | Phase 1 |
| 4.4 | 注册场景到 ProactiveEngine | 1h | 4.3 |
| 4.5 | 修改 `daily-report.js` 注入节奏数据 | 2h | Phase 1 |
| 4.6 | 新建 `weekly-report/SKILL.md` | 1h | 4.5 |
| 4.7 | 集成测试 + 调优 | 3h | 4.1-4.6 |
| | **Phase 4 合计** | **~16h** | |

### 总计

| Phase | 工时 | 新建文件 | 修改文件 |
|-------|------|---------|---------|
| Phase 1 (A1-A3) | ~13.5h | 3 | 3 |
| Phase 4 (A4-A6) | ~16h | 3 | 4 |
| **合计** | **~29.5h** | **6** | **7** |

---

## 十五、文件清单汇总

### 新建文件 (6个)

| 文件 | 模块 | 进程 | 说明 |
|------|------|------|------|
| `src/proactive/mouse-signal-collector.js` | A1 | 渲染 | 鼠标信号采集 |
| `src/proactive/rhythm-analyzer.js` | A2 | 渲染 | 五态节奏分析 |
| `src/proactive/composite-signal-engine.js` | A3 | 渲染 | 组合信号+基线 |
| `src/widgets/rhythm-dashboard.js` | A4 | 渲染 | 节奏仪表盘UI |
| `src/proactive/scenes/rhythm-scenes.js` | A6 | 渲染 | 7个新场景 |
| `src/skills/skills/weekly-report/SKILL.md` | A5 | 主 | 周报技能定义 |

### 修改文件 (7个)

| 文件 | 修改内容 |
|------|---------|
| `main.js` | mousemove 节流 (3行) |
| `src/renderer.js` | V2模块初始化 + 事件桥接 (~30行) |
| `src/proactive/proactive-engine.js` | 新增 `processExternalSignal` + `setRhythmModules` (~15行) |
| `src/index.html` | Tools面板新增"节奏"Tab (2行) |
| `src/styles.css` | `.rhythm-*` 系列样式 (~80行) |
| `src/skills/daily-report.js` | 注入节奏数据到AI prompt (~20行) |
| `src/skills/skills/daily-report/SKILL.md` | 更新 prompt 模板 |

---

## 十六、风险 & 缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| mousemove 高频导致 IPC 拥堵 | 性能下降 | main.js 50ms节流；渲染端只做加法 |
| 五态识别误判率高 | 用户体验差 | 置信度阈值 > 0.6 才触发；cooldown 防连续误触 |
| 心流20分钟阈值过长 | 用户等不到心流场景 | 可配置化；先默认20分钟，后续收集数据调优 |
| 渲染进程 init() 更复杂 | 启动变慢 | 使用动态 import，不影响首屏 |
| store 数据量增长 | 存储膨胀 | 严格的滚动清理策略（7天/30天） |

---

## 附录 A: CSS 新增样式 (概要)

```css
/* ======= 节奏仪表盘 ======= */
.rhythm-dashboard { padding: 12px; }

.rhythm-realtime {
  background: #f8f9fa;
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 12px;
}

.rhythm-state-display {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.rhythm-state-icon { font-size: 28px; }
.rhythm-state-name { font-size: 15px; font-weight: 700; }
.rhythm-state-detail { font-size: 12px; color: #888; }

.rhythm-meter {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 4px 0;
  font-size: 12px;
}

.meter-bar {
  flex: 1;
  height: 6px;
  background: #e0e0e0;
  border-radius: 3px;
  overflow: hidden;
}

.meter-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s ease;
}

.rhythm-hourly {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 40px;
  margin: 8px 0;
}

.rhythm-hourly .bar {
  flex: 1;
  border-radius: 2px 2px 0 0;
  min-width: 4px;
  transition: height 0.3s ease;
}

.rhythm-insights .insight-card {
  background: linear-gradient(135deg, #f8f9ff, #f0f4ff);
  border: 1px solid #e0e8ff;
  border-radius: 8px;
  padding: 8px 10px;
  margin: 4px 0;
  font-size: 12px;
}
```

---

## 附录 B: 与产品方案对照表

| 产品模块 | 技术模块 | 方案覆盖 | 备注 |
|---------|---------|---------|------|
| A1 鼠标信号化 | MouseSignalCollector | ✅ 完整 | 消费现有IPC通道 |
| A2 节奏分析器 | RhythmAnalyzer | ✅ 完整 | 五态识别+置信度 |
| A3 组合信号引擎 | CompositeSignalEngine | ✅ 完整 | 基线+时段+休息阈值 |
| A4 节奏仪表盘 | RhythmDashboard | ✅ 完整 | Tools新Tab |
| A5 AI节奏画像 | daily-report增强 + weekly-report | ✅ 完整 | 纯数值→AI人话 |
| A6 增强猫咪场景 | rhythm-scenes.js | ✅ 完整 | 7个新场景 |
