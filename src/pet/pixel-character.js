/**
 * Sprite-based Bongo Cat character using original bongo.cat open-source assets
 * (MIT license — https://github.com/Externalizable/bongo.cat)
 *
 * All original sprites are 800x900 (cat/paw/mouth) or 800x450 (instruments).
 * They are designed to overlay at the same origin in an 800x900 viewport.
 * We crop a viewport region from the composited result to fit our 300x300 canvas.
 *
 * Skins apply CSS filter (hue-rotate etc.) to cat/paw/mouth sprites only.
 */

const SPRITE_W = 800;
const SPRITE_H = 900;

// The visible region we crop from the 800x900 composite.
// Original bongo.cat content sits roughly in the bottom-right area.
// Cat head: ~(300,0)-(750,250), Keyboard: ~(50,450)-(750,450+h), Paws: ~(200,300)-(700,600)
// We crop a 800x500 region from y=200..700 to capture cat+keyboard without excess whitespace.
const CROP_Y = 320;
const CROP_H = 530;

const SPRITE_NAMES = [
  'cat', 'paw-left', 'paw-right', 'mouth', 'keyboard',
];

// Skin definitions — CSS filter strings applied to cat sprites
const SKINS = {
  'bongo-classic': { name: 'Classic',      filter: 'none' },
  'bongo-orange':  { name: 'Orange Cat',   filter: 'sepia(0.4) saturate(2.5) hue-rotate(10deg)' },
  'bongo-pink':    { name: 'Pink Cat',     filter: 'sepia(0.3) saturate(2) hue-rotate(300deg) brightness(1.1)' },
  'bongo-blue':    { name: 'Blue Cat',     filter: 'sepia(0.3) saturate(2) hue-rotate(180deg) brightness(1.1)' },
  'bongo-green':   { name: 'Green Cat',    filter: 'sepia(0.3) saturate(2) hue-rotate(90deg) brightness(1.05)' },
  'bongo-purple':  { name: 'Purple Cat',   filter: 'sepia(0.3) saturate(2) hue-rotate(240deg) brightness(1.1)' },
  'bongo-golden':  { name: 'Golden Cat',   filter: 'sepia(0.5) saturate(3) hue-rotate(20deg) brightness(1.1)' },
  'bongo-dark':    { name: 'Shadow Cat',   filter: 'brightness(0.4) contrast(1.3)' },
  'bongo-invert':  { name: 'Inverted Cat', filter: 'invert(1) hue-rotate(180deg)' },
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

  /** Draw a single sprite layer onto the composite canvas. */
  _drawLayer(cctx, img, srcX, applyFilter) {
    const skin = SKINS[this.skinId];
    if (applyFilter && skin && skin.filter !== 'none') {
      cctx.filter = skin.filter;
    }
    // srcX selects the frame for 2-frame sprites (0 or SPRITE_W)
    cctx.drawImage(img, srcX, 0, SPRITE_W, SPRITE_H, 0, 0, SPRITE_W, SPRITE_H);
    if (applyFilter) {
      cctx.filter = 'none';
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

    // Instrument (keyboard) — drawn at bottom, no filter
    const kbImg = this.images['keyboard'];
    if (kbImg) {
      // keyboard.png is 800x450, positioned at bottom of 800x900
      cc.drawImage(kbImg, 0, SPRITE_H - 450);
    }

    // Cat body (apply skin filter)
    const catImg = this.images['cat'];
    if (catImg) {
      this._drawLayer(cc, catImg, 0, true);
    }

    // Mouth (2-frame, apply filter)
    const mouthImg = this.images['mouth'];
    if (mouthImg) {
      this._drawLayer(cc, mouthImg, this.mouthOpen ? SPRITE_W : 0, true);
    }

    // Left paw (2-frame, apply filter)
    const leftImg = this.images['paw-left'];
    if (leftImg) {
      this._drawLayer(cc, leftImg, this.leftPawDown ? SPRITE_W : 0, true);
    }

    // Right paw (2-frame, apply filter)
    const rightImg = this.images['paw-right'];
    if (rightImg) {
      this._drawLayer(cc, rightImg, this.rightPawDown ? SPRITE_W : 0, true);
    }

    // Step 2: Crop the interesting region from the composite and draw to canvas
    // We take a CROP_H tall strip starting at CROP_Y, fitting it into the 300x300 canvas
    const scale = cw / SPRITE_W;
    const drawH = CROP_H * scale;
    // Center vertically in canvas
    const offsetY = (ch - drawH) / 2;

    ctx.drawImage(
      this._composite,
      0, CROP_Y, SPRITE_W, CROP_H,   // source crop
      0, offsetY, cw, drawH           // destination
    );
  }
}
