/**
 * Scene 23: Milestone Celebration — L1/L2 notifications
 * Celebrates user achievements and milestones.
 *
 * | Milestone         | Trigger                       | Behavior                          | Level |
 * |------------------|-------------------------------|-----------------------------------|-------|
 * | Streak 7/30/100  | streakDays milestone          | Celebration message               | L2    |
 * | Typing count     | 1000/5000/10000 today         | Acknowledge effort                | L1    |
 * | Prestige         | prestige event                | New beginning message             | L2    |
 * | First purchase   | petBase purchase              | Appreciation                      | L2    |
 * | Note milestone   | quickNotes 10/50/100          | Acknowledgement                   | L1    |
 */

export const milestoneStreakScene = {
  id: 23,
  name: 'milestone-streak',
  type: 'chat',
  level: 'L2',
  signal: 'time-trigger',
  condition: (ctx) => {
    if (ctx.type !== 'first-active') return false;
    const streakDays = ctx.affection?.streakDays || 0;
    return [7, 14, 30, 60, 100, 200, 365].includes(streakDays);
  },
  getMessage: (ctx, personality) => {
    const days = ctx.affection?.streakDays || 0;
    const messages = {
      lively: [
        `🎉 连续 ${days} 天了！你真的很棒！猫咪好感动~`,
        `⭐ ${days} 天的陪伴！谢谢你每天都来看猫咪！`,
        `🏆 ${days} 天成就达成！我们的友谊越来越深了~`
      ],
      cool: [
        `...${days} 天了。不错。`,
        `${days} 天。...我并没有在数。`,
        `嗯，${days} 天了。你很有毅力。`
      ],
      soft: [
        `🌸 ${days} 天了呢~ 谢谢你一直陪着猫咪~ 好幸福~`,
        `🎀 ${days} 天的回忆~ 每一天都很珍贵呢~`,
        `✨ 连续 ${days} 天~ 猫咪的心暖暖的~`
      ],
      scholar: [
        `📊 连续活跃 ${days} 天！根据行为科学，你已经形成了稳定的习惯！`,
        `🏅 ${days} 天连续记录！持续性是成功的关键因素之一。`,
        `📈 ${days} 天 streak! 你的坚持值得肯定。`
      ]
    };
    const pool = messages[personality] || messages.lively;
    return pool[Math.floor(Math.random() * pool.length)];
  },
  actions: [],
  cooldown: 24 * 60 * 60 * 1000 // 24 hours
};

export const milestonePrestigeScene = {
  id: 231,
  name: 'milestone-prestige',
  type: 'chat',
  level: 'L2',
  signal: 'prestige',
  condition: () => true,
  getMessage: (ctx, personality) => {
    const messages = {
      lively: [
        '✨ 新的开始！这一世会走得更远~ 加油！',
        '🌟 转生成功！猫咪升级了！新的冒险开始~',
        '🎊 恭喜转生！永久倍率提升！更强的我们来了~'
      ],
      cool: [
        '...新的一世。走吧。',
        '转生了。...重新开始也不错。',
        '嗯。这次会更强。'
      ],
      soft: [
        '🌸 新的一世~ 但猫咪记得前世的你的一切~',
        '✨ 转生了呢~ 不管几世，猫咪都会陪着你~',
        '🎀 新的开始~ 带着所有回忆~ 继续前进~'
      ],
      scholar: [
        '🔄 转生完成！永久倍率已提升。这是增量进步的最佳策略。',
        '📈 New Game+! 保留了宝贵的经验，以更高的基数重新开始。',
        '🧬 进化完成。新的阶段将解锁更多可能性。'
      ]
    };
    const pool = messages[personality] || messages.lively;
    return pool[Math.floor(Math.random() * pool.length)];
  },
  actions: [],
  cooldown: 60 * 60 * 1000 // 1 hour
};

export const milestoneTypingCountScene = {
  id: 232,
  name: 'milestone-typing-count',
  type: 'info',
  level: 'L1',
  signal: 'typing-speed-change',
  condition: (ctx) => {
    const typing = ctx.affection?._dailyStats?.typing || 0;
    return [1000, 5000, 10000, 20000].includes(typing) ||
           (typing > 0 && typing % 5000 === 0);
  },
  getMessage: (ctx, personality) => {
    const count = ctx.affection?._dailyStats?.typing || 0;
    const messages = {
      lively: [`⌨️ 今天打了 ${count} 个字！真是码字小能手~`],
      cool: [`${count} 字了。...还行。`],
      soft: [`🌸 今天打了 ${count} 个字呢~ 辛苦了~`],
      scholar: [`📊 今日输入量：${count} 字符。生产力数据记录中。`]
    };
    const pool = messages[personality] || messages.lively;
    return pool[Math.floor(Math.random() * pool.length)];
  },
  actions: [],
  cooldown: 2 * 60 * 60 * 1000 // 2 hours
};

export const milestoneNoteScene = {
  id: 233,
  name: 'milestone-notes',
  type: 'info',
  level: 'L1',
  signal: 'time-trigger',
  condition: async (ctx) => {
    const notes = await window.electronAPI.getStore('quickNotes') || [];
    return [10, 25, 50, 100, 200].includes(notes.length);
  },
  getMessage: async (ctx, personality) => {
    const notes = await window.electronAPI.getStore('quickNotes') || [];
    const count = notes.length;
    const messages = {
      lively: [`📝 已经记了 ${count} 条笔记了！猫咪帮你保管得好好的~`],
      cool: [`${count} 条笔记了。...不少了。`],
      soft: [`🌸 ${count} 条笔记呢~ 都是珍贵的记录~`],
      scholar: [`📚 笔记里程碑：${count} 条！知识积累是复利增长的。`]
    };
    const pool = messages[personality] || messages.lively;
    return pool[Math.floor(Math.random() * pool.length)];
  },
  actions: [],
  cooldown: 24 * 60 * 60 * 1000 // 24 hours
};
