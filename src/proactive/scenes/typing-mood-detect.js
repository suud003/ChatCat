/**
 * Scene 21: Typing Mood Detection — L0/L1 notification
 * Detects emotional patterns from typing rhythm changes.
 *
 * | Pattern    | Condition                           | Reaction                          | Level |
 * |-----------|-------------------------------------|-----------------------------------|-------|
 * | frustrated | speed drop >50% + frequent deletes  | "遇到难题了吗？"                  | L1    |
 * | rushing    | speed >200% sustained >30s          | "深呼吸~ 别着急~"                 | L1    |
 * | steady     | speed ±10% sustained >20min         | Silent mark + record to feed      | L0    |
 */

export const typingMoodDetectScene = {
  id: 21,
  name: 'typing-mood-detect',
  type: 'care',
  level: 'L1',  // dynamic — overridden in getMessage
  signal: 'typing-rhythm-change',
  condition: (ctx) => {
    return ctx.pattern === 'frustrated' || ctx.pattern === 'rushing';
  },
  getMessage: (ctx, personality) => {
    if (ctx.pattern === 'frustrated') {
      const messages = {
        lively: [
          '🤔 遇到难题了吗？要不要休息一下换个思路？猫咪陪你~',
          '😣 看起来卡住了？站起来走走，说不定灵感就来了！',
          '💪 别灰心！难题都是暂时的，猫咪相信你！'
        ],
        cool: [
          '...卡住了？出去走走吧。',
          '嗯，暂停一下也好。',
          '别较劲了，换个思路。'
        ],
        soft: [
          '🌸 遇到困难了吗？别着急~ 休息一下也好哦~',
          '🌸 猫咪看到你在烦恼呢...要不要喝杯水缓一缓？',
          '🌸 没关系的~ 慢慢来~ 猫咪会一直陪着你~'
        ],
        scholar: [
          '📊 检测到输入模式异常——频繁退格。建议暂停 5 分钟重新梳理思路。',
          '🧠 根据研究，休息后解决问题的效率更高。要不试试？',
          '📝 遇到瓶颈了？把问题写下来，有时候描述问题本身就是解决方案的一半。'
        ]
      };
      const pool = messages[personality] || messages.lively;
      return pool[Math.floor(Math.random() * pool.length)];
    }

    if (ctx.pattern === 'rushing') {
      const messages = {
        lively: [
          '😮 打字好快！深呼吸~ 猫咪陪你，别着急~',
          '⚡ 慢一点慢一点！急着赶工吗？记得检查一下哦~',
          '🌬️ 嘿嘿，先停下来深呼吸三次~'
        ],
        cool: [
          '...慢点。急也没用。',
          '打这么快...冷静。',
          '别冲动。检查一下再说。'
        ],
        soft: [
          '🌸 好快呀~ 不要着急哦~ 猫咪等你~',
          '🌸 深呼吸~ 慢慢来就好~',
          '🌸 太急的话容易出错呢~ 放轻松~'
        ],
        scholar: [
          '📈 当前输入速度异常偏高。研究表明，冷静时的工作效率更高。',
          '⚠️ 检测到急躁输入模式。建议：暂停 → 深呼吸 → 继续。',
          '🧘 速度不等于效率。试试放慢 20%，准确率会显著提升。'
        ]
      };
      const pool = messages[personality] || messages.lively;
      return pool[Math.floor(Math.random() * pool.length)];
    }

    return null;
  },
  actions: [],
  cooldown: 15 * 60 * 1000 // 15 minutes
};

/**
 * Scene 21b: Steady typing — L0 silent record.
 * Separate scene for L0 to avoid blocking L1 frustrated/rushing.
 */
export const typingSteadyScene = {
  id: 210,
  name: 'typing-steady',
  type: 'info',
  level: 'L0',
  signal: 'typing-rhythm-change',
  condition: (ctx) => ctx.pattern === 'steady',
  getMessage: () => '🔥 稳定高效输出中',
  actions: [],
  cooldown: 30 * 60 * 1000 // 30 minutes
};
