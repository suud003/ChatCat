/**
 * Scene 1: Daily Report — L3 notification
 * Triggered daily at configured hour (default 18:00).
 * Full implementation depends on Skill system (Batch 3).
 * This registers the scene framework for ProactiveEngine.
 */

export const dailyReportScene = {
  id: 1,
  name: 'daily-report',
  type: 'info',
  level: 'L3',
  signal: 'time-trigger',
  condition: (ctx) => {
    const config = ctx._dailyReportHour || 18;
    return ctx.hour === config && ctx.type !== 'first-active';
  },
  getMessage: (ctx, personality) => {
    const messages = {
      lively: '🎉 今天的日报已经生成好啦！快来看看你今天都做了什么~ (>^ω^<)',
      cool: '...日报好了。看不看随你。',
      soft: '🌸 日报已经帮你整理好了~ 辛苦啦~ (´・ω・`)',
      scholar: '📊 今天的日报已准备好。数据显示你今天很高效呢！'
    };
    return messages[personality] || messages.lively;
  },
  actions: [
    { label: '查看日报', action: 'view-report' },
    { label: '稍后再看', action: 'dismiss' }
  ],
  cooldown: 12 * 60 * 60 * 1000 // 12 hours
};
