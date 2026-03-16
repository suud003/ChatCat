/**
 * Pet Base System — shop, purchase, typing multiplier logic.
 *
 * V2: Unified shop refresh (free/paid/special/mock-payment).
 *     attemptPrestige() orchestrates material + coin check.
 */

import { RARITY_CONFIG, PET_BASE_ITEMS, getItemById, getItemsByRarity, getPrestigeMaterial } from './pet-base-items.js';

// Refresh costs & limits
const NORMAL_REFRESH_COST = 50000;
const SPECIAL_REFRESH_COST = 100000;
const MAX_DAILY_PAID_REFRESHES = 3;

export class PetBaseSystem {
  constructor() {
    /** @type {{ itemId: string, count: number }[]} */
    this.ownedItems = [];
    /** @type {{ itemId: string }[]} */
    this.shopInventory = [];
    /** @type {number} additive item multiplier bonus (e.g. 0.5 means +50%) */
    this.itemBonus = 0;

    // Unified shop refresh state
    this._lastFreeRefreshDate = null;   // YYYY-MM-DD of last free refresh
    this._dailyPaidRefreshCount = 0;    // paid refreshes used today
    this._dailyPaidRefreshDate = null;  // YYYY-MM-DD for paid refresh counter

    this._affection = null;
    this._listeners = {};
  }

  async init(affectionSystem) {
    this._affection = affectionSystem;

    // Load persisted data
    this.ownedItems = (await this._getStore('petBaseOwned')) || [];

    // Load new unified shop inventory
    const savedInventory = await this._getStore('petBaseShopInventory');
    const oldTimestamps = await this._getStore('petBaseShopRefresh');

    // Load refresh state
    this._lastFreeRefreshDate = (await this._getStore('petBaseLastFreeRefresh')) || null;
    this._dailyPaidRefreshCount = (await this._getStore('petBasePaidRefreshCount')) || 0;
    this._dailyPaidRefreshDate = (await this._getStore('petBasePaidRefreshDate')) || null;

    // Reset daily counters if new day
    const today = this._today();
    if (this._dailyPaidRefreshDate !== today) {
      this._dailyPaidRefreshCount = 0;
      this._dailyPaidRefreshDate = today;
    }

    // Migration: if old per-rarity timestamps exist, do a full fresh refresh
    if (oldTimestamps && !savedInventory) {
      this._refreshShop('free');
      await this._setStore('petBaseShopRefresh', null); // clear old data
    } else if (savedInventory && savedInventory.length > 0) {
      this.shopInventory = savedInventory;
    } else {
      this._refreshShop('free');
    }

    this._recalcBonus();

    // Register item multiplier with affection system
    this._affection.setItemBonus(this.itemBonus);
  }

  destroy() {
    // No timers to clean up
  }

  /** Number of used slots (each individual item = 1 slot) */
  get usedSlots() {
    let total = 0;
    for (const owned of this.ownedItems) {
      total += owned.count;
    }
    return total;
  }

  /** Max slots from affection system */
  get maxSlots() {
    return this._affection ? this._affection.itemSlots : 3;
  }

  /** Whether free refresh is available (unlimited for testing) */
  get canFreeRefresh() {
    return true; // TODO: revert to date check after testing
  }

  /** Milliseconds until free refresh resets (next midnight) */
  get freeRefreshResetMs() {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    return tomorrow.getTime() - now.getTime();
  }

  /** Remaining paid refreshes today */
  get remainingPaidRefreshes() {
    const today = this._today();
    if (this._dailyPaidRefreshDate !== today) return MAX_DAILY_PAID_REFRESHES;
    return Math.max(0, MAX_DAILY_PAID_REFRESHES - this._dailyPaidRefreshCount);
  }

  /** Purchase an item by id. Returns true on success. */
  purchase(itemId) {
    const item = getItemById(itemId);
    if (!item) return false;

    // Check slot availability — every item takes 1 slot
    if (this.usedSlots >= this.maxSlots) {
      this._emit('slotfull');
      return false;
    }

    if (!this._affection.spend(item.cost)) return false;

    // Add to owned
    const existing = this.ownedItems.find(o => o.itemId === itemId);
    if (existing) {
      existing.count++;
    } else {
      this.ownedItems.push({ itemId, count: 1 });
    }

    this._recalcBonus();
    this._affection.setItemBonus(this.itemBonus);
    this._save();
    this._emit('purchase', { itemId, item });
    return true;
  }

  /** Sell one item by id. Returns 40% of purchase cost. */
  sell(itemId) {
    const owned = this.ownedItems.find(o => o.itemId === itemId);
    if (!owned || owned.count <= 0) return false;

    const item = getItemById(itemId);
    if (!item) return false;

    const refund = Math.floor(item.cost * 0.4);

    owned.count--;
    if (owned.count <= 0) {
      this.ownedItems = this.ownedItems.filter(o => o.itemId !== itemId);
    }

    // Refund coins
    this._affection.addPassive(refund);

    this._recalcBonus();
    this._affection.setItemBonus(this.itemBonus);
    this._save();
    this._emit('sell', { itemId, item, refund });
    return true;
  }

  /** Get count of a specific owned item */
  getOwnedCount(itemId) {
    const owned = this.ownedItems.find(o => o.itemId === itemId);
    return owned ? owned.count : 0;
  }

  /* ---- Shop Refresh APIs ---- */

  /** Free daily refresh (once per day) — 10% prestige stone drop */
  useFreeRefresh() {
    if (!this.canFreeRefresh) return { success: false, reason: '今日免费刷新已用' };
    this._lastFreeRefreshDate = this._today();
    this._refreshShop('free');
    this._saveRefreshState();
    return { success: true };
  }

  /** Normal paid refresh — costs 50000 coins, max 3/day, 25% prestige stone drop */
  useNormalRefresh() {
    this._ensureDailyReset();
    if (this._dailyPaidRefreshCount >= MAX_DAILY_PAID_REFRESHES) {
      return { success: false, reason: 'exhausted' };
    }
    if (!this._affection.spend(NORMAL_REFRESH_COST)) {
      return { success: false, reason: '猫猫币不足' };
    }
    this._dailyPaidRefreshCount++;
    this._refreshShop('normal');
    this._saveRefreshState();
    return { success: true };
  }

  /** Special paid refresh — costs 100000 coins, 100% prestige stone drop, shares daily limit */
  useSpecialRefresh() {
    this._ensureDailyReset();
    if (this._dailyPaidRefreshCount >= MAX_DAILY_PAID_REFRESHES) {
      return { success: false, reason: 'exhausted' };
    }
    if (!this._affection.spend(SPECIAL_REFRESH_COST)) {
      return { success: false, reason: '猫猫币不足' };
    }
    this._dailyPaidRefreshCount++;
    this._refreshShop('special');
    this._saveRefreshState();
    return { success: true };
  }

  /** Mock payment refresh — 50% prestige stone drop */
  useMockPaymentRefresh() {
    this._refreshShop('paid');
    this._saveRefreshState();
    return { success: true };
  }

  /** Force refresh shop inventory (legacy compat) */
  forceRefreshShop() {
    this._refreshShop('free');
  }

  /* ---- Prestige ---- */

  /**
   * Attempt prestige: checks material + coins, consumes material, calls affection.prestige().
   * @returns {{ success: boolean, reason?: string, materialName?: string, cost?: number }}
   */
  attemptPrestige() {
    const tier = this._affection.prestigeTier;
    const coinCost = this._affection.prestigeCoinCost;
    const material = getPrestigeMaterial(tier);

    if (!material) {
      return { success: false, reason: '转生材料数据异常' };
    }

    // Check coins
    if (this._affection.affinity < coinCost) {
      return { success: false, reason: `猫猫币不足 (需要 ${coinCost})`, materialName: material.name, cost: coinCost };
    }

    // Check material
    const ownedMat = this.ownedItems.find(o => o.itemId === material.id);
    if (!ownedMat || ownedMat.count <= 0) {
      return { success: false, reason: `缺少转生材料: ${material.icon} ${material.name}`, materialName: material.name, cost: coinCost };
    }

    // Consume 1 material
    ownedMat.count--;
    if (ownedMat.count <= 0) {
      this.ownedItems = this.ownedItems.filter(o => o.itemId !== material.id);
    }

    // Execute prestige (deducts coins, resets level)
    const ok = this._affection.prestige(coinCost);
    if (!ok) {
      // Shouldn't happen since we checked, but restore material just in case
      const existing = this.ownedItems.find(o => o.itemId === material.id);
      if (existing) existing.count++;
      else this.ownedItems.push({ itemId: material.id, count: 1 });
      return { success: false, reason: '转生执行失败' };
    }

    // Recalc bonus after prestige
    this._recalcBonus();
    this._affection.setItemBonus(this.itemBonus);
    this._save();
    return { success: true, materialName: material.name, cost: coinCost };
  }

  /* ---- Events ---- */
  on(event, cb) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(cb);
  }

  _emit(event, data) {
    const cbs = this._listeners[event];
    if (cbs) cbs.forEach(cb => cb(data));
  }

  /* ---- Internal ---- */

  _recalcBonus() {
    let total = 0;
    for (const owned of this.ownedItems) {
      const item = getItemById(owned.itemId);
      if (item) total += item.multiplier * owned.count;
    }
    this.itemBonus = Math.round(total * 100) / 100; // avoid float drift
  }

  /**
   * Unified shop refresh.
   * @param {'free'|'normal'|'special'|'paid'} type - refresh type, affects prestige stone drop rate
   */
  _refreshShop(type) {
    const newInventory = [];

    for (const [rarity, config] of Object.entries(RARITY_CONFIG)) {
      // Skip prestige items from normal pool (handled separately by probability)
      if (rarity === 'prestige') continue;
      if (config.displayCount <= 0) continue;

      const pool = getItemsByRarity(rarity);
      const selected = this._randomPick(pool, config.displayCount);
      for (const item of selected) {
        newInventory.push({ itemId: item.id });
      }
    }

    // Prestige material drop by probability based on refresh type
    // free: 10%, normal: 25%, special: 100%, paid: 50%
    const dropChance = { free: 0.10, normal: 0.25, special: 1.0, paid: 0.50 };
    const chance = dropChance[type] ?? 0.10;

    if (Math.random() < chance) {
      const tier = this._affection ? this._affection.prestigeTier : 1;
      const mat = getPrestigeMaterial(tier);
      if (mat) {
        newInventory.push({ itemId: mat.id });
      }
    }

    this.shopInventory = newInventory;
    this._saveShopInventory();
    this._emit('shoprefresh');
  }

  _randomPick(arr, count) {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  }

  _ensureDailyReset() {
    const today = this._today();
    if (this._dailyPaidRefreshDate !== today) {
      this._dailyPaidRefreshCount = 0;
      this._dailyPaidRefreshDate = today;
    }
  }

  _today() {
    return new Date().toISOString().split('T')[0];
  }

  async _save() {
    await this._setStore('petBaseOwned', this.ownedItems);
  }

  async _saveShopInventory() {
    await this._setStore('petBaseShopInventory', this.shopInventory);
  }

  async _saveRefreshState() {
    await this._setStore('petBaseLastFreeRefresh', this._lastFreeRefreshDate);
    await this._setStore('petBasePaidRefreshCount', this._dailyPaidRefreshCount);
    await this._setStore('petBasePaidRefreshDate', this._dailyPaidRefreshDate);
    await this._saveShopInventory();
  }

  async _getStore(key) {
    return window.electronAPI.getStore(key);
  }

  async _setStore(key, value) {
    return window.electronAPI.setStore(key, value);
  }
}
