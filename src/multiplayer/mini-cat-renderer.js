/**
 * Mini-cat renderer — shows other online users as canvas-based cat sprites
 * on screen, with real-time typing/click action animations.
 *
 * Renders the FULL cat character (matching SpriteCharacter from pixel-character.js)
 * including skin tint, filter, and correct instrument — with proper aspect ratio.
 *
 * Each mini-cat is draggable to any position on screen.
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

// The main pet uses a 300×300 canvas. Aspect ratio of crop = 800:530 ≈ 1.509:1
// We keep canvas square and center the render inside, just like pixel-character.js

// Size presets: small / medium / large — canvas is square, cat is drawn inside
// preserving aspect ratio (matching main pet's rendering approach)
const SIZE_PRESETS = {
  small:  { canvas: 100, nameSize: 9,  levelSize: 8,  gap: 6 },
  medium: { canvas: 200, nameSize: 11, levelSize: 10, gap: 10 },
  large:  { canvas: 300, nameSize: 13, levelSize: 12, gap: 14 },
};

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
    // userId → { element, canvas, ctx, username, state, anim, dirty, dragPos }
    this._cats = new Map();
    this._rafId = null;

    // Current size preset
    this._size = SIZE_PRESETS.medium;
    this._sizeName = 'medium';

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

  /** Set display size: 'small' | 'medium' | 'large' */
  setSize(sizeName) {
    const preset = SIZE_PRESETS[sizeName];
    if (!preset) return;
    this._size = preset;
    this._sizeName = sizeName;

    // Update container gap
    if (this._container) {
      this._container.style.gap = preset.gap + 'px';
    }

    // Resize all existing mini-cats
    for (const [, cat] of this._cats) {
      this._resizeCat(cat);
      cat.dirty = true;
    }
    this._markDirty();
  }

  _resizeCat(cat) {
    const s = this._size;
    const containerW = s.canvas + 10;
    cat.element.style.width = containerW + 'px';
    cat.canvas.width = s.canvas;
    cat.canvas.height = s.canvas;
    cat.canvas.style.width = s.canvas + 'px';
    cat.canvas.style.height = s.canvas + 'px';
    // Re-acquire context after resize
    cat.ctx = cat.canvas.getContext('2d');

    const nameEl = cat.element.querySelector('.mini-cat-name');
    if (nameEl) {
      nameEl.style.fontSize = s.nameSize + 'px';
      nameEl.style.maxWidth = containerW + 'px';
    }
    const levelEl = cat.element.querySelector('.mini-cat-level');
    if (levelEl) {
      levelEl.style.fontSize = s.levelSize + 'px';
    }
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

    const s = this._size;
    const containerW = s.canvas + 10;

    const el = document.createElement('div');
    el.className = 'mini-cat';
    el.dataset.userId = userId;
    el.style.width = containerW + 'px';

    const level = state.level || 1;
    const flowBadge = state.isInFlow ? '<span class="mini-cat-flow">🔥</span>' : '';

    el.innerHTML = `
      <div class="mini-cat-canvas-wrap" style="position:relative;">
        <canvas class="mini-cat-canvas" width="${s.canvas}" height="${s.canvas}"
                style="width:${s.canvas}px;height:${s.canvas}px;"></canvas>
        ${flowBadge}
      </div>
      <div class="mini-cat-name" style="font-size:${s.nameSize}px;max-width:${containerW}px;">${this._escapeHtml(username)}</div>
      <div class="mini-cat-level" style="font-size:${s.levelSize}px;">Lv.${level}</div>
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
      // Drag state
      dragPos: null, // null = in flow layout, { x, y } = absolute positioned
    };

    // Setup drag
    this._setupDrag(catData);

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
  /*  Drag support — each mini-cat can be dragged freely                 */
  /* ------------------------------------------------------------------ */

  _setupDrag(cat) {
    const el = cat.element;
    let isDragging = false;
    let startX, startY, origLeft, origTop;

    el.style.cursor = 'grab';

    el.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      isDragging = true;
      el.style.cursor = 'grabbing';
      startX = e.clientX;
      startY = e.clientY;

      // If still in flow layout, capture current position and switch to absolute
      if (!cat.dragPos) {
        const rect = el.getBoundingClientRect();
        cat.dragPos = { x: rect.left, y: rect.top };
      }
      origLeft = cat.dragPos.x;
      origTop = cat.dragPos.y;

      // Apply absolute positioning
      el.style.position = 'fixed';
      el.style.left = origLeft + 'px';
      el.style.top = origTop + 'px';
      el.style.zIndex = '100';
    });

    const onMove = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      cat.dragPos.x = origLeft + dx;
      cat.dragPos.y = origTop + dy;
      el.style.left = cat.dragPos.x + 'px';
      el.style.top = cat.dragPos.y + 'px';
    };

    const onUp = () => {
      if (!isDragging) return;
      isDragging = false;
      el.style.cursor = 'grab';
      el.style.zIndex = '51';
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
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
    // Random horizontal offset based on current canvas size
    const cSize = this._size.canvas;
    emojiEl.style.left = (Math.random() * cSize * 0.5 + cSize * 0.25) + 'px';
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

    // Scale and draw to mini canvas — preserving aspect ratio (same as pixel-character.js)
    const cw = this._size.canvas;
    const ch = this._size.canvas;
    ctx.clearRect(0, 0, cw, ch);

    const scale = cw / SPRITE_W;
    const drawH = CROP_H * scale;
    const offsetY = (ch - drawH) / 2;

    ctx.drawImage(
      this._composite,
      0, CROP_Y, SPRITE_W, CROP_H,   // source crop
      0, offsetY, cw, drawH           // dest: maintain aspect ratio
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
