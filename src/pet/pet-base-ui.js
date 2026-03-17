/**
 * Pet Base UI — renders the shop and owned-items in fun panel tabs.
 * V2: Shop refresh button bar, mock payment dialog, prestige material display.
 */

import { RARITY_CONFIG, getItemById } from './pet-base-items.js';
import { formatNumber } from '../utils/format.js';

export class PetBaseUI {
  constructor(baseSystem, affectionSystem) {
    this._base = baseSystem;
    this._affection = affectionSystem;

    this._shopGrid = document.getElementById('base-shop-grid');
    this._ownedList = document.getElementById('base-owned-list');
    // Coin/bonus displays in both tabs
    this._coinDisplays = [document.getElementById('base-coins'), document.getElementById('base-coins-2')];
    this._bonusDisplays = [document.getElementById('base-bonus'), document.getElementById('base-bonus-2')];
    this._slotDisplays = [document.getElementById('base-slots'), document.getElementById('base-slots-2')];
    // Also update the bonus in pet status tab
    this._petBonusDisplay = document.getElementById('pet-cps-value');

    // Listen for changes
    this._base.on('purchase', () => this.render());
    this._base.on('sell', () => this.render());
    this._base.on('shoprefresh', () => this._renderShop());
    this._base.on('slotfull', () => this._showSlotFullToast());
    this._affection.on('affinitychange', () => this._updateHeader());

    // Live countdown timer for free refresh reset
    this._countdownTimer = setInterval(() => this._updateCountdown(), 1000);
  }

  destroy() {
    if (this._countdownTimer) clearInterval(this._countdownTimer);
  }

  render() {
    this._updateHeader();
    this._renderShop();
    this._renderOwned();
  }

  _updateHeader() {
    const coins = formatNumber(this._affection.affinity);
    const bonus = this._base.itemBonus;
    const bonusStr = bonus > 0 ? `+${Math.round(bonus * 100)}%` : '+0%';
    const slotsStr = `${this._base.usedSlots}/${this._base.maxSlots}`;
    for (const el of this._coinDisplays) if (el) el.textContent = coins;
    for (const el of this._bonusDisplays) if (el) el.textContent = bonusStr;
    for (const el of this._slotDisplays) if (el) el.textContent = slotsStr;
    if (this._petBonusDisplay) this._petBonusDisplay.textContent = `🎯 ${bonusStr}`;
  }

  _showSlotFullToast() {
    // Brief toast on the shop grid
    if (!this._shopGrid) return;
    let toast = this._shopGrid.querySelector('.base-slot-toast');
    if (toast) return; // already showing
    toast = document.createElement('div');
    toast.className = 'base-slot-toast';
    toast.textContent = '槽位已满！请先在物品栏售卖腾出空间，或转生解锁更多槽位';
    this._shopGrid.prepend(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  _renderShop() {
    if (!this._shopGrid) return;
    this._shopGrid.innerHTML = '';

    // ── Refresh button bar ──
    const refreshBar = document.createElement('div');
    refreshBar.className = 'shop-refresh-bar';

    const canFree = this._base.canFreeRefresh;
    const remaining = this._base.remainingPaidRefreshes;

    // Free refresh button
    const freeBtn = document.createElement('button');
    freeBtn.className = `refresh-btn free ${canFree ? '' : 'disabled'}`;
    freeBtn.textContent = '免费刷新';
    freeBtn.disabled = !canFree;
    freeBtn.addEventListener('click', () => {
      const r = this._base.useFreeRefresh();
      if (!r.success) this._showRefreshToast(r.reason);
    });

    // Normal refresh button
    const normalBtn = document.createElement('button');
    normalBtn.className = 'refresh-btn normal';
    normalBtn.textContent = `普通刷新 5万 (${remaining}/3)`;
    normalBtn.addEventListener('click', () => {
      if (remaining <= 0) {
        this._showRefreshToast('今日次数已用完，请使用付费刷新');
        return;
      }
      const r = this._base.useNormalRefresh();
      if (!r.success) this._showRefreshToast(r.reason);
    });

    // Special refresh button
    const specialBtn = document.createElement('button');
    specialBtn.className = 'refresh-btn special';
    specialBtn.textContent = `特殊刷新 10万 (${remaining}/3)`;
    specialBtn.addEventListener('click', () => {
      if (remaining <= 0) {
        this._showRefreshToast('今日次数已用完，请使用付费刷新');
        return;
      }
      const r = this._base.useSpecialRefresh();
      if (!r.success) this._showRefreshToast(r.reason);
    });

    // Paid refresh button — single button, always visible
    const paidBtn = document.createElement('button');
    paidBtn.className = 'refresh-btn paid';
    paidBtn.textContent = '💰 付费刷新';
    paidBtn.addEventListener('click', () => {
      this._showMockPaymentDialog();
    });

    // Info span with live countdown
    const infoSpan = document.createElement('span');
    infoSpan.className = 'refresh-info';
    infoSpan.id = 'refresh-countdown';
    this._updateCountdownEl(infoSpan);

    refreshBar.appendChild(freeBtn);
    refreshBar.appendChild(normalBtn);
    refreshBar.appendChild(specialBtn);
    refreshBar.appendChild(paidBtn);
    refreshBar.appendChild(infoSpan);
    this._shopGrid.appendChild(refreshBar);

    // ── Item cards ──
    for (const shopItem of this._base.shopInventory) {
      const item = getItemById(shopItem.itemId);
      if (!item) continue;

      const rarityConf = RARITY_CONFIG[item.rarity];
      const canAfford = this._affection.affinity >= item.cost;
      const slotsFull = this._base.usedSlots >= this._base.maxSlots;
      const ownedCount = this._base.getOwnedCount(item.id);
      const isPrestigeMaterial = item.rarity === 'prestige';
      const canBuy = canAfford && !slotsFull;

      const card = document.createElement('div');
      card.className = 'base-item-card';
      card.style.borderLeftColor = rarityConf.color;

      if (isPrestigeMaterial) {
        // Special display for prestige materials
        card.innerHTML = `
          <div class="base-item-thumb">
            <img class="base-item-img" src="shop-items/${item.id}.png" alt="${item.name}">
          </div>
          <div class="base-item-body">
            <div class="base-item-header">
              <span class="base-item-icon">${item.icon}</span>
              <span class="base-item-name">${item.name}</span>
              <span class="prestige-material-badge">${rarityConf.label}</span>
            </div>
            <div class="base-item-stats">
              <span>🐱 ${formatNumber(item.cost)}</span>
              <span class="prestige-tier-hint">第${item.prestigeTier}世转生所需</span>
              ${ownedCount > 0 ? `<span class="base-owned-badge">×${ownedCount}</span>` : ''}
            </div>
            <button class="base-buy-btn ${canBuy ? '' : 'disabled'}" ${canBuy ? '' : 'disabled'}>${slotsFull ? '槽位已满' : '购买'}</button>
          </div>
        `;
      } else {
        const bonusPct = `+${Math.round(item.multiplier * 100)}%`;
        card.innerHTML = `
          <div class="base-item-thumb">
            <img class="base-item-img" src="shop-items/${item.id}.png" alt="${item.name}">
          </div>
          <div class="base-item-body">
            <div class="base-item-header">
              <span class="base-item-icon">${item.icon}</span>
              <span class="base-item-name">${item.name}</span>
              <span class="base-rarity-badge" style="background:${rarityConf.color}">${rarityConf.label}</span>
            </div>
            <div class="base-item-stats">
              <span>🐱 ${formatNumber(item.cost)}</span>
              <span>🎯 ${bonusPct}</span>
              ${ownedCount > 0 ? `<span class="base-owned-badge">×${ownedCount}</span>` : ''}
            </div>
            <button class="base-buy-btn ${canBuy ? '' : 'disabled'}" ${canBuy ? '' : 'disabled'}>${slotsFull ? '槽位已满' : '购买'}</button>
          </div>
        `;
      }

      // Image fallback — hide img if not found, show icon only
      const itemImg = card.querySelector('.base-item-img');
      if (itemImg) {
        itemImg.addEventListener('error', () => {
          itemImg.style.display = 'none';
        });
      }

      const buyBtn = card.querySelector('.base-buy-btn');
      buyBtn.addEventListener('click', () => {
        if (this._base.purchase(item.id)) {
          card.classList.add('base-card-purchased');
          setTimeout(() => card.classList.remove('base-card-purchased'), 300);
        }
      });

      this._shopGrid.appendChild(card);
    }
  }

  _showRefreshToast(msg) {
    if (!this._shopGrid) return;
    let toast = this._shopGrid.querySelector('.base-slot-toast');
    if (toast) toast.remove();
    toast = document.createElement('div');
    toast.className = 'base-slot-toast';
    toast.textContent = msg;
    this._shopGrid.prepend(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  /** Format ms to HH:MM:SS */
  _formatCountdown(ms) {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  /** Update a countdown element's text */
  _updateCountdownEl(el) {
    if (!el) return;
    const ms = this._base.freeRefreshResetMs;
    const canFree = this._base.canFreeRefresh;
    el.textContent = canFree
      ? `免费可用 | 重置: ${this._formatCountdown(ms)}`
      : `重置: ${this._formatCountdown(ms)}`;
  }

  /** Called every second to update the countdown display */
  _updateCountdown() {
    const el = document.getElementById('refresh-countdown');
    this._updateCountdownEl(el);
  }

  /** Mock payment dialog — shows inside the shop grid */
  _showMockPaymentDialog() {
    // Remove existing dialog if any
    const existing = document.querySelector('.mock-payment-card');
    if (existing) existing.remove();

    const card = document.createElement('div');
    card.className = 'mock-payment-card';

    card.innerHTML = `
      <div class="mock-payment-title">商店刷新充值</div>
      <div class="mock-payment-qr">
        <div class="mock-qr-placeholder">QR</div>
      </div>
      <div class="mock-payment-hint">微信 / 支付宝 扫码支付</div>
      <div class="mock-payment-price">¥6.00</div>
      <div class="mock-payment-buttons">
        <button class="mock-pay-btn confirm">已支付</button>
        <button class="mock-pay-btn cancel">取消</button>
      </div>
    `;

    // Insert at top of shop grid
    if (this._shopGrid) {
      this._shopGrid.prepend(card);
    }

    // Confirm — execute mock payment refresh
    card.querySelector('.confirm').addEventListener('click', () => {
      this._base.useMockPaymentRefresh();
      card.remove();
    });

    // Cancel
    card.querySelector('.cancel').addEventListener('click', () => {
      card.remove();
    });
  }

  _renderOwned() {
    if (!this._ownedList) return;
    this._ownedList.innerHTML = '';

    if (this._base.ownedItems.length === 0) {
      this._ownedList.innerHTML = '<div class="base-empty"><img src="illustrations/empty-inventory.png" class="ill-empty" alt=""><div>还没有物品，去商店看看吧！</div></div>';
      return;
    }

    let totalBonus = 0;
    for (const owned of this._base.ownedItems) {
      const item = getItemById(owned.itemId);
      if (!item) continue;

      const rarityConf = RARITY_CONFIG[item.rarity];
      const isPrestigeMaterial = item.rarity === 'prestige';
      const itemBonus = item.multiplier * owned.count;
      totalBonus += itemBonus;
      const sellPrice = Math.floor(item.cost * 0.4);

      const row = document.createElement('div');
      row.className = 'base-owned-row';
      row.style.borderLeftColor = rarityConf.color;

      if (isPrestigeMaterial) {
        row.innerHTML = `
          <img class="base-owned-img" src="shop-items/${item.id}.png" alt="">
          <span class="base-owned-icon">${item.icon}</span>
          <span class="base-owned-name">${item.name}</span>
          <span class="base-owned-count">×${owned.count}</span>
          <span class="prestige-material-badge small">转生材料</span>
          <button class="base-sell-btn" title="售出1个，回收 ${formatNumber(sellPrice)} 🐱">售${formatNumber(sellPrice)}</button>
        `;
      } else {
        const bonusPct = `+${Math.round(itemBonus * 100)}%`;
        row.innerHTML = `
          <img class="base-owned-img" src="shop-items/${item.id}.png" alt="">
          <span class="base-owned-icon">${item.icon}</span>
          <span class="base-owned-name">${item.name}</span>
          <span class="base-owned-count">×${owned.count}</span>
          <span class="base-owned-cps">🎯${bonusPct}</span>
          <button class="base-sell-btn" title="售出1个，回收 ${formatNumber(sellPrice)} 🐱">售${formatNumber(sellPrice)}</button>
        `;
      }

      // Image fallback
      const ownedImg = row.querySelector('.base-owned-img');
      if (ownedImg) {
        ownedImg.addEventListener('error', () => { ownedImg.style.display = 'none'; });
      }

      row.querySelector('.base-sell-btn').addEventListener('click', () => {
        this._base.sell(item.id);
      });
      this._ownedList.appendChild(row);
    }

    const summary = document.createElement('div');
    summary.className = 'base-owned-summary';
    summary.innerHTML = `道具加成: 🎯 <strong>+${Math.round(totalBonus * 100)}%</strong> | 📦 ${this._base.usedSlots}/${this._base.maxSlots}`;
    this._ownedList.appendChild(summary);
  }
}
