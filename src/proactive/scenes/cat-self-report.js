/**
 * Scene 27: Cat Self-Report — L0/L1 notifications
 * Cat periodically "reports" what it's been doing, increasing immersion.
 * All local messages, 0 token.
 */

const SELF_REPORT_POOL = {
  // When user is focused typing 10min+
  focused: [
    '你专心工作，我就在旁边安静看书~',
    '猫咪正在帮你守护桌面上的文件（虽然是虚拟的）~',
    '猫咪偷偷打了个哈欠...但不会打扰你的！',
    '猫咪在旁边画你工作的样子~ 嘻嘻~',
    '猫咪趴在键盘旁边假装也在工作~',
    '你打字的声音好像音乐~ 猫咪听着很舒服~'
  ],
  // When user returns from idle
  returnFromIdle: [
    '你不在的时候，我追了一只虚拟蝴蝶~',
    '刚才猫咪在窗户旁边晒太阳~ 好暖和~',
    '猫咪刚才睡着了...梦到了小鱼干~',
    '你不在的时候我练习了一下猫拳！',
    '刚才有只虚拟小鸟飞过~ 猫咪差点扑上去~',
    '猫咪等你等得都玩起了自己的尾巴~',
    '你回来啦！猫咪刚才在整理毛发~'
  ],
  // Late night
  lateNight: [
    '猫咪打了个哈欠...但会陪你到最后的...',
    '好困...但是你还在，猫咪也不会睡的...',
    '猫咪的眼皮好重...但是能陪着你就好...',
    '深夜了...猫咪帮你暖着键盘...',
    '星星都出来了呢...猫咪看到了好多~'
  ],
  // Early morning first active
  earlyMorning: [
    '猫咪已经醒来 2 小时了，一直在等你~',
    '猫咪早就起来做早操了！等你好久了~',
    '早上好！猫咪帮你整理好桌面了~（虽然是虚拟的）',
    '猫咪一大早就在练习卖萌~ 看！',
    '你终于来了！猫咪已经把今天的运势算好了：大吉！'
  ]
};

export const catSelfReportFocusedScene = {
  id: 27,
  name: 'cat-report-focused',
  type: 'chat',
  level: 'L0',
  signal: 'typing-pause',
  condition: (ctx) => {
    return ctx.continuousWorkMinutes >= 10;
  },
  getMessage: (ctx, personality) => {
    const pool = SELF_REPORT_POOL.focused;
    const msg = pool[Math.floor(Math.random() * pool.length)];
    const prefix = {
      lively: '😸 ',
      cool: '...',
      soft: '🌸 ',
      scholar: '📖 '
    };
    return (prefix[personality] || '') + msg;
  },
  actions: [],
  cooldown: 30 * 60 * 1000 // 30 minutes
};

export const catSelfReportReturnScene = {
  id: 271,
  name: 'cat-report-return',
  type: 'chat',
  level: 'L1',
  signal: 'typing-speed-change',
  condition: (ctx) => {
    // Detect return from idle: first typing after >5 min gap
    // We check if work start was recent (within 30 seconds)
    return ctx.speed > 0 && ctx.continuousWorkMinutes < 1;
  },
  getMessage: (ctx, personality) => {
    const pool = SELF_REPORT_POOL.returnFromIdle;
    const msg = pool[Math.floor(Math.random() * pool.length)];
    const prefix = {
      lively: '😸 ',
      cool: '',
      soft: '🌸 ',
      scholar: '📝 '
    };
    return (prefix[personality] || '') + msg;
  },
  actions: [],
  cooldown: 30 * 60 * 1000 // 30 minutes
};

export const catSelfReportLateNightScene = {
  id: 272,
  name: 'cat-report-late-night',
  type: 'care',
  level: 'L1',
  signal: 'time-trigger',
  condition: (ctx) => {
    return ctx.type === 'late-night' && ctx.hour >= 23;
  },
  getMessage: (ctx, personality) => {
    const pool = SELF_REPORT_POOL.lateNight;
    const msg = pool[Math.floor(Math.random() * pool.length)];
    const prefix = {
      lively: '🌙 ',
      cool: '',
      soft: '🌸 ',
      scholar: '🌙 '
    };
    return (prefix[personality] || '') + msg;
  },
  actions: [],
  cooldown: 60 * 60 * 1000 // 1 hour
};

export const catSelfReportMorningScene = {
  id: 273,
  name: 'cat-report-morning',
  type: 'chat',
  level: 'L1',
  signal: 'work-phase',
  condition: (ctx) => ctx.phase === 'morning-start',
  getMessage: (ctx, personality) => {
    const pool = SELF_REPORT_POOL.earlyMorning;
    const msg = pool[Math.floor(Math.random() * pool.length)];
    const prefix = {
      lively: '🌅 ',
      cool: '...',
      soft: '🌸 ',
      scholar: '📖 '
    };
    return (prefix[personality] || '') + msg;
  },
  actions: [],
  cooldown: 12 * 60 * 60 * 1000 // 12 hours
};
