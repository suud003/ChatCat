/**
 * Scene 11: Pomodoro Suggest — L1 notification
 * Suggests starting a pomodoro when user has been working without one.
 */

export const pomodoroSuggestScene = {
  id: 11,
  name: 'pomodoro-suggest',
  type: 'efficiency',
  level: 'L1',
  signal: 'long-work',
  condition: (ctx) => ctx.continuousWorkMinutes >= 45 && ctx.continuousWorkMinutes < 90,
  getMessage: (ctx, personality) => {
    const messages = {
      lively: '🍅 已经工作好一会了！要不要试试番茄钟~ 专注效率 UP UP!',
      cool: '...你知道番茄钟吗。试试看。',
      soft: '🍅 猫咪建议你可以用番茄钟来管理时间~ 效率会更高哦~',
      scholar: '🍅 根据番茄工作法，25分钟专注+5分钟休息可以最大化工作效率~'
    };
    return messages[personality] || messages.lively;
  },
  actions: [],
  cooldown: 120 * 60 * 1000 // 2 hours
};
