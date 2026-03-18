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

function getYesterdayDate() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

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
