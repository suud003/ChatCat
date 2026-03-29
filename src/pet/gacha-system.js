/**
 * Gacha System — core logic for the gacha (capsule machine) system.
 *
 * Features:
 * - Single pull & 10-pull with coin or heart gem currency
 * - Soft pity at 50 pulls (SR+ probability doubles)
 * - Hard pity SSR at 80 pulls
 * - Hard pity SSSR at 150 pulls
 * - 10-pull guaranteed at least 1 R+
 * - Collection tracking with NEW markers
 * - Full persistence via electron-store
 *
 * Events: pull, newItem, ssrPull, sssrPull
 */

import { GACHA_RARITY, GACHA_ITEMS, getGachaItemById, getGachaItemsByRarity } from './gacha-items.js';

// Currency pricing
const PRICING = {
  coin: { single: 5000, multi: 45000 },
  gem:  { single: 1, multi: 8 },
};

// Pity thresholds
const SOFT_PITY_START = 50;       // SR+ prob doubles after this
const HARD_PITY_SSR = 80;         // Guaranteed SSR+ at this count
const HARD_PITY_SSSR = 150;       // Guaranteed SSSR at this count
const HISTORY_MAX = 200;          // Max history entries kept

// Equip & Exchange constants
const MAX_EQUIPPED = 5;
const EXCHANGE_COST = 10;         // 10 items of same rarity → 1 higher
const EXCHANGE_PATH = { N: 'R', R: 'SR', SR: 'SSR', SSR: 'SSSR' };

export class GachaSystem {
  constructor() {
    /** @type {string[]} owned item ids (with duplicates) */
    this._owned = [];
    /** @type {number} pulls since last SSR+ */
    this._pity = 0;
    /** @type {number} pulls since last SSSR */
    this._sssrPity = 0;
    /** @type {number} total pulls ever */
    this._totalPulls = 0;
    /** @type {{ id: string, rarity: string, timestamp: number }[]} */
    this._history = [];
    /** @type {Set<string>} ids that haven't been viewed yet */
    this._newItems = new Set();
    /** @type {string[]} equipped item ids (max 5) */
    this._equipped = [];

    this._affection = null;
    this._listeners = {};
  }

  /* ------------------------------------------------------------------ */
  /*  Lifecycle                                                          */
  /* ------------------------------------------------------------------ */

  async init(affectionSystem) {
    this._affection = affectionSystem;

    this._owned = (await this._getStore('gachaOwned')) || [];
    this._pity = (await this._getStore('gachaPity')) || 0;
    this._sssrPity = (await this._getStore('gachaSssrPity')) || 0;
    this._totalPulls = (await this._getStore('gachaTotalPulls')) || 0;
    this._history = (await this._getStore('gachaHistory')) || [];
    this._equipped = (await this._getStore('gachaEquipped')) || [];

    console.log(`[GachaSystem] Initialized: ${this._owned.length} owned, ${this._equipped.length} equipped, pity=${this._pity}, sssrPity=${this._sssrPity}, total=${this._totalPulls}`);
  }

  destroy() {
    // No timers to clean up
  }

  /* ------------------------------------------------------------------ */
  /*  Public API                                                         */
  /* ------------------------------------------------------------------ */

  get owned() { return this._owned; }
  get pity() { return this._pity; }
  get sssrPity() { return this._sssrPity; }
  get totalPulls() { return this._totalPulls; }
  get history() { return this._history; }

  /** Check if player can afford a pull */
  canPull(count = 1, currency = 'coin') {
    const price = count >= 10
      ? PRICING[currency]?.multi
      : PRICING[currency]?.single * count;
    if (price == null) return false;

    if (currency === 'coin') {
      return this._affection.affinity >= price;
    } else if (currency === 'gem') {
      return this._affection.heartGems >= price;
    }
    return false;
  }

  /** Get cost for a pull */
  getCost(count = 1, currency = 'coin') {
    if (count >= 10) return PRICING[currency]?.multi ?? 0;
    return (PRICING[currency]?.single ?? 0) * count;
  }

  /**
   * Execute gacha pull(s).
   * @param {number} count - 1 for single, 10 for multi
   * @param {'coin'|'gem'} currency
   * @returns {{ success: boolean, results?: object[], pityProgress?: number, reason?: string }}
   */
  pull(count = 1, currency = 'coin') {
    const cost = this.getCost(count, currency);

    // Deduct currency
    let spent = false;
    if (currency === 'coin') {
      spent = this._affection.spend(cost);
    } else if (currency === 'gem') {
      spent = this._affection.spendHeartGems(cost);
    }
    if (!spent) {
      return { success: false, reason: currency === 'coin' ? '猫猫币不足' : '心形宝石不足' };
    }

    const results = [];
    for (let i = 0; i < count; i++) {
      const item = this._rollOnce();
      results.push(item);
    }

    // 10-pull guarantee: at least 1 R+
    if (count >= 10) {
      const hasRPlus = results.some(r => r.rarity !== 'N');
      if (!hasRPlus) {
        // Replace the last item with a random R
        const rPool = getGachaItemsByRarity('R');
        const replacement = rPool[Math.floor(Math.random() * rPool.length)];
        const isNew = !this._owned.includes(replacement.id);
        results[results.length - 1] = { ...replacement, isNew };

        // Fix ownership tracking for replaced item
        const oldItem = results[results.length - 1];
        // Re-add the replacement
        this._owned.push(replacement.id);
        if (isNew) {
          this._newItems.add(replacement.id);
          this._emit('newItem', { item: replacement });
        }
      }
    }

    // Save
    this._doSave();

    this._emit('pull', { results, count, currency, cost });

    return {
      success: true,
      results,
      pityProgress: this._pity,
      sssrPityProgress: this._sssrPity,
    };
  }

  /** Get collection stats */
  getCollection() {
    const allItems = GACHA_ITEMS;
    const ownedSet = new Set(this._owned);
    const byRarity = {};

    for (const rarity of Object.keys(GACHA_RARITY)) {
      const items = getGachaItemsByRarity(rarity);
      byRarity[rarity] = {
        total: items.length,
        owned: items.filter(item => ownedSet.has(item.id)).length,
        items: items.map(item => ({
          ...item,
          owned: ownedSet.has(item.id),
          count: this._owned.filter(id => id === item.id).length,
          isNew: this._newItems.has(item.id),
        })),
      };
    }

    return {
      totalItems: allItems.length,
      totalOwned: new Set(this._owned).size,
      byRarity,
    };
  }

  /** Mark an item as "viewed" (remove NEW marker) */
  markViewed(itemId) {
    this._newItems.delete(itemId);
  }

  /** Mark all as viewed */
  markAllViewed() {
    this._newItems.clear();
  }

  /** Get unique owned count */
  get uniqueOwnedCount() {
    return new Set(this._owned).size;
  }

  /** Get duplicate count for an item */
  getOwnedCount(itemId) {
    return this._owned.filter(id => id === itemId).length;
  }

  /* ------------------------------------------------------------------ */
  /*  Equip / Unequip                                                    */
  /* ------------------------------------------------------------------ */

  get equipped() { return [...this._equipped]; }
  get maxEquipped() { return MAX_EQUIPPED; }

  isEquipped(itemId) {
    return this._equipped.includes(itemId);
  }

  /** Equip an item. Returns { success, reason? } */
  equip(itemId) {
    if (!this._owned.includes(itemId)) {
      return { success: false, reason: '未拥有该物品' };
    }
    if (this._equipped.includes(itemId)) {
      return { success: false, reason: '已装备该物品' };
    }
    if (this._equipped.length >= MAX_EQUIPPED) {
      return { success: false, reason: '装备栏已满' };
    }
    this._equipped.push(itemId);
    this._saveEquipped();
    this._emit('equipChange', { equipped: this.equipped });
    return { success: true };
  }

  /** Unequip an item */
  unequip(itemId) {
    const idx = this._equipped.indexOf(itemId);
    if (idx === -1) return { success: false, reason: '未装备该物品' };
    this._equipped.splice(idx, 1);
    this._saveEquipped();
    this._emit('equipChange', { equipped: this.equipped });
    return { success: true };
  }

  /* ------------------------------------------------------------------ */
  /*  Exchange / Synthesis                                               */
  /* ------------------------------------------------------------------ */

  /** Get how many items of a given rarity are available for exchange */
  getExchangeableCount(rarity) {
    return this._owned.filter(id => {
      const item = getGachaItemById(id);
      return item && item.rarity === rarity;
    }).length;
  }

  /**
   * Exchange 10 items of fromRarity → 1 random item of next rarity.
   * @param {string} fromRarity - N, R, SR, or SSR
   * @returns {{ success: boolean, result?: object, reason?: string }}
   */
  exchange(fromRarity) {
    const toRarity = EXCHANGE_PATH[fromRarity];
    if (!toRarity) {
      return { success: false, reason: '该稀有度无法合成' };
    }

    // Count owned of this rarity
    const ownedOfRarity = [];
    for (let i = 0; i < this._owned.length; i++) {
      const item = getGachaItemById(this._owned[i]);
      if (item && item.rarity === fromRarity) {
        ownedOfRarity.push(i);
      }
    }

    if (ownedOfRarity.length < EXCHANGE_COST) {
      return { success: false, reason: `${fromRarity}数量不足（需要${EXCHANGE_COST}个）` };
    }

    // Remove 10 items (from end to preserve indices)
    const toRemove = ownedOfRarity.slice(0, EXCHANGE_COST);
    // Collect removed item IDs for unequip check
    const removedIds = toRemove.map(idx => this._owned[idx]);

    // Unequip any that are being consumed
    for (const id of removedIds) {
      if (this._equipped.includes(id)) {
        this.unequip(id);
      }
    }

    // Remove from owned (sort indices descending to splice safely)
    const sortedIndices = [...toRemove].sort((a, b) => b - a);
    for (const idx of sortedIndices) {
      this._owned.splice(idx, 1);
    }

    // Roll a random item of the target rarity
    const pool = getGachaItemsByRarity(toRarity);
    const resultItem = pool[Math.floor(Math.random() * pool.length)];
    const isNew = !this._owned.includes(resultItem.id);
    this._owned.push(resultItem.id);

    if (isNew) {
      this._newItems.add(resultItem.id);
      this._emit('newItem', { item: resultItem });
    }

    this._doSave();
    this._saveEquipped();
    this._emit('exchange', { fromRarity, toRarity, result: { ...resultItem, isNew } });

    return { success: true, result: { ...resultItem, isNew } };
  }

  /* ------------------------------------------------------------------ */
  /*  Events                                                             */
  /* ------------------------------------------------------------------ */

  on(event, callback) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(callback);
  }

  _emit(event, data) {
    const cbs = this._listeners[event];
    if (cbs) cbs.forEach(cb => cb(data));
  }

  /* ------------------------------------------------------------------ */
  /*  Internal — Roll Logic                                              */
  /* ------------------------------------------------------------------ */

  _rollOnce() {
    this._pity++;
    this._sssrPity++;
    this._totalPulls++;

    let rarity = this._determineRarity();
    const pool = getGachaItemsByRarity(rarity);
    const item = pool[Math.floor(Math.random() * pool.length)];

    const isNew = !this._owned.includes(item.id);
    this._owned.push(item.id);

    // Track new items
    if (isNew) {
      this._newItems.add(item.id);
      this._emit('newItem', { item });
    }

    // Update pity counters
    const rarityOrder = { N: 0, R: 1, SR: 2, SSR: 3, SSSR: 4 };
    if (rarityOrder[rarity] >= rarityOrder['SSR']) {
      this._pity = 0; // Reset SSR pity
      this._emit('ssrPull', { item, rarity });
    }
    if (rarity === 'SSSR') {
      this._sssrPity = 0; // Reset SSSR pity
      this._emit('sssrPull', { item });
    }

    // Add to history
    this._history.unshift({
      id: item.id,
      rarity: item.rarity,
      name: item.name,
      timestamp: Date.now(),
    });
    if (this._history.length > HISTORY_MAX) {
      this._history.length = HISTORY_MAX;
    }

    return { ...item, isNew };
  }

  _determineRarity() {
    // Hard pity SSSR
    if (this._sssrPity >= HARD_PITY_SSSR) {
      return 'SSSR';
    }

    // Hard pity SSR
    if (this._pity >= HARD_PITY_SSR) {
      return 'SSR';
    }

    // Calculate effective probabilities
    let probs = {};
    for (const [rarity, config] of Object.entries(GACHA_RARITY)) {
      probs[rarity] = config.prob;
    }

    // Soft pity: after SOFT_PITY_START pulls, SR+ probability doubles
    if (this._pity >= SOFT_PITY_START) {
      const softMultiplier = 1 + (this._pity - SOFT_PITY_START) * 0.05; // gradually increase
      probs.SR *= softMultiplier;
      probs.SSR *= softMultiplier;
      probs.SSSR *= softMultiplier;

      // Re-normalize: reduce N and R proportionally
      const boostedTotal = probs.SR + probs.SSR + probs.SSSR;
      const remaining = 1 - boostedTotal;
      if (remaining > 0) {
        const nrTotal = probs.N + probs.R;
        probs.N = (probs.N / nrTotal) * remaining;
        probs.R = (probs.R / nrTotal) * remaining;
      } else {
        // All probability goes to high rarity
        probs.N = 0;
        probs.R = 0;
        const total = probs.SR + probs.SSR + probs.SSSR;
        probs.SR /= total;
        probs.SSR /= total;
        probs.SSSR /= total;
      }
    }

    // Roll
    const roll = Math.random();
    let cumulative = 0;
    for (const rarity of ['SSSR', 'SSR', 'SR', 'R', 'N']) {
      cumulative += probs[rarity];
      if (roll < cumulative) {
        return rarity;
      }
    }
    return 'N'; // fallback
  }

  /* ------------------------------------------------------------------ */
  /*  Persistence                                                        */
  /* ------------------------------------------------------------------ */

  async _doSave() {
    await this._setStore('gachaOwned', this._owned);
    await this._setStore('gachaPity', this._pity);
    await this._setStore('gachaSssrPity', this._sssrPity);
    await this._setStore('gachaTotalPulls', this._totalPulls);
    await this._setStore('gachaHistory', this._history);
  }

  async _saveEquipped() {
    await this._setStore('gachaEquipped', this._equipped);
  }

  async _getStore(key) {
    return window.electronAPI.getStore(key);
  }

  async _setStore(key, value) {
    return window.electronAPI.setStore(key, value);
  }
}
