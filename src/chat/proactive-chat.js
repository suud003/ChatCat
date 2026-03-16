/**
 * Proactive Chat System
 *
 * Makes the cat initiate conversations based on events and conditions:
 * - Daily greeting (first open of the day)
 * - Idle reminder (> 2 hours)
 * - Mood comfort (when bored)
 * - Level up celebration
 * - Pomodoro completion praise
 */

const GREETINGS = {
  lively: [
    '🌟 早上好呀！今天也要元气满满哦~ (>^ω^<)',
    '🌟 Hi hi! 新的一天开始啦！一起加油吧！',
    '🌟 喵~ 你来啦！好开心看到你！',
  ],
  cool: [
    '...哦，你来了。嗯，今天也要好好的。',
    '又见面了。...不是说我在等你或什么的。',
    'Hmm, 新的一天。别太累了。',
  ],
  soft: [
    '🌸 早安~ 今天也要温柔地度过哦~ (´・ω・`)',
    '🌸 你来啦~ 猫咪一直在等你呢~',
    '🌸 新的一天~ 要好好照顾自己哦~',
  ],
  scholar: [
    '📚 新的一天，新的知识等着我们！Today is a good day to learn.',
    '📚 你知道吗？今天在历史上也发生过很多有趣的事~',
    '📚 早安。记得保持好奇心哦 (=^.^=)',
  ],
};

const IDLE_MESSAGES = [
  '😴 你已经工作很久了... 要不要休息一下？站起来动动吧~',
  '☕ 喵~ 连续工作太久了，喝杯水休息一下吧！',
  '🌿 该休息一下了！猫咪在这里等你回来~',
];

const BORED_MESSAGES = [
  '😿 好无聊啊... 来跟猫咪聊聊天吧~',
  '🐱 喵... 好久没有互动了，想你了~',
  '😺 嘿~ 别忘了这里还有一只猫咪在等你哦！',
];

const LEVELUP_MESSAGES = [
  '🎉 太棒了！升级啦！我们的关系更近了一步~ Level {level}!',
  '🎊 恭喜升级到 Lv.{level}！继续加油哦！',
  '⭐ Lv.{level} 达成！猫咪好开心~',
];

const POMODORO_MESSAGES = [
  '🍅 太厉害了！又完成了一个番茄钟！给你鼓掌~',
  '👏 专注力满分！休息一下吧，你值得的！',
  '🌟 番茄钟完成！你的效率让猫咪佩服~',
];

const IDLE_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours
const CHECK_INTERVAL_MS = 60 * 1000; // 60 seconds

export class ProactiveChat {
  constructor(affectionSystem, showBubbleFn) {
    this._affection = affectionSystem;
    this._showBubble = showBubbleFn;
    this._personality = 'lively';
    this._greetDate = null;
    this._lastIdleReminder = 0;
    this._lastBubbleTime = 0;
    this._checkTimer = null;
  }

  setPersonality(p) {
    this._personality = p;
  }

  async init() {
    this._greetDate = await window.electronAPI.getStore('proactiveGreetDate');

    // Daily greeting
    const today = new Date().toISOString().split('T')[0];
    if (this._greetDate !== today) {
      this._greetDate = today;
      await window.electronAPI.setStore('proactiveGreetDate', today);
      setTimeout(() => {
        const greetings = GREETINGS[this._personality] || GREETINGS.lively;
        this._showBubble(this._pick(greetings), 6000);
      }, 2000);
    }

    // Event-driven listeners
    this._affection.on('levelup', (data) => {
      const msg = this._pick(LEVELUP_MESSAGES).replace('{level}', data.to);
      this._showBubbleThrottled(msg, 6000);
    });

    this._affection.on('moodchange', (data) => {
      if (data.to === 'bored') {
        this._showBubbleThrottled(this._pick(BORED_MESSAGES), 5000);
      }
    });

    // Periodic check for idle reminder
    this._checkTimer = setInterval(() => this._checkIdle(), CHECK_INTERVAL_MS);
  }

  /** Called externally when pomodoro completes */
  onPomodoroComplete() {
    this._showBubbleThrottled(this._pick(POMODORO_MESSAGES), 5000);
  }

  destroy() {
    clearInterval(this._checkTimer);
  }

  _checkIdle() {
    const idleMs = Date.now() - this._affection._lastInteractionTime;
    if (idleMs > IDLE_THRESHOLD_MS && Date.now() - this._lastIdleReminder > IDLE_THRESHOLD_MS) {
      this._lastIdleReminder = Date.now();
      this._showBubble(this._pick(IDLE_MESSAGES), 6000);
    }
  }

  _showBubbleThrottled(text, duration) {
    const now = Date.now();
    if (now - this._lastBubbleTime < 10000) return; // 10s throttle
    this._lastBubbleTime = now;
    this._showBubble(text, duration);
  }

  _pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }
}
