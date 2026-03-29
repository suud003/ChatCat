/**
 * Affection & Mood system — Incremental/Idle game inspired.
 *
 * Core loop: Type → earn affinity → level up (infinite) → prestige → multiplier ↑ → repeat
 * Every keystroke = +1 affinity (×2 in flow state). No caps.
 * Multipliers stack multiplicatively (prestige × mood × streak).
 *
 * V2: Removed fixed level table — uses formula for infinite levels.
 *     Prestige now requires coins + prestige material (checked by PetBaseSystem).
 */

/**
 * Get the cumulative affinity threshold for a given level.
 * Formula: level² × 50 + level × 100
 * Lv.1=0, Lv.2=300, Lv.5=1750, Lv.10=6000, Lv.20=22000, Lv.50=127500
 */
export function getLevelThreshold(level) {
  if (level <= 1) return 0;
  return Math.floor(level * level * 50 + level * 100);
}

// Mood thresholds (minutes since last interaction)
const MOOD_THRESHOLDS = {
  happy: 5,     // <5 min since interaction → happy
  normal: 20,   // <20 min → normal
  // beyond 20 min → bored
};

// Mood multipliers
const MOOD_MULTIPLIERS = {
  happy: 1.2,
  normal: 1.0,
  bored: 0.8,
};

// Flow state: continuous typing duration needed (ms)
const FLOW_THRESHOLD_MS = 5 * 60_000; // 5 minutes
// Max gap between keystrokes to count as continuous (ms)
const TYPING_CONTINUITY_GAP = 120_000; // 2 minutes
// Save throttle interval (ms)
const SAVE_INTERVAL = 2000;

export class AffectionSystem {
  constructor() {
    this._affinity = 0;
    this._level = 1;
    this._mood = 'normal';     // 'happy' | 'normal' | 'bored'
    this._dailyStats = {};
    this._streakDays = 0;
    this._lastLoginDate = null;
    this._unlockedItems = [];
    this._lastInteractionTime = Date.now();

    // Prestige / rebirth
    this._rebirthCount = 0;
    this._heartGems = 0;

    // Typing flow tracking
    this._lastTypingTime = 0;
    this._flowSessionStart = 0;
    this._isInFlow = false;

    // Item bonus (set by PetBaseSystem)
    this._itemBonus = 0;

    // Mood update interval
    this._moodInterval = null;

    // Save throttle
    this._savePending = false;
    this._saveTimer = null;

    // Event listeners
    this._listeners = {};
  }

  /* ------------------------------------------------------------------ */
  /*  Lifecycle                                                          */
  /* ------------------------------------------------------------------ */

  async init() {
    this._affinity = (await this._getStore('affinity')) || 0;
    this._level = (await this._getStore('level')) || 1;
    this._streakDays = (await this._getStore('streakDays')) || 0;
    this._lastLoginDate = (await this._getStore('lastLoginDate')) || null;
    this._unlockedItems = (await this._getStore('unlockedItems')) || [];
    this._rebirthCount = (await this._getStore('rebirthCount')) || 0;
    this._heartGems = (await this._getStore('heartGems')) || 0;

    // Migration: recalculate level from affinity using new formula
    // (handles upgrade from old fixed-threshold system)
    this._recalcLevel();

    // Load daily stats or reset if new day
    const today = this._today();
    const savedStats = (await this._getStore('dailyStats')) || {};
    if (savedStats._date === today) {
      this._dailyStats = savedStats;
    } else {
      this._dailyStats = { _date: today, typing: 0, login: false };
    }

    // Process login streak
    this._processLoginStreak(today);

    // Start mood updater (every 10s)
    this._moodInterval = setInterval(() => this._updateMood(), 10_000);
    this._updateMood();
  }

  destroy() {
    clearInterval(this._moodInterval);
    clearTimeout(this._saveTimer);
    if (this._savePending) this._doSave();
  }

  /* ------------------------------------------------------------------ */
  /*  Public API                                                         */
  /* ------------------------------------------------------------------ */

  get affinity() { return this._affinity; }
  get level() { return this._level; }
  get mood() { return this._mood; }
  get streakDays() { return this._streakDays; }
  get unlockedItems() { return this._unlockedItems; }
  get rebirthCount() { return this._rebirthCount; }
  get heartGems() { return this._heartGems; }
  get isInFlow() { return this._isInFlow; }

  /** Current level progress as 0-1 fraction */
  get levelProgress() {
    const current = getLevelThreshold(this._level);
    const next = getLevelThreshold(this._level + 1);
    if (next <= current) return 1;
    return Math.min(1, (this._affinity - current) / (next - current));
  }

  /** Threshold to reach the next level */
  get nextLevelThreshold() {
    return getLevelThreshold(this._level + 1);
  }

  /** Coin cost for the current prestige (checked by PetBaseSystem) */
  get prestigeCoinCost() {
    const r = this._rebirthCount;
    if (r === 0) return 5000;
    if (r === 1) return 20000;
    if (r === 2) return 80000;
    if (r === 3) return 250000;
    return 500000 * (r - 3);
  }

  /** Required prestige material tier (1-5, capped at 5) */
  get prestigeTier() {
    return Math.min(this._rebirthCount + 1, 5);
  }

  /** Whether the player has enough coins for prestige (material check is in PetBaseSystem) */
  get canPrestige() {
    return this._affinity >= this.prestigeCoinCost;
  }

  get totalMultiplier() { return this._getMultiplier(); }

  /** Item slots: base 3 + 1 per rebirth */
  get itemSlots() { return 3 + this._rebirthCount; }

  get multiplierBreakdown() {
    return {
      prestige: 1 + 0.5 * this._rebirthCount,
      mood: MOOD_MULTIPLIERS[this._mood] || 1.0,
      streak: Math.min(2.0, 1 + 0.02 * this._streakDays),
      items: 1 + this._itemBonus,
    };
  }

  /** Set the additive item bonus (called by PetBaseSystem). e.g. 0.5 = +50% */
  setItemBonus(bonus) {
    this._itemBonus = bonus || 0;
  }

  /** Called on every keydown — awards affinity per keystroke */
  onTyping() {
    const now = Date.now();
    this._touch();

    // Flow session tracking
    if (now - this._lastTypingTime > TYPING_CONTINUITY_GAP) {
      this._flowSessionStart = now;
      if (this._isInFlow) {
        this._isInFlow = false;
        this._emit('flow', { entered: false });
      }
    }
    this._lastTypingTime = now;

    // Check flow state
    const wasInFlow = this._isInFlow;
    this._isInFlow = (now - this._flowSessionStart) >= FLOW_THRESHOLD_MS;
    if (this._isInFlow && !wasInFlow) {
      this._emit('flow', { entered: true });
    }

    // +1 per keystroke, ×2 in flow
    const base = this._isInFlow ? 2 : 1;
    this._addAffinity(base);
  }

  onChat() { this._touch(); }
  onClick() { this._touch(); }
  onPomodoroComplete() { this._touch(); }
  onTodoComplete() { this._touch(); }

  /**
   * Execute prestige — deducts coin cost, resets level/affinity.
   * Material consumption is handled by PetBaseSystem.attemptPrestige().
   * @param {number} coinCost - the coin cost (must match prestigeCoinCost at call time)
   */
  prestige(coinCost) {
    const cost = coinCost ?? this.prestigeCoinCost;
    if (this._affinity < cost) return false;

    this._affinity -= cost;
    this._rebirthCount++;
    this._heartGems++;
    this._level = 1;
    this._dailyStats = {
      _date: this._today(),
      typing: 0,
      login: this._dailyStats.login
    };
    this._flowSessionStart = 0;
    this._isInFlow = false;

    this._emit('prestige', { rebirthCount: this._rebirthCount, heartGems: this._heartGems });
    this._doSave();
    return true;
  }

  on(event, callback) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(callback);
  }

  /* ------------------------------------------------------------------ */
  /*  Internal                                                           */
  /* ------------------------------------------------------------------ */

  _emit(event, data) {
    const cbs = this._listeners[event];
    if (cbs) cbs.forEach(cb => cb(data));
  }

  _touch() {
    this._lastInteractionTime = Date.now();
  }

  _getMultiplier() {
    const prestigeMult = 1 + 0.5 * this._rebirthCount;
    const moodMult = MOOD_MULTIPLIERS[this._mood] || 1.0;
    const streakMult = Math.min(2.0, 1 + 0.02 * this._streakDays);
    const itemMult = 1 + this._itemBonus;
    return prestigeMult * moodMult * streakMult * itemMult;
  }

  _addAffinity(baseAmount) {
    const multiplied = Math.floor(baseAmount * this._getMultiplier());
    const actual = Math.max(1, multiplied);

    this._dailyStats.typing = (this._dailyStats.typing || 0) + 1;
    this._affinity += actual;
    this._checkLevelUp();
    this._throttledSave();
    this._emit('affinitychange', { delta: actual });
  }

  /** Spend coins. Returns true if sufficient balance. */
  spend(amount) {
    if (amount <= 0 || this._affinity < amount) return false;
    this._affinity -= amount;
    this._throttledSave();
    this._emit('affinitychange', { delta: -amount });
    return true;
  }

  /** Spend heart gems. Returns true if sufficient balance. */
  spendHeartGems(amount) {
    if (amount <= 0 || this._heartGems < amount) return false;
    this._heartGems -= amount;
    this._throttledSave();
    this._emit('heartgemschange', { delta: -amount, remaining: this._heartGems });
    return true;
  }

  /** Add passive income (from pet base). Checks level up. */
  addPassive(amount) {
    if (amount <= 0) return;
    this._affinity += amount;
    this._checkLevelUp();
    this._throttledSave();
    this._emit('affinitychange', { delta: amount });
  }

  /** Recalculate level from current affinity using the formula */
  _recalcLevel() {
    let lv = 1;
    while (this._affinity >= getLevelThreshold(lv + 1)) {
      lv++;
    }
    this._level = lv;
  }

  _checkLevelUp() {
    let changed = false;
    while (this._affinity >= getLevelThreshold(this._level + 1)) {
      this._level++;
      changed = true;
    }
    if (changed) {
      this._emit('levelup', { to: this._level });
    }
  }

  _updateMood() {
    const idleMinutes = (Date.now() - this._lastInteractionTime) / 60_000;
    let newMood;
    if (idleMinutes < MOOD_THRESHOLDS.happy) {
      newMood = 'happy';
    } else if (idleMinutes < MOOD_THRESHOLDS.normal) {
      newMood = 'normal';
    } else {
      newMood = 'bored';
    }

    if (newMood !== this._mood) {
      const oldMood = this._mood;
      this._mood = newMood;
      this._emit('moodchange', { from: oldMood, to: newMood });
    }
  }

  _processLoginStreak(today) {
    if (this._dailyStats.login) return;

    this._dailyStats.login = true;

    const yesterday = this._dateOffset(-1);
    if (this._lastLoginDate === yesterday) {
      this._streakDays++;
    } else if (this._lastLoginDate !== today) {
      this._streakDays = 1;
    }

    this._lastLoginDate = today;
    this._doSave();
  }

  _today() {
    return new Date().toISOString().split('T')[0];
  }

  _dateOffset(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  }

  _throttledSave() {
    this._savePending = true;
    if (!this._saveTimer) {
      this._saveTimer = setTimeout(() => {
        this._saveTimer = null;
        if (this._savePending) this._doSave();
      }, SAVE_INTERVAL);
    }
  }

  async _doSave() {
    this._savePending = false;
    await this._setStore('affinity', this._affinity);
    await this._setStore('level', this._level);
    await this._setStore('streakDays', this._streakDays);
    await this._setStore('lastLoginDate', this._lastLoginDate);
    await this._setStore('unlockedItems', this._unlockedItems);
    await this._setStore('dailyStats', this._dailyStats);
    await this._setStore('rebirthCount', this._rebirthCount);
    await this._setStore('heartGems', this._heartGems);
  }

  async _getStore(key) {
    return window.electronAPI.getStore(key);
  }

  async _setStore(key, value) {
    return window.electronAPI.setStore(key, value);
  }
}
