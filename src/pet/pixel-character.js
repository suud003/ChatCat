/**
 * Sprite-based Bongo Cat character using original bongo.cat open-source assets
 * (MIT license — https://github.com/Externalizable/bongo.cat)
 *
 * All original sprites are 800x900 (cat/paw/mouth) or 800x450 (instruments).
 * They are designed to overlay at the same origin in an 800x900 viewport.
 * We crop a viewport region from the composited result to fit our 300x300 canvas.
 *
 * Skins use Canvas multiply blend to tint the entire cat body (including white areas).
 * Instruments replace the keyboard layer at the bottom.
 */

const SPRITE_W = 800;
const SPRITE_H = 900;

// The visible region we crop from the 800x900 composite.
const CROP_Y = 320;
const CROP_H = 530;

// All possible sprites to preload (base + instruments)
const SPRITE_NAMES = [
  'cat', 'paw-left', 'paw-right', 'mouth', 'keyboard',
  'bongo', 'cymbal', 'tambourine', 'marimba', 'cowbell',
];

// Skin definitions:
//   tint: hex color for multiply blend (colors the whole cat including white body)
//   filter: optional CSS filter for special effects (dark, invert, ghost)
//   instrument: which instrument sprite to use as base
const SKINS = {
  // === Color skins (keyboard) ===
  'bongo-classic': { name: 'Classic',       tint: null,      filter: null,                                      instrument: 'keyboard' },
  'bongo-orange':  { name: 'Orange Cat',    tint: '#FFB347', filter: null,                                      instrument: 'keyboard' },
  'bongo-pink':    { name: 'Pink Cat',      tint: '#FFB6C1', filter: null,                                      instrument: 'keyboard' },
  'bongo-blue':    { name: 'Blue Cat',      tint: '#87CEEB', filter: null,                                      instrument: 'keyboard' },
  'bongo-green':   { name: 'Green Cat',     tint: '#90EE90', filter: null,                                      instrument: 'keyboard' },
  'bongo-purple':  { name: 'Purple Cat',    tint: '#D8B4FE', filter: null,                                      instrument: 'keyboard' },
  'bongo-golden':  { name: 'Golden Cat',    tint: '#FFD700', filter: null,                                      instrument: 'keyboard' },
  'bongo-dark':    { name: 'Shadow Cat',    tint: null,      filter: 'brightness(0.4) contrast(1.3)',           instrument: 'keyboard' },
  'bongo-invert':  { name: 'Inverted Cat',  tint: null,      filter: 'invert(1) hue-rotate(180deg)',            instrument: 'keyboard' },
  // === Extra color skins ===
  'bongo-cyber':   { name: 'Cyber Cat',     tint: '#00F5D4', filter: 'contrast(1.1)',                           instrument: 'keyboard' },
  'bongo-sunset':  { name: 'Sunset Cat',    tint: '#FFA07A', filter: null,                                      instrument: 'keyboard' },
  'bongo-ice':     { name: 'Ice Cat',       tint: '#B0E0E6', filter: 'brightness(1.1)',                         instrument: 'keyboard' },
  'bongo-cherry':  { name: 'Cherry Cat',    tint: '#FF6B81', filter: null,                                      instrument: 'keyboard' },
  'bongo-mint':    { name: 'Mint Cat',      tint: '#98FB98', filter: null,                                      instrument: 'keyboard' },
  'bongo-coral':   { name: 'Coral Cat',     tint: '#F08080', filter: null,                                      instrument: 'keyboard' },
  'bongo-lemon':   { name: 'Lemon Cat',     tint: '#FFF44F', filter: null,                                      instrument: 'keyboard' },
  'bongo-ghost':   { name: 'Ghost Cat',     tint: null,      filter: 'brightness(1.4) contrast(0.7) saturate(0.2)', instrument: 'keyboard' },
  // === Instrument skins ===
  'bongo-drum':       { name: 'Bongo Drum',     tint: null,      filter: null,                                  instrument: 'bongo' },
  'bongo-cymbal':     { name: 'Cymbal Cat',     tint: null,      filter: null,                                  instrument: 'cymbal' },
  'bongo-tambourine': { name: 'Tambourine Cat', tint: null,      filter: null,                                  instrument: 'tambourine' },
  'bongo-marimba':    { name: 'Marimba Cat',    tint: null,      filter: null,                                  instrument: 'marimba' },
  'bongo-cowbell':    { name: 'Cowbell Cat',     tint: null,      filter: null,                                  instrument: 'cowbell' },
  // === Instrument + color combos ===
  'bongo-drum-pink':    { name: 'Pink Drummer',   tint: '#FFB6C1', filter: null,                                instrument: 'bongo' },
  'bongo-drum-blue':    { name: 'Blue Drummer',   tint: '#87CEEB', filter: null,                                instrument: 'bongo' },
  'bongo-cymbal-gold':  { name: 'Gold Cymbalist', tint: '#FFD700', filter: null,                                instrument: 'cymbal' },
  'bongo-marimba-green':{ name: 'Green Marimba',  tint: '#90EE90', filter: null,                                instrument: 'marimba' },
};

export { SKINS };

export class SpriteCharacter {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.images = {};
    this._loaded = false;
    this._rafId = null;
    this.skinId = 'bongo-classic';

    // Offscreen canvas for compositing all layers at full resolution,
    // then we crop the result onto the visible canvas.
    this._composite = document.createElement('canvas');
    this._composite.width = SPRITE_W;
    this._composite.height = SPRITE_H;
    this._compCtx = this._composite.getContext('2d');

    // Offscreen canvas for tinting individual sprite layers
    this._tintCanvas = document.createElement('canvas');
    this._tintCanvas.width = SPRITE_W;
    this._tintCanvas.height = SPRITE_H;
    this._tintCtx = this._tintCanvas.getContext('2d');

    // Paw states
    this.leftPawDown = false;
    this.rightPawDown = false;
    this.mouthOpen = false;

    // Typing alternation
    this._lastTypingPaw = 'right';

    // Timers
    this._leftTimer = null;
    this._rightTimer = null;
    this._mouthTimer = null;

    this._animate = this._animate.bind(this);
  }

  async load() {
    const basePath = new URL('./sprites/', import.meta.url).href;

    await Promise.all(SPRITE_NAMES.map(name => new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => { this.images[name] = img; resolve(); };
      img.onerror = () => reject(new Error(`Failed to load sprite: ${name}.png`));
      img.src = `${basePath}${name}.png`;
    })));

    this._loaded = true;
  }

  loadSkin(skinId) {
    if (SKINS[skinId]) {
      this.skinId = skinId;
    }
  }

  start() {
    if (!this._rafId && this._loaded) {
      this._rafId = requestAnimationFrame(this._animate);
    }
  }

  stop() {
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  triggerTyping() {
    const paw = this._lastTypingPaw === 'left' ? 'right' : 'left';
    this._lastTypingPaw = paw;
    if (paw === 'left') {
      this.leftPawDown = true;
      clearTimeout(this._leftTimer);
      this._leftTimer = setTimeout(() => { this.leftPawDown = false; }, 120);
    } else {
      this.rightPawDown = true;
      clearTimeout(this._rightTimer);
      this._rightTimer = setTimeout(() => { this.rightPawDown = false; }, 120);
    }
  }

  triggerClick() {
    this.leftPawDown = true;
    this.rightPawDown = true;
    clearTimeout(this._leftTimer);
    clearTimeout(this._rightTimer);
    const t = setTimeout(() => {
      this.leftPawDown = false;
      this.rightPawDown = false;
    }, 300);
    this._leftTimer = t;
    this._rightTimer = t;
  }

  triggerHappy() {
    this.mouthOpen = true;
    clearTimeout(this._mouthTimer);
    this._mouthTimer = setTimeout(() => { this.mouthOpen = false; }, 1500);
  }

  destroy() {
    this.stop();
    clearTimeout(this._leftTimer);
    clearTimeout(this._rightTimer);
    clearTimeout(this._mouthTimer);
  }

  // --- Internal ---

  _animate(_ts) {
    this._draw();
    this._rafId = requestAnimationFrame(this._animate);
  }

  /**
   * Draw a single sprite layer onto the composite canvas.
   * If applyColor is true and the skin has a tint, use multiply blend to color the sprite.
   */
  _drawLayer(cctx, img, srcX, applyColor) {
    const skin = SKINS[this.skinId];

    if (applyColor && skin.tint) {
      // Tint via multiply blend on a temporary canvas:
      // 1. Draw original sprite
      // 2. Multiply with tint color (white → tint, black stays black, grays get tinted)
      // 3. Restore original alpha mask
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

      // Draw tinted result onto composite, with optional CSS filter
      if (skin.filter) {
        cctx.filter = skin.filter;
      }
      cctx.drawImage(this._tintCanvas, 0, 0);
      cctx.filter = 'none';
    } else {
      // No tint — apply CSS filter directly if present
      if (applyColor && skin.filter) {
        cctx.filter = skin.filter;
      }
      cctx.drawImage(img, srcX, 0, SPRITE_W, SPRITE_H, 0, 0, SPRITE_W, SPRITE_H);
      if (applyColor) {
        cctx.filter = 'none';
      }
    }
  }

  _draw() {
    const ctx = this.ctx;
    const cw = this.canvas.width;   // 300
    const ch = this.canvas.height;  // 300

    ctx.clearRect(0, 0, cw, ch);
    if (!this._loaded) return;

    // Step 1: Composite all layers onto offscreen canvas at 800x900
    const cc = this._compCtx;
    cc.clearRect(0, 0, SPRITE_W, SPRITE_H);

    // Instrument layer — drawn at bottom, no tint/filter
    const skin = SKINS[this.skinId] || SKINS['bongo-classic'];
    const instrumentName = skin.instrument || 'keyboard';
    const instrImg = this.images[instrumentName];
    if (instrImg) {
      cc.drawImage(instrImg, 0, SPRITE_H - 450);
    }

    // Cat body (apply tint/filter)
    const catImg = this.images['cat'];
    if (catImg) {
      this._drawLayer(cc, catImg, 0, true);
    }

    // Mouth (2-frame, apply tint/filter)
    const mouthImg = this.images['mouth'];
    if (mouthImg) {
      this._drawLayer(cc, mouthImg, this.mouthOpen ? SPRITE_W : 0, true);
    }

    // Left paw (2-frame, apply tint/filter)
    const leftImg = this.images['paw-left'];
    if (leftImg) {
      this._drawLayer(cc, leftImg, this.leftPawDown ? SPRITE_W : 0, true);
    }

    // Right paw (2-frame, apply tint/filter)
    const rightImg = this.images['paw-right'];
    if (rightImg) {
      this._drawLayer(cc, rightImg, this.rightPawDown ? SPRITE_W : 0, true);
    }

    // Step 2: Crop the interesting region from the composite and draw to canvas
    const scale = cw / SPRITE_W;
    const drawH = CROP_H * scale;
    const offsetY = (ch - drawH) / 2;

    ctx.drawImage(
      this._composite,
      0, CROP_Y, SPRITE_W, CROP_H,   // source crop
      0, offsetY, cw, drawH           // destination
    );
  }
}
