/**
 * Offline Adventure — Calculates rewards and generates narratives
 * for time spent while the app was closed.
 *
 * Runs in renderer process (ES Module).
 */

export class OfflineAdventure {
  constructor(affectionSystem) {
    this._affection = affectionSystem;
  }

  /**
   * Check if user has been offline long enough to trigger an adventure.
   * Returns reward info or null if not applicable.
   */
  async check() {
    const lastActive = await window.electronAPI.getStore('lastActiveTime');
    const lastProcessed = await window.electronAPI.getStore('offlineAdventureDate');
    const today = new Date().toISOString().split('T')[0];

    if (!lastActive || lastProcessed === today) return null;

    const offlineMs = Date.now() - lastActive;
    const offlineHours = offlineMs / (1000 * 60 * 60);

    // At least 1 hour offline to trigger
    if (offlineHours < 1) return null;

    const reward = this._calculateReward(offlineHours);

    // Grant reward
    if (this._affection && typeof this._affection.addPassive === 'function') {
      this._affection.addPassive(reward.coins);
    }

    // Mark as claimed for today
    await window.electronAPI.setStore('offlineAdventureDate', today);

    return reward;
  }

  /**
   * Calculate offline adventure reward based on hours away.
   */
  _calculateReward(hours) {
    const cappedHours = Math.min(hours, 24);
    const level = this._affection?.level || 1;

    // Base reward: 100-500 coins per hour, with level bonus
    const baseCoins = Math.floor(cappedHours * (100 + level * 20));
    // Random variance +/- 30%
    const variance = 0.7 + Math.random() * 0.6;
    const coins = Math.floor(baseCoins * variance);

    // Random adventure location
    const locations = [
      '猫猫森林', '星空鱼塘', '月光花园', '彩虹桥',
      '秘密洞穴', '云端草原', '水晶矿山', '魔法图书馆'
    ];
    const location = locations[Math.floor(Math.random() * locations.length)];

    // Random adventure events (1-3 based on hours)
    const allEvents = [
      '发现了一堆闪闪发光的猫猫币', '和一只蝴蝶玩了很久',
      '在树上打了个长长的盹', '抓到了一条小鱼',
      '发现了一个神秘的箱子', '帮助了一只迷路的小猫',
      '追着自己的尾巴转了好多圈', '学会了一个新的翻滚技巧',
    ];
    const eventCount = Math.min(1 + Math.floor(cappedHours / 4), 3);
    const events = [];
    const pool = [...allEvents];
    for (let i = 0; i < eventCount; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      events.push(pool.splice(idx, 1)[0]);
    }

    return {
      offlineHours: Math.round(cappedHours * 10) / 10,
      coins,
      location,
      events,
    };
  }
}
