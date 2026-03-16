/**
 * Scene 25: Calendar Aware — L1/L2 notifications
 * Date, day-of-week, holiday, and season awareness.
 *
 * All messages are local (0 token). Checks run on hourly time-trigger.
 */

// Chinese public holidays (month-day format)
const HOLIDAYS = {
  '01-01': { name: '元旦', emoji: '🎆' },
  '02-14': { name: '情人节', emoji: '💕' },
  '03-08': { name: '妇女节', emoji: '🌷' },
  '04-01': { name: '愚人节', emoji: '🃏' },
  '05-01': { name: '劳动节', emoji: '🛠️' },
  '05-04': { name: '青年节', emoji: '💪' },
  '06-01': { name: '儿童节', emoji: '🎈' },
  '10-01': { name: '国庆节', emoji: '🇨🇳' },
  '10-31': { name: '万圣节', emoji: '🎃' },
  '12-24': { name: '平安夜', emoji: '🎄' },
  '12-25': { name: '圣诞节', emoji: '🎅' }
};

function getSeason(month) {
  if (month >= 3 && month <= 5) return { name: '春天', emoji: '🌸' };
  if (month >= 6 && month <= 8) return { name: '夏天', emoji: '☀️' };
  if (month >= 9 && month <= 11) return { name: '秋天', emoji: '🍂' };
  return { name: '冬天', emoji: '❄️' };
}

export const calendarWeekendScene = {
  id: 25,
  name: 'calendar-weekend',
  type: 'chat',
  level: 'L2',
  signal: 'time-trigger',
  condition: (ctx) => {
    if (ctx.type !== 'first-active') return false;
    const day = new Date().getDay();
    return day === 0 || day === 6;
  },
  getMessage: (ctx, personality) => {
    const messages = {
      lively: [
        '🎉 周末了！今天不工作也可以来陪猫咪玩哦~',
        '🎊 周末愉快！好好放松一下吧~',
        '😸 周末啦！今天想做什么有趣的事？'
      ],
      cool: [
        '周末。...好好休息。',
        '不用工作吧？休息去。',
        '...周末了。别想工作的事。'
      ],
      soft: [
        '🌸 周末了~ 好好休息哦~ 猫咪也想一起玩~',
        '🌸 周末快乐~ 今天也要开开心心的~',
        '🌸 不用上班~ 慢慢享受周末时光~'
      ],
      scholar: [
        '📅 周末时间！适度休息有助于下周的工作效率。',
        '🧘 周末建议：回顾本周成果，为下周做轻量规划。',
        '📊 工作与休息的平衡是高效能的关键。享受周末吧！'
      ]
    };
    const pool = messages[personality] || messages.lively;
    return pool[Math.floor(Math.random() * pool.length)];
  },
  actions: [],
  cooldown: 24 * 60 * 60 * 1000 // 24 hours
};

export const calendarMondayScene = {
  id: 251,
  name: 'calendar-monday',
  type: 'chat',
  level: 'L2',
  signal: 'time-trigger',
  condition: (ctx) => {
    if (ctx.type !== 'first-active') return false;
    return new Date().getDay() === 1;
  },
  getMessage: (ctx, personality) => {
    const messages = {
      lively: [
        '💪 又是元气满满的周一！这周想完成什么？',
        '🌟 新的一周开始啦！给自己定个小目标吧~',
        '⚡ 周一加油！猫咪和你一起冲冲冲~'
      ],
      cool: [
        '...周一。开始吧。',
        '新的一周。别拖延。',
        '周一。...加油吧，大概。'
      ],
      soft: [
        '🌸 周一了~ 新的一周~ 慢慢来不着急~',
        '🌸 新的开始~ 这周也要温柔地度过哦~',
        '🌸 周一加油~ 猫咪会一直陪着你~'
      ],
      scholar: [
        '📋 新的工作周！建议先回顾上周总结，制定本周优先级。',
        '🗓️ 周一 = 计划日。花 10 分钟整理待办清单会节省一整周的时间。',
        '📊 一周之计在于周一。明确目标，逐步执行。'
      ]
    };
    const pool = messages[personality] || messages.lively;
    return pool[Math.floor(Math.random() * pool.length)];
  },
  actions: [],
  cooldown: 24 * 60 * 60 * 1000
};

export const calendarFridayScene = {
  id: 252,
  name: 'calendar-friday-afternoon',
  type: 'chat',
  level: 'L1',
  signal: 'time-trigger',
  condition: (ctx) => {
    const now = new Date();
    return now.getDay() === 5 && ctx.hour >= 16 && ctx.hour < 18;
  },
  getMessage: (ctx, personality) => {
    const messages = {
      lively: ['🎉 周五了！坚持最后一下午~ 周末在向你招手！'],
      cool: ['周五下午。...快熬出头了。'],
      soft: ['🌸 周五下午了~ 再坚持一下~ 周末就到了~'],
      scholar: ['📅 周五下午。建议完成本周收尾工作，为下周做好准备。']
    };
    const pool = messages[personality] || messages.lively;
    return pool[Math.floor(Math.random() * pool.length)];
  },
  actions: [],
  cooldown: 24 * 60 * 60 * 1000
};

export const calendarHolidayScene = {
  id: 253,
  name: 'calendar-holiday',
  type: 'chat',
  level: 'L2',
  signal: 'time-trigger',
  condition: (ctx) => {
    if (ctx.type !== 'first-active') return false;
    const now = new Date();
    const key = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return !!HOLIDAYS[key];
  },
  getMessage: (ctx, personality) => {
    const now = new Date();
    const key = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const holiday = HOLIDAYS[key];
    if (!holiday) return null;

    const messages = {
      lively: [`${holiday.emoji} 今天是${holiday.name}！节日快乐~ 猫咪祝你开开心心！`],
      cool: [`${holiday.name}。...节日快乐。`],
      soft: [`${holiday.emoji} ${holiday.name}快乐~ 猫咪也好开心呢~`],
      scholar: [`${holiday.emoji} 今天是${holiday.name}。有趣的节日呢！`]
    };
    const pool = messages[personality] || messages.lively;
    return pool[Math.floor(Math.random() * pool.length)];
  },
  actions: [],
  cooldown: 24 * 60 * 60 * 1000
};

export const calendarSeasonScene = {
  id: 254,
  name: 'calendar-season',
  type: 'chat',
  level: 'L1',
  signal: 'time-trigger',
  condition: (ctx) => {
    if (ctx.type !== 'first-active') return false;
    const day = new Date().getDate();
    const month = new Date().getMonth() + 1;
    // First 3 days of season change months
    return [3, 6, 9, 12].includes(month) && day <= 3;
  },
  getMessage: (ctx, personality) => {
    const season = getSeason(new Date().getMonth() + 1);
    const messages = {
      lively: [`${season.emoji} ${season.name}来了~ 要注意身体哦！`],
      cool: [`${season.name}了。...注意保重。`],
      soft: [`${season.emoji} ${season.name}到了~ 记得照顾好自己~`],
      scholar: [`${season.emoji} 季节变换：进入${season.name}。建议适时调整作息。`]
    };
    const pool = messages[personality] || messages.lively;
    return pool[Math.floor(Math.random() * pool.length)];
  },
  actions: [],
  cooldown: 7 * 24 * 60 * 60 * 1000 // 7 days
};

export const calendarBirthdayScene = {
  id: 255,
  name: 'calendar-birthday',
  type: 'chat',
  level: 'L3',
  signal: 'time-trigger',
  condition: async (ctx) => {
    if (ctx.type !== 'first-active') return false;
    const profile = await window.electronAPI.getStore('userProfile');
    if (!profile?.importantDates?.length) return false;
    const now = new Date();
    const todayStr = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return profile.importantDates.some(d => d.date === todayStr && d.type === 'birthday');
  },
  getMessage: (ctx, personality) => {
    const messages = {
      lively: ['🎂 生日快乐！！！今天猫咪会特别乖的！祝你每一天都开开心心~'],
      cool: ['...生日快乐。今天特别允许你多摸我。'],
      soft: ['🎂🌸 生日快乐~ 猫咪好喜欢你~ 今天是特别的一天~'],
      scholar: ['🎂 生日快乐！有趣的事实：你又完成了一次环绕太阳的旅程！']
    };
    const pool = messages[personality] || messages.lively;
    return pool[Math.floor(Math.random() * pool.length)];
  },
  actions: [],
  cooldown: 24 * 60 * 60 * 1000
};
