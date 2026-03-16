/**
 * Scene 26: Idle Chat — L1 notification
 * When user is idle 5-15 minutes but not gone (short idle).
 * Throws out light conversation topics from a local message pool.
 * 0 token cost.
 */

const TOPIC_POOL = {
  trivia: [
    '你知道吗？猫每天要睡 16 个小时呢~ 好羡慕...',
    '据说猫的前爪有 5 个指头，后爪有 4 个~ 你数过吗？',
    '猫的听力是人类的 5 倍哦！所以猫咪能听到很多秘密~',
    '世界上最长寿的猫活了 38 年！猫咪也要努力~',
    '猫打呼噜的频率是 25-50 Hz，据说有助于骨骼愈合呢~',
    '猫的鼻纹和人的指纹一样，每只猫都是独一无二的~',
    '据说猫咪会模仿主人的作息！所以你熬夜，猫咪也陪你熬~',
    '猫咪每天花 30-50% 的时间在梳理毛发上~ 爱美之心~'
  ],
  care: [
    '喝水了吗？猫咪提醒你补充水分~',
    '站起来伸个懒腰吧~ 猫咪教你：两手举高，然后——啊——',
    '眼睛累了吗？看看远方休息一下~',
    '记得保持好坐姿哦~ 脊椎很重要的！',
    '深呼吸三次~ 吸——呼——感觉好多了吧？',
    '活动一下脖子~ 左转——右转——猫咪也跟着做~',
    '饿了吗？吃点东西补充能量吧~'
  ],
  chat: [
    '外面是什么天气呀？猫咪想知道~',
    '今天心情怎么样？可以和猫咪说说~',
    '最近有什么好玩的事吗？',
    '你有养真的猫咪吗？猫咪好奇~',
    '今天的饭好吃吗？猫咪也想尝尝~',
    '你喜欢什么颜色？猫咪想了解你更多~'
  ],
  game: [
    '猜猜猫咪在想什么数字？(1-10) 提示：和猫的指头数有关~',
    '石头剪刀布！猫咪出的是...🐾（猫拳！猫咪永远出猫拳~）',
    '如果猫咪会变身，你希望猫咪变成什么？',
    '来玩个接龙！猫咪先说：「猫」',
    '猫咪给你讲个冷笑话：为什么猫不玩扑克？因为它们总是出猫拳！'
  ]
};

// Flatten all topics
const ALL_TOPICS = [
  ...TOPIC_POOL.trivia,
  ...TOPIC_POOL.care,
  ...TOPIC_POOL.chat,
  ...TOPIC_POOL.game
];

// Track recently used topics to avoid repeats
let _recentTopicIndices = [];

function getRandomTopic() {
  // Avoid last 10 used topics
  let available = ALL_TOPICS.map((_, i) => i).filter(i => !_recentTopicIndices.includes(i));
  if (available.length === 0) {
    _recentTopicIndices = [];
    available = ALL_TOPICS.map((_, i) => i);
  }
  const idx = available[Math.floor(Math.random() * available.length)];
  _recentTopicIndices.push(idx);
  if (_recentTopicIndices.length > 10) _recentTopicIndices.shift();
  return ALL_TOPICS[idx];
}

export const idleChatScene = {
  id: 26,
  name: 'idle-chat',
  type: 'chat',
  level: 'L1',
  signal: 'short-idle',
  condition: (ctx) => {
    return ctx.idleMinutes >= 5 && ctx.idleMinutes < 30;
  },
  getMessage: (ctx, personality) => {
    const topic = getRandomTopic();

    // Add personality flair
    const prefix = {
      lively: '😸 ',
      cool: '',
      soft: '🌸 ',
      scholar: '📝 '
    };

    return (prefix[personality] || '') + topic;
  },
  actions: [],
  cooldown: 10 * 60 * 1000 // 10 minutes
};
