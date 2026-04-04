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
const ENABLE_CAT_OVERLAY_ANIMATION = true;
const DROWSY_MIN_TIMEOUT = 12_000;
const DROWSY_MAX_TIMEOUT = 18_000;

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

    // Offscreen canvas for compositing base layers at full resolution,
    // then we crop the result onto the visible canvas.
    this._composite = document.createElement('canvas');
    this._composite.width = SPRITE_W;
    this._composite.height = SPRITE_H;
    this._compCtx = this._composite.getContext('2d');

    // Dedicated cat layer so static cat and drowsy animation share
    // the same render slot above the instrument layer.
    this._catComposite = document.createElement('canvas');
    this._catComposite.width = SPRITE_W;
    this._catComposite.height = SPRITE_H;
    this._catCompCtx = this._catComposite.getContext('2d');

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
    this._lastTs = 0;
    this._idleTime = 0;
    this._nextDrowsyAt = this._randomDrowsyTime();
    this._playedDrowsyThisIdle = false;

    // Optional transparent overlay sheet: only the cat, no keyboard/background.
    this._overlaySheet = null;
    this._overlayMeta = null;
    this._overlayLoaded = false;
    this._overlayState = null;
    this._overlayFrame = 0;
    this._overlayFrameTime = 0;
    this._overlayTintCanvas = document.createElement('canvas');
    this._overlayTintCtx = this._overlayTintCanvas.getContext('2d');
    this._overlaySuppressActivityUntil = 0;

    this._animate = this._animate.bind(this);
  }

  async load() {
    const basePath = new URL('./sprites/', import.meta.url).href;
    const spriteLoad = Promise.all(SPRITE_NAMES.map(name => new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => { this.images[name] = img; resolve(); };
      img.onerror = () => reject(new Error(`Failed to load sprite: ${name}.png`));
      img.src = `${basePath}${name}.png`;
    })));
    const overlayLoad = ENABLE_CAT_OVERLAY_ANIMATION ? this._loadOverlayAssets() : Promise.resolve();

    await Promise.all([spriteLoad, overlayLoad]);

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
    this._onActivity();
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
    this._onActivity();
    // Show a random pixel-art expression icon near the cat's face instead of paw slap
    const expressions = ['proud', 'alert', 'anger', 'heart', 'curious', 'star', 'note', 'sweat', 'sleepy'];
    const icon = expressions[Math.floor(Math.random() * expressions.length)];
    this._clickExpr = { icon, startTime: performance.now(), duration: 500 };
    clearTimeout(this._clickExprTimer);
    this._clickExprTimer = setTimeout(() => { this._clickExpr = null; }, 500);
  }

  triggerHappy() {
    this._onActivity();
    this.mouthOpen = true;
    clearTimeout(this._mouthTimer);
    this._mouthTimer = setTimeout(() => { this.mouthOpen = false; }, 1500);
  }

  triggerIntent(name) {
    console.log('[SpriteCharacter] triggerIntent:', name);
    clearTimeout(this._intentTimer);
    if (name !== 'sleepy') this._onActivity();
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
      if (ENABLE_CAT_OVERLAY_ANIMATION) this._playOverlayState('drowsy');
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

  async reloadAssets() {
    const wasRunning = !!this._rafId;
    if (wasRunning) this.stop();
    await this.load();
    this.loadSkin(this.skinId);
    this._stopOverlayState();
    this._onActivity();
    if (wasRunning) this.start();
  }

  getDebugAnimationState() {
    return {
      renderer: 'SpriteCharacter',
      skinId: this.skinId,
      currentSkin: this.skinId,
      overlayState: this._overlayState,
      overlayLoaded: this._overlayLoaded,
      overlayFrame: this._overlayFrame,
      idleTimeMs: Math.round(this._idleTime),
      nextDrowsyAtMs: Math.round(this._nextDrowsyAt),
      leftPawDown: this.leftPawDown,
      rightPawDown: this.rightPawDown,
      mouthOpen: this.mouthOpen,
      clickExpr: this._clickExpr?.icon || null,
    };
  }

  getDebugAssetManifest() {
    return {
      renderer: 'SpriteCharacter',
      assets: [
        {
          id: 'classic-base-sprites',
          label: '经典底层 sprites',
          kind: 'sprite-layers',
          description: '键盘/乐器与经典猫身体拆层资源',
          revealPath: new URL('./sprites/cat.png', import.meta.url).href,
          files: SPRITE_NAMES.map((name) => ({ name: `${name}.png`, revealPath: new URL(`./sprites/${name}.png`, import.meta.url).href })),
        },
        {
          id: 'classic-cat-overlay',
          label: '猫层 Overlay 动画',
          kind: 'sheet',
          description: '只覆盖中间猫，不影响键盘与桌面',
          revealPath: new URL('./cat-overlays/default/sheet.png', import.meta.url).href,
          sheetUrl: new URL('./cat-overlays/default/sheet.png', import.meta.url).href,
          configUrl: new URL('./cat-overlays/default/sheet.json', import.meta.url).href,
          workflow: {
            id: 'classic-cat-overlay',
            sourceDir: new URL('./animation-sources/classic-cat-overlay/drowsy/', import.meta.url).href,
            referenceDir: new URL('./animation-sources/classic-cat-overlay/drowsy/reference/', import.meta.url).href,
            referencePath: new URL('./animation-sources/classic-cat-overlay/drowsy/reference/base.png', import.meta.url).href,
            framesDir: new URL('./animation-sources/classic-cat-overlay/drowsy/frames/', import.meta.url).href,
            buildDir: new URL('./cat-overlays/default/', import.meta.url).href,
            framePattern: 'frame_001.png ~ frame_999.png',
            stateName: 'drowsy',
          },
          meta: this._overlayMeta,
          states: this._overlayMeta?.states || {},
        },
      ],
    };
  }

  // --- Internal ---

  _animate(_ts) {
    const ts = _ts || performance.now();
    const dt = this._lastTs ? (ts - this._lastTs) : 16;
    this._lastTs = ts;
    this._tickIdle(dt);
    this._tickOverlay(dt);
    this._draw();
    this._rafId = requestAnimationFrame(this._animate);
  }

  async _loadOverlayAssets() {
    try {
      const overlayBasePath = new URL('./cat-overlays/default/', import.meta.url).href;
      const resp = await fetch(`${overlayBasePath}sheet.json`);
      if (!resp.ok) return;
      this._overlayMeta = await resp.json();
      this._overlaySheet = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load cat overlay sheet'));
        img.src = `${overlayBasePath}sheet.png`;
      });
      this._overlayLoaded = true;
    } catch (err) {
      console.warn('[SpriteCharacter] overlay load failed:', err.message);
    }
  }

  _tickIdle(dt) {
    if (!ENABLE_CAT_OVERLAY_ANIMATION) return;
    if (this._overlayState) return;
    this._idleTime += dt;
    if (!this._playedDrowsyThisIdle && this._idleTime >= this._nextDrowsyAt) {
      this._playedDrowsyThisIdle = true;
      this._playOverlayState('drowsy');
    }
  }

  _tickOverlay(dt) {
    if (!this._overlayState || !this._overlayMeta) return;
    const state = this._overlayMeta.states?.[this._overlayState];
    if (!state) {
      this._stopOverlayState();
      return;
    }
    this._overlayFrameTime += dt;
    if (this._overlayFrameTime < state.frameDuration) return;
    this._overlayFrameTime -= state.frameDuration;
    this._overlayFrame += 1;
    if (this._overlayFrame < state.frames) return;
    if (state.loop) {
      this._overlayFrame = 0;
      return;
    }
    const next = state.next;
    if (next && this._overlayMeta.states?.[next]) {
      this._overlayState = next;
      this._overlayFrame = 0;
      this._overlayFrameTime = 0;
      return;
    }
    this._stopOverlayState();
  }

  _playOverlayState(name) {
    if (!ENABLE_CAT_OVERLAY_ANIMATION) return false;
    if (!this._overlayLoaded || !this._overlayMeta?.states?.[name]) return false;
    console.log('[SpriteCharacter] overlay ->', name);
    this._clickExpr = null;
    this._overlayState = name;
    this._overlayFrame = 0;
    this._overlayFrameTime = 0;
    this._overlaySuppressActivityUntil = performance.now() + 500;
    return true;
  }

  _stopOverlayState() {
    if (!this._overlayState) return;
    console.log('[SpriteCharacter] overlay stop');
    this._overlayState = null;
    this._overlayFrame = 0;
    this._overlayFrameTime = 0;
    this._idleTime = 0;
    this._nextDrowsyAt = this._randomDrowsyTime();
    this._playedDrowsyThisIdle = false;
  }

  _onActivity() {
    if (this._overlayState && performance.now() < this._overlaySuppressActivityUntil) {
      return;
    }
    this._stopOverlayState();
    this._idleTime = 0;
    this._nextDrowsyAt = this._randomDrowsyTime();
    this._playedDrowsyThisIdle = false;
  }

  _randomDrowsyTime() {
    return DROWSY_MIN_TIMEOUT + Math.random() * (DROWSY_MAX_TIMEOUT - DROWSY_MIN_TIMEOUT);
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

    // Step 1: Build base layer and cat layer separately.
    const cc = this._compCtx;
    const catCc = this._catCompCtx;
    cc.clearRect(0, 0, SPRITE_W, SPRITE_H);
    catCc.clearRect(0, 0, SPRITE_W, SPRITE_H);

    // Instrument layer — drawn at bottom, no tint/filter
    const skin = SKINS[this.skinId] || SKINS['bongo-classic'];
    const instrumentName = skin.instrument || 'keyboard';
    const instrImg = this.images[instrumentName];
    if (instrImg) {
      cc.drawImage(instrImg, 0, SPRITE_H - 450);
    }

    const showOverlayCat = !!(this._overlayState && this._overlayLoaded && this._overlayMeta && this._overlaySheet);
    if (!showOverlayCat) {
      // Cat body (apply tint/filter)
      const catImg = this.images['cat'];
      if (catImg) {
        this._drawLayer(catCc, catImg, 0, true);
      }

      // Mouth (2-frame, apply tint/filter)
      const mouthImg = this.images['mouth'];
      if (mouthImg) {
        this._drawLayer(catCc, mouthImg, this.mouthOpen ? SPRITE_W : 0, true);
      }

      // Left paw (2-frame, apply tint/filter)
      const leftImg = this.images['paw-left'];
      if (leftImg) {
        this._drawLayer(catCc, leftImg, this.leftPawDown ? SPRITE_W : 0, true);
      }

      // Right paw (2-frame, apply tint/filter)
      const rightImg = this.images['paw-right'];
      if (rightImg) {
        this._drawLayer(catCc, rightImg, this.rightPawDown ? SPRITE_W : 0, true);
      }
    }

    // Step 2: Draw base layer first.
    const scale = cw / SPRITE_W;
    const drawH = CROP_H * scale;
    const offsetY = (ch - drawH) / 2;

    ctx.drawImage(
      this._composite,
      0, CROP_Y, SPRITE_W, CROP_H,   // source crop
      0, offsetY, cw, drawH           // destination
    );

    // Step 3: Draw the cat layer in the same render slot whether static or animated.
    if (showOverlayCat) {
      this._drawOverlayFrame(ctx, cw, ch, skin, offsetY, drawH);
    } else {
      ctx.drawImage(
        this._catComposite,
        0, CROP_Y, SPRITE_W, CROP_H,
        0, offsetY, cw, drawH
      );
    }

    // Step 4: Click expression overlay — drawn on final canvas so it won't be clipped
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

  _drawOverlayFrame(ctx, cw, ch, skin, slotY = 0, slotH = ch) {
    const state = this._overlayMeta?.states?.[this._overlayState];
    if (!state || !this._overlaySheet) return;
    const fw = Number(this._overlayMeta.frameWidth || cw);
    const fh = Number(this._overlayMeta.frameHeight || ch);
    const cols = Math.max(1, Number(state.columns || this._overlayMeta.columns || 1));
    const col = this._overlayFrame % cols;
    const row = Number(state.row || 0) + Math.floor(this._overlayFrame / cols);
    const sx = col * fw;
    const sy = row * fh;
    const scale = Number(this._overlayMeta?.displayScale || 1);
    const baseH = Math.min(slotH, ch);
    const baseW = baseH * (fw / Math.max(1, fh));
    const drawW = baseW * scale;
    const drawH = baseH * scale;
    const offsetX = Number(this._overlayMeta?.offsetX || 0);
    const offsetY = Number(this._overlayMeta?.offsetY || 0);
    const dx = ((cw - drawW) / 2) + offsetX;
    const dy = slotY + ((slotH - drawH) / 2) + offsetY;

    if (this._overlayMeta.tintable && (skin?.tint || skin?.filter)) {
      this._overlayTintCanvas.width = fw;
      this._overlayTintCanvas.height = fh;
      const tc = this._overlayTintCtx;
      tc.clearRect(0, 0, fw, fh);
      tc.globalCompositeOperation = 'source-over';
      tc.filter = 'none';
      tc.drawImage(this._overlaySheet, sx, sy, fw, fh, 0, 0, fw, fh);
      if (skin?.tint) {
        tc.globalCompositeOperation = 'multiply';
        tc.fillStyle = skin.tint;
        tc.fillRect(0, 0, fw, fh);
        tc.globalCompositeOperation = 'destination-in';
        tc.drawImage(this._overlaySheet, sx, sy, fw, fh, 0, 0, fw, fh);
      }
      tc.globalCompositeOperation = 'source-over';
      ctx.save();
      if (skin?.filter) ctx.filter = skin.filter;
      ctx.drawImage(this._overlayTintCanvas, dx, dy, drawW, drawH);
      ctx.restore();
      return;
    }

    ctx.save();
    if (skin?.filter) ctx.filter = skin.filter;
    ctx.drawImage(this._overlaySheet, sx, sy, fw, fh, dx, dy, drawW, drawH);
    ctx.restore();
  }
}
