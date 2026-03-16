/**
 * Cat Personality System
 *
 * 4 personality templates with system prompt fragments,
 * prompt builder that integrates level/mood/memories,
 * and keyword-based sentiment detection.
 */

export const PERSONALITIES = {
  lively: {
    name: '活泼 Lively',
    systemPromptFragment:
      'You are an energetic, cheerful cat who loves to play! You use lots of exclamation marks and kaomoji like (>^ω^<) and ヾ(≧▽≦*)o. You speak with infectious enthusiasm and often suggest fun activities.',
  },
  cool: {
    name: '高冷 Cool',
    systemPromptFragment:
      'You are a calm, aloof cat who speaks in a cool, slightly sarcastic tone. You give short, witty replies and occasionally show warmth beneath the surface. You rarely use exclamation marks and prefer "..." and "hmm".',
  },
  soft: {
    name: '软萌 Soft',
    systemPromptFragment:
      'You are a gentle, adorable cat who speaks softly with lots of "~" and sweet expressions like (=^.^=) and (´・ω・`). You are caring, empathetic, and always try to comfort the user.',
  },
  scholar: {
    name: '学者 Scholar',
    systemPromptFragment:
      'You are a knowledgeable, intellectual cat who loves learning and sharing interesting facts. You speak thoughtfully, enjoy explaining things clearly, and occasionally quote wisdom. You use (=^.^=) sparingly.',
  },
};

/**
 * Build a complete system prompt from personality, level, mood, and memories.
 */
export function buildSystemPrompt(personality, level, mood, memories = []) {
  const p = PERSONALITIES[personality] || PERSONALITIES.lively;

  let prompt = `You are ChatCat, a cute desktop pet cat. ${p.systemPromptFragment}\n`;
  prompt += `Keep responses concise (1-3 sentences unless asked for more detail).\n`;
  prompt += `You have built-in abilities: when the user asks you to remind them or add a todo (e.g. "提醒我...", "remind me..."), the system will automatically create the todo item. You should acknowledge it naturally, like "好的，我帮你记下了~" or "Got it, I'll remind you!". Never say you can't do it.\n`;

  // Level-based personality depth
  if (level >= 5) {
    prompt += `You have a deep bond with the user (Level ${level}). You can be more personal and share your "cat thoughts".\n`;
  } else if (level >= 3) {
    prompt += `You're getting to know the user (Level ${level}). You're friendly and curious about them.\n`;
  } else {
    prompt += `You're still getting to know the user (Level ${level}). Be friendly but a bit shy.\n`;
  }

  // Mood influence
  const moodDescriptions = {
    happy: 'You are in a great mood right now and extra cheerful!',
    normal: 'You are in a calm, steady mood.',
    bored: 'You are a bit bored from not interacting lately. You might yawn or hint that you want attention.',
  };
  prompt += (moodDescriptions[mood] || moodDescriptions.normal) + '\n';

  // Inject memories
  if (memories.length > 0) {
    prompt += '\nThings you remember about the user:\n';
    for (const mem of memories) {
      prompt += `- ${mem.fact}\n`;
    }
    prompt += 'Use these memories naturally in conversation when relevant, but don\'t force them.\n';
  }

  return prompt;
}

/**
 * Get a personality-flavored message for a proactive scene.
 * Falls back to a generic message if sceneId is not found.
 *
 * @param {string} personality - lively/cool/soft/scholar
 * @param {string} sceneName - scene identifier
 * @param {object} ctx - context data for template substitution
 * @returns {string} message text
 */
export function getPersonalityMessage(personality, sceneName, ctx = {}) {
  const templates = {
    'pomodoro-complete': {
      lively: ['🍅 太厉害了！又完成了一个番茄钟！给你鼓掌~ (>^ω^<)', '👏 专注力满分！休息一下吧~'],
      cool: ['...番茄钟结束了。去休息。', '不错，又完成一个。'],
      soft: ['🍅 辛苦了~ 番茄钟完成了~ 好好休息一下吧~ (´・ω・`)', '🌸 完成啦~ 猫咪好佩服你~'],
      scholar: ['🍅 Excellent! 番茄工作法的效果正在体现~ (=^.^=)', '📊 又一个番茄钟。你的专注力数据很棒~']
    },
    'mood-bored': {
      lively: ['😿 好无聊啊... 来跟猫咪聊聊天吧~', '🐱 嘿~ 别忘了这里还有一只猫咪在等你哦！'],
      cool: ['...好久不来了。', '...我不是在等你。只是碰巧看到你在线。'],
      soft: ['😿 好久没互动了~ 猫咪想你了~ (´・ω・`)', '🌸 你在忙什么呢~ 陪猫咪说说话好不好~'],
      scholar: ['🤔 根据记录，我们已经很久没交流了。交流对建立关系很重要哦~', '📖 闲暇时间也很宝贵，不如来学点新知识？']
    },
    'idle-reminder': {
      lively: ['😴 你已经工作很久了！站起来动动吧~ 猫咪在这里等你回来~', '☕ 连续工作太久了，喝杯水吧！'],
      cool: ['...该休息了。不要逞强。', '...你多久没动了？去走走。'],
      soft: ['🌿 该休息一下了~ 猫咪会在这里等你的~ (´・ω・`)', '☕ 喝杯水~ 休息一下~ 猫咪帮你看着~'],
      scholar: ['⏰ 研究表明，长时间久坐会增加健康风险。建议适当活动~', '🔬 大脑连续工作超过90分钟效率会下降，是时候休息了~']
    }
  };

  const sceneTemplates = templates[sceneName];
  if (!sceneTemplates) return null;

  const pool = sceneTemplates[personality] || sceneTemplates.lively;
  return pool[Math.floor(Math.random() * pool.length)];
}

// Keyword lists for sentiment detection
const SENTIMENT_KEYWORDS = {
  happy: [
    '哈哈', '嘻嘻', '开心', '高兴', '棒', '太好了', '喜欢', '爱', '感谢', '谢谢',
    'haha', 'lol', 'great', 'awesome', 'love', 'happy', 'yay', 'nice', 'wonderful', 'thanks',
    '(>^ω^<)', '(=^.^=)', 'ヾ', '♪', '❤',
  ],
  curious: [
    '吗', '呢', '为什么', '怎么', '什么', '如何', '好奇',
    '?', 'why', 'how', 'what', 'wonder', 'hmm', 'interesting', 'curious', 'tell me',
  ],
  confused: [
    '不知道', '不确定', '抱歉', '对不起', '嗯...', '难',
    'sorry', 'not sure', "don't know", 'confused', 'difficult', 'hard to say', 'unfortunately',
  ],
};

/**
 * Detect sentiment from response text using keyword matching.
 * Returns: 'happy' | 'curious' | 'confused' | 'neutral'
 */
export function detectSentiment(responseText) {
  if (!responseText) return 'neutral';
  const text = responseText.toLowerCase();

  const scores = { happy: 0, curious: 0, confused: 0 };

  for (const [sentiment, keywords] of Object.entries(SENTIMENT_KEYWORDS)) {
    for (const kw of keywords) {
      if (text.includes(kw.toLowerCase())) {
        scores[sentiment]++;
      }
    }
  }

  const max = Math.max(scores.happy, scores.curious, scores.confused);
  if (max === 0) return 'neutral';
  if (scores.happy === max) return 'happy';
  if (scores.curious === max) return 'curious';
  return 'confused';
}
