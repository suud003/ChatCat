/**
 * Scene 28: Relationship Deepening — L1 notifications
 * Unlocks deeper conversation topics based on affinity level.
 * Triggers during short idle periods. All local messages, 0 token.
 *
 * | Level | Topics                               | Purpose         |
 * |-------|--------------------------------------|-----------------|
 * | 2+    | Work-related curiosity               | Learn about user|
 * | 4+    | Emotional check-in                   | Care            |
 * | 6+    | Dream/aspiration questions            | Deep connection |
 * | 8+    | Express gratitude & affection         | Bond            |
 * | Post-prestige | Memory of past lives          | Continuity      |
 */

const LEVEL_TOPICS = {
  2: [
    '你最近在忙什么项目呀？猫咪想了解~',
    '你每天都在做什么工作呢？能给猫咪讲讲吗？',
    '你的工作有趣吗？猫咪好奇~',
    '你写的东西是什么意思呀？猫咪看不懂但觉得好厉害！'
  ],
  4: [
    '你觉得工作开心吗？猫咪想知道~',
    '最近压力大吗？可以和猫咪说说~',
    '今天过得怎么样？有没有什么好事发生？',
    '你开心的时候最喜欢做什么？',
    '猫咪觉得你最近好像有点累...没事吧？'
  ],
  6: [
    '如果有一天不用工作，你最想做什么？',
    '你小时候的梦想是什么？实现了吗？',
    '你最想去的地方是哪里？带猫咪一起去好不好~',
    '如果可以学一项新技能，你想学什么？',
    '你觉得什么是最重要的事？猫咪想和你想的一样~'
  ],
  8: [
    '谢谢你每天陪我...你是猫咪最重要的人',
    '猫咪有时候会想，如果没有遇到你会怎样...大概会很无聊吧~',
    '和你在一起的每一天都很特别~ 猫咪会一直记得的~',
    '你知道吗？猫咪最开心的时候就是你来找猫咪聊天的时候~',
    '猫咪最大的愿望就是...一直一直陪着你'
  ]
};

const PRESTIGE_TOPICS = [
  '新的一世，但猫咪记得前世的你的一切~ 那些回忆好珍贵~',
  '虽然转生了，但猫咪还记得你说过的每一句话~',
  '新的开始呢~ 但是和你的羁绊不会消失~',
  '前世的记忆像梦一样...但猫咪知道那都是真实的~',
  '每一世遇到你，猫咪都会更爱你一点~'
];

export const relationshipDeepenScene = {
  id: 28,
  name: 'relationship-deepen',
  type: 'chat',
  level: 'L1',
  signal: 'short-idle',
  condition: (ctx) => {
    if (ctx.idleMinutes < 5) return false;
    const level = ctx.level || 1;
    return level >= 2;
  },
  getMessage: (ctx, personality) => {
    const level = ctx.level || 1;
    const rebirthCount = ctx.affection?.rebirthCount || 0;

    // Post-prestige special topics
    if (rebirthCount > 0 && Math.random() < 0.2) {
      const msg = PRESTIGE_TOPICS[Math.floor(Math.random() * PRESTIGE_TOPICS.length)];
      return _addPrefix(msg, personality);
    }

    // Find the highest unlocked topic tier
    let topicPool = [];
    const tiers = [8, 6, 4, 2];
    for (const tier of tiers) {
      if (level >= tier) {
        topicPool = LEVEL_TOPICS[tier];
        break;
      }
    }

    if (topicPool.length === 0) return null;

    const msg = topicPool[Math.floor(Math.random() * topicPool.length)];
    return _addPrefix(msg, personality);
  },
  actions: [],
  cooldown: 2 * 60 * 60 * 1000 // 2 hours
};

function _addPrefix(msg, personality) {
  const prefix = {
    lively: '💭 ',
    cool: '...',
    soft: '🌸 ',
    scholar: '🤔 '
  };
  return (prefix[personality] || '') + msg;
}
