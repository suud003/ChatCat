/**
 * KeyboardRecorder - Records keyboard input with pinyin detection
 * Main process module (CommonJS)
 */

const fs = require('fs');
const path = require('path');
const { PinyinDetector } = require('./pinyin-detector');

// uiohook keycode → character/type mapping
// Reference: https://github.com/nickvdyck/uiohook-napi (based on libuiohook keycodes)
const KEYCODE_MAP = {
  // Letters (a-z)
  30: 'a', 48: 'b', 46: 'c', 32: 'd', 18: 'e', 33: 'f', 34: 'g', 35: 'h',
  23: 'i', 36: 'j', 37: 'k', 38: 'l', 50: 'm', 49: 'n', 24: 'o', 25: 'p',
  16: 'q', 19: 'r', 31: 's', 20: 't', 22: 'u', 47: 'v', 17: 'w', 45: 'x',
  21: 'y', 44: 'z',
  // Digits
  2: '1', 3: '2', 4: '3', 5: '4', 6: '5', 7: '6', 8: '7', 9: '8', 10: '9', 11: '0',
  // Punctuation & symbols
  12: '-', 13: '=', 26: '[', 27: ']', 43: '\\', 39: ';', 40: "'", 41: '`',
  51: ',', 52: '.', 53: '/',
};

// Special key names
const SPECIAL_KEYS = {
  1: 'Esc',
  14: '退格',
  15: 'Tab',
  28: '回车',
  57: '空格',
  3639: '删除', // Delete key
  // Ignore modifier/function keys
};

// Keys to ignore (modifiers, function keys, etc.)
const IGNORE_KEYCODES = new Set([
  29, 42, 54, 56,       // Ctrl, LShift, RShift, Alt
  3675, 3676,            // LWin, RWin
  3613,                  // RAlt
  3655, 3657, 3663, 3665, // Home, PgUp, End, PgDn
  3666, 3667, 3653,      // Insert, Delete alt, PrtSc
  57416, 57419, 57421, 57424, // Arrow keys
  59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 87, 88, // F1-F12
  58, 69, 70,            // CapsLock, NumLock, ScrollLock
]);

class KeyboardRecorder {
  constructor(mainWindow, store) {
    this._mainWindow = mainWindow;
    this._store = store;
    this._detector = new PinyinDetector();
    this._buffer = [];
    this._currentLine = '';
    this._recording = false;
    this._flushTimer = null;
    this._timeoutTimer = null;
    this._outputDir = store.get('recorderOutputDir') || '';
    this._lastDate = '';
  }

  /**
   * Process a keydown event from uiohook.
   * @param {number} keycode - uiohook keycode
   */
  processKeydown(keycode) {
    if (!this._recording) return;
    if (IGNORE_KEYCODES.has(keycode)) return;

    // Backspace
    if (keycode === 14) {
      const result = this._detector.onBackspace();
      if (!result.handled) {
        this._appendToken('[退格]');
      }
      return;
    }

    // Enter
    if (keycode === 28) {
      const result = this._detector.onEnter();
      if (result.handled) {
        this._appendToken(`[拼音:${result.pinyin}][选字:回车]`);
      } else {
        this._appendToken('[回车]');
      }
      this._flushLine();
      return;
    }

    // Space
    if (keycode === 57) {
      const result = this._detector.onSpace();
      if (result.handled) {
        this._appendToken(`[拼音:${result.pinyin}][选字:空格]`);
      } else {
        this._appendToken(' ');
      }
      return;
    }

    // Escape
    if (keycode === 1) {
      this._detector.onEscape();
      this._appendToken('[Esc]');
      return;
    }

    // Tab
    if (keycode === 15) {
      const flush = this._detector.onSpecialKey();
      if (flush.flushedText) this._appendToken(flush.flushedText);
      this._appendToken('[Tab]');
      return;
    }

    // Delete
    if (keycode === 3639) {
      const flush = this._detector.onSpecialKey();
      if (flush.flushedText) this._appendToken(flush.flushedText);
      this._appendToken('[删除]');
      return;
    }

    // Digits 1-9 (keycodes 2-10)
    if (keycode >= 2 && keycode <= 10) {
      const digitChar = String(keycode - 1);
      const result = this._detector.onDigit(digitChar);
      if (result.handled) {
        this._appendToken(`[拼音:${result.pinyin}][选字:${result.digit}]`);
      } else {
        this._appendToken(digitChar);
      }
      return;
    }

    // Digit 0 (keycode 11)
    if (keycode === 11) {
      const flush = this._detector.onSpecialKey();
      if (flush.flushedText) this._appendToken(flush.flushedText);
      this._appendToken('0');
      return;
    }

    // Letter keys
    const char = KEYCODE_MAP[keycode];
    if (char && /^[a-z]$/.test(char)) {
      const result = this._detector.addChar(char);
      if (result.flushedText) {
        this._appendToken(result.flushedText);
      }
      return;
    }

    // Other mapped characters (punctuation)
    if (char) {
      const flush = this._detector.onSpecialKey();
      if (flush.flushedText) this._appendToken(flush.flushedText);
      this._appendToken(char);
      return;
    }

    // Unknown keycode — flush any pending pinyin
    const flush = this._detector.onSpecialKey();
    if (flush.flushedText) this._appendToken(flush.flushedText);
  }

  _appendToken(token) {
    if (!this._currentLine) {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');
      this._currentLine = `[${hh}:${mm}:${ss}] `;
    }
    this._currentLine += token;
  }

  _flushLine() {
    if (this._currentLine) {
      this._buffer.push(this._currentLine);
      this._currentLine = '';
    }
  }

  /**
   * Flush buffer to file and notify renderer.
   */
  flush() {
    // Check pinyin timeout
    const timeout = this._detector.flushTimeout();
    if (timeout.flushedText) {
      this._appendToken(timeout.flushedText);
    }

    // Flush current line to buffer
    this._flushLine();

    if (this._buffer.length === 0) return;

    const lines = this._buffer.splice(0);
    const text = lines.join('\n') + '\n';

    // Write to file
    if (this._outputDir) {
      try {
        const filePath = this._getFilePath();
        fs.appendFileSync(filePath, text, 'utf-8');
      } catch (err) {
        console.warn('KeyboardRecorder write error:', err.message);
      }
    }

    // Notify renderer
    if (this._mainWindow && !this._mainWindow.isDestroyed()) {
      this._mainWindow.webContents.send('recorder-update', { lines });
    }
  }

  _getFilePath() {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
    return path.join(this._outputDir, `keyboard_${dateStr}.txt`);
  }

  _getTodayFilePath() {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    return path.join(this._outputDir, `keyboard_${dateStr}.txt`);
  }

  /**
   * Start recording.
   */
  start() {
    if (this._recording) return;
    this._recording = true;

    // 5-second periodic flush
    this._flushTimer = setInterval(() => this.flush(), 5000);
    // 1-second pinyin timeout check
    this._timeoutTimer = setInterval(() => {
      const timeout = this._detector.flushTimeout();
      if (timeout.flushedText) {
        this._appendToken(timeout.flushedText);
      }
    }, 1000);
  }

  /**
   * Stop recording.
   */
  stop() {
    if (!this._recording) return;
    this._recording = false;

    if (this._flushTimer) {
      clearInterval(this._flushTimer);
      this._flushTimer = null;
    }
    if (this._timeoutTimer) {
      clearInterval(this._timeoutTimer);
      this._timeoutTimer = null;
    }

    // Final flush
    this.flush();
  }

  /**
   * Set the output directory.
   */
  setOutputDir(dir) {
    this._outputDir = dir;
    this._store.set('recorderOutputDir', dir);
  }

  /**
   * Get today's log content (last N lines).
   */
  getTodayContent(maxLines = 50) {
    if (!this._outputDir) return '';
    const filePath = this._getTodayFilePath();
    try {
      if (!fs.existsSync(filePath)) return '';
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.trim().split('\n');
      return lines.slice(-maxLines).join('\n');
    } catch {
      return '';
    }
  }

  get recording() {
    return this._recording;
  }

  get outputDir() {
    return this._outputDir;
  }
}

module.exports = { KeyboardRecorder };
