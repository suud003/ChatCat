/**
 * Gacha UI — renders the gacha panel in the Fun tab.
 *
 * Renders into #gacha-panel:
 * - Currency display (coins + gems)
 * - Capsule machine illustration
 * - Full-width card-style pull buttons (single/multi, coin/gem)
 * - Pity progress bars (SSR / SSSR)
 * - Result overlay with card flip animation
 */

import { formatNumber } from '../utils/format.js';

export class GachaUI {
  constructor(gachaSystem, affectionSystem) {
    this._gacha = gachaSystem;
    this._affection = affectionSystem;
    this._container = document.getElementById('gacha-panel');
    this._resultOverlay = null;

    // Listen for events
    this._gacha.on('pull', () => this._updateHeader());
    this._gacha.on('ssrPull', () => this._showSSRFlash());
    this._gacha.on('sssrPull', () => this._showSSSRFlash());
    this._affection.on('affinitychange', () => this._updateHeader());
    if (this._affection.on) {
      this._affection.on('heartgemschange', () => this._updateHeader());
    }
  }

  render() {
    if (!this._container) return;
    this._container.innerHTML = '';
    this._container.className = 'gacha-panel';

    this._renderHeader();
    this._renderMachine();
    this._renderButtons();
  }

  /* ------------------------------------------------------------------ */
  /*  Header: currency only                                              */
  /* ------------------------------------------------------------------ */

  _renderHeader() {
    const header = document.createElement('div');
    header.className = 'gacha-header';
    header.id = 'gacha-header';

    const coins = this._affection.affinity;
    const gems = this._affection.heartGems;

    header.innerHTML = `
      <div class="gacha-currency">
        <img src="icons/stat-coin.png" class="cat-icon" alt=""> <span id="gacha-coins">${formatNumber(coins)}</span>
      </div>
      <div class="gacha-currency">
        <img src="icons/stat-gem.png" class="cat-icon" alt=""> <span id="gacha-gems">${gems}</span>
      </div>
    `;

    this._container.appendChild(header);
  }

  _updateHeader() {
    const coins = this._affection.affinity;
    const gems = this._affection.heartGems;
    const pity = this._gacha.pity;
    const sssrPity = this._gacha.sssrPity;

    const coinsEl = document.getElementById('gacha-coins');
    const gemsEl = document.getElementById('gacha-gems');
    const pitySSRText = document.getElementById('gacha-pity-ssr-text');
    const pitySSSRText = document.getElementById('gacha-pity-sssr-text');
    const pitySSRFill = document.getElementById('gacha-pity-ssr-fill');
    const pitySSSRFill = document.getElementById('gacha-pity-sssr-fill');

    if (coinsEl) coinsEl.textContent = formatNumber(coins);
    if (gemsEl) gemsEl.textContent = gems;
    if (pitySSRText) pitySSRText.textContent = `${pity}/80`;
    if (pitySSSRText) pitySSSRText.textContent = `${sssrPity}/150`;
    if (pitySSRFill) pitySSRFill.style.width = `${(pity / 80 * 100).toFixed(1)}%`;
    if (pitySSSRFill) pitySSSRFill.style.width = `${(sssrPity / 150 * 100).toFixed(1)}%`;

    // Update button disabled states
    this._updateButtonStates();
  }

  /* ------------------------------------------------------------------ */
  /*  Machine illustration                                               */
  /* ------------------------------------------------------------------ */

  _renderMachine() {
    const machine = document.createElement('div');
    machine.className = 'gacha-machine';
    machine.id = 'gacha-machine';

    machine.innerHTML = `
      <img src="illustrations/gacha-header.png" class="gacha-machine-img" id="gacha-machine-img" alt="扭蛋机"
           onerror="this.style.display='none'; this.parentElement.querySelector('.gacha-machine-text').textContent='🎰 扭蛋机';">
      <div class="gacha-machine-text">投入猫猫币或宝石，转动扭蛋机吧！</div>
    `;

    this._container.appendChild(machine);
  }

  /* ------------------------------------------------------------------ */
  /*  Pull buttons — full-width card style                               */
  /* ------------------------------------------------------------------ */

  _renderButtons() {
    const btns = document.createElement('div');
    btns.className = 'gacha-card-buttons';
    btns.id = 'gacha-buttons';

    const canSingleCoin = this._gacha.canPull(1, 'coin');
    const canMultiCoin = this._gacha.canPull(10, 'coin');
    const canSingleGem = this._gacha.canPull(1, 'gem');
    const canMultiGem = this._gacha.canPull(10, 'gem');

    btns.innerHTML = `
      <button class="gacha-card-btn coin" id="gacha-btn-single-coin" ${canSingleCoin ? '' : 'disabled'}>
        <span class="gacha-card-left">
          <img src="icons/stat-coin.png" class="cat-icon" alt="">
          <span class="gacha-card-label">单抽</span>
        </span>
        <span class="gacha-card-price">5,000</span>
      </button>
      <button class="gacha-card-btn coin" id="gacha-btn-multi-coin" ${canMultiCoin ? '' : 'disabled'}>
        <span class="gacha-card-left">
          <img src="icons/stat-coin.png" class="cat-icon" alt="">
          <span class="gacha-card-label">十连</span>
        </span>
        <span class="gacha-card-right">
          <span class="gacha-card-price">45,000</span>
          <span class="gacha-card-discount">9折</span>
        </span>
      </button>
      <button class="gacha-card-btn gem" id="gacha-btn-single-gem" ${canSingleGem ? '' : 'disabled'}>
        <span class="gacha-card-left">
          <img src="icons/stat-gem.png" class="cat-icon" alt="">
          <span class="gacha-card-label">单抽</span>
        </span>
        <span class="gacha-card-price">1</span>
      </button>
      <button class="gacha-card-btn gem" id="gacha-btn-multi-gem" ${canMultiGem ? '' : 'disabled'}>
        <span class="gacha-card-left">
          <img src="icons/stat-gem.png" class="cat-icon" alt="">
          <span class="gacha-card-label">十连</span>
        </span>
        <span class="gacha-card-right">
          <span class="gacha-card-price">8</span>
          <span class="gacha-card-discount">8折</span>
        </span>
      </button>
    `;

    // Wire up click handlers
    btns.querySelector('#gacha-btn-single-coin').addEventListener('click', () => this._doPull(1, 'coin'));
    btns.querySelector('#gacha-btn-multi-coin').addEventListener('click', () => this._doPull(10, 'coin'));
    btns.querySelector('#gacha-btn-single-gem').addEventListener('click', () => this._doPull(1, 'gem'));
    btns.querySelector('#gacha-btn-multi-gem').addEventListener('click', () => this._doPull(10, 'gem'));

    this._container.appendChild(btns);
  }

  _updateButtonStates() {
    const ids = [
      { id: 'gacha-btn-single-coin', count: 1, currency: 'coin' },
      { id: 'gacha-btn-multi-coin',  count: 10, currency: 'coin' },
      { id: 'gacha-btn-single-gem',  count: 1, currency: 'gem' },
      { id: 'gacha-btn-multi-gem',   count: 10, currency: 'gem' },
    ];
    for (const { id, count, currency } of ids) {
      const btn = document.getElementById(id);
      if (btn) btn.disabled = !this._gacha.canPull(count, currency);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Pity progress bars                                                 */
  /* ------------------------------------------------------------------ */

  _renderPityBars() {
    const pity = this._gacha.pity;
    const sssrPity = this._gacha.sssrPity;

    const section = document.createElement('div');
    section.className = 'gacha-pity-section';
    section.id = 'gacha-pity-section';

    section.innerHTML = `
      <div class="gacha-pity-group">
        <div class="gacha-pity-label"><span>SSR保底</span><span id="gacha-pity-ssr-text">${pity}/80</span></div>
        <div class="gacha-pity-bar"><div class="gacha-pity-fill ssr" id="gacha-pity-ssr-fill" style="width:${(pity / 80 * 100).toFixed(1)}%"></div></div>
      </div>
      <div class="gacha-pity-group">
        <div class="gacha-pity-label"><span>SSSR保底</span><span id="gacha-pity-sssr-text">${sssrPity}/150</span></div>
        <div class="gacha-pity-bar"><div class="gacha-pity-fill sssr" id="gacha-pity-sssr-fill" style="width:${(sssrPity / 150 * 100).toFixed(1)}%"></div></div>
      </div>
    `;

    this._container.appendChild(section);
  }

  /* ------------------------------------------------------------------ */
  /*  Pull execution + result display                                    */
  /* ------------------------------------------------------------------ */

  async _doPull(count, currency) {
    // Shake animation
    const machineImg = document.getElementById('gacha-machine-img');
    if (machineImg) {
      machineImg.classList.add('shaking');
      setTimeout(() => machineImg.classList.remove('shaking'), 500);
    }

    // Small delay for animation feel
    await new Promise(r => setTimeout(r, 400));

    const result = this._gacha.pull(count, currency);
    if (!result.success) {
      this._showToast(result.reason || '抽卡失败');
      return;
    }

    this._showResults(result.results);
    this._updateHeader();
  }

  _showResults(results) {
    // Remove existing overlay
    if (this._resultOverlay) {
      this._resultOverlay.remove();
    }

    const overlay = document.createElement('div');
    overlay.className = 'gacha-result-overlay';
    this._resultOverlay = overlay;

    const title = document.createElement('div');
    title.className = 'gacha-result-title';
    title.textContent = results.length === 1 ? '抽卡结果' : `${results.length}连抽结果`;
    overlay.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'gacha-result-grid';

    results.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = `gacha-result-card rarity-${item.rarity}`;
      card.style.animationDelay = `${index * 0.1}s`;

      const imgSrc = `gacha-items/${item.id}.png`;
      card.innerHTML = `
        <img class="gacha-result-card-img" src="${imgSrc}" alt="${item.name}"
             onerror="this.style.display='none'; this.parentElement.querySelector('.gacha-result-card-icon').style.display='block';">
        <span class="gacha-result-card-icon" style="display:none;">${item.icon}</span>
        <span class="gacha-result-card-name" title="${item.name}">${item.name}</span>
        <span class="gacha-result-card-rarity rarity-${item.rarity}">${item.rarity}</span>
        ${item.isNew ? '<span class="gacha-result-new">NEW</span>' : ''}
      `;

      // If image loads, keep icon hidden; if not, error handler shows icon
      const img = card.querySelector('.gacha-result-card-img');
      const iconSpan = card.querySelector('.gacha-result-card-icon');
      if (img) {
        img.addEventListener('load', () => { iconSpan.style.display = 'none'; });
        img.addEventListener('error', () => { img.style.display = 'none'; iconSpan.style.display = 'block'; });
      }

      grid.appendChild(card);
    });

    overlay.appendChild(grid);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'gacha-result-close';
    closeBtn.textContent = '确认';
    closeBtn.addEventListener('click', () => {
      overlay.remove();
      this._resultOverlay = null;
      // Mark viewed
      results.forEach(item => this._gacha.markViewed(item.id));
    });
    overlay.appendChild(closeBtn);

    this._container.appendChild(overlay);
  }

  /* ------------------------------------------------------------------ */
  /*  Flash effects                                                      */
  /* ------------------------------------------------------------------ */

  _showSSRFlash() {
    const flash = document.createElement('div');
    flash.className = 'gacha-ssr-flash';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 1000);
  }

  _showSSSRFlash() {
    const flash = document.createElement('div');
    flash.className = 'gacha-sssr-flash';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 1500);
  }

  /* ------------------------------------------------------------------ */
  /*  Toast                                                              */
  /* ------------------------------------------------------------------ */

  _showToast(msg) {
    let toast = this._container.querySelector('.gacha-toast');
    if (toast) toast.remove();

    toast = document.createElement('div');
    toast.className = 'gacha-toast';
    toast.style.cssText = `
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      background: rgba(0,0,0,0.8); color: #fff; padding: 8px 16px; border-radius: 8px;
      font-size: 13px; z-index: 20; pointer-events: none;
      animation: gachaFadeIn 0.2s ease;
    `;
    toast.textContent = msg;
    this._container.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  }
}
