/**
 * Mini-cat renderer — shows other online users as small canvas-based cat sprites
 * at the bottom of the screen, with real-time typing/click action animations.
 *
 * Renders the FULL cat character (matching SpriteCharacter from pixel-character.js)
 * including skin tint, filter, and correct instrument — just scaled down to 80×80.
 *
 * ES module for renderer process.
 */

import { SKINS } from '../pet/pixel-character.js';

const MAX_VISIBLE_CATS = 10;

// Sprite dimensions (matching pixel-character.js)
const SPRITE_W = 800;
const SPRITE_H = 900;
const CROP_Y = 320;
const CROP_H = 530;

// Canvas display size
const CANVAS_W = 80;
const CANVAS_H = 80;

// Animation timing
const PAW_DURATION = 120;    // ms — paw stays down
const EMOJI_DURATION = 500;  // ms — click emoji visible

// Click effect emoji pool
const CLICK_EMOJIS = ['💥', '✨', '⭐', '💫', '🌟', '❤️', '🎵', '🐾', '😻', '🎉'];

// All sprite names to preload
const SPRITE_NAMES = [
  'cat', 'paw-left', 'paw-right', 'mouth', 'keyboard',
  'bongo', 'cymbal', 'tambourine', 'marimba', 'cowbell',
];

// Shared sprite images (loaded once, shared across all mini-cats)
let _spritesLoaded = false;
let _spritesLoading = null;
const _sprites = {};

function _loadSprites() {
  if (_spritesLoaded) return Promise.resolve();
  if (_spritesLoading) return _spritesLoading;

  // Resolve path relative to THIS module, then navigate to ../pet/sprites/
  const basePath = new URL('../pet/sprites/', import.meta.url).href;

  _spritesLoading = Promise.all(SPRITE_NAMES.map(name => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { _sprites[name] = img; resolve(); };
      img.onerror = () => { console.warn(`[MiniCat] Failed to load sprite: ${name}`); resolve(); };
      img.src = `${basePath}${name}.png`;
    });
  })).then(() => {
    _spritesLoaded = true;
  });

  return _spritesLoading;
}

export class MiniCatRenderer {
  constructor() {
    this._container = document.getElementById('mp-cats-container');
    // userId → { element, canvas, ctx, username, state, anim, dirty }
    this._cats = new Map();
    this._rafId = null;

    // Offscreen compositing canvas (shared, full resolution)
    this._composite = document.createElement('canvas');
    this._composite.width = SPRITE_W;
    this._composite.height = SPRITE_H;
    this._compCtx = this._composite.getContext('2d');

    // Offscreen tint canvas (shared)
    this._tintCanvas = document.createElement('canvas');
    this._tintCanvas.width = SPRITE_W;
    this._tintCanvas.height = SPRITE_H;
    this._tintCtx = this._tintCanvas.getContext('2d');

    // Start loading sprites immediately
    _loadSprites();
  }

  /** Add or update a user's mini cat */
  addUser(userId, username, state = {}) {
    if (this._cats.has(userId)) {
      this.updateUser(userId, state);
      return;
    }

    if (this._cats.size >= MAX_VISIBLE_CATS) {
      this._updateOverflowBadge();
      return;
    }

    const el = document.createElement('div');
    el.className = 'mini-cat';
    el.dataset.userId = userId;

    const level = state.level || 1;
    const flowBadge = state.isInFlow ? '<span class="mini-cat-flow">🔥</span>' : '';

    el.innerHTML = `
      <div class="mini-cat-canvas-wrap" style="position:relative;">
        <canvas class="mini-cat-canvas" width="${CANVAS_W}" height="${CANVAS_H}"></canvas>
        ${flowBadge}
      </div>
      <div class="mini-cat-name">${this._escapeHtml(username)}</div>
      <div class="mini-cat-level">Lv.${level}</div>
    `;

    el.classList.add('mini-cat-enter');

    if (this._container) {
      this._container.appendChild(el);
    }

    const canvas = el.querySelector('.mini-cat-canvas');
    const ctx = canvas.getContext('2d');

    const catData = {
      element: el,
      canvas,
      ctx,
      username,
      state: { ...state },
      anim: {
        leftPawDown: false,
        rightPawDown: false,
        lastTypingPaw: 'right', // alternate: next will be 'left'
        leftPawTimer: null,
        rightPawTimer: null,
      },
      dirty: true, // needs initial render
    };

    this._cats.set(userId, catData);
    this._updateOverflowBadge();
    this._markDirty();
  }

  /** Update an existing user's state */
  updateUser(userId, stateUpdate) {
    const cat = this._cats.get(userId);
    if (!cat) return;

    Object.assign(cat.state, stateUpdate);

    // Update text elements
    const level = cat.state.level || 1;
    const levelEl = cat.element.querySelector('.mini-cat-level');
    if (levelEl) levelEl.textContent = `Lv.${level}`;

    const nameEl = cat.element.querySelector('.mini-cat-name');
    if (nameEl) nameEl.textContent = this._escapeHtml(cat.username);

    // Update flow badge
    const wrap = cat.element.querySelector('.mini-cat-canvas-wrap');
    let flowEl = wrap?.querySelector('.mini-cat-flow');
    if (cat.state.isInFlow && !flowEl && wrap) {
      flowEl = document.createElement('span');
      flowEl.className = 'mini-cat-flow';
      flowEl.textContent = '🔥';
      wrap.appendChild(flowEl);
    } else if (!cat.state.isInFlow && flowEl) {
      flowEl.remove();
    }

    cat.dirty = true;
    this._markDirty();
  }

  /** Remove a user's mini cat with fade-out animation */
  removeUser(userId) {
    const cat = this._cats.get(userId);
    if (!cat) return;

    // Clear paw timers
    if (cat.anim.leftPawTimer) clearTimeout(cat.anim.leftPawTimer);
    if (cat.anim.rightPawTimer) clearTimeout(cat.anim.rightPawTimer);

    cat.element.classList.add('mini-cat-leave');
    setTimeout(() => {
      cat.element.remove();
    }, 400);

    this._cats.delete(userId);
    this._updateOverflowBadge();
  }

  /** Set full snapshot of users (after login) */
  setSnapshot(users) {
    const newIds = new Set(users.map(u => u.userId));
    for (const userId of this._cats.keys()) {
      if (!newIds.has(userId)) {
        this.removeUser(userId);
      }
    }
    for (const user of users) {
      this.addUser(user.userId, user.username, user.state || {});
    }
  }

  /** Remove all mini cats */
  clear() {
    for (const [userId] of this._cats) {
      this.removeUser(userId);
    }
    this._cats.clear();
    this._updateOverflowBadge();
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  /**
   * Trigger an action animation on a remote user's mini cat.
   * @param {string} userId
   * @param {'typing'|'click'} actionType
   */
  triggerAction(userId, actionType) {
    const cat = this._cats.get(userId);
    if (!cat) return;

    if (actionType === 'typing') {
      this._triggerTyping(cat);
    } else if (actionType === 'click') {
      this._triggerClick(cat);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Typing animation — alternate left/right paw                       */
  /* ------------------------------------------------------------------ */

  _triggerTyping(cat) {
    const anim = cat.anim;
    // Alternate paw
    const paw = anim.lastTypingPaw === 'left' ? 'right' : 'left';
    anim.lastTypingPaw = paw;

    if (paw === 'left') {
      anim.leftPawDown = true;
      if (anim.leftPawTimer) clearTimeout(anim.leftPawTimer);
      anim.leftPawTimer = setTimeout(() => {
        anim.leftPawDown = false;
        cat.dirty = true;
        this._markDirty();
      }, PAW_DURATION);
    } else {
      anim.rightPawDown = true;
      if (anim.rightPawTimer) clearTimeout(anim.rightPawTimer);
      anim.rightPawTimer = setTimeout(() => {
        anim.rightPawDown = false;
        cat.dirty = true;
        this._markDirty();
      }, PAW_DURATION);
    }

    cat.dirty = true;
    this._markDirty();
  }

  /* ------------------------------------------------------------------ */
  /*  Click animation — floating emoji above canvas                     */
  /* ------------------------------------------------------------------ */

  _triggerClick(cat) {
    const wrap = cat.element.querySelector('.mini-cat-canvas-wrap');
    if (!wrap) return;

    const emoji = CLICK_EMOJIS[Math.floor(Math.random() * CLICK_EMOJIS.length)];
    const emojiEl = document.createElement('div');
    emojiEl.className = 'mini-cat-click-emoji';
    emojiEl.textContent = emoji;
    // Random horizontal offset
    emojiEl.style.left = (Math.random() * 40 + 20) + 'px';
    wrap.appendChild(emojiEl);

    setTimeout(() => {
      emojiEl.remove();
    }, EMOJI_DURATION);
  }

  /* ------------------------------------------------------------------ */
  /*  Render loop — single rAF for all mini-cat canvases                */
  /* ------------------------------------------------------------------ */

  _markDirty() {
    if (this._rafId) return;
    this._rafId = requestAnimationFrame(() => {
      this._rafId = null;
      this._renderAll();
    });
  }

  _renderAll() {
    if (!_spritesLoaded) {
      // Sprites not yet loaded — retry next frame
      _loadSprites().then(() => this._markDirty());
      return;
    }

    for (const [, cat] of this._cats) {
      if (!cat.dirty) continue;
      cat.dirty = false;
      this._renderCat(cat);
    }
  }

  /**
   * Draw a single sprite layer onto the composite canvas, with optional tint/filter.
   * Matches the _drawLayer logic from SpriteCharacter in pixel-character.js.
   * @param {CanvasRenderingContext2D} cctx - composite context
   * @param {HTMLImageElement} img - sprite image (may be multi-frame: 1600×900)
   * @param {number} srcX - x offset into sprite (0 or SPRITE_W for 2nd frame)
   * @param {boolean} applyColor - whether to apply skin tint/filter
   * @param {object} skin - skin config from SKINS
   */
  _drawLayer(cctx, img, srcX, applyColor, skin) {
    if (applyColor && skin.tint) {
      // Tint via multiply blend on temporary canvas
      const tc = this._tintCtx;
      tc.clearRect(0, 0, SPRITE_W, SPRITE_H);

      tc.globalCompositeOperation = 'source-over';
      tc.filter = 'none';
      tc.drawImage(img, srcX, 0, SPRITE_W, SPRITE_H, 0, 0, SPRITE_W, SPRITE_H);

      tc.globalCompositeOperation = 'multiply';
      tc.fillStyle = skin.tint;
      tc.fillRect(0, 0, SPRITE_W, SPRITE_H);

      tc.globalCompositeOperation = 'destination-in';
      tc.drawImage(img, srcX, 0, SPRITE_W, SPRITE_H, 0, 0, SPRITE_W, SPRITE_H);

      if (skin.filter) {
        cctx.filter = skin.filter;
      }
      cctx.drawImage(this._tintCanvas, 0, 0);
      cctx.filter = 'none';
    } else {
      if (applyColor && skin.filter) {
        cctx.filter = skin.filter;
      }
      cctx.drawImage(img, srcX, 0, SPRITE_W, SPRITE_H, 0, 0, SPRITE_W, SPRITE_H);
      if (applyColor) {
        cctx.filter = 'none';
      }
    }
  }

  _renderCat(cat) {
    const { ctx, anim, state } = cat;
    const cc = this._compCtx;

    // Resolve skin (from remote user's synced skinId)
    const skinId = state.skinId || 'bongo-classic';
    const skin = SKINS[skinId] || SKINS['bongo-classic'];

    // If this is a spriteSheet skin but we only have classic sprites,
    // fall back to bongo-classic rendering
    const effectiveSkin = (skin && skin.spriteSheet) ? (SKINS['bongo-classic']) : skin;
    const instrumentName = effectiveSkin.instrument || 'keyboard';

    // Clear offscreen composite
    cc.clearRect(0, 0, SPRITE_W, SPRITE_H);

    // Layer 1: Instrument (bottom, no tint/filter) — instruments are 800×450, drawn at bottom
    const instrImg = _sprites[instrumentName];
    if (instrImg) {
      cc.drawImage(instrImg, 0, SPRITE_H - 450);
    }

    // Layer 2: Cat body (apply tint/filter)
    const catImg = _sprites['cat'];
    if (catImg) {
      this._drawLayer(cc, catImg, 0, true, effectiveSkin);
    }

    // Layer 3: Mouth (2-frame 1600×900, frame 0 = closed, frame 1 = open)
    // For mini-cat, always show closed mouth (frame 0)
    const mouthImg = _sprites['mouth'];
    if (mouthImg) {
      this._drawLayer(cc, mouthImg, 0, true, effectiveSkin);
    }

    // Layer 4: Left paw (2-frame 1600×900, frame 0 = up, frame 1 = down)
    const leftImg = _sprites['paw-left'];
    if (leftImg) {
      this._drawLayer(cc, leftImg, anim.leftPawDown ? SPRITE_W : 0, true, effectiveSkin);
    }

    // Layer 5: Right paw (2-frame 1600×900, frame 0 = up, frame 1 = down)
    const rightImg = _sprites['paw-right'];
    if (rightImg) {
      this._drawLayer(cc, rightImg, anim.rightPawDown ? SPRITE_W : 0, true, effectiveSkin);
    }

    // Crop and scale to mini canvas
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.drawImage(
      this._composite,
      0, CROP_Y, SPRITE_W, CROP_H,  // source crop
      0, 0, CANVAS_W, CANVAS_H       // dest: fill entire 80×80 canvas
    );
  }

  /* ------------------------------------------------------------------ */
  /*  Helpers                                                           */
  /* ------------------------------------------------------------------ */

  _updateOverflowBadge() {
    let badge = this._container?.querySelector('.mini-cat-overflow');
    const totalUsers = this._cats.size;

    if (totalUsers > MAX_VISIBLE_CATS) {
      const overflow = totalUsers - MAX_VISIBLE_CATS;
      if (!badge) {
        badge = document.createElement('div');
        badge.className = 'mini-cat-overflow';
        this._container?.appendChild(badge);
      }
      badge.textContent = `+${overflow}`;
    } else if (badge) {
      badge.remove();
    }
  }

  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
