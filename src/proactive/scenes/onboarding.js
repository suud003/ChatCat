/**
 * Onboarding Scene — Guided user profile collection
 *
 * Day 1: Occupation / naming (first launch)
 * Day 2: Work schedule + interaction preference
 * Day 3: Work type + productivity tools
 *
 * Triggers as L3 notification with guided chat.
 */

export const onboardingScene = {
  id: 100,
  name: 'onboarding',
  type: 'chat',
  level: 'L3',
  signal: 'onboarding',
  condition: () => true,
  getMessage: (ctx, personality) => {
    const day = ctx.day || 1;
    const questions = ctx.questions || [];

    if (questions.length === 0) return null;

    const greetings = {
      1: {
        lively: `🌟 ${questions[0]} (>^ω^<)`,
        cool: `...${questions[0]}`,
        soft: `🌸 ${questions[0]} (´・ω・\`)`,
        scholar: `📚 ${questions[0]} (=^.^=)`
      },
      2: {
        lively: `✨ ${questions[0]}`,
        cool: `${questions[0]} 告诉我就好。`,
        soft: `🌸 ${questions[0]}`,
        scholar: `🔍 ${questions[0]}`
      },
      3: {
        lively: `🎯 最后一个问题！${questions[0]} (>^ω^<)`,
        cool: `${questions[0]} 这是最后一个问题了。`,
        soft: `🌸 ${questions[0]} 猫咪想更了解你~`,
        scholar: `📊 ${questions[0]} 这有助于猫咪优化工作建议~`
      }
    };

    const dayMessages = greetings[day] || greetings[1];
    return dayMessages[personality] || dayMessages.lively;
  },
  actions: [
    { label: '回复', action: 'reply-onboarding' }
  ],
  cooldown: 12 * 60 * 60 * 1000 // 12 hours
};
