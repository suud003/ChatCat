import {
  POMODORO_MAIN_ANIMATION_CONFIG,
  buildPomodoroAnimationFrameUrls,
} from '../config/pomodoro-animation-config.js';

export class PomodoroOverlayAnimation {
  constructor(config = {}) {
    this.config = { ...POMODORO_MAIN_ANIMATION_CONFIG, ...config };
    this._container = document.getElementById('pet-container');
    this._overlay = document.getElementById('pet-pomodoro-animation');
    this._frameEl = document.getElementById('pet-pomodoro-animation-frame');
    this._frameUrls = buildPomodoroAnimationFrameUrls(this.config);
    this._frames = [];
    this._preloadPromise = null;
    this._rafId = null;
    this._running = false;
    this._currentFrame = 0;
    this._lastFrameAt = 0;
    this._tick = this._tick.bind(this);
    this.applyConfig();
    console.warn('[PomodoroOverlayAnimation] init', {
      hasContainer: !!this._container,
      hasOverlay: !!this._overlay,
      hasFrameEl: !!this._frameEl,
      config: this.config
    });
  }

  preload() {
    if (this._preloadPromise) return this._preloadPromise;
    console.warn('[PomodoroOverlayAnimation] preload start', {
      frameCount: this._frameUrls.length,
      firstFrame: this._frameUrls[0],
      lastFrame: this._frameUrls[this._frameUrls.length - 1]
    });
    this._preloadPromise = Promise.all(this._frameUrls.map((src) => this._loadImage(src)))
      .then((frames) => {
        this._frames = frames;
        console.warn('[PomodoroOverlayAnimation] preload success', {
          loaded: frames.length
        });
        return frames;
      })
      .catch((err) => {
        this._preloadPromise = null;
        console.warn('[PomodoroOverlayAnimation] preload failed', err);
        throw err;
      });
    return this._preloadPromise;
  }

  applyConfig(overrides = {}) {
    this.config = { ...this.config, ...overrides };
    this._frameUrls = buildPomodoroAnimationFrameUrls(this.config);
    this._frames = [];
    this._preloadPromise = null;
    if (!this._overlay) return;
    this._overlay.style.setProperty('--pomodoro-overlay-width', `${this.config.width}px`);
    this._overlay.style.setProperty('--pomodoro-overlay-height', `${this.config.height}px`);
    this._overlay.style.setProperty('--pomodoro-overlay-offset-x', `${this.config.offsetX}px`);
    this._overlay.style.setProperty('--pomodoro-overlay-offset-y', `${this.config.offsetY}px`);
    this._overlay.style.setProperty('--pomodoro-overlay-opacity', String(this.config.opacity));
    console.warn('[PomodoroOverlayAnimation] applyConfig', this.config);
  }

  async show({ restart = true } = {}) {
    console.warn('[PomodoroOverlayAnimation] show requested', {
      restart,
      hasContainer: !!this._container,
      hasOverlay: !!this._overlay,
      hasFrameEl: !!this._frameEl
    });
    if (!this._container || !this._overlay || !this._frameEl) {
      console.warn('[PomodoroOverlayAnimation] show aborted because DOM is missing');
      return;
    }
    await this.preload();
    this._container.classList.add('pomodoro-animation-mode');
    this._overlay.classList.remove('hidden');
    this._overlay.classList.add('is-visible');
    console.warn('[PomodoroOverlayAnimation] overlay visible', {
      currentFrame: this._currentFrame,
      className: this._overlay.className
    });
    if (restart) {
      this._currentFrame = 0;
      this._renderCurrentFrame();
    }
    if (this._running) return;
    this._running = true;
    this._lastFrameAt = 0;
    this._rafId = requestAnimationFrame(this._tick);
  }

  hide() {
    console.warn('[PomodoroOverlayAnimation] hide requested');
    this._running = false;
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    if (this._container) {
      this._container.classList.remove('pomodoro-animation-mode');
    }
    if (this._overlay) {
      this._overlay.classList.remove('is-visible');
      this._overlay.classList.add('hidden');
    }
  }

  _tick(ts) {
    if (!this._running) return;
    if (!this._lastFrameAt) {
      this._lastFrameAt = ts;
      this._renderCurrentFrame();
    } else if (ts - this._lastFrameAt >= this.config.frameDurationMs) {
      this._lastFrameAt = ts;
      this._advanceFrame();
    }
    this._rafId = requestAnimationFrame(this._tick);
  }

  _advanceFrame() {
    if (this._frames.length === 0) return;
    if (this._currentFrame >= this._frames.length - 1) {
      if (!this.config.loop) {
        this._running = false;
        this._renderCurrentFrame();
        console.warn('[PomodoroOverlayAnimation] playback finished, restoring pet view');
        this.hide();
        return;
      }
      this._currentFrame = 0;
    } else {
      this._currentFrame += 1;
    }
    this._renderCurrentFrame();
  }

  _renderCurrentFrame() {
    const frame = this._frames[this._currentFrame];
    if (frame && this._frameEl.src !== frame.src) {
      this._frameEl.src = frame.src;
      if (this._currentFrame === 0 || this._currentFrame === this._frames.length - 1) {
        console.warn('[PomodoroOverlayAnimation] render frame', {
          index: this._currentFrame,
          src: frame.src
        });
      }
    }
  }

  _loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load pomodoro overlay frame: ${src}`));
      img.src = src;
    });
  }
}
