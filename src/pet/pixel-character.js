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
//   spriteSheet: sprite sheet id (null = classic sprite mode)
const SKINS = {
  // === Color skins (keyboard) ===
  'bongo-classic': { name: 'Classic',       tint: null,      filter: null,                                      instrument: 'keyboard', spriteSheet: null },
  'hachiware':     { name: 'Hachiware',     tint: null,      filter: null,                                      instrument: 'keyboard', spriteSheet: 'default' },
  'bongo-orange':  { name: 'Orange Cat',    tint: '#FFB347', filter: null,                                      instrument: 'keyboard', spriteSheet: null },
  'bongo-pink':    { name: 'Pink Cat',      tint: '#FFB6C1', filter: null,                                      instrument: 'keyboard', spriteSheet: null },
  'bongo-blue':    { name: 'Blue Cat',      tint: '#87CEEB', filter: null,                                      instrument: 'keyboard', spriteSheet: null },
  'bongo-green':   { name: 'Green Cat',     tint: '#90EE90', filter: null,                                      instrument: 'keyboard', spriteSheet: null },
  'bongo-purple':  { name: 'Purple Cat',    tint: '#D8B4FE', filter: null,                                      instrument: 'keyboard', spriteSheet: null },
  'bongo-golden':  { name: 'Golden Cat',    tint: '#FFD700', filter: null,                                      instrument: 'keyboard', spriteSheet: null },
  'bongo-dark':    { name: 'Shadow Cat',    tint: null,      filter: 'brightness(0.4) contrast(1.3)',           instrument: 'keyboard', spriteSheet: null },
  'bongo-invert':  { name: 'Inverted Cat',  tint: null,      filter: 'invert(1) hue-rotate(180deg)',            instrument: 'keyboard', spriteSheet: null },
  // === Extra color skins ===
  'bongo-cyber':   { name: 'Cyber Cat',     tint: '#00F5D4', filter: 'contrast(1.1)',                           instrument: 'keyboard', spriteSheet: null },
  'bongo-sunset':  { name: 'Sunset Cat',    tint: '#FFA07A', filter: null,                                      instrument: 'keyboard', spriteSheet: null },
  'bongo-ice':     { name: 'Ice Cat',       tint: '#B0E0E6', filter: 'brightness(1.1)',                         instrument: 'keyboard', spriteSheet: null },
  'bongo-cherry':  { name: 'Cherry Cat',    tint: '#FF6B81', filter: null,                                      instrument: 'keyboard', spriteSheet: null },
  'bongo-mint':    { name: 'Mint Cat',      tint: '#98FB98', filter: null,                                      instrument: 'keyboard', spriteSheet: null },
  'bongo-coral':   { name: 'Coral Cat',     tint: '#F08080', filter: null,                                      instrument: 'keyboard', spriteSheet: null },
  'bongo-lemon':   { name: 'Lemon Cat',     tint: '#FFF44F', filter: null,                                      instrument: 'keyboard', spriteSheet: null },
  'bongo-ghost':   { name: 'Ghost Cat',     tint: null,      filter: 'brightness(1.4) contrast(0.7) saturate(0.2)', instrument: 'keyboard', spriteSheet: null },
  // === Instrument skins ===
  'bongo-drum':       { name: 'Bongo Drum',     tint: null,      filter: null,                                  instrument: 'bongo',      spriteSheet: null },
  'bongo-cymbal':     { name: 'Cymbal Cat',     tint: null,      filter: null,                                  instrument: 'cymbal',     spriteSheet: null },
  'bongo-tambourine': { name: 'Tambourine Cat', tint: null,      filter: null,                                  instrument: 'tambourine', spriteSheet: null },
  'bongo-marimba':    { name: 'Marimba Cat',    tint: null,      filter: null,                                  instrument: 'marimba',    spriteSheet: null },
  'bongo-cowbell':    { name: 'Cowbell Cat',     tint: null,      filter: null,                                  instrument: 'cowbell',    spriteSheet: null },
  // === Instrument + color combos ===
  'bongo-drum-pink':    { name: 'Pink Drummer',   tint: '#FFB6C1', filter: null,                                instrument: 'bongo',  spriteSheet: null },
  'bongo-drum-blue':    { name: 'Blue Drummer',   tint: '#87CEEB', filter: null,                                instrument: 'bongo',  spriteSheet: null },
  'bongo-cymbal-gold':  { name: 'Gold Cymbalist', tint: '#FFD700', filter: null,                                instrument: 'cymbal', spriteSheet: null },
  'bongo-marimba-green':{ name: 'Green Marimba',  tint: '#90EE90', filter: null,                                instrument: 'marimba', spriteSheet: null },
  // === Animated sprite sheet skins ===
  'animated-default':   { name: 'Animated Cat',   tint: null,      filter: null,                                instrument: null, spriteSheet: 'default' },
  'animated-pink':      { name: 'Animated Pink',   tint: '#FFB6C1', filter: null,                               instrument: null, spriteSheet: 'default' },
  'animated-blue':      { name: 'Animated Blue',   tint: '#87CEEB', filter: null,                               instrument: null, spriteSheet: 'default' },
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

    // Click expression state
    this._clickExpr = null;     // { icon, startTime, duration }
    this._clickExprTimer = null;

    // Preload pixel-art expression icons
    this._exprImages = {};
    const exprFiles = {
      curious: 'icons/expr-curious.png', working: 'icons/expr-working.png',
      proud: 'icons/expr-proud.png', sleepy: 'icons/expr-sleepy.png',
      alert: 'icons/expr-alert.png', star: 'icons/expr-star.png',
      heart: 'icons/expr-heart.png', anger: 'icons/expr-anger.png',
      note: 'icons/expr-note.png', sweat: 'icons/expr-sweat.png',
    };
    for (const [key, file] of Object.entries(exprFiles)) {
      const img = new Image();
      img.src = file;
      this._exprImages[key] = img;
    }

    // Typing alternation
    this._lastTypingPaw = 'right';

    // Timers
    this._leftTimer = null;
    this._rightTimer = null;
    this._mouthTimer = null;
    this._intentTimer = null;

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
    // Show a random pixel-art expression icon near the cat's face instead of paw slap
    const expressions = ['proud', 'alert', 'anger', 'heart', 'curious', 'star', 'note', 'sweat', 'sleepy'];
    const icon = expressions[Math.floor(Math.random() * expressions.length)];
    this._clickExpr = { icon, startTime: performance.now(), duration: 500 };
    clearTimeout(this._clickExprTimer);
    this._clickExprTimer = setTimeout(() => { this._clickExpr = null; }, 500);
  }

  triggerHappy() {
    this.mouthOpen = true;
    clearTimeout(this._mouthTimer);
    this._mouthTimer = setTimeout(() => { this.mouthOpen = false; }, 1500);
  }

  triggerIntent(name) {
    console.log('[SpriteCharacter] triggerIntent:', name);
    clearTimeout(this._intentTimer);
    const intentIcons = {
      curious: 'curious',
      working: 'working',
      proud: 'proud',
      sleepy: 'sleepy',
      alert: 'alert',
      encouraging: 'star',
    };
    const icon = intentIcons[name];
    if (icon) {
      this._clickExpr = { icon, startTime: performance.now(), duration: name === 'working' ? 999999 : 2500 };
      clearTimeout(this._clickExprTimer);
      if (name !== 'working') {
        this._clickExprTimer = setTimeout(() => { this._clickExpr = null; }, 2500);
      }
    }

    // Pose changes for specific intents
    if (name === 'curious' || name === 'alert') {
      // Lift both paws + open mouth = surprised/curious pose
      this.leftPawDown = true;
      this.rightPawDown = true;
      this.mouthOpen = true;
      clearTimeout(this._leftTimer);
      clearTimeout(this._rightTimer);
      clearTimeout(this._mouthTimer);
      this._intentTimer = setTimeout(() => {
        this.leftPawDown = false;
        this.rightPawDown = false;
        this.mouthOpen = false;
      }, 2500);
    } else if (name === 'proud' || name === 'encouraging') {
      this.mouthOpen = true;
      clearTimeout(this._mouthTimer);
      this._mouthTimer = setTimeout(() => { this.mouthOpen = false; }, 1500);
    } else if (name === 'idle') {
      // Always clear working intent (duration 999999 would block idle forever)
      // For other intents, let short animations finish naturally
      if (this._clickExpr) {
        const isWorking = this._clickExpr.duration > 10000;
        const elapsed = performance.now() - this._clickExpr.startTime;
        if (!isWorking && elapsed < this._clickExpr.duration) {
          return; // Let animation finish naturally
        }
      }
      this._clickExpr = null;
      this.mouthOpen = false;
      this.leftPawDown = false;
      this.rightPawDown = false;
    } else if (name === 'sleepy') {
      this._clickExpr = null;
      this.mouthOpen = false;
    }
  }

  destroy() {
    this.stop();
    clearTimeout(this._leftTimer);
    clearTimeout(this._rightTimer);
    clearTimeout(this._mouthTimer);
    clearTimeout(this._clickExprTimer);
    clearTimeout(this._intentTimer);
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

    // Step 3: Click expression overlay — drawn on final canvas so it won't be clipped
    if (this._clickExpr) {
      const elapsed = performance.now() - this._clickExpr.startTime;
      const progress = Math.min(elapsed / this._clickExpr.duration, 1);
      const alpha = 1 - progress * 0.5;
      const floatY = progress * 40;
      // Scale-in bounce effect at start
      const scaleProgress = Math.min(elapsed / 300, 1);
      const exprScale = scaleProgress < 1 ? 0.5 + 0.5 * scaleProgress + 0.2 * Math.sin(scaleProgress * Math.PI) : 1.0;
      ctx.save();
      ctx.globalAlpha = alpha;
      // Draw pixel-art icon instead of emoji text
      const img = this._exprImages[this._clickExpr.icon];
      if (img?.complete && img.naturalWidth > 0) {
        const size = Math.round(48 * exprScale);
        const drawX = cw * 0.72 - size / 2;
        const drawY = ch * 0.52 - floatY - size / 2;
        ctx.drawImage(img, drawX, drawY, size, size);
      }
      ctx.restore();
    }
  }
}
