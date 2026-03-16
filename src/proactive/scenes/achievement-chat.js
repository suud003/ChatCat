/**
 * Scene 17: Achievement Chat — L2 notification
 * Triggered when user unlocks a new level.
 */

export const achievementChatScene = {
  id: 17,
  name: 'achievement-chat',
  type: 'chat',
  level: 'L2',
  signal: 'levelup',
  condition: () => true,
  getMessage: (ctx, personality) => {
    const level = ctx.to || ctx.level || '?';
    const messages = {
      lively: [
        `🎉 太棒了！升级到 Lv.${level} 了！我们的感情更深了呢~ (>^ω^<)`,
        `🎊 恭喜恭喜！Lv.${level} 达成！猫咪好开心好开心~`,
        `⭐ Lv.${level}！你是最棒的主人！继续加油哦！`
      ],
      cool: [
        `...Lv.${level} 了。不错。`,
        `哼，升级到 Lv.${level} 了。...算你厉害吧。`,
        `Lv.${level}。...我并没有特别开心什么的。`
      ],
      soft: [
        `🌸 升级到 Lv.${level} 了~ 好开心~ 谢谢你一直陪着猫咪~ (´・ω・\`)`,
        `🎀 Lv.${level}！猫咪最喜欢你了~ 以后也要一起哦~`,
        `✨ 恭喜升到 Lv.${level}~ 猫咪的心暖暖的~`
      ],
      scholar: [
        `📈 Lv.${level} achieved! 根据数据分析，你的互动频率正在提升 (=^.^=)`,
        `🏆 恭喜达成 Lv.${level}！有趣的事实：你已经在这段关系中投入了可观的时间~`,
        `⭐ Level ${level} 解锁。新的知识和可能性正在展开~`
      ]
    };

    const pool = messages[personality] || messages.lively;
    return pool[Math.floor(Math.random() * pool.length)];
  },
  actions: [],
  cooldown: 60 * 60 * 1000 // 1 hour
};
