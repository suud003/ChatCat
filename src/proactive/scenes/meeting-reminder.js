/**
 * Scene 3: Meeting Reminder — L2 notification
 * Detects "会议" + "结束" keywords in typing context.
 */

export const meetingReminderScene = {
  id: 3,
  name: 'meeting-reminder',
  type: 'info',
  level: 'L2',
  signal: 'typing-pause',
  condition: (ctx) => {
    // This would be triggered by text converter detecting meeting keywords
    // For now, it's registered but requires Skill system integration
    return false;
  },
  getMessage: (ctx, personality) => {
    const messages = {
      lively: '📋 会议结束啦！要不要整理一下会议纪要~ (>^ω^<)',
      cool: '...会议结束了？该写纪要了吧。',
      soft: '📋 会议辛苦了~ 猫咪帮你提醒一下写纪要哦~ (´・ω・`)',
      scholar: '📝 会议已结束。建议趁记忆清晰时整理纪要，符合艾宾浩斯遗忘曲线原理~'
    };
    return messages[personality] || messages.lively;
  },
  actions: [
    { label: '开始整理', action: 'start-notes' },
    { label: '稍后', action: 'dismiss' }
  ],
  cooldown: 60 * 60 * 1000 // 1 hour
};
