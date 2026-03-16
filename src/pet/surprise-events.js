/**
 * Surprise Event System
 *
 * Random events that pop up via cat bubble to delight the user.
 * 5 event types with level gates, mood-based probability, daily cap.
 */

const EVENTS = [
  {
    id: 'gift',
    minLevel: 1,
    weight: 3,
    messages: [
      '🎁 喵~ 送你一个小礼物！今天也要开心哦~',
      '🎁 Meow~ I found a little gift for you! Hope it makes you smile~',
      '🎁 这是猫咪特意为你准备的！收下吧~',
    ],
  },
  {
    id: 'clingy',
    minLevel: 2,
    weight: 3,
    messages: [
      '🐱 蹭蹭~ 不要忘了我哦！',
      '🐱 *rubs against you* Pay attention to me~',
      '🐱 喵呜... 想要被摸摸头...',
    ],
  },
  {
    id: 'trick',
    minLevel: 3,
    weight: 2,
    messages: [
      '✨ 看！猫咪学会了新把戏！*翻了个跟头*',
      '✨ Ta-da! Watch my new trick! *does a backflip*',
      '✨ 喵喵！看我打滚~ *骨碌碌*',
    ],
  },
  {
    id: 'secret',
    minLevel: 5,
    weight: 1,
    messages: [
      '🤫 悄悄告诉你... 你是猫咪最喜欢的人类！',
      '🤫 Psst... You\'re my favorite human. Don\'t tell anyone!',
      '🤫 猫咪有个秘密... 其实很喜欢听你打字的声音~',
    ],
  },
  {
    id: 'lucky',
    minLevel: 1,
    weight: 2,
    messages: [
      '🍀 今天是幸运日！猫咪觉得会有好事发生~',
      '🍀 Lucky day! I sense something good coming your way~',
      '🍀 喵~ 猫咪的第六感告诉我，今天运气不错！',
    ],
  },
];

const CHECK_INTERVAL_MIN = 15;
const CHECK_INTERVAL_MAX = 20;
const MAX_DAILY_EVENTS = 3;
const BASE_PROBABILITY = 0.15;

export class SurpriseEventSystem {
  constructor(affectionSystem, showBubbleFn) {
    this._affection = affectionSystem;
    this._showBubble = showBubbleFn;
    this._timer = null;
    this._todayData = { date: null, count: 0 };
  }

  async init() {
    const saved = await window.electronAPI.getStore('surpriseEventsToday');
    if (saved && saved.date === this._today()) {
      this._todayData = saved;
    } else {
      this._todayData = { date: this._today(), count: 0 };
    }
    this._scheduleNext();
  }

  destroy() {
    clearTimeout(this._timer);
  }

  _scheduleNext() {
    const delayMs = (CHECK_INTERVAL_MIN + Math.random() * (CHECK_INTERVAL_MAX - CHECK_INTERVAL_MIN)) * 60 * 1000;
    this._timer = setTimeout(() => this._tryTrigger(), delayMs);
  }

  _tryTrigger() {
    // Reset if new day
    if (this._todayData.date !== this._today()) {
      this._todayData = { date: this._today(), count: 0 };
    }

    // Daily cap check
    if (this._todayData.count >= MAX_DAILY_EVENTS) {
      this._scheduleNext();
      return;
    }

    // Calculate probability
    let prob = BASE_PROBABILITY;
    if (this._affection.mood === 'happy') prob += 0.10;
    if (this._affection.level >= 5) prob += 0.05;

    if (Math.random() < prob) {
      const event = this._selectEvent();
      if (event) {
        const msg = event.messages[Math.floor(Math.random() * event.messages.length)];
        this._showBubble(msg, 6000);
        this._todayData.count++;
        this._save();
      }
    }

    this._scheduleNext();
  }

  _selectEvent() {
    const level = this._affection.level;
    const eligible = EVENTS.filter(e => level >= e.minLevel);
    if (eligible.length === 0) return null;

    const totalWeight = eligible.reduce((sum, e) => sum + e.weight, 0);
    let roll = Math.random() * totalWeight;
    for (const e of eligible) {
      roll -= e.weight;
      if (roll <= 0) return e;
    }
    return eligible[eligible.length - 1];
  }

  _today() {
    return new Date().toISOString().split('T')[0];
  }

  async _save() {
    await window.electronAPI.setStore('surpriseEventsToday', this._todayData);
  }
}
