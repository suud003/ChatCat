/**
 * Scene 22: Work Phase Detection — L1/L2 notifications
 * Recognizes work phases and provides timely interactions.
 *
 * | Phase           | Detection                    | Behavior                              | Level |
 * |----------------|------------------------------|---------------------------------------|-------|
 * | morning-start  | First typing 8-10            | Greet + show unfinished todos         | L2    |
 * | afternoon-slump| 13:00-14:30 + speed low      | Suggest pomodoro                      | L1    |
 * | wrap-up        | 30min before end hour        | Suggest checking daily report         | L2    |
 * | overtime       | 2h past end hour + active    | Remind to rest                        | L2    |
 */

export const workPhaseDetectScene = {
  id: 22,
  name: 'work-phase-detect',
  type: 'care',
  level: 'L2',
  signal: 'work-phase',
  condition: (ctx) => {
    return ['morning-start', 'afternoon-slump', 'wrap-up', 'overtime'].includes(ctx.phase);
  },
  getMessage: (ctx, personality) => {
    const phase = ctx.phase;

    if (phase === 'morning-start') {
      const messages = {
        lively: [
          '🌅 新的一天开始啦！今天有什么计划吗？',
          '☀️ 早上好呀！猫咪已经准备好陪你工作了！',
          '🌟 又是元气满满的一天！一起加油吧~'
        ],
        cool: [
          '...来了。新的一天。',
          '嗯。开始吧。',
          '又开始了...别太拼。'
        ],
        soft: [
          '🌸 早上好~ 新的一天~ 今天也要好好的哦~',
          '🌸 你来啦~ 猫咪一直在等你呢~',
          '🌸 慢慢来~ 今天也要温柔地度过~'
        ],
        scholar: [
          '📋 新的工作日开始！建议先回顾昨日未完成事项，制定今日计划。',
          '📊 Good morning! 今天的待办清单准备好了吗？',
          '🗓️ 新的一天！先整理优先级，再开始执行。'
        ]
      };
      const pool = messages[personality] || messages.lively;
      return pool[Math.floor(Math.random() * pool.length)];
    }

    if (phase === 'afternoon-slump') {
      const messages = {
        lively: [
          '😴 午后犯困？来个小番茄钟提提神吧！',
          '☕ 下午茶时间！喝杯咖啡再继续~',
          '💤 这个时间段最容易困了~ 站起来动一动！'
        ],
        cool: [
          '...困了？起来走走。',
          '午后低谷期。休息一下。',
          '别硬撑。短暂休息效率更高。'
        ],
        soft: [
          '🌸 午后有点困困的吧~ 休息一下也好哦~',
          '🌸 打个小盹也可以呢~ 猫咪帮你看着~',
          '🌸 喝杯水~ 伸个懒腰~ 会精神很多的~'
        ],
        scholar: [
          '📉 午后效率低谷期。建议：短休 10 分钟或番茄钟 25 分钟集中攻克。',
          '🧪 研究表明午后小睡 15 分钟可以显著提升下午的工作效率。',
          '⏰ 13:00-14:30 是生理节律的低谷。适当休息是科学的选择。'
        ]
      };
      const pool = messages[personality] || messages.lively;
      return pool[Math.floor(Math.random() * pool.length)];
    }

    if (phase === 'wrap-up') {
      const messages = {
        lively: [
          '📝 快下班了！要不要看看今天的日报？输入 /report 一键生成~',
          '🎉 再坚持一下就下班啦！来回顾一下今天的成果吧~',
          '✨ 收工前来看看今天做了什么？ /report 帮你总结！'
        ],
        cool: [
          '...快下班了。日报写了吗？ /report',
          '该总结了。',
          '别忘了日报。 /report'
        ],
        soft: [
          '🌸 快到下班时间了~ 要不要回顾一下今天呢？',
          '🌸 辛苦了一天~ 来看看今天的成果吧~ /report',
          '🌸 今天也辛苦了~ 生成日报总结一下？'
        ],
        scholar: [
          '📊 建议在下班前做一个工作总结。使用 /report 自动生成日报。',
          '📋 工作日即将结束，请确认待办事项状态并生成日报。',
          '🗂️ 每日回顾有助于持续改进。来生成今天的日报吧？'
        ]
      };
      const pool = messages[personality] || messages.lively;
      return pool[Math.floor(Math.random() * pool.length)];
    }

    if (phase === 'overtime') {
      const messages = {
        lively: [
          '🌙 都这么晚了...辛苦了！记得早点休息哦~',
          '😢 还在加班吗？猫咪心疼你...记得吃晚饭了吗？',
          '🌃 好晚了！身体最重要～该收工了吧？'
        ],
        cool: [
          '...够了吧。回去休息。',
          '太晚了。身体比工作重要。',
          '别透支自己。'
        ],
        soft: [
          '🌸 好晚了呢...猫咪有点担心你...早点休息好不好？',
          '🌸 辛苦了...不要太累了哦...猫咪会一直陪着你的...',
          '🌸 记得吃饭了吗？照顾好自己比什么都重要~'
        ],
        scholar: [
          '⚠️ 持续工作过长。长期加班会导致效率下降和健康风险。建议结束今日工作。',
          '📊 当前已超出正常工作时间 2 小时+。休息是为了更好的明天。',
          '🧠 大脑需要充足休息才能保持最佳状态。该下班了。'
        ]
      };
      const pool = messages[personality] || messages.lively;
      return pool[Math.floor(Math.random() * pool.length)];
    }

    return null;
  },
  actions: [],
  cooldown: 60 * 60 * 1000 // 1 hour
};

/**
 * Wrap-up trigger via time-trigger signal.
 * Fires 30min before configured end hour.
 */
export const workWrapUpScene = {
  id: 220,
  name: 'work-wrap-up',
  type: 'efficiency',
  level: 'L2',
  signal: 'time-trigger',
  condition: async (ctx) => {
    const profile = await window.electronAPI.getStore('userProfile');
    const endHour = profile?.workSchedule?.endHour || 18;
    const now = new Date();
    // 30 min before end hour
    return now.getHours() === endHour - 1 && now.getMinutes() >= 30;
  },
  getMessage: (ctx, personality) => {
    const msgs = {
      lively: ['📝 快下班了！要不要生成今天的日报？输入 /report ~'],
      cool: ['...该总结了。 /report'],
      soft: ['🌸 快到下班时间了~ 来回顾一下今天？'],
      scholar: ['📊 建议生成日报总结。/report']
    };
    const pool = msgs[personality] || msgs.lively;
    return pool[Math.floor(Math.random() * pool.length)];
  },
  actions: [
    { label: '生成日报', action: 'trigger-report' },
    { label: '稍后', action: 'dismiss' }
  ],
  cooldown: 12 * 60 * 60 * 1000 // 12 hours
};

/**
 * Overtime trigger via time-trigger signal.
 */
export const workOvertimeScene = {
  id: 221,
  name: 'work-overtime',
  type: 'care',
  level: 'L2',
  signal: 'time-trigger',
  condition: async (ctx) => {
    const profile = await window.electronAPI.getStore('userProfile');
    const endHour = profile?.workSchedule?.endHour || 18;
    return ctx.hour >= endHour + 2 && ctx.hour < 24;
  },
  getMessage: (ctx, personality) => {
    const msgs = {
      lively: ['🌙 都这么晚了...辛苦了！记得早点休息哦~'],
      cool: ['...够了吧。回去休息。'],
      soft: ['🌸 好晚了呢...猫咪有点担心你...'],
      scholar: ['⚠️ 持续工作过长。建议结束今日工作。']
    };
    const pool = msgs[personality] || msgs.lively;
    return pool[Math.floor(Math.random() * pool.length)];
  },
  actions: [],
  cooldown: 2 * 60 * 60 * 1000 // 2 hours
};
