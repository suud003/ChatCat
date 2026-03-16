/**
 * Sprite-sheet-based animated character.
 *
 * Reads a sheet.json + sheet.png (or generates a placeholder sheet)
 * and drives a state-machine of frame-by-frame animations.
 *
 * Public interface is identical to SpriteCharacter so the renderer
 * can swap between the two transparently.
 */

const CANVAS_SIZE = 300;

// Timing constants
const SLEEP_TIMEOUT = 30_000;       // 30 s idle → sleep
const BLINK_MIN     = 3_000;        // random blink interval 3-5 s
const BLINK_MAX     = 5_000;
const HAPPY_DURATION = 2_000;       // happy state lasts 2 s

export class SpriteSheetCharacter {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // Sheet data
    this._sheet = null;          // Image
    this._meta = null;           // parsed sheet.json
    this._loaded = false;
    this._sheetId = null;

    // Tint
    this._tintColor = null;
    this._tintedSheet = null;    // offscreen canvas with pre-tinted sheet
    this._tintCanvas = document.createElement('canvas');
    this._tintCtx = this._tintCanvas.getContext('2d');

    // State machine
    this._state = 'idle';
    this._frame = 0;
    this._frameTime = 0;         // ms accumulated in current frame
    this._lastTs = 0;

    // Timers
    this._idleTime = 0;          // ms since last input
    this._nextBlink = this._randomBlink();
    this._blinkTimer = 0;
    this._happyTimer = null;

    // Typing alternation
    this._lastTypingPaw = 'right';

    // Dirty flag — only repaint when something changes
    this._dirty = true;
    this._prevState = null;
    this._prevFrame = -1;

    // RAF
    this._rafId = null;
    this._animate = this._animate.bind(this);
  }

  /* ------------------------------------------------------------------ */
  /*  Public API (same surface as SpriteCharacter)                       */
  /* ------------------------------------------------------------------ */

  async load(sheetId = 'default') {
    this._sheetId = sheetId;
    const basePath = new URL(`./spritesheets/${sheetId}/`, import.meta.url).href;

    // Load JSON meta
    const resp = await fetch(`${basePath}sheet.json`);
    this._meta = await resp.json();

    // Try loading sheet.png; fall back to programmatic placeholder
    try {
      this._sheet = await this._loadImage(`${basePath}sheet.png`);
    } catch {
      this._sheet = this._generatePlaceholder();
    }

    this._loaded = true;
  }

  loadSkin(skinId) {
    // SpriteSheetCharacter uses tint from the skin definition.
    // We import SKINS lazily to avoid circular deps.
    import('./pixel-character.js').then(({ SKINS }) => {
      const skin = SKINS[skinId];
      if (skin && skin.spriteSheet === this._sheetId) {
        this.setTint(skin.tint);
      }
    });
  }

  setTint(color) {
    if (color === this._tintColor) return;
    this._tintColor = color;
    this._tintedSheet = null;   // invalidate cache → rebuilt on next draw
    this._dirty = true;
  }

  start() {
    if (!this._rafId && this._loaded) {
      this._lastTs = performance.now();
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
    this._setState(paw === 'left' ? 'typing-left' : 'typing-right');
    this._resetIdle();
  }

  triggerClick() {
    this._setState('click-react');
    this._resetIdle();
  }

  triggerHappy() {
    this._setState('happy');
    this._resetIdle();
    clearTimeout(this._happyTimer);
    this._happyTimer = setTimeout(() => {
      if (this._state === 'happy') this._setState('idle');
    }, HAPPY_DURATION);
  }

  destroy() {
    this.stop();
    clearTimeout(this._happyTimer);
  }

  /* ------------------------------------------------------------------ */
  /*  State machine                                                      */
  /* ------------------------------------------------------------------ */

  _setState(name) {
    if (!this._meta || !this._meta.states[name]) return;
    this._state = name;
    this._frame = 0;
    this._frameTime = 0;
    this._dirty = true;
  }

  _resetIdle() {
    this._idleTime = 0;
    this._blinkTimer = 0;
    this._nextBlink = this._randomBlink();
  }

  _randomBlink() {
    return BLINK_MIN + Math.random() * (BLINK_MAX - BLINK_MIN);
  }

  /* ------------------------------------------------------------------ */
  /*  Animation loop                                                     */
  /* ------------------------------------------------------------------ */

  _animate(ts) {
    const dt = ts - this._lastTs;
    this._lastTs = ts;

    if (this._meta) {
      this._tick(dt);
    }

    if (this._dirty) {
      this._draw();
      this._dirty = false;
      this._prevState = this._state;
      this._prevFrame = this._frame;
    }

    this._rafId = requestAnimationFrame(this._animate);
  }

  _tick(dt) {
    const stateMeta = this._meta.states[this._state];
    if (!stateMeta) return;

    // Advance frame timer
    this._frameTime += dt;

    if (this._frameTime >= stateMeta.frameDuration) {
      this._frameTime -= stateMeta.frameDuration;
      this._frame++;

      if (this._frame >= stateMeta.frames) {
        if (stateMeta.loop) {
          this._frame = 0;
        } else {
          // Non-loop animation ended → transition
          const next = stateMeta.next || 'idle';
          this._setState(next);
          return;
        }
      }
      this._dirty = true;
    }

    // Idle-specific logic
    if (this._state === 'idle') {
      this._idleTime += dt;
      this._blinkTimer += dt;

      // Blink trigger
      if (this._blinkTimer >= this._nextBlink) {
        this._blinkTimer = 0;
        this._nextBlink = this._randomBlink();
        if (this._meta.states['idle-blink']) {
          this._setState('idle-blink');
          return;
        }
      }

      // Sleep trigger
      if (this._idleTime >= SLEEP_TIMEOUT) {
        this._setState('sleep');
      }
    }

    // Wake from sleep on any future input (handled by trigger* methods calling _resetIdle + _setState)
    // If currently sleeping and an input comes, trigger methods handle it.
  }

  /* ------------------------------------------------------------------ */
  /*  Drawing                                                            */
  /* ------------------------------------------------------------------ */

  _draw() {
    const ctx = this.ctx;
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    ctx.clearRect(0, 0, cw, ch);

    if (!this._loaded || !this._meta) return;

    const src = this._getSourceSheet();
    const stateMeta = this._meta.states[this._state];
    if (!stateMeta) return;

    const fw = this._meta.frameWidth;
    const fh = this._meta.frameHeight;
    const col = this._frame % this._meta.columns;
    const row = stateMeta.row;
    const sx = col * fw;
    const sy = row * fh;

    ctx.drawImage(src, sx, sy, fw, fh, 0, 0, cw, ch);
  }

  _getSourceSheet() {
    if (!this._tintColor || !this._meta.tintable) return this._sheet;

    if (!this._tintedSheet) {
      this._buildTintedSheet();
    }
    return this._tintedSheet;
  }

  _buildTintedSheet() {
    const sw = this._sheet.width;
    const sh = this._sheet.height;
    this._tintCanvas.width = sw;
    this._tintCanvas.height = sh;
    const tc = this._tintCtx;

    // Draw original
    tc.globalCompositeOperation = 'source-over';
    tc.drawImage(this._sheet, 0, 0);

    // Multiply tint
    tc.globalCompositeOperation = 'multiply';
    tc.fillStyle = this._tintColor;
    tc.fillRect(0, 0, sw, sh);

    // Restore alpha
    tc.globalCompositeOperation = 'destination-in';
    tc.drawImage(this._sheet, 0, 0);

    this._tintedSheet = this._tintCanvas;
  }

  /* ------------------------------------------------------------------ */
  /*  Helpers                                                            */
  /* ------------------------------------------------------------------ */

  _loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load: ${src}`));
      img.src = src;
    });
  }

  /**
   * Generate a placeholder sprite sheet with colored rectangles and labels
   * so the system can be tested without real art assets.
   */
  _generatePlaceholder() {
    const meta = this._meta;
    const cols = meta.columns;
    const fw = meta.frameWidth;
    const fh = meta.frameHeight;
    const rows = Object.keys(meta.states).length;

    const c = document.createElement('canvas');
    c.width = cols * fw;
    c.height = rows * fh;
    const ctx = c.getContext('2d');

    const palette = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
      '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
    ];

    for (const [name, state] of Object.entries(meta.states)) {
      const row = state.row;
      const hue = palette[row % palette.length];

      for (let f = 0; f < state.frames; f++) {
        const x = f * fw;
        const y = row * fh;

        // Background
        ctx.fillStyle = hue;
        ctx.globalAlpha = 0.3;
        ctx.fillRect(x, y, fw, fh);

        // Border
        ctx.globalAlpha = 1;
        ctx.strokeStyle = hue;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, fw - 2, fh - 2);

        // Simple cat face silhouette
        ctx.fillStyle = hue;
        ctx.globalAlpha = 0.6;
        // Head circle
        ctx.beginPath();
        ctx.arc(x + fw / 2, y + fh * 0.4, fw * 0.25, 0, Math.PI * 2);
        ctx.fill();
        // Ears
        ctx.beginPath();
        ctx.moveTo(x + fw * 0.3, y + fh * 0.22);
        ctx.lineTo(x + fw * 0.2, y + fh * 0.08);
        ctx.lineTo(x + fw * 0.4, y + fh * 0.18);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + fw * 0.7, y + fh * 0.22);
        ctx.lineTo(x + fw * 0.8, y + fh * 0.08);
        ctx.lineTo(x + fw * 0.6, y + fh * 0.18);
        ctx.fill();
        // Body
        ctx.beginPath();
        ctx.ellipse(x + fw / 2, y + fh * 0.7, fw * 0.22, fh * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Label
        ctx.fillStyle = '#333';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(name, x + fw / 2, y + fh - 30);
        ctx.font = '12px sans-serif';
        ctx.fillText(`frame ${f}`, x + fw / 2, y + fh - 12);
      }
    }

    return c;   // canvas is a valid CanvasImageSource
  }
}
