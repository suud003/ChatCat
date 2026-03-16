/**
 * Scene 6: Rest Reminder — L2 notification
 * Triggered when continuous work exceeds 90 minutes.
 */

export const restReminderScene = {
  id: 6,
  name: 'rest-reminder',
  type: 'care',
  level: 'L2',
  signal: 'long-work',
  condition: (ctx) => ctx.continuousWorkMinutes > 90,
  getMessage: (ctx, personality) => {
    const minutes = ctx.continuousWorkMinutes;
    const messages = {
      lively: `🌿 你已经连续工作 ${minutes} 分钟了！站起来动动吧~ 猫咪在这里等你回来！(>^ω^<)`,
      cool: `...${minutes} 分钟了。你不累吗？去休息一下吧。`,
      soft: `🌿 已经工作 ${minutes} 分钟了~ 要好好休息一下哦~ 猫咪会担心你的~ (´・ω・\`)`,
      scholar: `⏰ 连续工作 ${minutes} 分钟。研究表明每 90 分钟休息一次可以提高 20% 效率哦~`
    };
    return messages[personality] || messages.lively;
  },
  actions: [
    { label: '好的，休息一下', action: 'dismiss' },
    { label: '稍后提醒', action: 'snooze' }
  ],
  cooldown: 90 * 60 * 1000 // 90 minutes
};
