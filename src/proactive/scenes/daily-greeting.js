/**
 * Scene 10: Daily Greeting — L3 notification with reply action
 * Triggered on first activity of the day.
 */

export const dailyGreetingScene = {
  id: 10,
  name: 'daily-greeting',
  type: 'chat',
  level: 'L3',
  signal: 'time-trigger',
  condition: (ctx) => ctx.type === 'first-active',
  getMessage: (ctx, personality) => {
    const hour = ctx.hour;
    let timeGreeting;
    if (hour >= 5 && hour < 12) timeGreeting = '早上好';
    else if (hour >= 12 && hour < 14) timeGreeting = '中午好';
    else if (hour >= 14 && hour < 18) timeGreeting = '下午好';
    else timeGreeting = '晚上好';

    const messages = {
      lively: [
        `🌟 ${timeGreeting}呀！今天也要元气满满哦~ (>^ω^<)`,
        `🌟 Hi hi! ${timeGreeting}！新的一天开始啦！一起加油吧！`,
        `🌟 喵~ 你来啦！${timeGreeting}！好开心看到你！`
      ],
      cool: [
        `...哦，${timeGreeting}。嗯，今天也要好好的。`,
        `又见面了。${timeGreeting}。...不是说我在等你或什么的。`,
        `Hmm, ${timeGreeting}。别太累了。`
      ],
      soft: [
        `🌸 ${timeGreeting}~ 今天也要温柔地度过哦~ (´・ω・\`)`,
        `🌸 你来啦~ ${timeGreeting}~ 猫咪一直在等你呢~`,
        `🌸 ${timeGreeting}~ 要好好照顾自己哦~`
      ],
      scholar: [
        `📚 ${timeGreeting}！新的一天，新的知识等着我们！`,
        `📚 ${timeGreeting}。你知道吗？今天在历史上也发生过很多有趣的事~`,
        `📚 ${timeGreeting}。记得保持好奇心哦 (=^.^=)`
      ]
    };

    const pool = messages[personality] || messages.lively;
    return pool[Math.floor(Math.random() * pool.length)];
  },
  actions: [{ label: '回复', action: 'reply' }],
  cooldown: 12 * 60 * 60 * 1000 // 12 hours
};
