/**
 * Scene 7: Late Night Care — L2 notification
 * Triggered when user is still active after 22:00.
 */

export const lateNightCareScene = {
  id: 7,
  name: 'late-night-care',
  type: 'care',
  level: 'L2',
  signal: 'time-trigger',
  condition: (ctx) => ctx.hour >= 22 || ctx.type === 'late-night',
  getMessage: (ctx, personality) => {
    const hour = ctx.hour;
    const messages = {
      lively: `🌙 都 ${hour} 点了！虽然猫咪是夜行动物，但你可不是哦~ 早点休息吧！`,
      cool: `...${hour} 点了。不早了。`,
      soft: `🌙 已经 ${hour} 点了~ 夜深了要早点睡哦~ 猫咪会乖乖等明天的~ (´・ω・\`)`,
      scholar: `🌙 现在是 ${hour}:00，长期熬夜会影响褪黑素分泌。建议尽快休息~ (=^.^=)`
    };
    return messages[personality] || messages.lively;
  },
  actions: [
    { label: '好的，马上睡', action: 'dismiss' },
    { label: '再等一会', action: 'snooze' }
  ],
  cooldown: 120 * 60 * 1000 // 2 hours
};
