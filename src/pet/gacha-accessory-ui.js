/**
 * Gacha Accessory UI — accessories page with drag-drop synthesis.
 *
 * Renders into #accessory-panel:
 * - Equipped slots (max 5)
 * - Owned accessories grid by rarity (image-only square cards, draggable)
 * - Synthesis: 10 square drop slots — drag same-rarity items to fill, auto-synthesize when 10 filled
 * - Collection / album grid
 *
 * Also manages #pet-decoration-layer for showing equipped items next to the cat.
 */

import { GACHA_RARITY, getGachaItemById } from './gacha-items.js';

// Decoration positions around the cat (relative to pet-decoration-layer)
const DECO_POSITIONS = [
  { name: 'top',       style: 'top: 2px;  left: 50%; transform: translateX(-50%);' },
  { name: 'top-left',  style: 'top: 20px; left: 8px;' },
  { name: 'top-right', style: 'top: 20px; right: 8px;' },
  { name: 'left',      style: 'top: 50%;  left: 4px; transform: translateY(-50%);' },
  { name: 'right',     style: 'top: 50%;  right: 4px; transform: translateY(-50%);' },
];

const EXCHANGE_COST = 10;

export class GachaAccessoryUI {
  constructor(gachaSystem, affectionSystem) {
    this._gacha = gachaSystem;
    this._affection = affectionSystem;
    this._container = document.getElementById('accessory-panel');
    this._decoLayer = document.getElementById('pet-decoration-layer');
    this._collectionOpen = false;

    // Synthesis slots state: array of 10, each null or itemId
    this._synthSlots = new Array(EXCHANGE_COST).fill(null);
    this._synthRarity = null; // locked rarity once first item is placed

    // Listen for changes
    this._gacha.on('equipChange', () => this._refresh());
    this._gacha.on('exchange', () => this._refresh());
    this._gacha.on('pull', () => this._refresh());
  }

  /* ------------------------------------------------------------------ */
  /*  Public API                                                         */
  /* ------------------------------------------------------------------ */

  render() {
    if (!this._container) return;
    this._container.innerHTML = '';
    this._container.className = 'accessory-panel';

    this._renderEquippedSlots();
    this._renderSynthesis();
    this._renderOwnedGrid();
    this._renderCollection();
  }

  renderDecorations() {
    if (!this._decoLayer) return;
    this._decoLayer.innerHTML = '';

    const equipped = this._gacha.equipped;
    equipped.forEach((itemId, index) => {
      if (index >= DECO_POSITIONS.length) return;
      const item = getGachaItemById(itemId);
      if (!item) return;

      const pos = DECO_POSITIONS[index];
      const el = document.createElement('div');
      el.className = `pet-deco-item rarity-${item.rarity}`;
      el.style.cssText = pos.style;

      const imgSrc = `gacha-items/${item.id}.png`;
      el.innerHTML = `
        <img src="${imgSrc}" alt="${item.name}" width="48" height="48"
             onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
        <span class="pet-deco-fallback" style="display:none;">${item.icon}</span>
      `;

      this._decoLayer.appendChild(el);
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Equipped Slots                                                     */
  /* ------------------------------------------------------------------ */

  _renderEquippedSlots() {
    const section = document.createElement('div');
    section.className = 'accessory-section';

    const equipped = this._gacha.equipped;
    const max = this._gacha.maxEquipped;

    section.innerHTML = `
      <div class="accessory-section-title">已装备 (${equipped.length}/${max})</div>
      <div class="accessory-equipped-slots"></div>
    `;

    const slotsContainer = section.querySelector('.accessory-equipped-slots');

    for (let i = 0; i < max; i++) {
      const slot = document.createElement('div');
      const itemId = equipped[i];

      if (itemId) {
        const item = getGachaItemById(itemId);
        if (item) {
          slot.className = `accessory-slot filled rarity-${item.rarity}`;
          slot.title = `${item.name} (点击卸下)`;
          const imgSrc = `gacha-items/${item.id}.png`;
          slot.innerHTML = `
            <img src="${imgSrc}" alt="${item.name}" class="accessory-slot-img"
                 onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
            <span class="accessory-slot-icon" style="display:none;">${item.icon}</span>
          `;
          slot.addEventListener('click', () => this._doUnequip(itemId));
        }
      } else {
        slot.className = 'accessory-slot empty';
        slot.innerHTML = '<span class="accessory-slot-plus">+</span>';
        slot.title = '空槽位';
      }

      slotsContainer.appendChild(slot);
    }

    this._container.appendChild(section);
  }

  /* ------------------------------------------------------------------ */
  /*  Owned Items Grid — image-only square cards, draggable              */
  /* ------------------------------------------------------------------ */

  _renderOwnedGrid() {
    const section = document.createElement('div');
    section.className = 'accessory-section';

    const title = document.createElement('div');
    title.className = 'accessory-section-title';
    title.textContent = '我的饰品';
    section.appendChild(title);

    const collection = this._gacha.getCollection();

    for (const rarity of ['SSSR', 'SSR', 'SR', 'R', 'N']) {
      const data = collection.byRarity[rarity];
      if (!data) continue;

      const ownedItems = data.items.filter(item => item.owned);

      const raritySection = document.createElement('div');
      raritySection.className = 'accessory-rarity-group';

      const rarityTitle = document.createElement('div');
      rarityTitle.className = `accessory-rarity-title rarity-${rarity}`;
      rarityTitle.textContent = `${GACHA_RARITY[rarity].label} (${ownedItems.length})`;
      raritySection.appendChild(rarityTitle);

      if (ownedItems.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'accessory-empty-rarity';
        empty.textContent = '暂无';
        raritySection.appendChild(empty);
      } else {
        const grid = document.createElement('div');
        grid.className = 'accessory-item-grid';

        for (const item of ownedItems) {
          const card = this._createItemCard(item);
          grid.appendChild(card);
        }

        raritySection.appendChild(grid);
      }

      section.appendChild(raritySection);
    }

    this._container.appendChild(section);
  }

  _createItemCard(item) {
    const card = document.createElement('div');
    const isEquipped = this._gacha.isEquipped(item.id);
    card.className = `accessory-item-card rarity-${item.rarity} ${isEquipped ? 'equipped' : ''}`;
    card.draggable = true;
    card.title = `${item.name} (×${item.count})`;

    const imgSrc = `gacha-items/${item.id}.png`;
    card.innerHTML = `
      <img class="accessory-item-img" src="${imgSrc}" alt="${item.name}"
           onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
      <span class="accessory-item-icon" style="display:none;">${item.icon}</span>
      ${item.count > 1 ? `<span class="accessory-item-count">×${item.count}</span>` : ''}
      ${isEquipped ? '<span class="accessory-equipped-badge">✓</span>' : ''}
    `;

    // Click to equip/unequip
    card.addEventListener('click', (e) => {
      if (e.defaultPrevented) return;
      if (isEquipped) {
        this._doUnequip(item.id);
      } else {
        this._doEquip(item.id);
      }
    });

    // Drag data
    card.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', JSON.stringify({
        id: item.id,
        rarity: item.rarity,
      }));
      e.dataTransfer.effectAllowed = 'move';
      card.classList.add('dragging');
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
    });

    return card;
  }

  /* ------------------------------------------------------------------ */
  /*  Synthesis — 10 square drop slots                                   */
  /* ------------------------------------------------------------------ */

  _renderSynthesis() {
    const section = document.createElement('div');
    section.className = 'accessory-section';

    const titleRow = document.createElement('div');
    titleRow.className = 'accessory-section-title synth-title-row';
    const filledCount = this._synthSlots.filter(s => s !== null).length;
    const rarityLabel = this._synthRarity ? ` (${this._synthRarity})` : '';
    titleRow.innerHTML = `合成${rarityLabel} <span class="synth-count">${filledCount}/${EXCHANGE_COST}</span>`;

    // Clear button
    if (filledCount > 0) {
      const clearBtn = document.createElement('span');
      clearBtn.className = 'synth-clear-btn';
      clearBtn.textContent = '清空';
      clearBtn.addEventListener('click', () => {
        this._synthSlots.fill(null);
        this._synthRarity = null;
        this._refresh();
      });
      titleRow.appendChild(clearBtn);
    }

    section.appendChild(titleRow);

    const grid = document.createElement('div');
    grid.className = 'synth-grid';

    for (let i = 0; i < EXCHANGE_COST; i++) {
      const slot = document.createElement('div');
      const itemId = this._synthSlots[i];

      if (itemId) {
        const item = getGachaItemById(itemId);
        if (item) {
          slot.className = `synth-slot filled rarity-${item.rarity}`;
          const imgSrc = `gacha-items/${item.id}.png`;
          slot.innerHTML = `
            <img class="synth-slot-img" src="${imgSrc}" alt="${item.name}"
                 onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
            <span class="synth-slot-icon" style="display:none;">${item.icon}</span>
          `;
          // Click to remove from slot
          slot.addEventListener('click', () => {
            this._synthSlots[i] = null;
            // If all empty, reset rarity lock
            if (this._synthSlots.every(s => s === null)) {
              this._synthRarity = null;
            }
            this._refresh();
          });
        }
      } else {
        slot.className = `synth-slot empty ${this._synthRarity ? 'rarity-lock-' + this._synthRarity : ''}`;
        slot.innerHTML = `<span class="synth-slot-placeholder">${i + 1}</span>`;
      }

      // Drop handling
      slot.addEventListener('dragover', (e) => {
        e.preventDefault();
        try {
          // We can't read data during dragover, so just show visual feedback
          slot.classList.add('drag-over');
          e.dataTransfer.dropEffect = 'move';
        } catch (_) { /* ignore */ }
      });

      slot.addEventListener('dragleave', () => {
        slot.classList.remove('drag-over');
      });

      slot.addEventListener('drop', (e) => {
        e.preventDefault();
        slot.classList.remove('drag-over');
        try {
          const data = JSON.parse(e.dataTransfer.getData('text/plain'));
          this._handleDrop(i, data);
        } catch (_) { /* ignore */ }
      });

      grid.appendChild(slot);
    }

    section.appendChild(grid);

    // Synth button — appears when all 10 slots filled
    if (filledCount === EXCHANGE_COST && this._synthRarity) {
      const synthBtn = document.createElement('button');
      synthBtn.className = 'synth-execute-btn';
      const toRarity = { N: 'R', R: 'SR', SR: 'SSR', SSR: 'SSSR' }[this._synthRarity] || '?';
      synthBtn.textContent = `合成 → ${toRarity} ×1`;
      synthBtn.addEventListener('click', () => this._doSynth());
      section.appendChild(synthBtn);
    }

    // Result display area
    const resultArea = document.createElement('div');
    resultArea.className = 'accessory-exchange-result';
    resultArea.id = 'accessory-exchange-result';
    section.appendChild(resultArea);

    this._container.appendChild(section);
  }

  _handleDrop(slotIndex, data) {
    const { id, rarity } = data;

    // Slot already filled
    if (this._synthSlots[slotIndex] !== null) {
      this._showToast('该格已有物品');
      return;
    }

    // Check rarity lock
    if (this._synthRarity && rarity !== this._synthRarity) {
      this._showToast(`只能放入 ${this._synthRarity} 品质的饰品`);
      return;
    }

    // Check if item is already in a slot
    if (this._synthSlots.includes(id)) {
      // Allow duplicates only if user owns multiple
      const inSlotCount = this._synthSlots.filter(s => s === id).length;
      const item = getGachaItemById(id);
      const ownedCount = item ? this._gacha.getOwnedCount(id) : 0;
      if (inSlotCount >= ownedCount) {
        this._showToast('数量不足');
        return;
      }
    }

    // Place item
    this._synthSlots[slotIndex] = id;
    if (!this._synthRarity) {
      this._synthRarity = rarity;
    }

    this._refresh();
  }

  _doSynth() {
    if (!this._synthRarity) return;

    const result = this._gacha.exchange(this._synthRarity);
    if (!result.success) {
      this._showToast(result.reason || '合成失败');
      return;
    }

    // Clear slots
    this._synthSlots.fill(null);
    this._synthRarity = null;

    // Show result
    if (result.result) {
      const item = result.result;
      const imgSrc = `gacha-items/${item.id}.png`;
      // Refresh first, then show result
      this._refresh();

      const resultArea = document.getElementById('accessory-exchange-result');
      if (resultArea) {
        resultArea.innerHTML = `
          <div class="exchange-result-card rarity-${item.rarity}">
            <img src="${imgSrc}" alt="${item.name}" class="exchange-result-img"
                 onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
            <span class="exchange-result-icon" style="display:none;">${item.icon}</span>
            <span class="exchange-result-name">${item.name}</span>
            <span class="exchange-result-rarity">${item.rarity}</span>
            ${item.isNew ? '<span class="gacha-result-new">NEW</span>' : ''}
          </div>
        `;
        resultArea.classList.add('show');
        setTimeout(() => resultArea.classList.remove('show'), 3000);
      }
    } else {
      this._refresh();
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Collection / Album                                                 */
  /* ------------------------------------------------------------------ */

  _renderCollection() {
    const collection = this._gacha.getCollection();

    const toggle = document.createElement('div');
    toggle.className = 'gacha-collection-toggle';
    toggle.innerHTML = `
      <span>图鉴 ${collection.totalOwned}/${collection.totalItems}</span>
      <div class="gacha-collection-stats">
        ${Object.entries(collection.byRarity).map(([r, data]) =>
          `<span style="color:${GACHA_RARITY[r].color}">${r}:${data.owned}/${data.total}</span>`
        ).join('')}
      </div>
    `;
    toggle.addEventListener('click', () => {
      this._collectionOpen = !this._collectionOpen;
      const panel = document.getElementById('gacha-collection-panel');
      if (panel) panel.classList.toggle('open', this._collectionOpen);
    });
    this._container.appendChild(toggle);

    const panel = document.createElement('div');
    panel.className = `gacha-collection-panel ${this._collectionOpen ? 'open' : ''}`;
    panel.id = 'gacha-collection-panel';
    this._buildCollectionContent(panel, collection);
    this._container.appendChild(panel);
  }

  _buildCollectionContent(panel, collection) {
    panel.innerHTML = '';

    for (const [rarity, data] of Object.entries(collection.byRarity)) {
      const section = document.createElement('div');
      section.className = 'gacha-collection-section';

      const sectionTitle = document.createElement('div');
      sectionTitle.className = `gacha-collection-section-title rarity-${rarity}`;
      sectionTitle.textContent = `${GACHA_RARITY[rarity].label} (${data.owned}/${data.total})`;
      section.appendChild(sectionTitle);

      const grid = document.createElement('div');
      grid.className = 'gacha-collection-grid';

      for (const item of data.items) {
        const cell = document.createElement('div');
        cell.className = `gacha-collection-item ${item.owned ? 'owned' : 'locked'}`;

        const imgSrc = `gacha-items/${item.id}.png`;
        cell.innerHTML = `
          <img class="gacha-collection-item-img" src="${imgSrc}" alt="${item.name}"
               onerror="this.style.display='none'; this.parentElement.querySelector('.gacha-collection-item-icon').style.display='block';">
          <span class="gacha-collection-item-icon" style="display:none;">${item.owned ? item.icon : '❓'}</span>
          ${item.count > 1 ? `<span class="gacha-collection-item-count">x${item.count}</span>` : ''}
          ${item.isNew ? '<span class="gacha-result-new">NEW</span>' : ''}
        `;
        cell.title = item.owned ? item.name : '???';

        const img = cell.querySelector('.gacha-collection-item-img');
        const iconSpan = cell.querySelector('.gacha-collection-item-icon');
        if (img) {
          img.addEventListener('load', () => { iconSpan.style.display = 'none'; });
          img.addEventListener('error', () => { img.style.display = 'none'; iconSpan.style.display = 'block'; });
        }

        grid.appendChild(cell);
      }

      section.appendChild(grid);
      panel.appendChild(section);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Actions                                                            */
  /* ------------------------------------------------------------------ */

  _doEquip(itemId) {
    const result = this._gacha.equip(itemId);
    if (!result.success) {
      this._showToast(result.reason);
    }
  }

  _doUnequip(itemId) {
    const result = this._gacha.unequip(itemId);
    if (!result.success) {
      this._showToast(result.reason);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Refresh                                                            */
  /* ------------------------------------------------------------------ */

  _refresh() {
    this.render();
    this.renderDecorations();
  }

  /* ------------------------------------------------------------------ */
  /*  Toast                                                              */
  /* ------------------------------------------------------------------ */

  _showToast(msg) {
    if (!this._container) return;
    let toast = this._container.querySelector('.accessory-toast');
    if (toast) toast.remove();

    toast = document.createElement('div');
    toast.className = 'accessory-toast';
    toast.textContent = msg;
    this._container.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  }
}
